import musicManifest from "~/nemesis/music-manifest.json";
import type { NemesisRecentMessage } from "~/services/nemesis-guard.server";
import type { AudioAttachment } from "~/types/chat";

export type NemesisMusicEntry = {
  id: string;
  trackId: number;
  lookupCountry?: "CN";
  semantics: string[];
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string;
  trackViewUrl: string;
  previewDurationMs: number;
};

export const NEMESIS_MUSIC_CATALOG: NemesisMusicEntry[] = musicManifest as NemesisMusicEntry[];

const musicById = new Map(NEMESIS_MUSIC_CATALOG.map((track) => [track.id, track]));

export const DEFAULT_PREVIEW_DURATION_MS = 30_000;

export function getNemesisMusic(id: string) {
  return musicById.get(id) ?? null;
}

export function resolveNemesisMusic(id: string): AudioAttachment | null {
  const track = getNemesisMusic(id);
  if (!track || !track.previewUrl || !track.trackViewUrl) {
    return null;
  }

  return {
    type: "audio",
    id: track.id,
    source: "apple_music",
    title: track.title,
    artist: track.artist,
    previewUrl: track.previewUrl,
    artworkUrl: track.artworkUrl,
    trackViewUrl: track.trackViewUrl,
    previewDurationMs: track.previewDurationMs || DEFAULT_PREVIEW_DURATION_MS,
  };
}

export function buildNemesisMusicPromptAppendix() {
  const lines = NEMESIS_MUSIC_CATALOG.map((track) => {
    const semantics = track.semantics.slice(0, 8).join("、");
    return `${track.id}：${track.title}（${track.artist}）— ${semantics}`;
  });

  return [
    "[Nemesis Music Catalog]",
    "如需推歌试听，在回复末尾单独一行写 [media:曲目id]，曲目 id 必须来自下列列表，最多一首。",
    "可与 [sticker:贴纸id] 同时出现（各最多一个）；贴纸在上、音乐在下。",
    "放歌礼仪（必须）：正文里先用一两句自然口语交代为何放歌（例如欢迎你来了、家俊想请你听一首他挑的歌、希望你喜欢），再写 [media:...]。禁止无铺垫、正文与曲目情绪脱节时硬贴播放器。",
    "仅在用户明确要听歌、好友来访接待、或难过/感动等情绪且曲目真的合适时使用；不要每条都推。",
    "温柔接待好友来访：老周来访优先 Key 社曲（见 Friend visit 提示）；勿用 john_harukaze（偏节奏R&B）、deco_monitoring、rick_never_gonna 等梗曲/魔性曲。",
    "key_eternicus 与 EMT/Re:0 无关，不要在聊 EMT 时硬推此曲。",
    "只输出 id 标记，不要输出 previewUrl 或任何裸链。",
    ...lines,
  ].join("\n");
}

const FRIEND_VISIT_MUSIC_HINTS: Record<string, { label: string; trackIds: string[] }> = {
  老周: {
    label: "老周来访",
    trackIds: ["key_finisterre", "key_eternicus"],
  },
  阿浩: {
    label: "阿浩来访",
    trackIds: ["miku_ride_conformism"],
  },
  friend_b: {
    label: "阿浩来访",
    trackIds: ["miku_ride_conformism"],
  },
};

export function buildFriendVisitAttachmentHint(
  message: string,
  recentMessages: NemesisRecentMessage[] = [],
) {
  const transcript = [...recentMessages, { role: "user" as const, text: message }]
    .map((item) => item.text)
    .join("\n");

  for (const [token, hint] of Object.entries(FRIEND_VISIT_MUSIC_HINTS)) {
    if (!transcript.includes(token)) {
      continue;
    }

    return [
      `[Friend visit — ${hint.label}]`,
      "若要附试听：正文先用口语说明「你来了呀」「家俊想请你听一首」之类，再在末尾单独一行写 [media:曲目id]。",
      `曲目 id 优先：${hint.trackIds.join("、")}。`,
      "禁止无铺垫只贴 [media:...]；禁止 john_harukaze、燃曲、梗曲、魔性曲。老周来访只推 Key 社曲（key_finisterre、key_eternicus）。",
    ].join("\n");
  }

  return null;
}
