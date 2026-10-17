import { useCallback, useState } from "react";
import { useIntl } from "react-intl";
import { NemesisChatComposer } from "~/components/nemesis/chat/NemesisChatComposer";
import { NemesisChatHeader } from "~/components/nemesis/chat/NemesisChatHeader";
import { NemesisChatMessageList } from "~/components/nemesis/chat/NemesisChatMessageList";
import { NemesisChatSidebar } from "~/components/nemesis/chat/NemesisChatSidebar";
import { useNemesisChat } from "~/hooks/useNemesisChat.client";

export default function NemesisChatPage() {
  const chat = useNemesisChat();
  const intl = useIntl();
  // 手机端会话抽屉；桌面端侧栏常驻，这个状态只影响 760px 以下的样式。
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const startNewSession = useCallback(() => {
    chat.startNewSession();
    setIsSidebarOpen(false);
  }, [chat]);

  const selectSession = useCallback(
    (sessionId: string) => {
      chat.selectSession(sessionId);
      setIsSidebarOpen(false);
    },
    [chat]
  );

  return (
    <div className="nm-root">
      <NemesisChatSidebar
        sessions={chat.sessions}
        activeSessionId={chat.activeSession?.id ?? null}
        isLoading={chat.isLoading}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onStartNewSession={startNewSession}
        onSelectSession={selectSession}
        onDeleteSession={chat.deleteSession}
      />
      <button
        type="button"
        className={`nm-scrim${isSidebarOpen ? " open" : ""}`}
        onClick={closeSidebar}
        aria-label={intl.formatMessage({ defaultMessage: "关闭会话列表", description: "Nemesis 手机端关闭侧栏" })}
        tabIndex={isSidebarOpen ? 0 : -1}
      />

      <main className="nm-main">
        <NemesisChatHeader
          title={chat.activeSession?.title || intl.formatMessage({ defaultMessage: "新的对话", description: "Nemesis 还没有提问的会话标题" })}
          requestStatus={chat.requestStatus}
          isLoading={chat.isLoading}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onStartNewSession={startNewSession}
        />

        <NemesisChatMessageList
          chatWindowRef={chat.chatWindowRef}
          messages={chat.messages}
          isLoading={chat.isLoading}
          requestStage={chat.requestStage}
          error={chat.error}
          notice={chat.notice}
          typingMessageId={chat.typingMessageId}
          copiedMessageId={chat.copiedMessageId}
          feedbackMessageId={chat.feedbackMessageId}
          feedbackCategory={chat.feedbackCategory}
          feedbackNote={chat.feedbackNote}
          feedbackSubmittingId={chat.feedbackSubmittingId}
          submittedFeedbackIds={chat.submittedFeedbackIds}
          lastSubmittedFeedbackId={chat.lastSubmittedFeedbackId}
          onSuggestion={(text) => void chat.sendMessage(text)}
          onRetry={() => void chat.retryLastMessage()}
          onTypewriterComplete={chat.finishTypingMessage}
          onCopy={chat.copyMessage}
          onRegenerate={(messageId) => void chat.regenerateResponse(messageId)}
          onOpenFeedback={chat.openFeedback}
          onFeedbackCategoryChange={chat.setFeedbackCategory}
          onFeedbackNoteChange={chat.setFeedbackNote}
          onCloseFeedback={chat.closeFeedback}
          onSubmitFeedback={(message) => void chat.submitFeedback(message)}
        />

        <NemesisChatComposer
          textareaRef={chat.textareaRef}
          inputMessage={chat.inputMessage}
          requestStatus={chat.requestStatus}
          showPrivacyNotice={chat.showPrivacyNotice}
          isPrivacyPopoverOpen={chat.isPrivacyPopoverOpen}
          onInputChange={chat.setInputMessage}
          onEnter={chat.handleEnter}
          onSend={() => void chat.sendMessage()}
          onStop={chat.stopGeneration}
          onSkipTyping={chat.skipTyping}
          onAcceptPrivacyNotice={chat.acceptPrivacyNotice}
          onTogglePrivacyPopover={() => chat.setIsPrivacyPopoverOpen((value) => !value)}
        />
      </main>
    </div>
  );
}
