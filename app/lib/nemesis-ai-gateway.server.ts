import { getEnvVar, getRuntimeEnv, type RuntimeEnv } from "~/utils/cloudflare-env.server";

const DIRECT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DIRECT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DIRECT_XAI_BASE_URL = "https://api.x.ai/v1";
const GATEWAY_HOST = "https://gateway.ai.cloudflare.com/v1";

/** Providers supported on AI Gateway OpenAI-compat `/compat/chat/completions`. */
export type NemesisCompatProvider = "google-ai-studio" | "deepseek" | "grok";

type AiGatewayBinding = {
  gateway: (id: string) => {
    getUrl: (provider?: string) => Promise<string>;
  };
};

export type NemesisGatewayRequestTarget = {
  url: string;
  headers: Record<string, string>;
  viaGateway: boolean;
};

function cleanSecret(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function mergeRuntimeEnv(env?: RuntimeEnv): RuntimeEnv {
  const runtime = getRuntimeEnv();
  if (!env) {
    return runtime;
  }

  return {
    ...runtime,
    ...env,
    AI: env.AI ?? runtime.AI,
  };
}

function getGatewayId() {
  return getEnvVar("NEMESIS_AI_GATEWAY_ID")?.trim() || null;
}

function getGatewayAuthToken() {
  const value =
    getEnvVar("CF_AIG_TOKEN") ||
    getEnvVar("NEMESIS_AI_GATEWAY_TOKEN") ||
    getEnvVar("CLOUDFLARE_API_TOKEN");
  return value ? cleanSecret(value) : null;
}

function getGoogleApiKey() {
  const value = getEnvVar("GOOGLE_AI_API_KEY") || getEnvVar("GEMINI_API_KEY");
  return value ? cleanSecret(value) : null;
}

function getDeepSeekApiKey() {
  const value = getEnvVar("DEEPSEEK_API_KEY");
  return value ? cleanSecret(value) : null;
}

function getXaiApiKey() {
  const value = getEnvVar("XAI_API_KEY");
  return value ? cleanSecret(value) : null;
}

/**
 * BYOK keys use alias `default` unless the dashboard entry used another name.
 * @see https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/
 */
function getProviderByokAlias(provider: NemesisCompatProvider): string | null {
  const envName =
    provider === "google-ai-studio"
      ? "NEMESIS_AIG_BYOK_ALIAS_GOOGLE"
      : provider === "deepseek"
        ? "NEMESIS_AIG_BYOK_ALIAS_DEEPSEEK"
        : "NEMESIS_AIG_BYOK_ALIAS_GROK";

  const fromEnv = getEnvVar(envName)?.trim();
  if (fromEnv) {
    return fromEnv === "default" ? null : fromEnv;
  }

  if (provider === "deepseek") {
    return "deepseek";
  }

  return null;
}

export function redactGatewayUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}

/** `{provider}/{model}` per AI Gateway compat docs. */
export function toCompatModelId(provider: NemesisCompatProvider, model: string) {
  return `${provider}/${model}`;
}

async function resolveGatewayRootUrl(env: RuntimeEnv | undefined, gatewayId: string) {
  const runtimeEnv = mergeRuntimeEnv(env);
  const ai = runtimeEnv.AI as AiGatewayBinding | undefined;

  if (ai && typeof ai.gateway === "function") {
    try {
      const url = await ai.gateway(gatewayId).getUrl();
      return url.replace(/\/+$/, "");
    } catch (error) {
      console.warn("[NemesisAIGateway] env.AI.gateway().getUrl() failed:", {
        gatewayId,
        error,
      });
    }
  }

  const accountId = getEnvVar("CLOUDFLARE_ACCOUNT_ID")?.trim();
  if (!accountId) {
    return null;
  }

  return `${GATEWAY_HOST}/${accountId}/${gatewayId}`;
}

function buildCompatHeaders(provider: NemesisCompatProvider) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const gatewayAuthToken = getGatewayAuthToken();

  if (gatewayAuthToken) {
    headers["cf-aig-authorization"] = `Bearer ${gatewayAuthToken}`;
    const byokAlias = getProviderByokAlias(provider);
    if (byokAlias) {
      headers["cf-aig-byok-alias"] = byokAlias;
    }
    return headers;
  }

  const apiKey =
    provider === "google-ai-studio"
      ? getGoogleApiKey()
      : provider === "deepseek"
        ? getDeepSeekApiKey()
        : getXaiApiKey();

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    return headers;
  }

  throw new Error(
    `AI Gateway is enabled but neither CF_AIG_TOKEN nor a ${provider} API key is configured.`,
  );
}

