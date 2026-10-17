export type StickerAttachment = {
  type: "sticker";
  id: string;
  url: string;
  alt?: string;
  mime?: "image/webp" | "image/gif";
};

export type AudioAttachment = {
  type: "audio";
  id: string;
  source: "apple_music";
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string;
  trackViewUrl: string;
  previewDurationMs: number;
};

export type VideoAttachment = {
  type: "video";
  id: string;
  source: "r2";
  title: string;
  url: string;
  posterUrl?: string;
  mime: "video/mp4";
};

export type ChatAttachment = StickerAttachment | AudioAttachment | VideoAttachment;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  timestamp: number;
  status?: 'complete' | 'incomplete' | 'failed';
  finishReason?: string;
  modelRoute?: string;
  modelProvider?: string;
  modelName?: string;
  fallbackUsed?: boolean;
  /** 见 NemesisSseDoneEvent.contextSignature。 */
  contextSignature?: string;
}
