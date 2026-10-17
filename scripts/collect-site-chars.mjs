// Collects the CJK ideographs the site actually renders, so build-font-subsets.py can put them
// into the first font slices. Needs the dev server running (default http://localhost:3000) and
// playwright-core + a Chromium install. Output is committed; the font build never runs this.
//
//   node scripts/collect-site-chars.mjs [baseUrl]
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const playwrightPaths = [
  "playwright-core",
  path.join(process.env.APPDATA ?? "", "npm/node_modules/@playwright/test/node_modules/playwright-core"),
];
let chromium;
for (const candidate of playwrightPaths) {
  try {
    ({ chromium } = require(candidate));
    break;
  } catch {}
}
if (!chromium) throw new Error("playwright-core not found");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "scripts/data/site-core-chars.json");
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

const OTHER = ["/updates", "/gallery", "/anime", "/game", "/music", "/cv", "/xiao", "/chat"];
// Tiers are ordered: a character lives in the first tier that needs it, so a zh visitor never
// downloads a slice made for ja-only characters.
const TIERS = [
  { name: "zh-home", pages: ["/"] },
  { name: "zh-site", pages: OTHER, locales: ["zh.json"] },
  { name: "ja-site", pages: ["/ja", ...OTHER.map((p) => `/ja${p}`)], locales: ["ja.json"] },
];

const isHan = (ch) => ch >= "一" && ch <= "鿿";
const hanOf = (text) => new Set([...text].filter(isHan));

// Runs inside every page before its scripts. Records ideographs from text nodes that are really
// laid out (skips <style>/<script>/<head>, display:none...) including transient text such as the
// typewriter terminal and rotating copy, which a one-off snapshot would miss. opacity:0 text still
// counts: the browser downloads font slices for it.
function installRecorder() {
  const seen = new Set();
  window.__siteHan = seen;
  const record = (node) => {
    const parent = node.parentElement;
    if (!parent || !parent.checkVisibility({ visibilityProperty: true })) return;
    for (const ch of node.data) if (ch >= "一" && ch <= "鿿") seen.add(ch);
  };
  // placeholders render like text but are attributes, not text nodes.
  const recordPlaceholder = (el) => {
    const text = el.getAttribute("placeholder");
    if (!text || !el.checkVisibility({ visibilityProperty: true })) return;
    for (const ch of text) if (ch >= "一" && ch <= "鿿") seen.add(ch);
  };
  const scan = (root) => {
    if (root.nodeType === 3) return record(root);
    if (root.nodeType === 1) {
      recordPlaceholder(root);
      root.querySelectorAll("[placeholder]").forEach(recordPlaceholder);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) record(n);
  };
  window.__siteHanScan = () => scan(document.documentElement);
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData") record(m.target);
      else m.addedNodes.forEach(scan);
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
}

async function renderedChars(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  // Lazy sections mount only after they sit in the viewport long enough to import their chunk,
  // so dwell at every scroll position instead of flying past.
  for (let round = 0; round < 2; round++) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += 450) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(450);
      await page.evaluate(() => window.__siteHanScan());
    }
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__siteHanScan());
  }
  // Rotating / typed copy: keep sampling at the bottom of the page.
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__siteHanScan());
  }
  return new Set(await page.evaluate(() => [...window.__siteHan]));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
await context.addInitScript(`(${installRecorder.toString()})()`);
const page = await context.newPage();

const seen = new Set();
const tiers = {};
for (const tier of TIERS) {
  const chars = new Set();
  for (const route of tier.pages) {
    const found = await renderedChars(page, BASE + route);
    found.forEach((c) => chars.add(c));
    console.log(`${tier.name.padEnd(8)} ${route.padEnd(16)} ${found.size}`);
  }
  // Strings that only appear after interaction (dialogs, errors, toasts) live in the locale catalogs.
  for (const file of tier.locales ?? []) {
    hanOf(readFileSync(path.join(ROOT, "app/locales", file), "utf8")).forEach((c) => chars.add(c));
  }
  const fresh = [...chars].filter((c) => !seen.has(c)).sort();
  fresh.forEach((c) => seen.add(c));
  tiers[tier.name] = fresh.join("");
  console.log(`=> ${tier.name}: ${fresh.length} new chars`);
}
await browser.close();

writeFileSync(OUT, JSON.stringify(tiers, null, 2) + "\n");
console.log(`wrote ${path.relative(ROOT, OUT)} (${seen.size} chars total)`);