function gatewayResolutionError(gatewayId: string) {
  return new Error(
    `AI Gateway "${gatewayId}" URL could not be resolved. ` +
      "Ensure the Worker has an [ai] binding, the gateway exists in the dashboard, " +
      "or set CLOUDFLARE_ACCOUNT_ID for local dev fallback.",
  );
}

/**
 * AI Gateway OpenAI-compatible endpoint documented at:
 * https://developers.cloudflare.com/ai-gateway/usage/chat-completion/
 *
 * POST {account}/{gateway}/compat/chat/completions
 * model: "google-ai-studio/gemini-2.5-flash" | "deepseek/..." (classifiers only; Grok uses native /grok/v1/…)
 */
export async function resolveCompatChatCompletionsTarget(
  provider: NemesisCompatProvider,
  env?: RuntimeEnv,
): Promise<NemesisGatewayRequestTarget> {
  const gatewayId = getGatewayId();
  if (!gatewayId) {
    throw new Error("NEMESIS_AI_GATEWAY_ID is not configured");
  }

  const gatewayRootUrl = await resolveGatewayRootUrl(env, gatewayId);
  if (!gatewayRootUrl) {
    throw gatewayResolutionError(gatewayId);
  }

  const url = `${gatewayRootUrl}/compat/chat/completions`;
  const headers = buildCompatHeaders(provider);

  console.log("[NemesisAIGateway] Compat target:", {
    provider,
    viaGateway: true,
    url: redactGatewayUrl(url),
    hasGatewayAuth: Boolean(getGatewayAuthToken()),
    hasProviderApiKey: Boolean(
      provider === "google-ai-studio"
        ? getGoogleApiKey()
        : provider === "deepseek"
          ? getDeepSeekApiKey()
          : getXaiApiKey(),
    ),
    hasAiBinding: Boolean(mergeRuntimeEnv(env).AI),
  });

  return {
    url,
    headers,
    viaGateway: true,
  };
}

/** Classifier / JSON tasks — OpenAI-compat on Gateway. */
export async function resolveGeminiClassifierTarget(
  model: string,
  env?: RuntimeEnv,
): Promise<NemesisGatewayRequestTarget> {
  const gatewayId = getGatewayId();
  if (gatewayId) {
    return resolveCompatChatCompletionsTarget("google-ai-studio", env);
  }

  const googleApiKey = getGoogleApiKey();
  if (!googleApiKey) {
    throw new Error("Gemini API key is not configured");
  }

  return {
    url: `${DIRECT_GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(googleApiKey)}`,
    headers: { "Content-Type": "application/json" },
    viaGateway: false,
  };
}

/** @deprecated Use resolveGeminiClassifierTarget or resolveGeminiMainGenerationTarget */
export async function resolveGeminiGenerateContentTarget(
  model: string,
  env?: RuntimeEnv,
): Promise<NemesisGatewayRequestTarget> {
  return resolveGeminiClassifierTarget(model, env);
}

/**
 * Main Nemesis reply — native generateContent so Gemini 3 thinkingConfig works.
 * POST {gateway}/google-ai-studio/v1beta/models/{model}:generateContent
 */
export async function resolveGeminiMainGenerationTarget(
  model: string,
  env?: RuntimeEnv,
): Promise<NemesisGatewayRequestTarget> {
  const gatewayId = getGatewayId();
  const googleApiKey = getGoogleApiKey();
  const apiVersion = /gemini-3/i.test(model) ? "v1beta" : "v1";

  if (gatewayId) {
    const gatewayRootUrl = await resolveGatewayRootUrl(env, gatewayId);
    if (!gatewayRootUrl) {
      throw gatewayResolutionError(gatewayId);
    }

    const url = `${gatewayRootUrl}/google-ai-studio/${apiVersion}/models/${encodeURIComponent(model)}:generateContent`;
    const headers = buildCompatHeaders("google-ai-studio");

    console.log("[NemesisAIGateway] Gemini main generate target:", {
      model,
      apiVersion,
      viaGateway: true,
      url: redactGatewayUrl(url),
      hasGatewayAuth: Boolean(getGatewayAuthToken()),
    });

    return { url, headers, viaGateway: true };
  }

  if (!googleApiKey) {
    throw new Error("Gemini API key is not configured");
  }

  return {
    url: `${DIRECT_GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(googleApiKey)}`,
    headers: { "Content-Type": "application/json" },
    viaGateway: false,
  };
}

