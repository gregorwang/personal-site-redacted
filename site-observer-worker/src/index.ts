import { consumeDeliveryBatch } from "./delivery-consumer";
import {
  acquirePollLease,
  createDailyHeartbeat,
  createDegradedAlertIfNeeded,
  enqueuePendingDeliveries,
  getMonitorHealth,
  loadTelemetryWindow,
  processTelemetryCandidates,
  recordMonitorFailure,
  recordMonitorSuccess,
  recoverQuietIncidents,
  releasePollLease,
  runDailyRetention,
  saveTelemetryWindowResult,
  setMonitorWaitingForToken,
} from "./incident-store";
import type { ObserverQueueMessage } from "./incident-types";
import { readObserverConfig, safeErrorMessage } from "./observer-config";
import { fetchTelemetryWindow } from "./telemetry";

async function runScheduledPoll(env: Env): Promise<void> {
  const now = Date.now();
  const leaseToken = await acquirePollLease(env.DB, now);
  if (!leaseToken) {
    console.info("observer_poll_skipped", { reason: "lease_held" });
    return;
  }

  try {
    const config = readObserverConfig(env);
    await enqueuePendingDeliveries(env, now);
    await runDailyRetention(env.DB, now);

    if (!config.observabilityToken) {
      await setMonitorWaitingForToken(env.DB, now);
      console.warn("observer_poll_waiting_for_token");
      return;
    }

    const window = await loadTelemetryWindow(
      env.DB,
      now,
      config.lookbackMs,
    );
    const result = await fetchTelemetryWindow(
      {
        ...config,
        observabilityToken: config.observabilityToken,
      },
      window,
    );
    const processing = await processTelemetryCandidates(
      env.DB,
      config,
      result.candidates,
      now,
    );
    await saveTelemetryWindowResult(
      env.DB,
      window,
      result.nextOffset,
      now,
    );
    await recordMonitorSuccess(env.DB, now, Boolean(result.nextOffset));
    const recovered = await recoverQuietIncidents(
      env.DB,
      config.recoveryMs,
      now,
    );
    await createDailyHeartbeat(
      env.DB,
      config.heartbeatHourJst,
      now,
    );
    const queued = await enqueuePendingDeliveries(env, Date.now());

    console.info("observer_poll_complete", {
      from: window.from,
      to: window.to,
      matched: result.matchedCount ?? null,
      received: processing.received,
      fresh: processing.fresh,
      groups: processing.groups,
      recovered,
      queued,
      hasBacklog: Boolean(result.nextOffset),
    });
  } catch (error) {
    const safeError = safeErrorMessage(error);
    console.error("observer_poll_failed", { error: safeError });
    try {
      const health = await recordMonitorFailure(env.DB, error, Date.now());
      await createDegradedAlertIfNeeded(env.DB, health, Date.now());
      await enqueuePendingDeliveries(env, Date.now());
    } catch (healthError) {
      console.error("observer_health_record_failed", {
        error: safeErrorMessage(healthError),
      });
    }
  } finally {
    try {
      await releasePollLease(env.DB, leaseToken, Date.now());
    } catch (error) {
      console.error("observer_lease_release_failed", {
        error: safeErrorMessage(error),
      });
    }
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/health") {
    return jsonResponse({ error: "Not found" }, 404);
  }

  try {
    const config = readObserverConfig(env);
    const health = await getMonitorHealth(env.DB);
    return jsonResponse({
      ok: true,
      service: "site-observer-worker",
      target: config.targetWorkerName,
      environment: config.targetEnvironment,
      ai_gateway: config.aiEnabled ? config.aiGatewayId : null,
      poll_status: health?.status ?? "initializing",
      last_success_at: health?.last_success_at
        ? new Date(health.last_success_at).toISOString()
        : null,
      delivery_mode: config.deliveryEnabled ? "enabled" : "dry_run",
      observability_token_configured: Boolean(
        config.observabilityToken,
      ),
      webhook_configured: Boolean(
        config.webhookUrl && config.webhookSecret,
      ),
    });
  } catch {
    return jsonResponse(
      {
        ok: false,
        service: "site-observer-worker",
        error: "Health storage unavailable",
      },
      503,
    );
  }
}

export default {
  fetch: handleFetch,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runScheduledPoll(env));
  },
  queue(batch, env) {
    return consumeDeliveryBatch(batch, env);
  },
} satisfies ExportedHandler<Env, ObserverQueueMessage>;
