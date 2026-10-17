import {
  resolveGeminiClassifierTarget,
  toCompatModelId,
} from "~/lib/nemesis-ai-gateway.server";
import { withTimeoutSignal } from "~/lib/abort-signal.server";
import { getEnvVar, type RuntimeEnv } from "~/utils/cloudflare-env.server";

const DEFAULT_CLASSIFIER_GEMINI_MODEL = "gemini-3.5-flash-lite";
/** 分类器挂起会卡住整条 SSE 链路；上游异常时让调用方走降级策略 / 默认路由。 */
const CLASSIFIER_FETCH_TIMEOUT_MS = 25_000;
/** Gemini 拒绝处理这段输入本身的原因（PROHIBITED_CONTENT 是不可关闭的那一档，如涉及未成年人的性内容）。 */
const PROVIDER_BLOCK_REASONS = new Set(["PROHIBITED_CONTENT", "BLOCKLIST", "SAFETY", "content_filter"]);

/** 提供方的安全系统拒绝了这段输入——不是网络故障，调用方不该把它当成「分类器不可用」。 */
export class NemesisClassifierBlockedError extends Error {
  constructor(readonly blockReason: string) {
    super(`Gemini refused the classifier input: ${blockReason}`);
    this.name = "NemesisClassifierBlockedError";
  }
}

type GeminiClassifierResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string; thought?: boolean }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
    status?: string;
  };
};

type CompatClassifierResponse = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getClassifierGeminiModel() {
  return (
    getEnvVar("NEMESIS_CLASSIFIER_GEMINI_MODEL")?.trim() ||
    getEnvVar("NEMESIS_GEMINI_LITE_MODEL")?.trim() ||
    getEnvVar("NEMESIS_GEMINI_MODEL")?.trim() ||
    DEFAULT_CLASSIFIER_GEMINI_MODEL
  );
}

function extractGeminiText(data: GeminiClassifierResponse) {
  return data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string" && part.text.trim())
    .map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractCompatText(data: CompatClassifierResponse) {
  return data.choices
    ?.map((choice) => choice.message?.content)
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function callGeminiJsonClassifier(input: {
  env?: RuntimeEnv;
  systemPrompt: string;
  userContent: string;
  maxTokens?: number;
  logTag?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const model = getClassifierGeminiModel();
  const maxTokens = input.maxTokens ?? 256;
  const logTag = input.logTag ?? "NemesisGeminiJson";
  const { url, headers, viaGateway } = await resolveGeminiClassifierTarget(model, input.env);

  const requestBody = viaGateway
    ? {
        model: toCompatModelId("google-ai-studio", model),
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userContent },
        ],
        max_tokens: maxTokens,
        temperature: 0,
        response_format: { type: "json_object" },
        stream: false,
      }
    : {
        systemInstruction: {
          parts: [{ text: input.systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.userContent }],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0,
          responseMimeType: "application/json",
        },
      };

  const response = await fetch(url, {
    method: "POST",
    headers: viaGateway
      ? {
          ...headers,
          // Classifiers gate routing — never reuse a cached JSON verdict after prompt/policy changes.
          "cf-aig-skip-cache": "true",
        }
      : headers,
    body: JSON.stringify(requestBody),
    signal: withTimeoutSignal(CLASSIFIER_FETCH_TIMEOUT_MS, input.signal),
  });

  if (viaGateway) {
    let data: CompatClassifierResponse | null = null;
    try {
      data = (await response.json()) as CompatClassifierResponse;
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error(`[${logTag}] Gemini JSON request failed:`, {
        model,
        status: response.status,
        viaGateway,
        providerMessage: data?.error?.message,
      });
      throw new Error(data?.error?.message || "Gemini classifier request failed");
    }

    const text = data ? extractCompatText(data) : "";
    if (!text) {
      const finishReason = data?.choices?.[0]?.finish_reason;
      if (finishReason && PROVIDER_BLOCK_REASONS.has(finishReason)) {
        throw new NemesisClassifierBlockedError(finishReason);
      }
      throw new Error("Gemini classifier returned empty response");
    }

    return text;
  }

  let data: GeminiClassifierResponse | null = null;
  try {
    data = (await response.json()) as GeminiClassifierResponse;
  } catch {
    data = null;
  }

  if (!response.ok) {
    console.error(`[${logTag}] Gemini JSON request failed:`, {
      model,
      status: response.status,
      viaGateway,
      providerMessage: data?.error?.message,
    });
    throw new Error(data?.error?.message || "Gemini classifier request failed");
  }

  const text = data ? extractGeminiText(data) : "";
  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason ?? data?.candidates?.[0]?.finishReason;
    if (blockReason && PROVIDER_BLOCK_REASONS.has(blockReason)) {
      throw new NemesisClassifierBlockedError(blockReason);
    }
    throw new Error("Gemini classifier returned empty response");
  }

  return text;
}

/**
 * 统一分类器（策略 + 路由）。Gemini 3 的隐藏思考和可见输出共用 maxOutputTokens，
 * 256 时曾出现 JSON 被截断成 "Invalid classifier JSON"；给足余量，实际输出只有一百多 token。
 */
export async function callGeminiClassifier(input: {
  env?: RuntimeEnv;
  systemPrompt: string;
  userContent: string;
  signal?: AbortSignal;
}): Promise<string> {
  return callGeminiJsonClassifier({
    ...input,
    maxTokens: 1024,
    logTag: "NemesisGuard",
  });
}
