import { db } from "~/lib/db.server";
import type { GuardDecision } from "~/services/nemesis-guard.server";
import type { NemesisLeakCheck } from "~/services/nemesis-leak-guard.server";
import { getEnvVar } from "~/utils/cloudflare-env.server";

const DIGEST_FALLBACK_SECRET = "dev-only-nemesis-guard-audit-secret";

export type NemesisGuardEventInput = {
  userId: string;
  userEmail?: string | null;
  message: string;
  assistantMessage?: string | null;
  recentMessages?: Array<{ role: "user" | "model"; text: string }>;
  decision: GuardDecision;
  modelResult?: {
    provider: string;
    route: string;
    model: string;
    queryType?: string;
    queryRouteConfidence?: number;
    fallbackUsed?: boolean;
    fallbackChain?: string[];
    finishReason?: string;
    incomplete?: boolean;
  };
  /** 输出侧原文泄露检查命中时才有值；此时 assistantMessage 是被拦下的原始回复。 */
  leak?: NemesisLeakCheck;
};

export type NemesisFeedbackCategory =
  | "hallucination"
  | "contradiction"
  | "persona_mismatch"
  | "low_quality"
  | "unsafe"
  | "other";

export type NemesisFeedbackEventInput = {
  userId: string;
  userEmail?: string | null;
  message: string;
  assistantMessage: string;
  recentMessages?: Array<{ role: "user" | "model"; text: string }>;
  conversationId?: string | null;
  userMessageId?: string | null;
  assistantMessageId?: string | null;
  feedbackCategory: NemesisFeedbackCategory;
  feedbackNote?: string | null;
  modelResult?: {
    provider?: string | null;
    route?: string | null;
    model?: string | null;
    fallbackUsed?: boolean | null;
    finishReason?: string | null;
    incomplete?: boolean | null;
  };
};

function getDigestSecret() {
  return (getEnvVar("BETTER_AUTH_SECRET") || getEnvVar("AUTH_KEY_SECRET") || DIGEST_FALLBACK_SECRET)
    .replace(/^\uFEFF/, "")
    .trim();
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function createMessageDigest(message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getDigestSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  return toHex(signature);
}

function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) {
    return null;
  }

  const [name, domain] = email.split("@");
  const visibleName = name.slice(0, 2);
  const domainParts = domain.split(".");
  const visibleDomain = domainParts[0]?.slice(0, 1) || "";
  const suffix = domainParts.length > 1 ? `.${domainParts.slice(1).join(".")}` : "";

  return `${visibleName}***@${visibleDomain}***${suffix}`;
}

function legacyLabel(decision: GuardDecision) {
  if (decision.ruleId === "input_length_limit") {
    return "TOO_LONG";
  }

  return decision.category;
}

function serializeRecentMessages(messages?: Array<{ role: "user" | "model"; text: string }>) {
  if (!messages?.length) {
    return null;
  }

  return JSON.stringify(
    messages.slice(-10).map((item) => ({
      role: item.role,
      text: item.text.slice(0, 1000),
    }))
  );
}

