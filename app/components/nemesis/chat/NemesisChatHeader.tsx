import { defineMessages, useIntl, type MessageDescriptor } from "react-intl";
import { NemesisIcon } from "~/components/nemesis/chat/NemesisIcon";
import type { NemesisRequestStatus } from "~/hooks/useNemesisChat.client";

type NemesisChatHeaderProps = {
  title: string;
  requestStatus: NemesisRequestStatus;
  isLoading: boolean;
  onOpenSidebar: () => void;
  onStartNewSession: () => void;
};

const STATUS_LABELS = defineMessages({
  idle: { defaultMessage: "在线", description: "Nemesis 顶栏状态" },
  thinking: { defaultMessage: "正在思考", description: "Nemesis 顶栏状态" },
  typing: { defaultMessage: "正在回复", description: "Nemesis 顶栏状态" },
}) satisfies Record<NemesisRequestStatus, MessageDescriptor>;

export function NemesisChatHeader({
  title,
  requestStatus,
  isLoading,
  onOpenSidebar,
  onStartNewSession,
}: NemesisChatHeaderProps) {
  const intl = useIntl();
  const statusLabel = intl.formatMessage(STATUS_LABELS[requestStatus]);
  return (
    <header className="nm-head">
      <button type="button" className="nm-icon-btn nm-mobile-only" onClick={onOpenSidebar} aria-label={intl.formatMessage({ defaultMessage: "打开会话列表", description: "Nemesis 手机端打开侧栏按钮" })}>
        <NemesisIcon name="menu" />
      </button>
      <h1 className="nm-title nm-trunc">{title}</h1>
      <span className={`nm-status${requestStatus === "idle" ? "" : ` ${requestStatus}`}`} role="status" aria-live="polite">
        <span className="nm-sd" />
        <span className="nm-desk-only">{statusLabel}</span>
        <span className="nm-sr nm-mobile-only">{statusLabel}</span>
      </span>
      <button
        type="button"
        className="nm-icon-btn nm-mobile-only"
        onClick={onStartNewSession}
        disabled={isLoading}
        aria-label={intl.formatMessage({ defaultMessage: "新对话", description: "Nemesis 新建对话按钮" })}
      >
        <NemesisIcon name="compose" />
      </button>
    </header>
  );
}
