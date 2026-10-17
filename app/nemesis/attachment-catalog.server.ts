import stickerManifest from "~/nemesis/sticker-manifest.json";
import { getEnvVar } from "~/utils/cloudflare-env.server";

export type StickerMood =
  | "ack"
  | "laugh"
  | "dry_humor"
  | "speechless"
  | "reject"
  | "tired"
  | "think"
  | "warm"
  | "emt"
  | "tech"
  | "site";

export type NemesisSticker = {
  id: string;
  semantics: string[];
  alt: string;
  mood: StickerMood;
  animated: boolean;
  filename: string;
  r2Key: string;
  mime: "image/webp" | "image/gif";
};

type StickerManifestEntry = {
  original: string;
  id: string;
  semantics: string[];
  alt: string;
  mood: StickerMood;
  animated: boolean;
};

function stickerFilename(entry: StickerManifestEntry) {
  const extension = entry.original.slice(entry.original.lastIndexOf(".")).toLowerCase();
  return `${entry.id}${extension}`;
}

function stickerMime(filename: string): NemesisSticker["mime"] {
  return filename.endsWith(".gif") ? "image/gif" : "image/webp";
}

export const NEMESIS_STICKER_CATALOG: NemesisSticker[] = (stickerManifest as StickerManifestEntry[]).map(
  (entry) => {
    const filename = stickerFilename(entry);
    return {
      id: entry.id,
      semantics: entry.semantics,
      alt: entry.alt,
      mood: entry.mood,
      animated: entry.animated,
      filename,
      r2Key: `stickers/nemesis/${filename}`,
      mime: stickerMime(filename),
    };
  }
);

const stickerById = new Map(NEMESIS_STICKER_CATALOG.map((sticker) => [sticker.id, sticker]));

export function getStickerPublicBaseUrl() {
  const appUrl = getEnvVar("APP_URL")?.replace(/\/+$/, "");
  return appUrl ? `${appUrl}/stickers/nemesis` : "/stickers/nemesis";
}

export function getStickerPublicUrl(sticker: NemesisSticker) {
  return `${getStickerPublicBaseUrl()}/${sticker.filename}`;
}

export function getNemesisSticker(id: string) {
  return stickerById.get(id) ?? null;
}

export function resolveNemesisSticker(id: string) {
  const sticker = getNemesisSticker(id);
  if (!sticker) {
    return null;
  }

  return {
    type: "sticker" as const,
    id: sticker.id,
    url: getStickerPublicUrl(sticker),
    alt: sticker.alt,
    mime: sticker.mime,
  };
}

export function buildNemesisStickerPromptAppendix() {
  const lines = NEMESIS_STICKER_CATALOG.map((sticker) => {
    const semantics = sticker.semantics.slice(0, 6).join("、");
    return `${sticker.id}：${semantics}`;
  });

  return [
    "[Nemesis Sticker Catalog]",
    "如需发表情包，在回复末尾单独一行写 [sticker:贴纸id]，贴纸 id 必须来自下列列表，最多一张。",
    "不要每条都发；只有语气合适时才发。EMT 类贴纸要克制，不要频繁。",
    ...lines,
  ].join("\n");
}
