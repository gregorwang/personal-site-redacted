import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { imageAssets } from "./image-assets.config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin =
  process.platform === "win32"
    ? join(root, "node_modules", ".bin", "wrangler.cmd")
    : join(root, "node_modules", ".bin", "wrangler");
const rawDir = join(root, "assets", "images", "raw");
const bucket = "gregorwang";
const CDN_BASE = "https://cdn.xn--cckl9nsb.com";
const OSS_BASE = "https://oss.xn--cckl9nsb.com";

mkdirSync(rawDir, { recursive: true });

let failed = 0;

for (const asset of imageAssets) {
  const ext = extname(asset.sourceKey) || ".bin";
  const dest = join(rawDir, `${asset.key}${ext}`);

  if (existsSync(dest)) {
    console.log(`skip (exists): ${asset.key}`);
    continue;
  }

  if (asset.base === "cdn") {
    console.log(`wrangler get: ${asset.sourceKey}`);
    const command = `"${wranglerBin}" r2 object get "${bucket}/${asset.sourceKey}" --file "${dest}"`;
    const result = spawnSync(command, { cwd: root, stdio: "inherit", shell: true });
    if (result.status !== 0) {
      failed += 1;
      console.error(`R2 fetch failed: ${asset.sourceKey}`);
    }
    continue;
  }

  const url = `${OSS_BASE}/${asset.sourceKey.split("/").map(encodeURIComponent).join("/")}`;
  console.log(`http get: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(dest, buffer);
  } catch (error) {
    failed += 1;
    console.error(`HTTP fetch failed: ${asset.sourceKey}`, error);
  }
}

if (failed > 0) {
  console.error(`\n${failed} asset(s) failed to download.`);
  process.exitCode = 1;
} else {
  console.log(`\nDownloaded sources to ${rawDir}`);
}
