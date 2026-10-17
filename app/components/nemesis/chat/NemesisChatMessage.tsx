import { FormattedMessage, useIntl } from "react-intl";
import { NemesisMessageContent } from "~/components/nemesis/NemesisMessageContent";
import { NemesisIcon } from "~/components/nemesis/chat/NemesisIcon";
import { NEMESIS_FEEDBACK_CATEGORIES } from "~/nemesis/chat-ui-config";
import type { Message } from "~/types/chat";
import type { NemesisFeedbackCategory } from "~/types/nemesis-chat";

type NemesisChatMessageProps = {
  message: Message;
  typingMessageId: string | null;
  isLoading: boolean;
  isCopied: boolean;
  feedbackMessageId: string | null;
  feedbackCategory: NemesisFeedbackCategory;
  feedbackNote: string;
  feedbackSubmittingId: string | null;
  submittedFeedbackIds: string[];
  lastSubmittedFeedbackId: string | null;
  onTypewriterComplete: () => void;
  onCopy: (message: Message) => void;
  onRegenerate: (messageId: string) => void;
  onOpenFeedback: (messageId: string) => void;
  onFeedbackCategoryChange: (category: NemesisFeedbackCategory) => void;
  onFeedbackNoteChange: (note: string) => void;
  onCloseFeedback: () => void;
  onSubmitFeedback: (message: Message) => void;
};

