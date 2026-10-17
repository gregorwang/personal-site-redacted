import type { LyricLine } from "~/types/lyrics";

const lyricImports: Record<string, () => Promise<{ default: LyricLine[] }>> = {
  "nine-point-eight": () => import("~/data/lyrics/nine-point-eight.json"),
  mashiro: () => import("~/data/lyrics/mashiro.json"),
  connect: () => import("~/data/lyrics/connect.json"),
  shine: () => import("~/data/lyrics/shine.json"),
  moments: () => import("~/data/lyrics/moments.json"),
  goodbye: () => import("~/data/lyrics/goodbye.json"),
  etanikuru: () => import("~/data/lyrics/etanikuru.json"),
  "daisy-crown": () => import("~/data/lyrics/daisy-crown.json"),
  "farewell-star": () => import("~/data/lyrics/farewell-star.json"),
  "alka-tale": () => import("~/data/lyrics/alka-tale.json"),
};

export async function loadHomeLyrics(lyricsId: string): Promise<LyricLine[]> {
  const load = lyricImports[lyricsId];
  if (!load) return [];
  const module = await load();
  return module.default;
}
