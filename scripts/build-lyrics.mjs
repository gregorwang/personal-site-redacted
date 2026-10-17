import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "assets", "lyrics");
const outDir = join(root, "app", "data", "lyrics");

/** @type {Array<{ slug: string, source: string }>} */
const LYRIC_ASSETS = [
  { slug: "nine-point-eight", source: "Nine Point Eight.lrc" },
  { slug: "mashiro", source: "まっしろな雪.lrc" },
  { slug: "connect", source: "コネクト.lrc" },
  { slug: "shine", source: "You're the Shine(Night Butterflies).lrc" },
  { slug: "moments", source: "Moments.lrc" },
  { slug: "goodbye", source: "Goodbye.lrc" },
];

function parseLrc(lrcText) {
  const lyrics = [];

  for (const line of lrcText.split("\n")) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (!match) continue;

    const minutes = Number.parseInt(match[1], 10);
    const seconds = Number.parseInt(match[2], 10);
    const milliseconds = Number.parseInt(match[3].padEnd(3, "0"), 10);
    const time = Math.round((minutes * 60 + seconds + milliseconds / 1000) * 1000) / 1000;
    const text = match[4].trim();

    if (text) {
      lyrics.push({ time, text });
    }
  }

  lyrics.sort((a, b) => a.time - b.time);
  return lyrics;
}

mkdirSync(outDir, { recursive: true });

const existing = new Set(readdirSync(outDir).filter((name) => name.endsWith(".json")));
let wrote = 0;

for (const asset of LYRIC_ASSETS) {
  const sourcePath = join(sourceDir, asset.source);
  const outPath = join(outDir, `${asset.slug}.json`);
  const lyrics = parseLrc(readFileSync(sourcePath, "utf8"));
  writeFileSync(outPath, `${JSON.stringify(lyrics, null, 2)}\n`, "utf8");
  existing.delete(`${asset.slug}.json`);
  wrote += 1;
  console.log(`${asset.source} → ${asset.slug}.json (${lyrics.length} lines)`);
}

for (const stale of existing) {
  console.warn(`skip stale output (no source mapping): ${stale}`);
}

console.log(`\nWrote ${wrote} lyric JSON files → ${outDir}`);
