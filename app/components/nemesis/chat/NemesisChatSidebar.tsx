import { useState } from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import { Link } from "~/components/common/LocaleLink";
import { NemesisIcon } from "~/components/nemesis/chat/NemesisIcon";
import { MAX_NEMESIS_CHAT_SESSIONS } from "~/nemesis/chat-ui-config";
import type { NemesisChatSession } from "~/types/nemesis-chat";

type NemesisChatSidebarProps = {
  sessions: NemesisChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onStartNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatSessionMeta(session: NemesisChatSession, now: Date, intl: IntlShape) {
  if (session.messages.length === 0) {
    return intl.formatMessage({ defaultMessage: "未开始", description: "Nemesis 侧栏：还没有消息的会话" });
  }

  const updated = new Date(session.updatedAt);
  const time = isSameDay(updated, now)
    ? intl.formatTime(updated, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    : intl.formatDate(updated, { month: "short", day: "numeric" });

  return intl.formatMessage(
    { defaultMessage: "{time} · {count} 条", description: "Nemesis 侧栏会话信息，{time} 是更新时间，{count} 是消息条数" },
    { time, count: session.messages.length },
  );
}

export function NemesisChatSidebar({
  sessions,
  activeSessionId,
  isLoading,
  isOpen,
  onClose,
  onStartNewSession,
  onSelectSession,
  onDeleteSession,
}: NemesisChatSidebarProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const intl = useIntl();
  const closeLabel = intl.formatMessage({ defaultMessage: "关闭会话列表", description: "Nemesis 手机端关闭侧栏" });
  const now = new Date();
  const groups = [
    { label: intl.formatMessage({ defaultMessage: "今天", description: "Nemesis 侧栏分组" }), items: sessions.filter((session) => isSameDay(new Date(session.updatedAt), now)) },
    { label: intl.formatMessage({ defaultMessage: "更早", description: "Nemesis 侧栏分组" }), items: sessions.filter((session) => !isSameDay(new Date(session.updatedAt), now)) },
  ].filter((group) => group.items.length > 0);

  return (
    <aside className={`nm-rail${isOpen ? " open" : ""}`} aria-label={intl.formatMessage({ defaultMessage: "会话列表", description: "Nemesis 侧栏的无障碍标签" })}>
      <div className="nm-brand">
        <span className="nm-mark" style={{ width: 36, height: 36 }} aria-hidden="true" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="nm-brand-name">Nemesis</div>
          <div className="nm-brand-sub"><FormattedMessage defaultMessage="汪家俊的 AI 影子" description="Nemesis 侧栏品牌副标题" /></div>
        </div>
        <button type="button" className="nm-icon-btn nm-mobile-only" onClick={onClose} aria-label={closeLabel}>
          <NemesisIcon name="close" />
        </button>
      </div>

      <div style={{ padding: "0 16px 10px" }}>
        <button type="button" className="nm-new" onClick={onStartNewSession} disabled={isLoading}>
          <NemesisIcon name="plus" />
          <FormattedMessage defaultMessage="新对话" description="Nemesis 新建对话按钮" />
        </button>
      </div>

      <nav className="nm-sessions nm-scroll" aria-label={intl.formatMessage({ defaultMessage: "历史对话", description: "Nemesis 侧栏会话导航的无障碍标签" })}>
        {groups.map((group) => (
          <div key={group.label}>
            <div className="nm-group">{group.label}</div>
            {group.items.map((session) => {
              const isActive = session.id === activeSessionId;
              const isConfirming = session.id === confirmingId;

              return (
                <div
                  key={session.id}
                  className={`nm-row${isActive ? " active" : ""}${isConfirming ? " confirming" : ""}`}
                >
                  {isConfirming ? (
                    <div className="nm-confirm">
                      <span className="nm-confirm-text"><FormattedMessage defaultMessage="删除这段对话？" description="Nemesis 侧栏：删除确认" /></span>
                      <button
                        type="button"
                        className="nm-mini danger"
                        onClick={() => {
                          setConfirmingId(null);
                          onDeleteSession(session.id);
                        }}
                      >
                        <FormattedMessage defaultMessage="删除" description="Nemesis 侧栏：确认删除" />
                      </button>
                      <button type="button" className="nm-mini" onClick={() => setConfirmingId(null)}>
                        <FormattedMessage defaultMessage="取消" description="Nemesis 侧栏：取消删除" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="nm-row-main"
                        onClick={() => onSelectSession(session.id)}
                        disabled={isLoading}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <span className="nm-row-title">
                          <span className="nm-dot" />
                          <span className="nm-trunc">{session.title || intl.formatMessage({ defaultMessage: "新的对话", description: "Nemesis 还没有提问的会话标题" })}</span>
                        </span>
                        <span className="nm-row-meta">{formatSessionMeta(session, now, intl)}</span>
                      </button>
                      <button
                        type="button"
                        className="nm-icon-btn nm-row-del"
                        onClick={() => setConfirmingId(session.id)}
                        disabled={isLoading}
                        aria-label={intl.formatMessage({ defaultMessage: "删除这段对话", description: "Nemesis 侧栏：删除会话按钮的无障碍标签" })}
                        title={intl.formatMessage({ defaultMessage: "删除", description: "Nemesis 侧栏：确认删除" })}
                      >
                        <NemesisIcon name="trash" small />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="nm-rail-foot">
        <div className="nm-rail-note">
          <NemesisIcon name="lock" small className="nm-rail-note-icon" />
          <span>
            <FormattedMessage
              defaultMessage="聊天记录存在这台设备的浏览器里，最多保留 {max} 段；少数轮次会留存到后台审计。"
              description="Nemesis 侧栏底部说明，{max} 是最多保留的会话数"
              values={{ max: MAX_NEMESIS_CHAT_SESSIONS }}
            />
          </span>
        </div>
        <Link to="/" className="nm-home">
          <NemesisIcon name="back" small />
          <FormattedMessage defaultMessage="返回首页" description="Nemesis 侧栏底部返回链接" />
        </Link>
      </div>
    </aside>
  );
}
