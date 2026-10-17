import { resolveNemesisSticker } from "~/nemesis/attachment-catalog.server";
import { resolveNemesisMusic } from "~/nemesis/music-catalog.server";
import { resolveNemesisQuoteText } from "~/nemesis/quote-catalog.server";
import { policyAllowsPersonaExtras, type NemesisModelPolicy } from "~/nemesis/response-policies.server";
import { ensureNemesisFoodVideoAttachment, resolveNemesisVideo } from "~/nemesis/video-catalog";
import { formatMessageForRecentContext } from "~/lib/nemesis-message";
import { detectNemesisPromptLeak, type NemesisLeakCheck } from "~/services/nemesis-leak-guard.server";
import type { ChatAttachment } from "~/types/chat";

export { formatMessageForRecentContext };

// 模型常写成 [sticker: id]、[Sticker：id]，标签里的空格、大小写、全角冒号都要容忍，否则原始标签会显示给用户。
function tagPattern(kind: string) {
  return new RegExp(String.raw`\[\s*${kind}\s*[:：]\s*([a-z0-9_]+)\s*\]`, "gi");
}

const STICKER_TAG_PATTERN = tagPattern("sticker");
const MEDIA_TAG_PATTERN = tagPattern("media");
const VIDEO_TAG_PATTERN = tagPattern("video");
const QUOTE_TAG_PATTERN = tagPattern("quote");
/** 模型偶尔漏掉前缀只写 [stare_suspicious]；只有 id 在白名单里才当附件，正文里普通的方括号不动。 */
const BARE_TAG_PATTERN = /\[\s*([a-z0-9_]+)\s*\]/gi;

export type ParsedNemesisReply = {
  text: string;
  attachments: ChatAttachment[];
};

function normalizeAttachmentId(id: string) {
  return id.trim().toLowerCase();
}

function isKnownAttachmentId(id: string) {
  return Boolean(resolveNemesisSticker(id) || resolveNemesisMusic(id) || resolveNemesisVideo(id));
}

function stripAttachmentTags(rawText: string) {
  return rawText
    .replace(STICKER_TAG_PATTERN, "")
    .replace(MEDIA_TAG_PATTERN, "")
    .replace(VIDEO_TAG_PATTERN, "")
    .replace(BARE_TAG_PATTERN, (match, rawId: string) => (isKnownAttachmentId(normalizeAttachmentId(rawId)) ? "" : match))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function replaceQuoteTags(rawText: string) {
  return rawText.replace(QUOTE_TAG_PATTERN, (_match, rawId: string) => {
    const quote = resolveNemesisQuoteText(normalizeAttachmentId(rawId));
    return quote ? `“${quote}”` : "";
  });
}

function getLastTagId(rawText: string, pattern: RegExp) {
  const matches = [...rawText.matchAll(pattern)];
  if (matches.length === 0) {
    return null;
  }

  const lastMatch = matches[matches.length - 1];
  return normalizeAttachmentId(lastMatch[1] ?? "");
}

function getLastBareId<T>(rawText: string, resolve: (id: string) => T | null) {
  const ids = [...rawText.matchAll(BARE_TAG_PATTERN)].map((match) => normalizeAttachmentId(match[1] ?? ""));
  return ids.reverse().find((id) => resolve(id)) ?? null;
}

export function parseNemesisReply(rawText: string): ParsedNemesisReply {
  const text = stripAttachmentTags(replaceQuoteTags(rawText));
  const attachments: ChatAttachment[] = [];

  const stickerId = getLastTagId(rawText, STICKER_TAG_PATTERN) ?? getLastBareId(rawText, resolveNemesisSticker);
  if (stickerId) {
    const sticker = resolveNemesisSticker(stickerId);
    if (sticker) {
      attachments.push(sticker);
    }
  }

  const mediaId = getLastTagId(rawText, MEDIA_TAG_PATTERN) ?? getLastBareId(rawText, resolveNemesisMusic);
  if (mediaId) {
    const audio = resolveNemesisMusic(mediaId);
    if (audio) {
      attachments.push(audio);
    }
  }

  const videoId = getLastTagId(rawText, VIDEO_TAG_PATTERN) ?? getLastBareId(rawText, resolveNemesisVideo);
  if (videoId) {
    const video = resolveNemesisVideo(videoId);
    if (video) {
      attachments.push(video);
    }
  }

  return { text, attachments };
}

export type FinalizedNemesisReply =
  | { leaked: true; leak: NemesisLeakCheck }
  | { leaked: false; text: string; attachments: ChatAttachment[] };

/**
 * 模型原始输出 → 发给前端的回复。API 路由和评测脚本共用，保证评测看到的就是线上发出去的。
 * 先在原始输出上查原文泄露（quote 标记还没展开），再解析附件标签，最后按策略补美食视频。
 */
export function finalizeNemesisReply(
  rawText: string,
  input: { policy: NemesisModelPolicy; userMessage: string },
): FinalizedNemesisReply {
  const leak = detectNemesisPromptLeak(rawText);
  if (leak.leaked) {
    return { leaked: true, leak };
  }

  const parsed = parseNemesisReply(rawText);
  return {
    leaked: false,
    text: parsed.text.trim(),
    attachments: policyAllowsPersonaExtras(input.policy)
      ? ensureNemesisFoodVideoAttachment(parsed.attachments, input.userMessage)
      : parsed.attachments,
  };
}
