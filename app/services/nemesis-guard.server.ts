import { NEMESIS_CLASSIFIER_PROMPT } from "~/nemesis/classifier-prompt.server";
import { NEMESIS_FIXED_REPLIES } from "~/nemesis/guard-replies";
import {
  isNemesisResponsePolicy,
  type NemesisModelPolicy,
  type NemesisResponsePolicy,
} from "~/nemesis/response-policies.server";
import { callGeminiClassifier, NemesisClassifierBlockedError } from "~/lib/nemesis-gemini-classifier.server";
import { verifyNemesisContextText } from "~/services/nemesis-context-signature.server";
import {
  DEFAULT_NEMESIS_ROUTE_DECISION,
  normalizeNemesisRouteDecision,
  type NemesisQueryRouteDecision,
} from "~/services/nemesis-query-router.server";
import { getEnvVar, type RuntimeEnv } from "~/utils/cloudflare-env.server";

export const DEFAULT_MAX_MESSAGE_LENGTH = 1000;
export const MAX_RECENT_MESSAGES = 10;
const RULE_VERSION = "nemesis-guard-v0.4";
const CLASSIFIER_VERSION = "nemesis-classifier-gemini-v3";

/** 分类器挂掉时的降级策略：照常调用主模型，靠 system prompt 和 Safety Net 兜底，而不是回模板。 */
const DEGRADED_POLICY: NemesisModelPolicy = "persona";
/**
 * 策略的严格程度，用来比较分类器给的主策略和备选策略。
 * 分类器自报的 confidence 几乎都 ≥ 0.95、没有区分度，所以「拿不准」改看它有没有给备选策略。
 */
const POLICY_STRICTNESS: Record<NemesisResponsePolicy, number> = {
  persona: 0,
  general: 0,
  careful: 1,
  boundary: 1,
  crisis: 1,
  deflect: 1,
  block: 2,
};
const AUDITED_POLICIES = new Set<NemesisResponsePolicy>(["block", "deflect", "boundary"]);

export type NemesisRole = "user" | "model";

export type NemesisRecentMessage = {
  role: NemesisRole;
  text: string;
};

/**
 * 写入审计表 mode 列的粗粒度结果（表上有 CHECK 约束，外部后台也按它读）。
 * CLARIFY 只出现在旧审计行里，guard 不再产出。
 */
export type NemesisMode = "PASS_TO_GEMINI" | "CLARIFY" | "SAFE_BOUNDARY" | "REFUSE";
export type NemesisDecisionStage = "RULE_GUARD" | "WORKERS_AI" | "ROUTER" | "GEMINI";
export type NemesisGuardStage = NemesisDecisionStage;
export type NemesisCategory =
  | "PROMPT_EXTRACTION"
  | "JAILBREAK"
  | "PRIVACY_PROBE"
  | "OWNER_BOUNDARY"
  | "PUBLIC_AFFAIRS_INFERENCE"
  | "NORMAL"
  | "OFF_TOPIC"
  | "SENSITIVE_ADVICE"
  | "SELF_HARM"
  | "HARMFUL_REQUEST"
  | "HATE_DISCRIMINATION"
  | "SEXUAL_CONTENT"
  | "MISINFORMATION"
  | "GAMBLING"
  | "UNKNOWN"
  | "TOO_LONG";

export type SuggestedChange =
  | "NO_CHANGE"
  | "RULE_TOO_STRICT"
  | "CHANGE_TO_CLARIFY"
  | "CHANGE_TO_SAFE_BOUNDARY"
  | "KEEP_REFUSE"
  | "CHECK_CLASSIFIER_PROMPT"
  | "CHECK_GEMINI_PROMPT";

/** block 一定带固定回复、不调用主模型；其余策略一定调用主模型。用 policy 做判别，调用方无需再判空。 */
type GuardDecisionOutcome =
  | { policy: "block"; fixedReply: string }
  | { policy: NemesisModelPolicy; fixedReply?: undefined };

