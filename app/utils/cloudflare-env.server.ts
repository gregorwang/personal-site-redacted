export interface RuntimeEnv {
  DB?: D1Database;
  RATE_LIMITER?: DurableObjectNamespace;
  MEDIA_BUCKET?: R2Bucket;
  AI?: Ai;
  AUTH_KEY_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  IMAGE_BASE_URL?: string;
  MEDIA_BASE_URL?: string;
  APP_URL?: string;
  BETTER_AUTH_URL?: string;
  LOCAL_APP_URL?: string;
  APP_NAME?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  ADMIN_EMAILS?: string;
  ADMIN_MESSAGES_URL?: string;
  MESSAGE_MODERATION_ALLOWED_IPS?: string;
  MESSAGE_NOTIFICATION_WEBHOOK_URL?: string;
  MESSAGE_NOTIFICATION_WEBHOOK_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_AI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  XAI_API_KEY?: string;
  NEMESIS_GEMINI_MODEL?: string;
  NEMESIS_GEMINI_LITE_MODEL?: string;
  NEMESIS_GEMINI_FLASH_MODEL?: string;
  NEMESIS_GEMINI_THINKING_LEVEL?: string;
  NEMESIS_DEEPSEEK_MODEL?: string;
  NEMESIS_GROK_MODEL?: string;
  NEMESIS_MODEL_ROUTE?: string;
  NEMESIS_CLASSIFIER_GEMINI_MODEL?: string;
  NEMESIS_AI_GATEWAY_ID?: string;
  CF_AIG_TOKEN?: string;
  NEMESIS_AI_GATEWAY_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  NEMESIS_MAX_PER_MINUTE?: string;
  NEMESIS_MAX_PER_DAY?: string;
  NEMESIS_MAX_MESSAGE_LENGTH?: string;
  MICROSOFT_AUTH_BASE_URL?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  MICROSOFT_REDIRECT_URI?: string;
  NODE_ENV?: string;
  [key: string]: unknown;
}

type RuntimeGlobal = typeof globalThis & {
  __REMIX_RUNTIME_ENV__?: RuntimeEnv;
};

let runtimeEnv: RuntimeEnv = {};

export function setRuntimeEnv(env: RuntimeEnv) {
  runtimeEnv = env;
  (globalThis as RuntimeGlobal).__REMIX_RUNTIME_ENV__ = env;
}

export function getRuntimeEnv(): RuntimeEnv {
  const globalEnv = (globalThis as RuntimeGlobal).__REMIX_RUNTIME_ENV__;
  if (globalEnv && Object.keys(globalEnv).length > 0) {
    return globalEnv;
  }

  if (Object.keys(runtimeEnv).length > 0) {
    return runtimeEnv;
  }

  if (typeof process !== "undefined" && process.env) {
    return process.env as unknown as RuntimeEnv;
  }

  return {};
}

export function getEnvVar(name: keyof RuntimeEnv | string): string | undefined {
  const value = getRuntimeEnv()[name];
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

export function getRequiredEnv(name: keyof RuntimeEnv | string): string {
  const value = getEnvVar(name);
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

export function getDatabaseBinding(): D1Database {
  const db = getRuntimeEnv().DB;
  if (!db) {
    throw new Error("Cloudflare D1 binding 'DB' is required");
  }
  return db;
}

export function getRateLimiterBinding(): DurableObjectNamespace {
  const binding = getRuntimeEnv().RATE_LIMITER;
  if (!binding) {
    throw new Error("Cloudflare Durable Object binding 'RATE_LIMITER' is required");
  }
  return binding;
}
