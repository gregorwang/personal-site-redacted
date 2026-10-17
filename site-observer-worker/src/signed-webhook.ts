import type {
  IncidentAnalysis,
  IncidentRecord,
  IncidentSample,
  MonitorSnapshot,
  ObserverQueueMessage,
} from "./incident-types";
import type { ObserverConfig } from "./observer-config";
import {
  sanitizeLogText,
  sanitizeRoute,
} from "./log-redaction";

export type WebhookSendResult =
  | {
      outcome: "delivered";
      status: number;
      responseExcerpt: string | null;
    }
  | {
      outcome: "retry";
      error: string;
      retryAfterSeconds: number;
      status: number | null;
      responseExcerpt: string | null;
    }
  | {
      outcome: "permanent_failure";
      error: string;
      status: number | null;
      responseExcerpt: string | null;
    };

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function buildObserverWebhookPayload(
  config: ObserverConfig,
  message: ObserverQueueMessage,
  incident?: IncidentRecord,
  analysis?: IncidentAnalysis,
  samples?: IncidentSample[],
  monitorSnapshot?: MonitorSnapshot,
): Record<string, unknown> {
  if (message.kind === "heartbeat") {
    if (!monitorSnapshot) {
      throw new Error("Heartbeat webhook requires a monitor snapshot");
    }
    const isDegraded =
      monitorSnapshot.degradedComponents.length > 0 ||
      monitorSnapshot.dlqCount > 0 ||
      monitorSnapshot.permanentFailureCount > 0;
    return {
      schema_version: 1,
      event_type: "site.monitor.heartbeat",
      delivery_id: message.deliveryId,
      emitted_at: toIso(message.observedAt),
      monitor: {
        status: monitorSnapshot.status,
        checked_at: toIso(monitorSnapshot.checkedAt),
        last_log_query_at: monitorSnapshot.lastLogQueryAt
          ? toIso(monitorSnapshot.lastLogQueryAt)
          : null,
        open_incident_count: monitorSnapshot.openIncidentCount,
        new_incidents_24h: monitorSnapshot.newIncidents24h,
        ai_status: config.aiEnabled ? "available" : "disabled",
        webhook_status: config.deliveryEnabled
          ? monitorSnapshot.permanentFailureCount > 0
            ? "degraded"
            : "available"
          : "dry_run",
        dlq_count: monitorSnapshot.dlqCount,
        permanent_failure_count: monitorSnapshot.permanentFailureCount,
        degraded_components: monitorSnapshot.degradedComponents,
        summary: isDegraded
          ? "网站监控存在异常，请检查降级组件和投递失败记录。"
          : "网站监控运行正常",
      },
    };
  }

  if (message.kind === "degraded") {
    if (!monitorSnapshot) {
      throw new Error("Degraded webhook requires a monitor snapshot");
    }
    const degradedComponents = Array.from(
      new Set([
        ...monitorSnapshot.degradedComponents,
        "observability_poll",
      ]),
    );
    return {
      schema_version: 1,
      event_type: "site.monitor.degraded",
      delivery_id: message.deliveryId,
      emitted_at: toIso(message.observedAt),
      monitor: {
        status: "degraded",
        checked_at: toIso(monitorSnapshot.checkedAt),
        last_log_query_at: monitorSnapshot.lastLogQueryAt
          ? toIso(monitorSnapshot.lastLogQueryAt)
          : null,
        open_incident_count: monitorSnapshot.openIncidentCount,
        new_incidents_24h: monitorSnapshot.newIncidents24h,
        ai_status: config.aiEnabled ? "available" : "disabled",
        webhook_status: config.deliveryEnabled
          ? monitorSnapshot.permanentFailureCount > 0
            ? "degraded"
            : "available"
          : "dry_run",
        dlq_count: monitorSnapshot.dlqCount,
        permanent_failure_count: monitorSnapshot.permanentFailureCount,
        degraded_components: degradedComponents,
        consecutive_failures: message.consecutiveFailures,
        reason: message.reason,
        summary: "监控自身连续失败，请检查 Observability API Token、D1 和队列。",
      },
    };
  }

  if (!incident || !analysis || !samples) {
    throw new Error("Incident webhook requires incident and analysis");
  }
  const affectedRoutes = Array.from(
    new Set(
      [incident.route, ...samples.map((sample) => sample.route)]
        .map(sanitizeRoute)
        .filter((route): route is string => Boolean(route)),
    ),
  ).slice(0, 5);
  const statusCodes = Array.from(
    new Set(
      samples
        .map((sample) => sample.status_code)
        .filter((status): status is number => status !== null),
    ),
  ).slice(0, 5);
  const errorSamples = samples.slice(0, 3).map((sample) => ({
    observed_at: toIso(sample.observed_at),
    message: sanitizeLogText(sample.message),
    route: sanitizeRoute(sample.route),
    status_code: sample.status_code,
    outcome: sample.outcome?.slice(0, 80) ?? null,
    level: sample.level?.slice(0, 40) ?? null,
  }));
  const isStormSummary = Boolean(message.stormSummary);
  const title = isStormSummary ? "错误风暴通知已限流" : analysis.title;
  const summary = message.stormSummary
    ? `过去一小时事故通知已达到上限，本摘要生成前已抑制 ${message.stormSummary.suppressedCount} 条普通通知。`
    : analysis.summary;

  return {
    schema_version: 1,
    event_type: `site.incident.${message.transition}`,
    delivery_id: message.deliveryId,
    emitted_at: toIso(message.createdAt),
    incident: {
      id: incident.id,
      fingerprint: `sha256:${incident.fingerprint}`,
      service: incident.service,
      environment: incident.environment,
      status: incident.status,
      severity: incident.severity,
      title,
      summary,
      likely_cause: analysis.likelyCause,
      confidence: analysis.confidence,
      user_impact: analysis.userImpact,
      evidence: analysis.evidence,
      recommended_checks: analysis.recommendedChecks,
      analysis_source: analysis.source,
      first_seen: toIso(incident.first_seen),
      last_seen: toIso(incident.last_seen),
      recovered_at: incident.recovered_at
        ? toIso(incident.recovered_at)
        : null,
      occurrence_count: incident.occurrence_count,
      affected_routes: affectedRoutes,
      status_codes: statusCodes,
      error_samples_redacted: true,
      error_samples: errorSamples,
      deployment_version: incident.deployment_version,
    },
  };
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function createWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return bytesToHex(signature);
}

