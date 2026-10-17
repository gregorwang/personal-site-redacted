import { FormattedMessage } from "react-intl";
import { ChatAudioPlayer } from "./ChatAudioPlayer.client";
import type { ChatAttachment } from "~/types/chat";

type ChatAttachmentListProps = {
  attachments?: ChatAttachment[];
};

export function ChatAttachmentList({ attachments }: ChatAttachmentListProps) {
  if (!attachments?.length) {
    return null;
  }

  return (
    <div className="nm-attachments">
      {attachments.map((attachment) => {
        if (attachment.type === "sticker") {
          return (
            <img
              key={attachment.id}
              src={attachment.url}
              alt={attachment.alt ?? attachment.id}
              loading="lazy"
              decoding="async"
              className="nm-sticker nm-pop"
            />
          );
        }

        if (attachment.type === "audio") {
          return <ChatAudioPlayer key={attachment.id} attachment={attachment} />;
        }

        if (attachment.type === "video") {
          return (
            <figure key={attachment.id} className="nm-video nm-rise">
              {/* Preset short clip; no caption track is available for this R2 asset yet. */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video controls playsInline preload="metadata" poster={attachment.posterUrl}>
                <source src={attachment.url} type={attachment.mime} />
                <FormattedMessage defaultMessage="当前浏览器不支持视频播放。" description="Nemesis 视频附件：浏览器不支持 video 时的回退文字" />
              </video>
              <figcaption>{attachment.title}</figcaption>
            </figure>
          );
        }

        return null;
      })}
    </div>
  );
}
