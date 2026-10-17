import type { ActionFunctionArgs } from "react-router";
import { JSON_NO_STORE_HEADERS, NO_STORE_HEADERS } from "~/lib/cache-headers.server";
import { checkRateLimit } from "~/lib/rate-limit.server";
import {
  recordNemesisFeedbackEvent,
  type NemesisFeedbackCategory,
} from "~/services/nemesis-guard-events.server";
import { requireNemesisUser } from "~/services/nemesis-auth.server";

const MAX_TEXT_LENGTH = 4000;
const MAX_NOTE_LENGTH = 1000;
const FEEDBACK_CATEGORIES = new Set<NemesisFeedbackCategory>([
  "hallucination",
  "contradiction",
  "persona_mismatch",
  "low_quality",
  "unsafe",
  "other",
]);

type FeedbackRecentMessage = {
  role: "user" | "model";
  text: string;
};

function asTrimmedString(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalString(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  const text = asTrimmedString(value, maxLength);
  return text || null;
}

function normalizeCategory(value: unknown): NemesisFeedbackCategory {
  return typeof value === "string" && FEEDBACK_CATEGORIES.has(value as NemesisFeedbackCategory)
    ? (value as NemesisFeedbackCategory)
    : "other";
}

function normalizeRecentMessages(value: unknown): FeedbackRecentMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-10)
    .map((item): FeedbackRecentMessage | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const role = record.role;
      const text = asTrimmedString(record.text, 1000);
      if ((role !== "user" && role !== "model") || !text) {
        return null;
      }

      return { role, text };
    })
    .filter((item): item is FeedbackRecentMessage => Boolean(item));
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: NO_STORE_HEADERS });
  }

  let user;
  try {
    user = await requireNemesisUser(request);
  } catch (error) {
    if (error instanceof Response) {
      return Response.json({ error: "请先登录后再提交反馈。" }, { status: error.status, headers: NO_STORE_HEADERS });
    }

    throw error;
  }

  // 反馈直接写 D1 审计表，必须限流，防止单个登录账号刷爆写入量。
  const limitResult = await checkRateLimit({
    key: user.id,
    scope: "nemesis-feedback",
    maxPerMinute: 6,
    maxPerDay: 60,
  });
  if (!limitResult.allowed) {
    return Response.json({ error: "反馈提交过于频繁，请稍后再试。" }, { status: 429, headers: NO_STORE_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求格式错误。" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求格式错误。" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const record = body as Record<string, unknown>;
  const message = asTrimmedString(record.userMessage);
  const assistantMessage = asTrimmedString(record.assistantMessage);
  if (!message || !assistantMessage) {
    return Response.json({ error: "反馈需要包含用户问题和 Nemesis 回复。" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  await recordNemesisFeedbackEvent({
    userId: user.id,
    userEmail: user.email,
    message,
    assistantMessage,
    recentMessages: normalizeRecentMessages(record.recentMessages),
    conversationId: optionalString(record.conversationId, 128),
    userMessageId: optionalString(record.userMessageId, 128),
    assistantMessageId: optionalString(record.assistantMessageId, 128),
    feedbackCategory: normalizeCategory(record.feedbackCategory),
    feedbackNote: optionalString(record.feedbackNote, MAX_NOTE_LENGTH),
    modelResult: {
      provider: optionalString(record.modelProvider, 64),
      route: optionalString(record.modelRoute, 64),
      model: optionalString(record.modelName, 128),
      fallbackUsed: typeof record.fallbackUsed === "boolean" ? record.fallbackUsed : null,
      finishReason: optionalString(record.finishReason, 128),
      incomplete: typeof record.incomplete === "boolean" ? record.incomplete : null,
    },
  });

  return Response.json({ ok: true }, { headers: JSON_NO_STORE_HEADERS });
}

export async function loader() {
  return Response.json({ message: "Nemesis feedback API", method: "POST" }, { headers: JSON_NO_STORE_HEADERS });
}