type GuardDecisionDetails = {
  category: NemesisCategory;
  stage: NemesisDecisionStage;
  route: NemesisQueryRouteDecision;
  /** 分类器失败或输出不可用，按 DEGRADED_POLICY 处理。 */
  degraded: boolean;
  ruleId?: string;
  ruleName?: string;
  ruleStrength?: "strong" | "medium" | "weak";
  classifierLabel?: string;
  classifierConfidence?: number;
  classifierReason?: string;
  /** 分类器认为也说得通的第二选择；没有就是它很确定。 */
  classifierAlternative?: NemesisResponsePolicy;
  reason: string;
  shouldAudit: boolean;
  suspectedOverStrict: boolean;
  /** 备选策略比实际策略更严：可能放过了该收紧的内容，进审计供巡检。 */
  suspectedUnderStrict?: boolean;
  suggestedChange: SuggestedChange;
};

export type GuardDecision = GuardDecisionDetails &
  GuardDecisionOutcome & {
    mode: NemesisMode;
    calledGemini: boolean;
    ruleVersion: string;
    classifierVersion?: string;
  };

export type NemesisClassification = {
  policy: NemesisResponsePolicy;
  category: NemesisCategory;
  confidence: number;
  alternativePolicy: NemesisResponsePolicy | null;
  reason: string;
  shouldAudit: boolean;
  route: NemesisQueryRouteDecision;
};

export type NemesisRequestValidationResult =
  | { ok: true; message: string; recentMessages: NemesisRecentMessage[] }
  | { ok: false; status: number; payload: { error?: string; text?: string } };

const VALID_CATEGORIES = new Set<NemesisCategory>([
  "PROMPT_EXTRACTION",
  "JAILBREAK",
  "PRIVACY_PROBE",
  "OWNER_BOUNDARY",
  "PUBLIC_AFFAIRS_INFERENCE",
  "NORMAL",
  "OFF_TOPIC",
  "SENSITIVE_ADVICE",
  "SELF_HARM",
  "HARMFUL_REQUEST",
  "HATE_DISCRIMINATION",
  "SEXUAL_CONTENT",
  "MISINFORMATION",
  "GAMBLING",
  "UNKNOWN",
]);

function getMaxMessageLength() {
  const value = Number(getEnvVar("NEMESIS_MAX_MESSAGE_LENGTH"));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_MESSAGE_LENGTH;
}

function normalizeInput(message: string) {
  return message.trim().replace(/\s+/g, " ");
}

export function policyToAuditMode(policy: NemesisResponsePolicy): NemesisMode {
  if (policy === "block") {
    return "REFUSE";
  }

  return policy === "persona" || policy === "general" ? "PASS_TO_GEMINI" : "SAFE_BOUNDARY";
}

function buildDecision(input: GuardDecisionDetails & GuardDecisionOutcome): GuardDecision {
  return {
    ...input,
    mode: policyToAuditMode(input.policy),
    calledGemini: input.policy !== "block",
    ruleVersion: RULE_VERSION,
    classifierVersion: input.stage === "GEMINI" ? CLASSIFIER_VERSION : undefined,
  };
}

function normalizeCategory(value: unknown): NemesisCategory {
  return typeof value === "string" && VALID_CATEGORIES.has(value as NemesisCategory) ? (value as NemesisCategory) : "UNKNOWN";
}

/** 模型偶尔会在 JSON 前后加说明或 ``` 围栏；只取最外层的对象。 */
function extractJsonObject(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : null;
}

/**
 * 模型输出不可信：解析失败、不是对象、policy 不在受控集合里，都返回 null，由调用方按降级处理。
 * 不能把 JSON.parse 的结果直接 as 成 NemesisClassification。
 */
export function parseNemesisClassifierJson(raw: string): NemesisClassification | null {
  const json = extractJsonObject(raw);
  if (!json) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  if (!isNemesisResponsePolicy(record.policy)) {
    return null;
  }

  const confidence =
    typeof record.confidence === "number" && Number.isFinite(record.confidence)
      ? Math.min(1, Math.max(0, record.confidence))
      : 0;

  return {
    policy: record.policy,
    category: normalizeCategory(record.category),
    confidence,
    alternativePolicy:
      isNemesisResponsePolicy(record.alternativePolicy) && record.alternativePolicy !== record.policy
        ? record.alternativePolicy
        : null,
    reason: typeof record.reason === "string" ? record.reason.slice(0, 300) : "No reason",
    shouldAudit: record.shouldAudit === true,
    route: normalizeNemesisRouteDecision(record),
  };
}