/**
 * xAI chat completions.
 * 配了 NEMESIS_AI_GATEWAY_ID 时走 Gateway 原生 grok 端点（cf-aig-authorization + BYOK）；
 * 没配时直连 api.x.ai，用 XAI_API_KEY。
 * @see https://developers.cloudflare.com/ai-gateway/usage/providers/grok/
 */
export async function resolveXaiChatCompletionsTarget(
  env?: RuntimeEnv,
): Promise<NemesisGatewayRequestTarget> {
  const gatewayId = getGatewayId();
  if (!gatewayId) {
    const apiKey = getXaiApiKey();
    if (!apiKey) {
      throw new Error("XAI_API_KEY is not configured");
    }

    return {
      url: `${DIRECT_XAI_BASE_URL}/chat/completions`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      viaGateway: false,
    };
  }

  if (!getGatewayAuthToken()) {
    throw new Error("CF_AIG_TOKEN is required for Grok via AI Gateway (BYOK provider keys)");
  }

  const gatewayRootUrl = await resolveGatewayRootUrl(env, gatewayId);
  if (!gatewayRootUrl) {
    throw gatewayResolutionError(gatewayId);
  }

  const url = `${gatewayRootUrl}/grok/chat/completions`;
  const headers = buildCompatHeaders("grok");

  console.log("[NemesisAIGateway] xAI native target:", {
    viaGateway: true,
    url: redactGatewayUrl(url),
    hasGatewayAuth: true,
    hasAiBinding: Boolean(mergeRuntimeEnv(env).AI),
  });

  return { url, headers, viaGateway: true };
}

/**
 * DeepSeek native provider endpoint.
 * @see https://developers.cloudflare.com/ai-gateway/usage/providers/deepseek/
 */
export async function resolveDeepseekChatCompletionsTarget(
  env?: RuntimeEnv,
): Promise<NemesisGatewayRequestTarget> {
  const gatewayId = getGatewayId();
  if (!gatewayId) {
    throw new Error("NEMESIS_AI_GATEWAY_ID is not configured");
  }

  const gatewayRootUrl = await resolveGatewayRootUrl(env, gatewayId);
  if (!gatewayRootUrl) {
    throw gatewayResolutionError(gatewayId);
  }

  const url = `${gatewayRootUrl}/deepseek/chat/completions`;
  const headers = buildCompatHeaders("deepseek");

  console.log("[NemesisAIGateway] DeepSeek native target:", {
    viaGateway: true,
    url: redactGatewayUrl(url),
    hasGatewayAuth: Boolean(getGatewayAuthToken()),
    hasAiBinding: Boolean(mergeRuntimeEnv(env).AI),
  });

  return { url, headers, viaGateway: true };
}

export async function resolveOpenAiCompatTarget(
  provider: NemesisCompatProvider,
  env?: RuntimeEnv,
): Promise<NemesisGatewayRequestTarget> {
  if (provider === "grok") {
    return resolveXaiChatCompletionsTarget(env);
  }

  const gatewayId = getGatewayId();
  if (gatewayId) {
    if (provider === "deepseek") {
      return resolveDeepseekChatCompletionsTarget(env);
    }

    return resolveCompatChatCompletionsTarget(provider, env);
  }

  if (provider === "deepseek") {
    const apiKey = getDeepSeekApiKey();
    if (!apiKey) {
      throw new Error("DeepSeek API key is not configured");
    }

    return {
      url: `${DIRECT_DEEPSEEK_BASE_URL}/chat/completions`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      viaGateway: false,
    };
  }

  throw new Error(`Unsupported direct provider: ${provider}`);
}

export function buildGatewayHeaders(provider: NemesisCompatProvider) {
  return buildCompatHeaders(provider);
}
