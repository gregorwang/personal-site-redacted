import {
  analysisFromStoredIncident,
  analyzeIncident,
} from "./incident-analysis";
import {
  freezeDeliveryWebhookBody,
  getDelivery,
  getIncident,
  getIncidentSamples,
  getMonitorSnapshot,
  markDeliveryFinished,
  markDeliveryProcessing,
  markDeliveryRetry,
  recordDeliveryAttempt,
  saveIncidentAnalysis,
} from "./incident-store";
import type { ObserverQueueMessage } from "./incident-types";
import { sha256Hex } from "./log-redaction";
import { readObserverConfig, safeErrorMessage } from "./observer-config";
import { parseObserverQueueMessage } from "./queue-message";
import {
  buildObserverWebhookPayload,
  sendSignedWebhook,
} from "./signed-webhook";

function validateFrozenWebhookBody(
  rawBody: string,
  deliveryId: string,
): void {
  if (new TextEncoder().encode(rawBody).byteLength > 65_536) {
    throw new Error("Frozen webhook body exceeds the 64 KiB limit");
  }
  const parsed: unknown = JSON.parse(rawBody);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !("delivery_id" in parsed) ||
    parsed.delivery_id !== deliveryId
  ) {
    throw new Error("Frozen webhook body has a mismatched delivery_id");
  }
}

async function preparePayload(
  env: Env,
  message: ObserverQueueMessage,
): Promise<Record<string, unknown>> {
  const config = readObserverConfig(env);
  if (message.kind !== "incident") {
    const monitorSnapshot = await getMonitorSnapshot(
      env.DB,
      message.observedAt,
    );
    return buildObserverWebhookPayload(
      config,
      message,
      undefined,
      undefined,
      undefined,
      monitorSnapshot,
    );
  }

  const incident = await getIncident(env.DB, message.incidentId);
  if (!incident) {
    throw new Error(`Incident ${message.incidentId} does not exist`);
  }
  const samples = await getIncidentSamples(env.DB, incident.id);
  const analysis =
    message.transition === "recovered"
      ? analysisFromStoredIncident(incident, samples)
      : await analyzeIncident(env, config, incident, samples);
  if (message.transition !== "recovered") {
    await saveIncidentAnalysis(env.DB, incident.id, analysis, Date.now());
  }

  return buildObserverWebhookPayload(
    config,
    message,
    incident,
    analysis,
    samples,
  );
}

async function handleMessage(
  env: Env,
  rawMessage: unknown,
): Promise<
  | { outcome: "ack" }
  | { outcome: "retry"; delaySeconds: number }
> {
  const message = parseObserverQueueMessage(rawMessage);
  if (!message) {
    console.error("observer_queue_invalid_message");
    return { outcome: "ack" };
  }

  const now = Date.now();
  const delivery = await getDelivery(env.DB, message.deliveryId);
  if (!delivery) {
    console.error("observer_queue_missing_delivery", {
      deliveryId: message.deliveryId,
    });
    return { outcome: "ack" };
  }
  if (
    delivery.state === "delivered" ||
    delivery.state === "dry_run" ||
    delivery.state === "permanent_failure"
  ) {
    return { outcome: "ack" };
  }

  const attemptNumber = await markDeliveryProcessing(
    env.DB,
    message.deliveryId,
    now,
  );
  const config = readObserverConfig(env);

  if (!config.deliveryEnabled) {
    await markDeliveryFinished(
      env.DB,
      message.deliveryId,
      "dry_run",
      null,
      Date.now(),
    );
    console.info("observer_delivery_dry_run", {
      deliveryId: message.deliveryId,
      kind: message.kind,
    });
    return { outcome: "ack" };
  }

  if (!config.webhookUrl || !config.webhookSecret) {
    await markDeliveryFinished(
      env.DB,
      message.deliveryId,
      "permanent_failure",
      "Webhook URL or secret is not configured",
      Date.now(),
    );
    console.error("observer_webhook_not_configured", {
      deliveryId: message.deliveryId,
    });
    return { outcome: "ack" };
  }

  let rawBody: string;
  try {
    if (delivery.webhook_body_json) {
      rawBody = delivery.webhook_body_json;
    } else {
      const payload = await preparePayload(env, message);
      rawBody = await freezeDeliveryWebhookBody(
        env.DB,
        message.deliveryId,
        JSON.stringify(payload),
        Date.now(),
      );
    }
    validateFrozenWebhookBody(rawBody, message.deliveryId);
  } catch (error) {
    const safeError = safeErrorMessage(error);
    await markDeliveryRetry(
      env.DB,
      message.deliveryId,
      safeError,
      Date.now(),
    );
    console.error("observer_payload_failed", {
      deliveryId: message.deliveryId,
      error: safeError,
    });
    return { outcome: "retry", delaySeconds: 60 };
  }

  const requestBodySha256 = await sha256Hex(rawBody);
  const requestBodyBytes = new TextEncoder().encode(rawBody).byteLength;
  const sendResult = await sendSignedWebhook(
    {
      ...config,
      webhookUrl: config.webhookUrl,
      webhookSecret: config.webhookSecret,
    },
    message.deliveryId,
    rawBody,
  );
  await recordDeliveryAttempt(
    env.DB,
    message.deliveryId,
    attemptNumber,
    sendResult.outcome,
    sendResult.status,
    sendResult.responseExcerpt,
    requestBodySha256,
    requestBodyBytes,
    Date.now(),
  );
  if (sendResult.outcome === "delivered") {
    await markDeliveryFinished(
      env.DB,
      message.deliveryId,
      "delivered",
      null,
      Date.now(),
    );
    console.info("observer_delivery_succeeded", {
      deliveryId: message.deliveryId,
      attemptNumber,
      status: sendResult.status,
      requestBodySha256,
    });
    return { outcome: "ack" };
  }
  if (sendResult.outcome === "permanent_failure") {
    await markDeliveryFinished(
      env.DB,
      message.deliveryId,
      "permanent_failure",
      sendResult.error,
      Date.now(),
    );
    console.error("observer_delivery_permanent_failure", {
      deliveryId: message.deliveryId,
      attemptNumber,
      error: sendResult.error,
      requestBodySha256,
    });
    return { outcome: "ack" };
  }

  await markDeliveryRetry(
    env.DB,
    message.deliveryId,
    sendResult.error,
    Date.now(),
  );
  console.warn("observer_delivery_retry", {
    deliveryId: message.deliveryId,
    attemptNumber,
    error: sendResult.error,
    requestBodySha256,
  });
  return {
    outcome: "retry",
    delaySeconds: sendResult.retryAfterSeconds,
  };
}

export async function consumeDeliveryBatch(
  batch: MessageBatch<ObserverQueueMessage>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      const result = await handleMessage(env, message.body);
      if (result.outcome === "retry") {
        message.retry({ delaySeconds: result.delaySeconds });
      } else {
        message.ack();
      }
    } catch (error) {
      console.error("observer_queue_unhandled_failure", {
        error: safeErrorMessage(error),
      });
      message.retry({ delaySeconds: 60 });
    }
  }
}