function buildClassifierInput(message: string, recentMessages: NemesisRecentMessage[] = []) {
  const context = recentMessages
    .slice(-6)
    .map((item) => `${item.role === "user" ? "User" : "Nemesis"}: ${item.text}`)
    .join("\n");

  return [
    "Classify the latest user message. Use recent conversation only as context.",
    context ? `[Recent conversation]\n${context}` : "",
    `[Latest user message]\n${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** 返回 null 表示分类器不可用（网络、超时、坏 JSON），调用方降级处理。 */
export async function classifyNemesisMessage(
  env: RuntimeEnv,
  message: string,
  recentMessages: NemesisRecentMessage[] = [],
  signal?: AbortSignal,
): Promise<NemesisClassification | null> {
  let raw: string;
  try {
    raw = await callGeminiClassifier({
      env,
      signal,
      systemPrompt: NEMESIS_CLASSIFIER_PROMPT,
      userContent: buildClassifierInput(message, recentMessages),
    });
  } catch (error) {
    // 连分类都被 Gemini 的不可关闭安全档拒绝的输入，主模型同样会拒绝；直接按硬红线处理，
    // 不能当成故障降级去调用主模型（那只会一路 fallback 到别的 provider）。
    if (error instanceof NemesisClassifierBlockedError) {
      return {
        policy: "block",
        category: "HARMFUL_REQUEST",
        confidence: 1,
        alternativePolicy: null,
        reason: `Provider safety block: ${error.blockReason}`,
        shouldAudit: true,
        route: DEFAULT_NEMESIS_ROUTE_DECISION,
      };
    }

    if (!signal?.aborted) {
      console.error("[NemesisGuard] Gemini classifier failed:", error);
    }
    return null;
  }

  const parsed = parseNemesisClassifierJson(raw);
  if (!parsed) {
    console.error("[NemesisGuard] Classifier returned unusable JSON:", {
      length: raw.length,
      preview: raw.slice(0, 200),
    });
  }

  return parsed;
}

function describeDecisionReason(input: {
  classified: NemesisClassification;
  policy: NemesisResponsePolicy;
  ambiguousBlock: boolean;
  suspectedUnderStrict: boolean;
}) {
  const { classified, policy } = input;
  if (input.ambiguousBlock) {
    return `分类器在 block 和 ${classified.alternativePolicy} 之间拿不准，不硬停，按 ${policy} 交给主模型`;
  }
  if (input.suspectedUnderStrict) {
    return `疑似漏拦：备选策略是更严的 ${classified.alternativePolicy}。${classified.reason}`;
  }
  return classified.reason;
}

function decideFromClassification(classified: NemesisClassification): GuardDecision {
  const alternative = classified.alternativePolicy;
  // 连分类器自己都给出了别的选择，说明不是确定的硬红线：不回模板，交给主模型按 careful（或危机）处理。
  const ambiguousBlock = classified.policy === "block" && alternative !== null;
  const policy: NemesisResponsePolicy = ambiguousBlock ? (alternative === "crisis" ? "crisis" : "careful") : classified.policy;
  const outcome: GuardDecisionOutcome =
    policy === "block" ? { policy, fixedReply: NEMESIS_FIXED_REPLIES.block } : { policy };
  const suspectedOverStrict =
    ambiguousBlock || (alternative !== null && POLICY_STRICTNESS[alternative] < POLICY_STRICTNESS[policy]);
  const suspectedUnderStrict = alternative !== null && POLICY_STRICTNESS[alternative] > POLICY_STRICTNESS[policy];

  return buildDecision({
    ...outcome,
    category: classified.category,
    stage: "GEMINI",
    route: classified.route,
    degraded: false,
    classifierLabel: classified.policy,
    classifierConfidence: classified.confidence,
    classifierReason: classified.reason,
    classifierAlternative: alternative ?? undefined,
    reason: describeDecisionReason({ classified, policy, ambiguousBlock, suspectedUnderStrict }),
    shouldAudit: classified.shouldAudit || ambiguousBlock || suspectedUnderStrict || AUDITED_POLICIES.has(policy),
    suspectedOverStrict,
    suspectedUnderStrict,
    suggestedChange: ambiguousBlock || suspectedUnderStrict
      ? "CHECK_CLASSIFIER_PROMPT"
      : policy === "block"
        ? "KEEP_REFUSE"
        : "NO_CHANGE",
  });
}

function degradedDecision(): GuardDecision {
  return buildDecision({
    policy: DEGRADED_POLICY,
    category: "UNKNOWN",
    stage: "GEMINI",
    route: DEFAULT_NEMESIS_ROUTE_DECISION,
    degraded: true,
    reason: "分类器不可用，按默认策略降级调用主模型",
    shouldAudit: true,
    suspectedOverStrict: false,
    suggestedChange: "CHECK_CLASSIFIER_PROMPT",
  });
}

export async function guardNemesisMessage(
  env: RuntimeEnv,
  message: string,
  recentMessages: NemesisRecentMessage[] = [],
  signal?: AbortSignal,
): Promise<GuardDecision> {
  const normalizedMessage = normalizeInput(message);

  if (!normalizedMessage) {
    return buildDecision({
      policy: "block",
      category: "UNKNOWN",
      stage: "RULE_GUARD",
      route: DEFAULT_NEMESIS_ROUTE_DECISION,
      fixedReply: NEMESIS_FIXED_REPLIES.empty,
      degraded: false,
      reason: "空输入",
      shouldAudit: false,
      suspectedOverStrict: false,
      suggestedChange: "NO_CHANGE",
    });
  }

  if (normalizedMessage.length > getMaxMessageLength()) {
    return buildDecision({
      policy: "block",
      category: "TOO_LONG",
      stage: "RULE_GUARD",
      route: DEFAULT_NEMESIS_ROUTE_DECISION,
      fixedReply: NEMESIS_FIXED_REPLIES.tooLong,
      degraded: false,
      ruleId: "input_length_limit",
      ruleName: "Input length limit",
      ruleStrength: "strong",
      reason: "输入超过长度限制",
      shouldAudit: true,
      suspectedOverStrict: false,
      suggestedChange: "NO_CHANGE",
    });
  }

  const classified = await classifyNemesisMessage(env, normalizedMessage, recentMessages, signal);
  return classified ? decideFromClassification(classified) : degradedDecision();
}

type UnverifiedRecentMessage = NemesisRecentMessage & { signature?: unknown };

function normalizeRecentMessages(value: unknown): UnverifiedRecentMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-MAX_RECENT_MESSAGES)
    .map((item): UnverifiedRecentMessage | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const role = record.role;
      const text = record.text;

      if ((role !== "user" && role !== "model") || typeof text !== "string") {
        return null;
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        return null;
      }

      // 先保留完整文本：签名是对完整回复做的，截断要放在验签之后。
      return { role, text: trimmedText, signature: record.signature };
    })
    .filter((item): item is UnverifiedRecentMessage => Boolean(item));
}

/** user 消息本来就是用户自己的输入，无需签名；model 消息只保留服务端签过名的。 */
async function keepTrustedRecentMessages(
  userId: string,
  messages: UnverifiedRecentMessage[],
): Promise<NemesisRecentMessage[]> {
  const verified = await Promise.all(
    messages.map(async (item) =>
      item.role === "user" || (await verifyNemesisContextText(userId, item.text, item.signature)),
    ),
  );

  const droppedModelMessages = verified.filter((ok) => !ok).length;
  if (droppedModelMessages > 0) {
    console.warn("[NemesisGuard] Dropped unsigned or forged model history:", {
      userId,
      droppedModelMessages,
    });
  }

  const maxLength = getMaxMessageLength();
  return messages
    .filter((_, index) => verified[index])
    .map((item) => ({ role: item.role, text: item.text.slice(0, maxLength) }));
}

export async function validateNemesisRequest(
  request: Request,
  options: { userId: string },
): Promise<NemesisRequestValidationResult> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      status: 400,
      payload: { error: "请求格式错误。" },
    };
  }

  if (!body || typeof body !== "object") {
    return {
      ok: false,
      status: 400,
      payload: { error: "请求格式错误。" },
    };
  }

  const record = body as Record<string, unknown>;
  const rawMessage = record.message;

  if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
    return {
      ok: false,
      status: 400,
      payload: { error: "请输入消息内容。" },
    };
  }

  const message = rawMessage.trim();
  return {
    ok: true,
    message,
    recentMessages: await keepTrustedRecentMessages(
      options.userId,
      normalizeRecentMessages(record.recentMessages),
    ),
  };
}
