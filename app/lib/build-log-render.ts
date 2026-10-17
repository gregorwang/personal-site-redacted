/**
 * 构建记录右侧面板用的纯函数：代码高亮（配色照 cursor.com 实测）和一个够用的 Markdown 渲染。
 * 输入都是 app/data/build-log.ts 里写死的内容，不接受访客输入，所以输出的 HTML 可以直接塞进 innerHTML。
 * 结果按文件对象缓存：同一个文件只算一次，切标签不会重算。
 */
import type { BuildLogFile } from "~/types/build-log";

type CodeFile = Extract<BuildLogFile, { kind: "code" }>;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const KEYWORDS: Partial<Record<CodeFile["lang"], Set<string>>> = {
  py: new Set("import from as def return for in if else elif while with class not and or is lambda try except raise pass yield".split(" ")),
  ts: new Set("import from export interface class private public constructor return const let new if else this type extends implements void await async function as satisfies".split(" ")),
};
const BUILTINS = new Set("int str len range max min print super open float list dict set tuple isinstance".split(" "));
const TOKEN = /("""[^]*?"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|([A-Za-z_]\w*)|([^\w"'`]+)/g;

function highlightValue(line: string, lang: CodeFile["lang"] | "value"): string {
  const keywords = lang === "value" ? undefined : KEYWORDS[lang];
  let out = "";
  let previous = "";
  let lastIdentifier = "";
  for (const match of line.matchAll(TOKEN)) {
    const [token, str, num, id, other] = match;
    const rest = line.slice((match.index ?? 0) + token.length).trimStart();
    if (str) {
      const q = str.startsWith('"""') ? 3 : 1;
      out += `<span class="tq">${escapeHtml(str.slice(0, q))}</span><span class="ts">${escapeHtml(str.slice(q, -q))}</span><span class="tq">${escapeHtml(str.slice(-q))}</span>`;
    } else if (num) {
      out += `<span class="tn">${num}</span>`;
    } else if (id) {
      let cls = "";
      if (keywords?.has(id)) cls = "tk";
      else if (/^(True|False|None|true|false|null)$/.test(id)) cls = "tc";
      else if (id === "self" || id === "this") cls = "tself";
      else if (previous.endsWith(".") && rest.startsWith("(")) cls = "tm";
      else if (BUILTINS.has(id) && rest.startsWith("(")) cls = "tb";
      else if (rest.startsWith("(") || lastIdentifier === "def" || lastIdentifier === "function") cls = "tf";
      else if (/^[A-Z]/.test(id)) cls = "tc";
      out += cls ? `<span class="${cls}">${id}</span>` : id;
      lastIdentifier = id;
    } else {
      out += escapeHtml(other);
    }
    previous = token;
  }
  return out;
}

function highlightLine(line: string, lang: CodeFile["lang"]): string {
  if (lang === "md") {
    if (/^(#|--|>|Description:|Globs:)/.test(line)) return `<span class="${line.startsWith("#") ? "th" : "tcm"}">${escapeHtml(line)}</span>`;
    return escapeHtml(line).replace(/^(\s*)(\d+\.|-)/, '$1<span class="tk">$2</span>');
  }
  if (lang === "yaml" || lang === "json") {
    if (/^\s*#/.test(line)) return `<span class="tcm">${escapeHtml(line)}</span>`;
    const pair = line.match(lang === "yaml" ? /^(\s*-?\s*)([^:"#][^:]*?)(:)(\s.*|$)/ : /^(\s*)("[^"]*")(\s*:)(.*)$/);
    if (pair) return `${escapeHtml(pair[1])}<span class="tc">${escapeHtml(pair[2])}</span>${escapeHtml(pair[3])}${highlightValue(pair[4], "value")}`;
    return highlightValue(line, "value");
  }
  // 行尾注释：前面的引号成对时才算注释
  const comment = line.match(lang === "ts" ? /^(.*?)(\/\/.*)$/ : /^(.*?)(#.*)$/);
  if (comment && comment[1].split('"').length % 2 === 1 && comment[1].split("'").length % 2 === 1) {
    return highlightValue(comment[1], lang) + `<span class="tcm">${escapeHtml(comment[2])}</span>`;
  }
  return highlightValue(line, lang);
}

const codeCache = new WeakMap<CodeFile, string>();

export function renderCode(file: CodeFile): string {
  const cached = codeCache.get(file);
  if (cached) return cached;
  const html = file.content
    .split("\n")
    .map((raw) => {
      let line = raw;
      let cls = "";
      if (file.diff) {
        cls = raw[0] === "+" ? " add" : raw[0] === "-" ? " del" : "";
        line = raw.slice(1);
      }
      return `<span class="ln${cls}">${highlightLine(line, file.lang) || " "}</span>`;
    })
    .join("");
  codeCache.set(file, html);
  return html;
}

function inlineMarkdown(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

const markdownCache = new Map<string, string>();

export function renderMarkdown(source: string): string {
  const cached = markdownCache.get(source);
  if (cached) return cached;
  const out: string[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const body: string[] = [];
      while (++i < lines.length && !lines[i].startsWith("```")) body.push(escapeHtml(lines[i]));
      out.push(`<pre>${body.join("\n")}</pre>`);
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      for (; i < lines.length && lines[i].startsWith("|"); i++) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split("|").map((cell) => inlineMarkdown(cell.trim())));
      }
      i--;
      out.push(`<table>${rows.map((cells, r) => `<tr>${cells.map((c) => (r ? `<td>${c}</td>` : `<th>${c}</th>`)).join("")}</tr>`).join("")}</table>`);
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      out.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    if (line.startsWith(">")) {
      out.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }
    const item = line.match(/^(\s*)(?:[-*]|\d+\.)\s+(.*)/);
    if (item) {
      out.push(`<div class="li" style="padding-left:${item[1].length * 8 + 14}px">${inlineMarkdown(item[2])}</div>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) out.push("<hr>");
    else if (line.trim()) out.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  const html = out.join("");
  markdownCache.set(source, html);
  return html;
}
