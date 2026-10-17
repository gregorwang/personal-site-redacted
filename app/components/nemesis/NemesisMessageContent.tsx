import { ChatAttachmentList } from "./ChatAttachment";
import { TypewriterText } from "./TypewriterText";
import type { ChatAttachment } from "~/types/chat";

type NemesisMessageContentProps = {
  content: string;
  attachments?: ChatAttachment[];
  showAttachments?: boolean;
  useTypewriter?: boolean;
  onTypewriterComplete?: () => void;
};

function PlainTextMessage({ content }: { content: string }) {
  if (!content.trim()) {
    return null;
  }

  return (
    <>
      {content.split(/\n{2,}/).map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 16)}`} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </>
  );
}

export function NemesisMessageContent({
  content,
  attachments,
  showAttachments = true,
  useTypewriter,
  onTypewriterComplete,
}: NemesisMessageContentProps) {
  const shouldShowAttachments = showAttachments && Boolean(attachments?.length);

  if (useTypewriter) {
    return (
      <>
        {content.trim() ? (
          <p className="whitespace-pre-wrap">
            <TypewriterText text={content} speed={15} onComplete={onTypewriterComplete} />
            <span className="nm-caret" aria-hidden="true" />
          </p>
        ) : null}
        {shouldShowAttachments ? <ChatAttachmentList attachments={attachments} /> : null}
      </>
    );
  }

  return (
    <>
      <PlainTextMessage content={content} />
      {shouldShowAttachments ? <ChatAttachmentList attachments={attachments} /> : null}
    </>
  );
}
