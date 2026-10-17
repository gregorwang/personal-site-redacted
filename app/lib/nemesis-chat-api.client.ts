import { INITIAL_NEMESIS_PROGRESS, requestNemesisStream } from "~/lib/nemesis-sse.client";
import { buildRecentMessagesForApi, createNemesisChatId } from "~/lib/nemesis-chat-sessions.client";
import {
  formatAssistantMessageForFeedback,
  formatMessageForRecentContext,
} from "~/lib/nemesis-message";
import type { Message } from "~/types/chat";
import type { NemesisFeedbackCategory } from "~/types/nemesis-chat";
import type { NemesisProgressStep } from "~/types/nemesis-sse";
import type { NemesisStreamResult } from "~/lib/nemesis-sse.client";

export function createInitialNemesisProgress(): NemesisProgressStep[] {
  return INITIAL_NEMESIS_PROGRESS.map((step) => ({ ...step }));
}

export async function requestNemesisReply(
  message: string,
  history: Message[],
  onProgress: (progress: NemesisProgressStep[]) => void,
  signal?: AbortSignal
): Promise<NemesisStreamResult> {
  return requestNemesisStream(message, buildRecentMessagesForApi(history), {
    onStatus: (_event, progress) => {
      onProgress(progress);
    },
    signal,
  });
}

export function buildAssistantMessage(answer: NemesisStreamResult): Message {
  // 附件只认服务端给的：服务端按策略决定要不要补美食视频，并对附件参与签名；
  // 客户端再自行补一次会让上下文文本和签名对不上，这轮回复下一轮就被丢弃。
  const attachments = answer.attachments ?? [];

  return {
    id: createNemesisChatId(),
    role: "assistant",
    content: answer.text,
    attachments: attachments.length ? attachments : undefined,
    timestamp: Date.now(),
    status: answer.incomplete ? "incomplete" : "complete",
    finishReason: answer.finishReason,
    modelRoute: answer.modelRoute,
    modelProvider: answer.modelProvider,
    modelName: answer.modelName,
    fallbackUsed: answer.fallbackUsed,
    contextSignature: answer.contextSignature,
  };
}

export function buildFeedbackContext(messages: Message[], assistantMessageId: string) {
  const messageIndex = messages.findIndex((message) => message.id === assistantMessageId);
  const source = messageIndex >= 0 ? messages.slice(0, messageIndex + 1) : messages;

  return source.slice(-10).map((message) => ({
    role: message.role === "assistant" ? ("model" as const) : ("user" as const),
    text:
      message.role === "assistant"
        ? formatMessageForRecentContext(message.content, message.attachments)
        : message.content,
  }));
}

type SubmitNemesisFeedbackInput = {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
  recentMessages: ReturnType<typeof buildFeedbackContext>;
  feedbackCategory: NemesisFeedbackCategory;
  feedbackNote: string;
};

export async function submitNemesisFeedback(input: SubmitNemesisFeedbackInput) {
  const response = await fetch("/api/nemesis-feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId: input.conversationId,
      userMessageId: input.userMessage.id,
      assistantMessageId: input.assistantMessage.id,
      userMessage: input.userMessage.content,
      assistantMessage: formatAssistantMessageForFeedback(
        input.assistantMessage.content,
        input.assistantMessage.attachments
      ),
      recentMessages: input.recentMessages,
      feedbackCategory: input.feedbackCategory,
      feedbackNote: input.feedbackNote,
      modelRoute: input.assistantMessage.modelRoute,
      modelProvider: input.assistantMessage.modelProvider,
      modelName: input.assistantMessage.modelName,
      fallbackUsed: input.assistantMessage.fallbackUsed,
      finishReason: input.assistantMessage.finishReason,
      incomplete: input.assistantMessage.status === "incomplete",
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error || "反馈提交失败，请稍后重试。");
  }
}
