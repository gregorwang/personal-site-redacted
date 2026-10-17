import { NEMESIS_CLASSIFIER_PROMPT } from "~/nemesis/classifier-prompt.server";
import { NEMESIS_MEMORY_CANON } from "~/nemesis/memory-canon.server";
import { getAllNemesisPolicyInstructionTexts } from "~/nemesis/response-policies.server";
import { NEMESIS_SYSTEM_PROMPT } from "~/nemesis/system-prompt.server";

/**
 * 输出侧原文泄露检查：输入侧分类器看不出「分十轮把 canon 拼出来」，
 * 但不管怎么问，只要回复里出现大段与隐藏 prompt / Memory Canon 逐字一致的内容，这里都能拦下。
 *
 * 做法是确定性的子串指纹：把隐藏文本规范化（只保留字母和数字，去掉空白、标点、markdown），
 * 切成固定长度的滑动窗口放进 Set；回复按同样方式规范化后逐窗口查表，统计命中覆盖的字符。
 * 改写、转述不会命中——那是正常使用记忆；要防的是原文整段导出。
 */

/** 窗口长度：16 个规范化字符，大约是半句中文。 */
const WINDOW_SIZE = 16;
/** 连续命中达到这个长度视为整段搬运（canon 单行规范化后 p90 约 33 字，最长 65 字）。 */
const MAX_CONTIGUOUS_MATCH = 48;
/** 零散命中累计达到这个长度也视为泄露。 */
const MAX_TOTAL_MATCH = 100;
/** 回复里出现这么多个 canon 章节标题，视为在列结构。 */
const MAX_STRUCTURE_HITS = 3;
const MIN_HEADING_LENGTH = 6;

export type NemesisLeakCheck = {
  leaked: boolean;
  longestRun: number;
  matchedChars: number;
  structureHits: number;
};

type Fingerprints = {
  windows: Set<string>;
  headings: string[];
};

let fingerprints: Fingerprints | null = null;

function normalizeForFingerprint(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * 示范输出本来就是让模型照着说的：canon 的语气样本，以及 prompt 里用 > 引用的示范回复。
 * 同一段示范可能在 canon 其他章节里重复出现，所以不是删掉某一节，而是把示范文本的窗口整体从指纹里扣掉。
 */
function extractIntendedExamples(canon: string, prompts: string[]) {
  const toneSamples = canon.match(/^#\s*\d+\.\s*Nemesis 语气样本[\s\S]*?(?=^#\s*\d+\.|(?![\s\S]))/m)?.[0] ?? "";
  const quotedExamples = [canon, ...prompts]
    .flatMap((text) => text.split("\n"))
    .filter((line) => line.trimStart().startsWith(">"))
    .map((line) => line.trimStart().slice(1));

  return [toneSamples, ...quotedExamples];
}

function addWindows(target: Set<string>, text: string) {
  const normalized = normalizeForFingerprint(text);
  for (let index = 0; index + WINDOW_SIZE <= normalized.length; index += 1) {
    target.add(normalized.slice(index, index + WINDOW_SIZE));
  }
}

function extractCanonHeadings(canon: string) {
  return [...canon.matchAll(/^#\s*\d+\.\s*(.+)$/gm)]
    .map((match) => normalizeForFingerprint(match[1] ?? ""))
    .filter((heading) => heading.length >= MIN_HEADING_LENGTH);
}

function getFingerprints(): Fingerprints {
  if (fingerprints) {
    return fingerprints;
  }

  // 不收 grok roast prompt：它是要求模型照着刷屏、照着骂的风格稿，不含记忆；
  // 收进来的话，Grok 越听话越容易被误判成泄露、整条回复被换掉。
  const prompts = [NEMESIS_SYSTEM_PROMPT, NEMESIS_CLASSIFIER_PROMPT, ...getAllNemesisPolicyInstructionTexts()];

  const windows = new Set<string>();
  for (const source of [NEMESIS_MEMORY_CANON, ...prompts]) {
    addWindows(windows, source);
  }

  const allowed = new Set<string>();
  for (const example of extractIntendedExamples(NEMESIS_MEMORY_CANON, prompts)) {
    addWindows(allowed, example);
  }
  for (const window of allowed) {
    windows.delete(window);
  }

  fingerprints = { windows, headings: extractCanonHeadings(NEMESIS_MEMORY_CANON) };
  return fingerprints;
}

export function detectNemesisPromptLeak(text: string): NemesisLeakCheck {
  const normalized = normalizeForFingerprint(text);
  const { windows, headings } = getFingerprints();
  const covered = new Uint8Array(normalized.length);

  for (let index = 0; index + WINDOW_SIZE <= normalized.length; index += 1) {
    if (windows.has(normalized.slice(index, index + WINDOW_SIZE))) {
      covered.fill(1, index, index + WINDOW_SIZE);
    }
  }

  let longestRun = 0;
  let currentRun = 0;
  let matchedChars = 0;
  for (const flag of covered) {
    if (flag) {
      currentRun += 1;
      matchedChars += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  const structureHits = headings.filter((heading) => normalized.includes(heading)).length;

  return {
    leaked:
      longestRun >= MAX_CONTIGUOUS_MATCH ||
      matchedChars >= MAX_TOTAL_MATCH ||
      structureHits >= MAX_STRUCTURE_HITS,
    longestRun,
    matchedChars,
    structureHits,
  };
}
