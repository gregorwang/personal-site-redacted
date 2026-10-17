const MINUTE_MS = 60_000;

export interface ObserverConfig {
  accountId: string;
  targetWorkerName: string;
  targetEnvironment: string;
  deliveryEnabled: boolean;
  aiEnabled: boolean;
  aiGatewayId: string;
  lookbackMs: number;
  recoveryMs: number;
  queryEventLimit: number;
  heartbeatHourJst: number;
  observabilityToken: string | undefined;
  webhookUrl: string | undefined;
  webhookSecret: string | undefined;
}

function cleanOptional(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/^\uFEFF/, "").trim();
  return cleaned ? cleaned : undefined;
}

function parseBoolean(value: string | undefined): boolean {
  return cleanOptional(value)?.toLowerCase() === "true";
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

export function readObserverConfig(env: Env): ObserverConfig {
  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID.trim(),
    targetWorkerName: env.TARGET_WORKER_NAME.trim(),
    targetEnvironment: env.TARGET_ENVIRONMENT.trim(),
    deliveryEnabled: parseBoolean(env.DELIVERY_ENABLED),
    aiEnabled: parseBoolean(env.AI_ENABLED),
    aiGatewayId: env.AI_GATEWAY_ID.trim(),
    lookbackMs:
      parseBoundedInteger(env.LOOKBACK_MINUTES, 10, 5, 60) * MINUTE_MS,
    recoveryMs:
      parseBoundedInteger(env.RECOVERY_MINUTES, 30, 10, 180) * MINUTE_MS,
    queryEventLimit: parseBoundedInteger(
      env.QUERY_EVENT_LIMIT,
      100,
      25,
      500,
    ),
    heartbeatHourJst: parseBoundedInteger(
      env.DAILY_HEARTBEAT_HOUR_JST,
      9,
      0,
      23,
    ),
    observabilityToken: cleanOptional(env.CF_OBSERVABILITY_API_TOKEN),
    webhookUrl: cleanOptional(env.SITE_INCIDENT_WEBHOOK_URL),
    webhookSecret: cleanOptional(env.SITE_INCIDENT_WEBHOOK_SECRET),
  };
}

export function safeErrorMessage(error: unknown, maximumLength = 300): string {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "Unknown error";

  return message.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}
