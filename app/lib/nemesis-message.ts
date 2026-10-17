import type { AudioAttachment, ChatAttachment, StickerAttachment, VideoAttachment } from "~/types/chat";

function getStickerAttachment(attachments?: ChatAttachment[]) {
  return attachments?.find((item): item is StickerAttachment => item.type === "sticker");
}

function getAudioAttachment(attachments?: ChatAttachment[]) {
  return attachments?.find((item): item is AudioAttachment => item.type === "audio");
}

function getVideoAttachment(attachments?: ChatAttachment[]) {
  return attachments?.find((item): item is VideoAttachment => item.type === "video");
}

function buildAttachmentNotes(
  attachments: ChatAttachment[] | undefined,
  format: "context" | "copy"
) {
  const notes: string[] = [];
  const sticker = getStickerAttachment(attachments);
  const audio = getAudioAttachment(attachments);
  const video = getVideoAttachment(attachments);

  if (sticker) {
    if (format === "context") {
      const label = sticker.alt?.trim() || sticker.id;
      notes.push(`[Nemesis 发了一张表情包：${label}]`);
    } else {
      notes.push(`[表情包: ${sticker.id}]`);
    }
  }

  if (audio) {
    if (format === "context") {
      notes.push(`[Nemesis 推了一首歌：${audio.title}]`);
    } else {
      notes.push(`[音乐: ${audio.id}]`);
    }
  }

  if (video) {
    if (format === "context") {
      notes.push(`[Nemesis 发了一个视频：${video.title}]`);
    } else {
      notes.push(`[视频: ${video.id}]`);
    }
  }

  return notes;
}

function appendAttachmentNotes(content: string, notes: string[]) {
  if (notes.length === 0) {
    return content;
  }

  const suffix = notes.join("\n");
  if (!content.trim()) {
    return suffix;
  }

  return `${content}\n${suffix}`;
}

export function formatMessageForRecentContext(content: string, attachments?: ChatAttachment[]) {
  return appendAttachmentNotes(content, buildAttachmentNotes(attachments, "context"));
}

export function formatMessageForCopy(content: string, attachments?: ChatAttachment[]) {
  return appendAttachmentNotes(content, buildAttachmentNotes(attachments, "copy"));
}

export function formatAssistantMessageForFeedback(content: string, attachments?: ChatAttachment[]) {
  return formatMessageForCopy(content, attachments);
}

function isStickerAttachment(value: unknown): value is StickerAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.type === "sticker" &&
    typeof record.id === "string" &&
    typeof record.url === "string"
  );
}

function isAudioAttachment(value: unknown): value is AudioAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.type === "audio" &&
    record.source === "apple_music" &&
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.artist === "string" &&
    typeof record.previewUrl === "string" &&
    typeof record.artworkUrl === "string" &&
    typeof record.trackViewUrl === "string" &&
    typeof record.previewDurationMs === "number"
  );
}

function isVideoAttachment(value: unknown): value is VideoAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.type === "video" &&
    record.source === "r2" &&
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.url === "string" &&
    (record.posterUrl === undefined || typeof record.posterUrl === "string") &&
    record.mime === "video/mp4"
  );
}

function isChatAttachment(value: unknown): value is ChatAttachment {
  return isStickerAttachment(value) || isAudioAttachment(value) || isVideoAttachment(value);
}

export function isValidAttachments(value: unknown): value is ChatAttachment[] {
  return Array.isArray(value) && value.every(isChatAttachment);
}
