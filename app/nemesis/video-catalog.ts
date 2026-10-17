import type { ChatAttachment, VideoAttachment } from "~/types/chat";

export type NemesisVideoEntry = {
  id: string;
  title: string;
  url: string;
  posterUrl?: string;
  mime: "video/mp4";
  semantics: string[];
};

export const NEMESIS_VIDEO_CATALOG: NemesisVideoEntry[] = [
  {
    id: "kita_omurice",
    title: "喜多的蛋包饭名场面",
    url: "https://oss.xn--cckl9nsb.com/animie1.mp4",
    mime: "video/mp4",
    semantics: ["美食", "吃饭", "蛋包饭", "料理", "好吃", "饿了", "孤独摇滚", "喜多"],
  },
];

const videoById = new Map(NEMESIS_VIDEO_CATALOG.map((video) => [video.id, video]));

const FOOD_TOPIC_PATTERNS = [
  /美食/u,
  /吃饭/u,
  /吃点/u,
  /好吃/u,
  /饿/u,
  /蛋包饭/u,
  /料理/u,
  /做饭/u,
  /下厨/u,
  /餐厅/u,
  /晚饭/u,
  /午饭/u,
  /早饭/u,
  /夜宵/u,
  /甜品/u,
  /食物/u,
  /菜/u,
  /food/i,
  /meal/i,
  /cooking/i,
  /omurice/i,
];

export function getNemesisVideo(id: string) {
  return videoById.get(id) ?? null;
}

export function resolveNemesisVideo(id: string): VideoAttachment | null {
  const video = getNemesisVideo(id);
  if (!video?.url) {
    return null;
  }

  return {
    type: "video",
    id: video.id,
    source: "r2",
    title: video.title,
    url: video.url,
    posterUrl: video.posterUrl,
    mime: video.mime,
  };
}

export function getNemesisFoodVideoAttachment(message: string): ChatAttachment | null {
  const normalized = message.trim();
  if (!normalized) {
    return null;
  }

  const isFoodTopic = FOOD_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized));
  return isFoodTopic ? resolveNemesisVideo("kita_omurice") : null;
}

export function appendUniqueAttachment(attachments: ChatAttachment[], attachment: ChatAttachment | null) {
  if (!attachment) {
    return attachments;
  }

  if (attachments.some((item) => item.type === attachment.type && item.id === attachment.id)) {
    return attachments;
  }

  return [...attachments, attachment];
}

export function ensureNemesisFoodVideoAttachment(attachments: ChatAttachment[] = [], message: string) {
  return appendUniqueAttachment(attachments, getNemesisFoodVideoAttachment(message));
}