export function NemesisChatMessage({
  message,
  typingMessageId,
  isLoading,
  isCopied,
  feedbackMessageId,
  feedbackCategory,
  feedbackNote,
  feedbackSubmittingId,
  submittedFeedbackIds,
  lastSubmittedFeedbackId,
  onTypewriterComplete,
  onCopy,
  onRegenerate,
  onOpenFeedback,
  onFeedbackCategoryChange,
  onFeedbackNoteChange,
  onCloseFeedback,
  onSubmitFeedback,
}: NemesisChatMessageProps) {
  const intl = useIntl();
  if (message.role === "user") {
    return (
      <div className="nm-user-row nm-in-user">
        <div className="nm-user-slip">{message.content}</div>
      </div>
    );
  }

  const isTyping = message.id === typingMessageId;
  const isFeedbackOpen = feedbackMessageId === message.id;
  const isFeedbackDone = submittedFeedbackIds.includes(message.id);
  const isSubmitting = feedbackSubmittingId === message.id;
  const regenerateDisabled = isLoading || Boolean(typingMessageId);
  const feedbackLabel = intl.formatMessage({ defaultMessage: "反馈这条回复", description: "Nemesis 回复操作：反馈" });
  const feedbackTitle = isFeedbackDone ? intl.formatMessage({ defaultMessage: "已反馈", description: "Nemesis 回复操作：已反馈" }) : feedbackLabel;
  const regenerateLabel = intl.formatMessage({ defaultMessage: "重新生成", description: "Nemesis 回复操作：重新生成" });

  return (
    <article className="nm-turn nm-rise" aria-label={intl.formatMessage({ defaultMessage: "Nemesis 的回复", description: "Nemesis 回复区块的无障碍标签" })}>
      <span className="nm-mark" aria-hidden="true" />
      <div style={{ minWidth: 0 }}>
        <div className="nm-prose">
          <NemesisMessageContent
            content={message.content}
            attachments={message.attachments}
            showAttachments={!isTyping}
            useTypewriter={isTyping}
            onTypewriterComplete={onTypewriterComplete}
          />
        </div>

        {!isTyping && (
          <div className="nm-foot nm-fade">
            {message.modelName ? <span className="nm-meta">{message.modelName}</span> : null}
            {message.fallbackUsed ? <span className="nm-tag"><FormattedMessage defaultMessage="主模型繁忙 · 已用备用" description="Nemesis 回复标签：用了备用模型" /></span> : null}
            {message.status === "incomplete" && (
              <>
                <span className="nm-tag warn"><FormattedMessage defaultMessage="回复中断" description="Nemesis 回复标签：回复没有生成完" /></span>
                <button
                  type="button"
                  className="nm-text-btn"
                  onClick={() => onRegenerate(message.id)}
                  disabled={regenerateDisabled}
                >
                  {regenerateLabel}
                </button>
              </>
            )}
            <div className={`nm-actions${isFeedbackOpen || isCopied ? " pinned" : ""}`}>
              <button
                type="button"
                className={`nm-icon-btn${isCopied ? " done" : ""}`}
                onClick={() => onCopy(message)}
                aria-label={isCopied ? intl.formatMessage({ defaultMessage: "已复制", description: "Nemesis 回复操作：复制成功" }) : intl.formatMessage({ defaultMessage: "复制回复", description: "Nemesis 回复操作：复制的无障碍标签" })}
                title={isCopied ? intl.formatMessage({ defaultMessage: "已复制", description: "Nemesis 回复操作：复制成功" }) : intl.formatMessage({ defaultMessage: "复制", description: "Nemesis 回复操作：复制" })}
              >
                {isCopied ? <NemesisIcon name="check" small className="nm-pop" /> : <NemesisIcon name="copy" small />}
              </button>
              <button
                type="button"
                className="nm-icon-btn"
                onClick={() => onRegenerate(message.id)}
                disabled={regenerateDisabled}
                aria-label={regenerateLabel}
                title={regenerateLabel}
              >
                <NemesisIcon name="regenerate" small />
              </button>
              <button
                type="button"
                className={`nm-icon-btn${isFeedbackDone ? " done" : ""}`}
                onClick={() => onOpenFeedback(message.id)}
                disabled={isFeedbackDone}
                aria-label={feedbackTitle}
                title={feedbackTitle}
                aria-expanded={isFeedbackOpen}
              >
                <NemesisIcon name={isFeedbackDone ? "check" : "flag"} small />
              </button>
            </div>
          </div>
        )}

        {isFeedbackOpen && (
          <div className="nm-fb" role="group" aria-label={feedbackLabel}>
            <div className="nm-fb-title"><FormattedMessage defaultMessage="这条回复哪里不对？" description="Nemesis 反馈面板标题" /></div>
            <div className="nm-chips">
              {NEMESIS_FEEDBACK_CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`nm-chip${feedbackCategory === item.value ? " on" : ""}`}
                  onClick={() => onFeedbackCategoryChange(item.value)}
                  aria-pressed={feedbackCategory === item.value}
                >
                  {intl.formatMessage(item.label)}
                </button>
              ))}
            </div>
            <label className="nm-sr" htmlFor={`nemesis-feedback-${message.id}`}>
              <FormattedMessage defaultMessage="补充说明" description="Nemesis 反馈面板：补充说明输入框标签" />
            </label>
            <textarea
              id={`nemesis-feedback-${message.id}`}
              className="nm-note"
              rows={2}
              maxLength={1000}
              placeholder={intl.formatMessage({ defaultMessage: "补充说明，可留空", description: "Nemesis 反馈面板：补充说明输入框占位" })}
              value={feedbackNote}
              onChange={(event) => onFeedbackNoteChange(event.target.value)}
            />
            <div className="nm-fb-foot">
              <span className="nm-fb-hint">
                <FormattedMessage defaultMessage="提交后，只有这一轮问答和少量上下文会进入审计中心。" description="Nemesis 反馈面板说明" />
              </span>
              <button type="button" className="nm-btn plain" onClick={onCloseFeedback}>
                <FormattedMessage defaultMessage="取消" description="Nemesis 反馈面板：取消按钮" />
              </button>
              <button
                type="button"
                className="nm-btn ink"
                onClick={() => onSubmitFeedback(message)}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? intl.formatMessage({ defaultMessage: "提交中…", description: "Nemesis 反馈面板：提交中" })
                  : intl.formatMessage({ defaultMessage: "提交反馈", description: "Nemesis 反馈面板：提交按钮" })}
              </button>
            </div>
          </div>
        )}

        {isFeedbackDone && lastSubmittedFeedbackId === message.id && (
          <div className="nm-done-note">
            <NemesisIcon name="check" small className="nm-pop" />
            <FormattedMessage defaultMessage="已收到反馈。这一轮会进入审计中心，帮它更像他。" description="Nemesis 反馈提交成功提示，「它」是 Nemesis，「他」是汪家俊" />
          </div>
        )}
      </div>
    </article>
  );
}
