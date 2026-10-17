import type { TelemetryCandidate } from "./incident-types";
import {
  sanitizeLogText,
  sanitizeRoute,
} from "./log-redaction";
import type { ObserverConfig } from "./observer-config";

const QUERY_ENDPOINT_PATH = "/workers/observability/telemetry/query";
const MAX_PAGES_PER_RUN = 3;
const ABNORMAL_OUTCOMES = new Set([
  "exception",
  "exceededCpu",
  "exceededMemory",
  "internalError",
]);

type JsonRecord = Record<string, unknown>;

export interface TelemetryWindow {
  from: number;
  to: number;
  offset?: string;
}

export interface TelemetryWindowResult {
  candidates: TelemetryCandidate[];
  nextOffset?: string;
  matchedCount?: number;
}

interface TelemetryQueryPage {
  candidates: TelemetryCandidate[];
  eventIds: string[];
  matchedCount?: number;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(
  record: JsonRecord,
  key: string,
): JsonRecord | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

function getString(
  record: JsonRecord | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumber(
  record: JsonRecord | undefined,
  key: string,
): number | undefined {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function nestedResponseStatus(workers: JsonRecord | undefined): number | undefined {
  const event = workers ? getRecord(workers, "event") : undefined;
  const response = event ? getRecord(event, "response") : undefined;
  return getNumber(response, "status");
}

function nestedRequestPath(workers: JsonRecord | undefined): string | undefined {
  const event = workers ? getRecord(workers, "event") : undefined;
  const request = event ? getRecord(event, "request") : undefined;
  return getString(request, "path") ?? getString(request, "url");
}

function getErrorName(message: string | undefined): string | null {
  if (!message) {
    return null;
  }
  const match = /^([A-Za-z_$][\w.$-]{1,80})(?::|\s)/.exec(message.trim());
  return match?.[1] ?? null;
}

function candidateFromEvent(
  value: unknown,
  targetWorkerName: string,
): TelemetryCandidate | null {
  if (!isRecord(value)) {
    return null;
  }

  const metadata = getRecord(value, "$metadata");
  const workers = getRecord(value, "$workers");
  const eventId = getString(metadata, "id");
  const service =
    getString(metadata, "service") ??
    getString(workers, "scriptName");
  const observedAt =
    parseTimestamp(value.timestamp) ??
    parseTimestamp(getString(metadata, "timestamp"));

  if (
    !eventId ||
    !service ||
    service !== targetWorkerName ||
    observedAt === undefined
  ) {
    return null;
  }

  const error = getString(metadata, "error");
  const errorTemplate = getString(metadata, "errorTemplate");
  const message =
    errorTemplate ??
    error ??
    getString(metadata, "messageTemplate") ??
    getString(metadata, "message") ??
    "Worker error event";
  const level = getString(metadata, "level")?.toLowerCase();
  const outcome = getString(workers, "outcome");
  const statusCode =
    getNumber(metadata, "statusCode") ?? nestedResponseStatus(workers);
  const isRuntimeFailure = outcome ? ABNORMAL_OUTCOMES.has(outcome) : false;
  const isHttpFailure = statusCode !== undefined && statusCode >= 500;
  const isErrorLog = Boolean(error) || level === "error";

  if (!isRuntimeFailure && !isHttpFailure && !isErrorLog) {
    return null;
  }

  const sourceKind = isRuntimeFailure
    ? "runtime"
    : isHttpFailure
      ? "http_5xx"
      : "log_error";
  const severity =
    outcome === "exceededCpu" ||
    outcome === "exceededMemory" ||
    outcome === "internalError" ||
    outcome === "exception"
      ? "critical"
      : isHttpFailure
        ? "high"
        : "medium";
  const route = sanitizeRoute(
    getString(metadata, "url") ?? nestedRequestPath(workers) ?? null,
  );

  return {
    eventId,
    observedAt,
    service,
    sourceKind,
    severity,
    route,
    errorName: getErrorName(error ?? message),
    message: sanitizeLogText(message),
    fingerprintHint: getString(metadata, "fingerprint") ?? null,
    statusCode: statusCode ?? null,
    outcome: outcome ?? null,
    level: level ?? null,
    deploymentVersion: getString(workers, "scriptVersion") ?? null,
  };
}

export function buildTelemetryQuery(
  config: Pick<ObserverConfig, "targetWorkerName" | "queryEventLimit">,
  window: TelemetryWindow,
): JsonRecord {
  const query: JsonRecord = {
    queryId: "site-observer-errors-v1",
    timeframe: {
      from: window.from,
      to: window.to,
    },
    dry: true,
    limit: config.queryEventLimit,
    parameters: {
      datasets: ["cloudflare-workers"],
      filterCombination: "and",
      filters: [
        {
          kind: "filter",
          key: "$metadata.service",
          operation: "eq",
          type: "string",
          value: config.targetWorkerName,
        },
        {
          kind: "group",
          filterCombination: "or",
          filters: [
            {
              kind: "filter",
              key: "$metadata.error",
              operation: "exists",
              type: "string",
            },
            {
              kind: "filter",
              key: "$metadata.level",
              operation: "eq",
              type: "string",
              value: "error",
            },
            {
              kind: "filter",
              key: "$metadata.statusCode",
              operation: "gte",
              type: "number",
              value: 500,
            },
            {
              kind: "filter",
              key: "$workers.event.response.status",
              operation: "gte",
              type: "number",
              value: 500,
            },
            ...Array.from(ABNORMAL_OUTCOMES, (outcome) => ({
              kind: "filter",
              key: "$workers.outcome",
              operation: "eq",
              type: "string",
              value: outcome,
            })),
          ],
        },
      ],
    },
    view: "events",
  };

  if (window.offset) {
    query.offset = window.offset;
    query.offsetDirection = "next";
  }

  return query;
}

function apiErrorMessage(body: unknown): string {
  if (!isRecord(body) || !Array.isArray(body.errors)) {
    return "Cloudflare Observability API request failed";
  }
  const messages = body.errors
    .map((error) => (isRecord(error) ? getString(error, "message") : undefined))
    .filter((message): message is string => Boolean(message));
  return messages.join("; ").slice(0, 300) ||
    "Cloudflare Observability API request failed";
}

export function parseTelemetryQueryPage(
  body: unknown,
  targetWorkerName: string,
): TelemetryQueryPage {
  if (!isRecord(body)) {
    throw new Error("Observability API returned a non-object response");
  }
  const result = getRecord(body, "result");
  const eventsContainer = result ? getRecord(result, "events") : undefined;
  const rawEvents = eventsContainer?.events;
  if (!Array.isArray(rawEvents)) {
    throw new Error("Observability API response did not contain events");
  }

  const candidates: TelemetryCandidate[] = [];
  const eventIds: string[] = [];
  for (const rawEvent of rawEvents) {
    if (isRecord(rawEvent)) {
      const eventId = getString(getRecord(rawEvent, "$metadata"), "id");
      if (eventId) {
        eventIds.push(eventId);
      }
    }
    const candidate = candidateFromEvent(rawEvent, targetWorkerName);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  const matchedCount = getNumber(eventsContainer, "count");
  return {
    candidates,
    eventIds,
    ...(matchedCount !== undefined ? { matchedCount } : {}),
  };
}

async function fetchPage(
  config: ObserverConfig & { observabilityToken: string },
  window: TelemetryWindow,
): Promise<TelemetryQueryPage> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      config.accountId,
    )}${QUERY_ENDPOINT_PATH}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.observabilityToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildTelemetryQuery(config, window)),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const rawBody = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    if (!response.ok) {
      throw new Error(
        `Observability API HTTP ${response.status}: response was not JSON`,
      );
    }
    throw new Error("Observability API returned invalid JSON");
  }
  if (!response.ok) {
    throw new Error(
      `Observability API HTTP ${response.status}: ${apiErrorMessage(body)}`,
    );
  }
  return parseTelemetryQueryPage(body, config.targetWorkerName);
}

