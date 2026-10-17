/* eslint-env node */
// 对比 app/locales/zh.json（npm run i18n:extract 生成的源文案）和各语言词典：
// 列出缺失的翻译（会回落成中文）和过期的翻译（原文已改或已删，ID 变了）。
// 用法：npm run i18n:check            只报告
//       npm run i18n:check -- --strict 有缺失时退出码为 1（以后可放进 CI）
import { readFileSync } from "node:fs";

const LOCALES = ["ja", "en"];
const read = (name) => JSON.parse(readFileSync(new URL(`../app/locales/${name}.json`, import.meta.url), "utf8"));

const source = read("zh");
const sourceIds = Object.keys(source);
let missingTotal = 0;

for (const locale of LOCALES) {
  const catalog = read(locale);
  const missing = sourceIds.filter((id) => !(id in catalog));
  const stale = Object.keys(catalog).filter((id) => !(id in source));
  missingTotal += missing.length;

  console.log(`[${locale}] ${sourceIds.length - missing.length}/${sourceIds.length} translated`);
  for (const id of missing) console.log(`  missing ${id}: ${source[id].defaultMessage}`);
  for (const id of stale) console.log(`  stale   ${id}: ${catalog[id]}`);
}

if (process.argv.includes("--strict") && missingTotal > 0) process.exit(1);