function parseRetryAfter(value: string | null): number {
  if (!value) {
    return 60;
  }
  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds)) {
    return Math.min(900, Math.max(30, seconds));
  }
  return 60;
}

async function readWebhookResponseExcerpt(
  response: Response,
): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    return null;
  }
  const maximumBytes = 4_096;
  const bytes = new Uint8Array(maximumBytes);
  let byteLength = 0;

  try {
    while (byteLength < maximumBytes) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      const remaining = maximumBytes - byteLength;
      const copied = Math.min(remaining, chunk.value.byteLength);
      bytes.set(chunk.value.subarray(0, copied), byteLength);
      byteLength += copied;
      if (copied < chunk.value.byteLength || byteLength === maximumBytes) {
        await reader.cancel("Webhook response excerpt limit reached");
        break;
      }
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }

  const excerpt = sanitizeLogText(
    new TextDecoder().decode(bytes.subarray(0, byteLength)),
    300,
  );
  return excerpt || null;
}

function formatWebhookHttpError(
  status: number,
  responseExcerpt: string | null,
): string {
  return responseExcerpt
    ? `Webhook HTTP ${status}: ${responseExcerpt}`
    : `Webhook HTTP ${status}`;
}

function validateWebhookUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("Webhook URL must not contain credentials");
  }
  return url;
}

export async function sendSignedWebhook(
  config: ObserverConfig & {
    webhookUrl: string;
    webhookSecret: string;
  },
  deliveryId: string,
  rawBody: string,
): Promise<WebhookSendResult> {
  let url: URL;
  try {
    url = validateWebhookUrl(config.webhookUrl);
  } catch (error) {
    return {
      outcome: "permanent_failure",
      error: error instanceof Error ? error.message : "Invalid webhook URL",
      status: null,
      responseExcerpt: null,
    };
  }

  const timestamp = String(Math.floor(Date.now() / 1_000));
  const signature = await createWebhookSignature(
    config.webhookSecret,
    timestamp,
    rawBody,
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "site-observer-worker/1.0",
        "X-Request-ID": deliveryId,
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature-V2": signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(8_000),
    });

    const responseExcerpt = await readWebhookResponseExcerpt(response);
    if (
      (response.status >= 200 && response.status < 300) ||
      response.status === 409
    ) {
      return {
        outcome: "delivered",
        status: response.status,
        responseExcerpt,
      };
    }
    const responseError = formatWebhookHttpError(
      response.status,
      responseExcerpt,
    );
    if (
      response.status === 408 ||
      response.status === 425 ||
      response.status === 429 ||
      response.status >= 500
    ) {
      return {
        outcome: "retry",
        error: responseError,
        retryAfterSeconds: parseRetryAfter(
          response.headers.get("Retry-After"),
        ),
        status: response.status,
        responseExcerpt,
      };
    }
    return {
      outcome: "permanent_failure",
      error: responseError,
      status: response.status,
      responseExcerpt,
    };
  } catch (error) {
    return {
      outcome: "retry",
      error:
        error instanceof Error
          ? `${error.name}: ${error.message}`.slice(0, 300)
          : "Webhook network failure",
      retryAfterSeconds: 60,
      status: null,
      responseExcerpt: null,
    };
  }
}