export async function fetchTelemetryWindow(
  config: ObserverConfig & { observabilityToken: string },
  initialWindow: TelemetryWindow,
): Promise<TelemetryWindowResult> {
  const candidates: TelemetryCandidate[] = [];
  let matchedCount: number | undefined;
  let offset = initialWindow.offset;

  for (let pageIndex = 0; pageIndex < MAX_PAGES_PER_RUN; pageIndex += 1) {
    const page = await fetchPage(config, {
      from: initialWindow.from,
      to: initialWindow.to,
      ...(offset ? { offset } : {}),
    });
    candidates.push(...page.candidates);
    matchedCount = page.matchedCount ?? matchedCount;

    const lastEventId = page.eventIds.at(-1);
    const hasAnotherPage =
      page.eventIds.length >= config.queryEventLimit && Boolean(lastEventId);
    if (!hasAnotherPage) {
      return {
        candidates,
        ...(matchedCount !== undefined ? { matchedCount } : {}),
      };
    }

    if (lastEventId === offset) {
      throw new Error("Observability API pagination cursor did not advance");
    }
    offset = lastEventId;
  }

  return {
    candidates,
    ...(offset ? { nextOffset: offset } : {}),
    ...(matchedCount !== undefined ? { matchedCount } : {}),
  };
}
