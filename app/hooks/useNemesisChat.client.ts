import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useLocale } from "~/components/common/LocaleLink";
import { DEFAULT_LOCALE } from "~/lib/i18n";
import {
  buildAssistantMessage,
  buildFeedbackContext,
  createInitialNemesisProgress,
  requestNemesisReply,
  submitNemesisFeedback,
} from "~/lib/nemesis-chat-api.client";
import {
  createNemesisChatId,
  createNemesisChatSession,
  getNemesisSessionTitle,
  hasAcceptedNemesisPrivacyNotice,
  readNemesisChatSessions,
  saveNemesisChatSessions,
  saveNemesisPrivacyNoticeAccepted,
} from "~/lib/nemesis-chat-sessions.client";
import { formatMessageForCopy } from "~/lib/nemesis-message";
import { MAX_NEMESIS_CHAT_SESSIONS } from "~/nemesis/chat-ui-config";
import type { Message } from "~/types/chat";
import type { NemesisChatSession, NemesisFeedbackCategory } from "~/types/nemesis-chat";
import type { NemesisProgressStep } from "~/types/nemesis-sse";

const COPIED_FEEDBACK_MS = 1600;

export type NemesisRequestStatus = "idle" | "thinking" | "typing";

export function useNemesisChat() {
  const [sessions, setSessions] = useState<NemesisChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requestStage, setRequestStage] = useState<NemesisProgressStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [isPrivacyPopoverOpen, setIsPrivacyPopoverOpen] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState<NemesisFeedbackCategory>("persona_mismatch");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackSubmittingId, setFeedbackSubmittingId] = useState<string | null>(null);
  const [submittedFeedbackIds, setSubmittedFeedbackIds] = useState<string[]>([]);
  const [lastSubmittedFeedbackId, setLastSubmittedFeedbackId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const chatWindowRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasLoadedSessions = useRef(false);
  const requestAbortRef = useRef<AbortController | null>(null);
  // 正在等待回复的那条用户消息；用户主动停止时把它撤回到输入框。
  const pendingUserMessageRef = useRef<Message | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  const intl = useIntl();
  const locale = useLocale();
  const text = useMemo(
    () => ({
      upstreamBusy: intl.formatMessage({ defaultMessage: "上游模型服务暂时繁忙，稍后重试通常可以恢复。", description: "Nemesis 请求失败的通用提示" }),
      stoppedKeepInput: intl.formatMessage({ defaultMessage: "已停止生成，你的问题还在输入框里。", description: "Nemesis 停止生成后的提示" }),
      stopped: intl.formatMessage({ defaultMessage: "已停止生成。", description: "Nemesis 停止生成后的提示" }),
      feedbackNoQuestion: intl.formatMessage({ defaultMessage: "找不到这条回复对应的用户问题，无法提交反馈。", description: "Nemesis 反馈错误" }),
      feedbackFailed: intl.formatMessage({ defaultMessage: "反馈提交失败，请稍后重试。", description: "Nemesis 反馈错误" }),
      copyFailed: intl.formatMessage({ defaultMessage: "复制失败，请手动选择文本。", description: "Nemesis 复制失败提示" }),
    }),
    [intl]
  );
  // 服务端和流式读取的错误信息都是中文原文：中文页面照原样显示，其它语言换成本地化的通用提示
  const describeError = useCallback(
    (err: unknown, fallback: string) =>
      locale === DEFAULT_LOCALE && err instanceof Error && err.message ? err.message : fallback,
    [locale]
  );

  const isTypingReply = Boolean(typingMessageId);
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const requestStatus: NemesisRequestStatus = requestStage ? "thinking" : isTypingReply ? "typing" : "idle";

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (chatWindowRef.current) {
        chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
      }
    });
  }, []);

  const finishTypingMessage = useCallback(() => {
    setTypingMessageId(null);
    scrollToBottom();
  }, [scrollToBottom]);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, []);

  const upsertActiveSession = useCallback((sessionId: string, nextMessages: Message[]) => {
    setSessions((current) =>
      [
        {
          id: sessionId,
          title: getNemesisSessionTitle(nextMessages),
          messages: nextMessages,
          updatedAt: Date.now(),
        },
        ...current.filter((session) => session.id !== sessionId),
      ].slice(0, MAX_NEMESIS_CHAT_SESSIONS)
    );
  }, []);

  const commitMessages = useCallback(
    (nextMessages: Message[]) => {
      setMessages(nextMessages);

      if (!activeSessionId) {
        return;
      }

      setSessions((current) =>
        current
          .map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  title: getNemesisSessionTitle(nextMessages),
                  messages: nextMessages,
                  updatedAt: Date.now(),
                }
              : session
          )
          .sort((a, b) => b.updatedAt - a.updatedAt)
      );
    },
    [activeSessionId]
  );

  const acceptPrivacyNotice = useCallback(() => {
    saveNemesisPrivacyNoticeAccepted();
    setShowPrivacyNotice(false);
  }, []);

  const startNewSession = useCallback(() => {
    if (isLoading) {
      return;
    }

    const nextSession = createNemesisChatSession();
    setSessions((current) => [nextSession, ...current].slice(0, MAX_NEMESIS_CHAT_SESSIONS));
    setActiveSessionId(nextSession.id);
    setMessages([]);
    setInputMessage("");
    setError(null);
    setNotice(null);
    setRequestStage(null);
    setTypingMessageId(null);
  }, [isLoading]);

  const selectSession = useCallback(
    (sessionId: string) => {
      if (isLoading || sessionId === activeSessionId) {
        return;
      }

      const session = sessions.find((item) => item.id === sessionId);
      if (!session) {
        return;
      }

      setActiveSessionId(session.id);
      setMessages(session.messages);
      setInputMessage("");
      setError(null);
      setNotice(null);
      setRequestStage(null);
      setTypingMessageId(null);
    },
    [activeSessionId, isLoading, sessions]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      if (isLoading) {
        return;
      }

      setSessions((current) => {
        const nextSessions = current.filter((session) => session.id !== sessionId);
        if (sessionId === activeSessionId) {
          const fallbackSession = nextSessions[0] ?? createNemesisChatSession();
          const ensuredSessions = nextSessions.length > 0 ? nextSessions : [fallbackSession];
          setActiveSessionId(fallbackSession.id);
          setMessages(fallbackSession.messages);
          setInputMessage("");
          setError(null);
          return ensuredSessions;
        }

        return nextSessions;
      });
    },
    [activeSessionId, isLoading]
  );

  const requestReply = useCallback(
    async (sessionId: string, history: Message[], userMessage: Message) => {
      const nextMessages = [...history, userMessage];

      setMessages(nextMessages);
      upsertActiveSession(sessionId, nextMessages);
      setError(null);
      setNotice(null);
      setIsLoading(true);
      setRequestStage(createInitialNemesisProgress());
      scrollToBottom();

      const abortController = new AbortController();
      requestAbortRef.current = abortController;
      pendingUserMessageRef.current = userMessage;

      try {
        const answer = await requestNemesisReply(
          userMessage.content,
          history,
          setRequestStage,
          abortController.signal
        );
        const assistantMessage = buildAssistantMessage(answer);
        const answeredMessages = [...nextMessages, assistantMessage];

        setMessages(answeredMessages);
        upsertActiveSession(sessionId, answeredMessages);
        setTypingMessageId(assistantMessage.id);
        scrollToBottom();
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }
        setError(describeError(err, text.upstreamBusy));
      } finally {
        // 用户主动停止时 stopGeneration 已经收尾，这里不能再覆盖新的请求状态。
        if (requestAbortRef.current === abortController) {
          requestAbortRef.current = null;
          pendingUserMessageRef.current = null;
          setIsLoading(false);
          setRequestStage(null);
        }
      }
    },
    [describeError, scrollToBottom, text, upsertActiveSession]
  );

  const sendMessage = useCallback(
    async (messageToSend?: string) => {
      const message = (messageToSend || inputMessage).trim();
      if (!message || isLoading) {
        return;
      }

      const sessionId = activeSessionId ?? createNemesisChatId();
      if (!activeSessionId) {
        setActiveSessionId(sessionId);
      }

      const userMessage: Message = {
        id: createNemesisChatId(),
        role: "user",
        content: message,
        timestamp: Date.now(),
      };

      setInputMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      await requestReply(sessionId, messages, userMessage);
    },
    [activeSessionId, inputMessage, isLoading, messages, requestReply]
  );

  // 上一轮请求失败后重试：最后一条仍是没有回复的用户消息，直接用它重新请求，不重复插入。
  const retryLastMessage = useCallback(async () => {
    const lastMessage = messages[messages.length - 1];
    if (!activeSessionId || isLoading || !lastMessage || lastMessage.role !== "user") {
      return;
    }

    await requestReply(activeSessionId, messages.slice(0, -1), lastMessage);
  }, [activeSessionId, isLoading, messages, requestReply]);

  const stopGeneration = useCallback(() => {
    const controller = requestAbortRef.current;
    if (!controller) {
      return;
    }

    const pendingUserMessage = pendingUserMessageRef.current;
    requestAbortRef.current = null;
    pendingUserMessageRef.current = null;
    controller.abort();
    setIsLoading(false);
    setRequestStage(null);

    if (pendingUserMessage) {
      commitMessages(messages.filter((message) => message.id !== pendingUserMessage.id));
      setInputMessage(pendingUserMessage.content);
      setNotice(text.stoppedKeepInput);
      textareaRef.current?.focus();
      return;
    }

    setNotice(text.stopped);
  }, [commitMessages, messages, text]);

  const skipTyping = useCallback(() => {
    finishTypingMessage();
  }, [finishTypingMessage]);

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      if (!activeSessionId || isTypingReply) {
        return;
      }

      const messageIndex = messages.findIndex((message) => message.id === messageId);
      if (messageIndex <= 0) {
        return;
      }

      const previousUserMessage = messages[messageIndex - 1];
      if (previousUserMessage.role !== "user") {
        return;
      }

      const history = messages.slice(0, messageIndex - 1);
      const messagesBeforeRegenerate = messages.slice(0, messageIndex);
      const followingMessages = messages.slice(messageIndex + 1);
      const previousAssistantMessage = messages[messageIndex];

      commitMessages([...messagesBeforeRegenerate, ...followingMessages]);
      setError(null);
      setNotice(null);
      setIsLoading(true);
      setRequestStage(createInitialNemesisProgress());

      const abortController = new AbortController();
      requestAbortRef.current = abortController;
      pendingUserMessageRef.current = null;

      try {
        const answer = await requestNemesisReply(
          previousUserMessage.content,
          history,
          setRequestStage,
          abortController.signal
        );
        const assistantMessage = buildAssistantMessage(answer);

        commitMessages([...messagesBeforeRegenerate, assistantMessage, ...followingMessages]);
        setTypingMessageId(assistantMessage.id);
        scrollToBottom();
      } catch (err) {
        commitMessages([...messagesBeforeRegenerate, previousAssistantMessage, ...followingMessages]);
        if (!abortController.signal.aborted) {
          setError(describeError(err, text.upstreamBusy));
        }
      } finally {
        if (requestAbortRef.current === abortController) {
          requestAbortRef.current = null;
          setIsLoading(false);
          setRequestStage(null);
        }
      }
    },
    [activeSessionId, commitMessages, describeError, isTypingReply, messages, scrollToBottom, text]
  );

  const closeFeedback = useCallback(() => {
    setFeedbackMessageId(null);
  }, []);

  const openFeedback = useCallback((messageId: string) => {
    setFeedbackMessageId((current) => (current === messageId ? null : messageId));
    setFeedbackCategory("persona_mismatch");
    setFeedbackNote("");
    setError(null);
  }, []);

  const submitFeedback = useCallback(
    async (assistantMessage: Message) => {
      if (!activeSessionId || assistantMessage.role !== "assistant" || feedbackSubmittingId) {
        return;
      }

      const messageIndex = messages.findIndex((message) => message.id === assistantMessage.id);
      if (messageIndex <= 0) {
        setError(text.feedbackNoQuestion);
        return;
      }

      const previousUserMessage = messages[messageIndex - 1];
      if (previousUserMessage.role !== "user") {
        setError(text.feedbackNoQuestion);
        return;
      }

      setFeedbackSubmittingId(assistantMessage.id);
      setError(null);

      try {
        await submitNemesisFeedback({
          conversationId: activeSessionId,
          userMessage: previousUserMessage,
          assistantMessage,
          recentMessages: buildFeedbackContext(messages, assistantMessage.id),
          feedbackCategory,
          feedbackNote,
        });

        setSubmittedFeedbackIds((current) =>
          current.includes(assistantMessage.id) ? current : [...current, assistantMessage.id]
        );
        setLastSubmittedFeedbackId(assistantMessage.id);
        setFeedbackMessageId(null);
        setFeedbackNote("");
      } catch (err) {
        setError(describeError(err, text.feedbackFailed));
      } finally {
        setFeedbackSubmittingId(null);
      }
    },
    [activeSessionId, describeError, feedbackCategory, feedbackNote, feedbackSubmittingId, messages, text]
  );

  const copyMessage = useCallback((message: Message) => {
    navigator.clipboard
      .writeText(formatMessageForCopy(message.content, message.attachments))
      .then(() => {
        setCopiedMessageId(message.id);
        if (copiedTimerRef.current !== null) {
          window.clearTimeout(copiedTimerRef.current);
        }
        copiedTimerRef.current = window.setTimeout(() => {
          setCopiedMessageId(null);
          copiedTimerRef.current = null;
        }, COPIED_FEEDBACK_MS);
      })
      .catch(() => {
        setError(text.copyFailed);
      });
  }, [text]);

  const handleEnter = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      event.preventDefault();
      void sendMessage();
    },
    [sendMessage]
  );

  useEffect(() => {
    const localSessions = readNemesisChatSessions();
    const initialSessions = localSessions.length > 0 ? localSessions : [createNemesisChatSession()];
    const initialSession = initialSessions[0];

    setSessions(initialSessions);
    setActiveSessionId(initialSession.id);
    setMessages(initialSession.messages);
    setShowPrivacyNotice(!hasAcceptedNemesisPrivacyNotice());
    hasLoadedSessions.current = true;
  }, []);

  useEffect(() => {
    if (hasLoadedSessions.current) {
      saveNemesisChatSessions(sessions);
    }
  }, [sessions]);

  // 离开聊天页（含 SPA 内跳转）时中止进行中的请求，服务端随之取消上游模型调用。
  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort();
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight, inputMessage]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [isLoading, messages.length, scrollToBottom]);

  return {
    sessions,
    activeSession,
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    requestStage,
    error,
    notice,
    typingMessageId,
    isPrivacyPopoverOpen,
    setIsPrivacyPopoverOpen,
    showPrivacyNotice,
    feedbackMessageId,
    feedbackCategory,
    setFeedbackCategory,
    feedbackNote,
    setFeedbackNote,
    feedbackSubmittingId,
    submittedFeedbackIds,
    lastSubmittedFeedbackId,
    copiedMessageId,
    requestStatus,
    chatWindowRef,
    textareaRef,
    acceptPrivacyNotice,
    startNewSession,
    selectSession,
    deleteSession,
    sendMessage,
    retryLastMessage,
    stopGeneration,
    skipTyping,
    regenerateResponse,
    openFeedback,
    closeFeedback,
    submitFeedback,
    copyMessage,
    handleEnter,
    finishTypingMessage,
  };
}

export type NemesisChatController = ReturnType<typeof useNemesisChat>;
