import type { RefObject } from "react";
import { FormattedMessage, defineMessages, useIntl } from "react-intl";
import { NemesisThinkingBubble } from "~/components/nemesis/NemesisThinkingBubble";
import { NemesisChatMessage } from "~/components/nemesis/chat/NemesisChatMessage";
import { NemesisIcon } from "~/components/nemesis/chat/NemesisIcon";
import type { Message } from "~/types/chat";
import type { NemesisFeedbackCategory } from "~/types/nemesis-chat";
import type { NemesisProgressStep } from "~/types/nemesis-sse";

// 推荐问题按当前语言显示，点击后也用当前语言的问法发给 Nemesis
const SUGGESTION_MESSAGES = defineMessages({
  aboutTag: { defaultMessage: "关于他", description: "Nemesis 推荐问题标签" },
  aboutText: { defaultMessage: "汪家俊最近在折腾什么？", description: "Nemesis 推荐问题" },
  siteTag: { defaultMessage: "这个网站", description: "Nemesis 推荐问题标签" },
  siteText: { defaultMessage: "这个网站是怎么搭起来的？", description: "Nemesis 推荐问题" },
  musicTag: { defaultMessage: "听歌", description: "Nemesis 推荐问题标签" },
  musicText: { defaultMessage: "推荐一首你最近常听的歌", description: "Nemesis 推荐问题" },
  foodTag: { defaultMessage: "吃饭", description: "Nemesis 推荐问题标签" },
  foodText: { defaultMessage: "今晚吃什么好？", description: "Nemesis 推荐问题" },
});

const SUGGESTIONS = [
  { tag: SUGGESTION_MESSAGES.aboutTag, text: SUGGESTION_MESSAGES.aboutText },
  { tag: SUGGESTION_MESSAGES.siteTag, text: SUGGESTION_MESSAGES.siteText },
  { tag: SUGGESTION_MESSAGES.musicTag, text: SUGGESTION_MESSAGES.musicText },
  { tag: SUGGESTION_MESSAGES.foodTag, text: SUGGESTION_MESSAGES.foodText },
] as const;

type NemesisChatMessageListProps = {
  chatWindowRef: RefObject<HTMLDivElement>;
  messages: Message[];
  isLoading: boolean;
  requestStage: NemesisProgressStep[] | null;
  error: string | null;
  notice: string | null;
  typingMessageId: string | null;
  copiedMessageId: string | null;
  feedbackMessageId: string | null;
  feedbackCategory: NemesisFeedbackCategory;
  feedbackNote: string;
  feedbackSubmittingId: string | null;
  submittedFeedbackIds: string[];
  lastSubmittedFeedbackId: string | null;
  onSuggestion: (text: string) => void;
  onRetry: () => void;
  onTypewriterComplete: () => void;
  onCopy: (message: Message) => void;
  onRegenerate: (messageId: string) => void;
  onOpenFeedback: (messageId: string) => void;
  onFeedbackCategoryChange: (category: NemesisFeedbackCategory) => void;
  onFeedbackNoteChange: (note: string) => void;
  onCloseFeedback: () => void;
  onSubmitFeedback: (message: Message) => void;
};

export function NemesisChatMessageList({
  chatWindowRef,
  messages,
  isLoading,
  requestStage,
  error,
  notice,
  typingMessageId,
  copiedMessageId,
  feedbackMessageId,
  feedbackCategory,
  feedbackNote,
  feedbackSubmittingId,
  submittedFeedbackIds,
  lastSubmittedFeedbackId,
  onSuggestion,
  onRetry,
  onTypewriterComplete,
  onCopy,
  onRegenerate,
  onOpenFeedback,
  onFeedbackCategoryChange,
  onFeedbackNoteChange,
  onCloseFeedback,
  onSubmitFeedback,
}: NemesisChatMessageListProps) {
  const lastMessage = messages[messages.length - 1];
  // 只有最后一条是没拿到回复的用户消息时，重试才有意义；反馈、复制等错误不给重试按钮。
  const canRetry = !isLoading && lastMessage?.role === "user";
  const intl = useIntl();

  return (
    <div ref={chatWindowRef} className="nm-thread nm-scroll">
      <div className="nm-col nm-thread-inner">
        {messages.length === 0 && !isLoading && (
          <section className="nm-empty">
            <span className="nm-mark lg nm-pop" aria-hidden="true" />
            <h2 className="nm-empty-title nm-rise">
              <FormattedMessage
                defaultMessage="问他，问这个网站，<br></br>或者随便聊点什么。"
                description="Nemesis 空状态标题，<br></br> 是换行位置"
                values={{ br: () => <br /> }}
              />
            </h2>
            <p className="nm-empty-sub nm-rise">
              <FormattedMessage defaultMessage="Nemesis 是汪家俊留在网上的 AI 影子。" description="Nemesis 空状态副标题" />
            </p>
            <div className="nm-sugg">
              {SUGGESTIONS.map((item, index) => {
                const text = intl.formatMessage(item.text);
                return (
                  <button
                    key={item.text.defaultMessage}
                    type="button"
                    className="nm-sugg-btn nm-rise"
                    style={{ animationDelay: `${0.12 + index * 0.06}s` }}
                    onClick={() => onSuggestion(text)}
                  >
                    <span className="nm-sugg-tag">{intl.formatMessage(item.tag)}</span>
                    <span className="nm-sugg-text">{text}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {messages.map((message) => (
          <NemesisChatMessage
            key={message.id}
            message={message}
            typingMessageId={typingMessageId}
            isLoading={isLoading}
            isCopied={copiedMessageId === message.id}
            feedbackMessageId={feedbackMessageId}
            feedbackCategory={feedbackCategory}
            feedbackNote={feedbackNote}
            feedbackSubmittingId={feedbackSubmittingId}
            submittedFeedbackIds={submittedFeedbackIds}
            lastSubmittedFeedbackId={lastSubmittedFeedbackId}
            onTypewriterComplete={onTypewriterComplete}
            onCopy={onCopy}
            onRegenerate={onRegenerate}
            onOpenFeedback={onOpenFeedback}
            onFeedbackCategoryChange={onFeedbackCategoryChange}
            onFeedbackNoteChange={onFeedbackNoteChange}
            onCloseFeedback={onCloseFeedback}
            onSubmitFeedback={onSubmitFeedback}
          />
        ))}

        {isLoading && requestStage ? <NemesisThinkingBubble steps={requestStage} /> : null}

        {error && (
          <div className="nm-turn nm-rise" role="alert">
            <span className="nm-error-icon">
              <NemesisIcon name="alert" small />
            </span>
            <div className="nm-error">
              <span className="nm-error-text">{error}</span>
              {canRetry ? (
                <button type="button" className="nm-btn ink" onClick={onRetry}>
                  <FormattedMessage defaultMessage="重试" description="Nemesis 错误提示：重试按钮" />
                </button>
              ) : null}
            </div>
          </div>
        )}

        {notice ? <div className="nm-notice">{notice}</div> : null}
      </div>
    </div>
  );
}
