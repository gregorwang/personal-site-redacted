import type {
  DegradedQueueMessage,
  HeartbeatQueueMessage,
  IncidentQueueMessage,
  IncidentTransition,
  ObserverQueueMessage,
  StormSummary,
} from "./incident-types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIncidentTransition(value: unknown): value is IncidentTransition {
  return value === "opened" || value === "updated" || value === "recovered";
}

function parseStormSummary(value: unknown): StormSummary | undefined {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.suppressedCount) ||
    value.suppressedCount < 1 ||
    !isFiniteNumber(value.windowStartedAt)
  ) {
    return undefined;
  }
  return {
    suppressedCount: Math.floor(value.suppressedCount),
    windowStartedAt: value.windowStartedAt,
  };
}

export function parseObserverQueueMessage(
  value: unknown,
): ObserverQueueMessage | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isNonEmptyString(value.deliveryId) ||
    !isFiniteNumber(value.createdAt)
  ) {
    return null;
  }

  if (
    value.kind === "incident" &&
    isNonEmptyString(value.incidentId) &&
    isIncidentTransition(value.transition) &&
    isFiniteNumber(value.revision)
  ) {
    const stormSummary = parseStormSummary(value.stormSummary);
    const message: IncidentQueueMessage = {
      schemaVersion: 1,
      kind: "incident",
      deliveryId: value.deliveryId,
      incidentId: value.incidentId,
      transition: value.transition,
      revision: value.revision,
      createdAt: value.createdAt,
      ...(stormSummary ? { stormSummary } : {}),
    };
    return message;
  }

  if (
    value.kind === "heartbeat" &&
    isNonEmptyString(value.dateJst) &&
    isFiniteNumber(value.observedAt)
  ) {
    const message: HeartbeatQueueMessage = {
      schemaVersion: 1,
      kind: "heartbeat",
      deliveryId: value.deliveryId,
      dateJst: value.dateJst,
      observedAt: value.observedAt,
      createdAt: value.createdAt,
    };
    return message;
  }

  if (
    value.kind === "degraded" &&
    isNonEmptyString(value.reason) &&
    isFiniteNumber(value.consecutiveFailures) &&
    isFiniteNumber(value.observedAt)
  ) {
    const message: DegradedQueueMessage = {
      schemaVersion: 1,
      kind: "degraded",
      deliveryId: value.deliveryId,
      reason: value.reason.slice(0, 300),
      consecutiveFailures: value.consecutiveFailures,
      observedAt: value.observedAt,
      createdAt: value.createdAt,
    };
    return message;
  }

  return null;
}
