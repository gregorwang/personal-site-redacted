import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import process from "node:process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const uploadManifestPath = join(root, "dist", "upload-manifest.json");
const bucket = "gregorwang";
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const CDN_BASE = "https://cdn.xn--cckl9nsb.com";
// 队列是全站所有图片的所有宽度档（500+ 个），逐个串行检查要好几分钟，所以检查和上传都并发跑
const CHECK_CONCURRENCY = 64;
const UPLOAD_CONCURRENCY = 4;

/** 文件名带内容 hash，CDN 上已经有同名对象就说明内容相同，不必重传 */
async function existsOnCdn(r2Key) {
  const url = `${CDN_BASE}/${r2Key.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/** 最多 limit 个任务同时跑，结果按原顺序返回 */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * 命令以 npx 开头：Windows 的 cmd 遇到以引号开头、里面还有别的引号的命令行，会把首尾引号剥掉，
 * 带引号的 wrangler.cmd 绝对路径（含中文目录）会被拆坏。
 */
function upload(item) {
  const command = [
    "npx wrangler r2 object put",
    `"${bucket}/${item.r2Key}"`,
    "--file",
    `"${item.localFile}"`,
    "--content-type",
    `"${item.contentType}"`,
    "--cache-control",
    `"${CACHE_CONTROL}"`,
  ].join(" ");
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: root, shell: true });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => {
      if (code === 0) console.log(`uploaded ${item.r2Key}`);
      else console.error(`FAILED ${item.r2Key}\n${output.trim().slice(-800)}`);
      resolve(code === 0);
    });
  });
}

if (!existsSync(uploadManifestPath)) {
  console.error("Missing dist/upload-manifest.json — run npm run images:process first.");
  process.exit(1);
}

/** @type {Array<{ localFile: string, r2Key: string, base: string, contentType: string }>} */
const queue = JSON.parse(readFileSync(uploadManifestPath, "utf8"));
const started = Date.now();

const onCdn = await mapLimit(queue, CHECK_CONCURRENCY, (item) => existsOnCdn(item.r2Key));
const pending = queue.filter((_, index) => !onCdn[index]);
console.log(`${queue.length} object(s) in queue, ${queue.length - pending.length} already on CDN, ${pending.length} to upload.`);

const uploaded = await mapLimit(pending, UPLOAD_CONCURRENCY, upload);
const failed = uploaded.filter((ok) => !ok).length;

console.log(`\nUploaded ${pending.length - failed} object(s), ${failed} failed, in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
if (failed > 0) process.exit(1);
