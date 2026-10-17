import { useState, type RefObject } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { NemesisIcon } from "~/components/nemesis/chat/NemesisIcon";
import type { NemesisRequestStatus } from "~/hooks/useNemesisChat.client";
import { NEMESIS_PRIVACY_NOTICE } from "~/nemesis/chat-ui-config";

type NemesisChatComposerProps = {
  textareaRef: RefObject<HTMLTextAreaElement>;
  inputMessage: string;
  requestStatus: NemesisRequestStatus;
  showPrivacyNotice: boolean;
  isPrivacyPopoverOpen: boolean;
  onInputChange: (value: string) => void;
  onEnter: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onStop: () => void;
  onSkipTyping: () => void;
  onAcceptPrivacyNotice: () => void;
  onTogglePrivacyPopover: () => void;
};

export function NemesisChatComposer({
  textareaRef,
  inputMessage,
  requestStatus,
  showPrivacyNotice,
  isPrivacyPopoverOpen,
  onInputChange,
  onEnter,
  onSend,
  onStop,
  onSkipTyping,
  onAcceptPrivacyNotice,
  onTogglePrivacyPopover,
}: NemesisChatComposerProps) {
  const [isStripExpanded, setIsStripExpanded] = useState(false);
  const intl = useIntl();
  const stopLabel = intl.formatMessage({ defaultMessage: "停止生成", description: "Nemesis 输入框：停止生成按钮的无障碍标签" });
  const skipLabel = intl.formatMessage({ defaultMessage: "直接显示完整回复", description: "Nemesis 输入框：跳过逐字打出按钮的无障碍标签" });
  const sendLabel = intl.formatMessage({ defaultMessage: "发送", description: "Nemesis 输入框：发送按钮" });
  const privacyTitle = intl.formatMessage(NEMESIS_PRIVACY_NOTICE.title);

  return (
    <div className="nm-dock nm-col">
      {showPrivacyNotice && (
        <div className="nm-strip">
          <NemesisIcon name="lock" small className="nm-strip-icon" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>
              <FormattedMessage defaultMessage="聊天记录存在你这台设备的浏览器里；触发安全规则、系统降级或你点了反馈的那几轮会留存到后台。" description="Nemesis 首次访问的隐私提示条" />
            </div>
            {isStripExpanded && (
              <div className="nm-strip-more nm-fade">
                <FormattedMessage defaultMessage="会留存到后台审计的只有三种：触发安全规则的那一轮（比如被拦下或被婉拒）、安全系统临时故障期间的对话，以及你主动点了「反馈」的那一轮，内容是问题、回复和少量上下文。为了生成回复，消息会发送给第三方大模型服务。清理浏览器数据、换设备或用无痕模式，本地记录可能会消失。请不要输入密码、证件号、银行卡、住址等敏感信息。" description="Nemesis 隐私提示条展开后的详情" />
              </div>
            )}
          </div>
          <button
            type="button"
            className="nm-btn plain sm"
            onClick={() => setIsStripExpanded((value) => !value)}
            aria-expanded={isStripExpanded}
          >
            {isStripExpanded
              ? intl.formatMessage({ defaultMessage: "收起", description: "Nemesis 隐私提示条：收起详情" })
              : intl.formatMessage({ defaultMessage: "详情", description: "Nemesis 隐私提示条：展开详情" })}
          </button>
          <button type="button" className="nm-btn ink sm" onClick={onAcceptPrivacyNotice}>
            <FormattedMessage defaultMessage="知道了" description="Nemesis 隐私提示：确认按钮" />
          </button>
        </div>
      )}

      <div className="nm-composer">
        <label className="nm-sr" htmlFor="nemesis-input">
          <FormattedMessage defaultMessage="给 Nemesis 发消息" description="Nemesis 输入框的无障碍标签" />
        </label>
        <textarea
          id="nemesis-input"
          ref={textareaRef}
          value={inputMessage}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onEnter}
          placeholder={intl.formatMessage({ defaultMessage: "问点什么……", description: "Nemesis 输入框占位" })}
          className="nm-ta"
          rows={1}
        />
        <div className="nm-composer-bar">
          <span className="nm-hint nm-desk-only">
            <FormattedMessage defaultMessage="Enter 发送 · Shift + Enter 换行" description="Nemesis 输入框快捷键提示" />
          </span>
          <span style={{ flex: 1 }} />
          {requestStatus === "thinking" && (
            <>
              <span className="nm-send-label"><FormattedMessage defaultMessage="停止" description="Nemesis 输入框：停止生成按钮旁的文字" /></span>
              <button type="button" className="nm-send stop" onClick={onStop} aria-label={stopLabel} title={stopLabel}>
                <NemesisIcon name="stop" small />
              </button>
            </>
          )}
          {requestStatus === "typing" && (
            <>
              <span className="nm-send-label"><FormattedMessage defaultMessage="显示全部" description="Nemesis 输入框：跳过逐字打出按钮旁的文字" /></span>
              <button
                type="button"
                className="nm-send"
                onClick={onSkipTyping}
                aria-label={skipLabel}
                title={skipLabel}
              >
                <NemesisIcon name="skip" />
              </button>
            </>
          )}
          {requestStatus === "idle" && (
            <button
              type="button"
              className="nm-send"
              onClick={onSend}
              disabled={!inputMessage.trim()}
              aria-label={sendLabel}
              title={sendLabel}
            >
              <NemesisIcon name="send" />
            </button>
          )}
        </div>
      </div>

      <div className="nm-legal-line">
        {isPrivacyPopoverOpen && (
          <div className="nm-pop-over" role="dialog" aria-label={privacyTitle}>
            <div className="nm-pop-title">{privacyTitle}</div>
            <ul className="nm-pop-list">
              {NEMESIS_PRIVACY_NOTICE.paragraphs.map((paragraph) => (
                <li key={paragraph.defaultMessage}>{intl.formatMessage(paragraph)}</li>
              ))}
            </ul>
            <div className="nm-pop-foot">
              <span style={{ fontSize: 14, fontWeight: 600 }}>{intl.formatMessage(NEMESIS_PRIVACY_NOTICE.emphasis)}</span>
              <button type="button" className="nm-btn plain" onClick={onTogglePrivacyPopover}>
                <FormattedMessage defaultMessage="知道了" description="Nemesis 隐私提示：确认按钮" />
              </button>
            </div>
          </div>
        )}
        <FormattedMessage defaultMessage="Nemesis 是 AI 影子，不是汪家俊本人。对话记录存在你的浏览器里" description="Nemesis 输入框下方的说明行" /> ·{" "}
        <button
          type="button"
          className="nm-legal"
          onClick={onTogglePrivacyPopover}
          aria-expanded={isPrivacyPopoverOpen}
        >
          <FormattedMessage defaultMessage="隐私说明" description="Nemesis 输入框下方打开隐私说明的按钮" />
        </button>
      </div>
    </div>
  );
}
