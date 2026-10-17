import {
  MAX_NEMESIS_CHAT_SESSIONS,
  NEMESIS_CHAT_SESSIONS_KEY,
  NEMESIS_PRIVACY_ACK_KEY,
} from "~/nemesis/chat-ui-config";
import { isNemesisGuardFixedReply } from "~/nemesis/guard-replies";
import { formatMessageForRecentContext, isValidAttachments } from "~/lib/nemesis-message";
import type { Message } from "~/types/chat";
import type { NemesisChatSession } from "~/types/nemesis-chat";

export function createNemesisChatId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 会话标题取第一个问题；还没提问时返回空字符串，由界面按当前语言显示「新的对话」。 */
export function getNemesisSessionTitle(messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) {
    return "";
  }

  const title = firstUserMessage.content.replace(/\s+/g, " ").trim();
  return title.length > 24 ? `${title.slice(0, 24)}...` : title;
}

function isPersistedMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const attachments = record.attachments;
  const attachmentsValid =
    attachments === undefined || attachments === null || isValidAttachments(attachments);

  return (
    typeof record.id === "string" &&
    (record.role === "user" || record.role === "assistant") &&
    typeof record.content === "string" &&
    typeof record.timestamp === "number" &&
    (record.contextSignature === undefined || typeof record.contextSignature === "string") &&
    attachmentsValid
  );
}

export function createNemesisChatSession(messages: Message[] = []): NemesisChatSession {
  return {
    id: createNemesisChatId(),
    title: getNemesisSessionTitle(messages),
    messages,
    updatedAt: Date.now(),
  };
}

export function readNemesisChatSessions(): NemesisChatSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(NEMESIS_CHAT_SESSIONS_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : null;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item): NemesisChatSession | null => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        if (typeof record.id !== "string" || !Array.isArray(record.messages)) {
          return null;
        }

        const messages = record.messages.filter(isPersistedMessage);
        return {
          id: record.id,
          title: typeof record.title === "string" ? record.title : getNemesisSessionTitle(messages),
          messages,
          updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
        };
      })
      .filter((item): item is NemesisChatSession => Boolean(item))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_NEMESIS_CHAT_SESSIONS);
  } catch {
    return [];
  }
}

export function saveNemesisChatSessions(sessions: NemesisChatSession[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      NEMESIS_CHAT_SESSIONS_KEY,
      JSON.stringify(sessions.slice(0, MAX_NEMESIS_CHAT_SESSIONS))
    );
  } catch {
    // Local chat history is optional; the server conversation flow should keep working without it.
  }
}

export function buildRecentMessagesForApi(source: Message[]) {
  return source
    .filter((message) => !isNemesisGuardFixedReply(message.content))
    .filter((message) => message.role !== "assistant" || message.status !== "incomplete")
    .slice(-10)
    .map((message) =>
      message.role === "assistant"
        ? {
            role: "model",
            // 必须与服务端签名时的文本逐字一致（formatMessageForRecentContext + trim）。
            text: formatMessageForRecentContext(message.content, message.attachments).trim(),
            signature: message.contextSignature,
          }
        : { role: "user", text: message.content }
    );
}

export function hasAcceptedNemesisPrivacyNotice() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(NEMESIS_PRIVACY_ACK_KEY) === "true";
}

export function saveNemesisPrivacyNoticeAccepted() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(NEMESIS_PRIVACY_ACK_KEY, "true");
}