export async function recordNemesisGuardEvent(input: NemesisGuardEventInput) {
  const message = input.message.trim();
  const messageDigest = await createMessageDigest(message);
  const decision = input.decision;
  const confidence =
    typeof decision.classifierConfidence === "number" && Number.isFinite(decision.classifierConfidence)
      ? decision.classifierConfidence
      : null;
  // policy / degraded / leak 只进 metadata：mode 列有 CHECK 约束，外部后台也按旧取值读它。
  const metadata = JSON.stringify({
    policy: decision.policy,
    degraded: decision.degraded,
    leak: input.leak,
    ruleName: decision.ruleName,
    classifierLabel: decision.classifierLabel,
    classifierReason: decision.classifierReason,
    classifierAlternative: decision.classifierAlternative,
    suspectedUnderStrict: decision.suspectedUnderStrict,
    reason: decision.reason,
    ruleVersion: decision.ruleVersion,
    classifierVersion: decision.classifierVersion,
    modelRoute: input.modelResult?.route,
    modelProvider: input.modelResult?.provider,
    modelName: input.modelResult?.model,
    queryType: input.modelResult?.queryType,
    queryRouteConfidence: input.modelResult?.queryRouteConfidence,
    fallbackUsed: input.modelResult?.fallbackUsed,
    fallbackChain: input.modelResult?.fallbackChain,
    finishReason: input.modelResult?.finishReason,
    incomplete: input.modelResult?.incomplete,
    assistantMessage: input.assistantMessage,
  });

  await db
    .prepare(
      `
        INSERT INTO nemesis_guard_events (
          user_id,
          user_email_masked,
          message,
          message_digest,
          input_length,
          stage,
          label,
          mode,
          category,
          rule_id,
          rule_strength,
          classifier_confidence,
          confidence,
          called_gemini,
          suspected_over_strict,
          reason,
          suggested_change,
          model_provider,
          model_route,
          model_name,
          query_type,
          query_router_confidence,
          fallback_used,
          fallback_chain,
          event_source,
          assistant_message,
          recent_messages,
          metadata,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `
    )
    .run(
      input.userId,
      maskEmail(input.userEmail),
      message,
      messageDigest,
      message.length,
      decision.stage,
      legacyLabel(decision),
      decision.mode,
      decision.category,
      decision.ruleId ?? null,
      decision.ruleStrength ?? null,
      confidence,
      confidence,
      input.modelResult ? true : decision.calledGemini,
      decision.suspectedOverStrict,
      decision.reason,
      decision.suggestedChange,
      input.modelResult?.provider ?? null,
      input.modelResult?.route ?? null,
      input.modelResult?.model ?? null,
      input.modelResult?.queryType ?? null,
      input.modelResult?.queryRouteConfidence ?? null,
      typeof input.modelResult?.fallbackUsed === "boolean" ? (input.modelResult.fallbackUsed ? 1 : 0) : null,
      input.modelResult?.fallbackChain ? JSON.stringify(input.modelResult.fallbackChain) : null,
      "guard",
      input.assistantMessage ?? null,
      serializeRecentMessages(input.recentMessages),
      metadata
    );
}

export async function recordNemesisFeedbackEvent(input: NemesisFeedbackEventInput) {
  const message = input.message.trim();
  const assistantMessage = input.assistantMessage.trim();
  const messageDigest = await createMessageDigest(`${message}\n\n${assistantMessage}`);
  const metadata = JSON.stringify({
    feedbackCategory: input.feedbackCategory,
    feedbackNote: input.feedbackNote,
    modelRoute: input.modelResult?.route,
    modelProvider: input.modelResult?.provider,
    modelName: input.modelResult?.model,
    fallbackUsed: input.modelResult?.fallbackUsed,
    finishReason: input.modelResult?.finishReason,
    incomplete: input.modelResult?.incomplete,
  });

  await db
    .prepare(
      `
        INSERT INTO nemesis_guard_events (
          user_id,
          user_email_masked,
          message,
          message_digest,
          input_length,
          stage,
          label,
          mode,
          category,
          called_gemini,
          suspected_over_strict,
          reason,
          suggested_change,
          model_provider,
          model_route,
          model_name,
          fallback_used,
          event_source,
          assistant_message,
          recent_messages,
          conversation_id,
          user_message_id,
          assistant_message_id,
          feedback_category,
          feedback_note,
          feedback_status,
          metadata,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `
    )
    .run(
      input.userId,
      maskEmail(input.userEmail),
      message,
      messageDigest,
      message.length,
      "GEMINI",
      "USER_FEEDBACK",
      "PASS_TO_GEMINI",
      "NORMAL",
      1,
      0,
      "用户主动反馈 Nemesis 回复质量",
      "CHECK_GEMINI_PROMPT",
      input.modelResult?.provider ?? null,
      input.modelResult?.route ?? null,
      input.modelResult?.model ?? null,
      typeof input.modelResult?.fallbackUsed === "boolean" ? (input.modelResult.fallbackUsed ? 1 : 0) : null,
      "feedback",
      assistantMessage,
      serializeRecentMessages(input.recentMessages),
      input.conversationId ?? null,
      input.userMessageId ?? null,
      input.assistantMessageId ?? null,
      input.feedbackCategory,
      input.feedbackNote?.trim() || null,
      "open",
      metadata
    );
}
