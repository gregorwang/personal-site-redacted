import { readdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stickerDir = join(root, "stickers", "nemesis");
const bucket = "gregorwang";

const contentTypes = {
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const files = readdirSync(stickerDir).filter((name) => extname(name).toLowerCase() in contentTypes);

let failed = 0;

for (const filename of files) {
  const ext = extname(filename).toLowerCase();
  const filePath = join(stickerDir, filename);
  const key = `stickers/nemesis/${filename}`;
  const contentType = contentTypes[ext];

  console.log(`Uploading ${key} ...`);
  const command = `npx wrangler r2 object put "${bucket}/${key}" --file "${filePath}" --content-type "${contentType}"`;
  const result = spawnSync(command, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    failed += 1;
    console.error(`Failed: ${filename}`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`Uploaded ${files.length} stickers to R2 bucket ${bucket}.`);
