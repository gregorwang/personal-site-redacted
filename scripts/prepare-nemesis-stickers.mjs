import { readFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "scripts", "sticker-manifest.json");
const photoMdPath = join(root, "docs", "reference", "nemesis-sticker-semantics-2026-06-13.md");
const stickers = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : parseStickerArrays(readFileSync(photoMdPath, "utf8").trim());

function parseStickerArrays(raw) {
  const parts = raw.split(/\]\s*\[/);
  if (parts.length === 1) {
    return JSON.parse(raw);
  }
  const first = JSON.parse(`${parts[0]}]`);
  const last = JSON.parse(`[${parts[parts.length - 1]}`);
  const middle = parts.slice(1, -1).flatMap((part) => JSON.parse(`[${part}]`));
  return [...first, ...middle, ...last];
}

const outDir = join(root, "stickers", "nemesis");
mkdirSync(outDir, { recursive: true });

const manifest = [];

for (const item of stickers) {
  const src = join(root, "photo", item.original);
  if (!existsSync(src)) {
    console.error(`Missing source file: ${item.original}`);
    process.exitCode = 1;
    continue;
  }

  const ext = extname(item.original).toLowerCase();
  const filename = `${item.id}${ext}`;
  const dest = join(outDir, filename);
  copyFileSync(src, dest);

  manifest.push({
    ...item,
    filename,
    r2Key: `stickers/nemesis/${filename}`,
  });
}

console.log(`Prepared ${manifest.length} stickers in stickers/nemesis/`);

export { manifest };
