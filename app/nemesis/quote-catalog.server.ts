import type { NemesisRecentMessage } from "~/services/nemesis-guard.server";

export type NemesisQuoteIntensity = "low" | "medium" | "high";

export type NemesisQuote = {
  id: string;
  text: string;
  tags: string[];
  triggers: string[];
  avoid: string[];
  intensity: NemesisQuoteIntensity;
};

export const NEMESIS_QUOTE_CATALOG: NemesisQuote[] = [
  {
    id: "fate_distance_001",
    text: "我们之间只是不长不短的缘分。",
    tags: ["缘分", "距离", "告别", "陪伴有限", "关系有限性"],
    triggers: ["缘分", "只能陪", "走一段路", "陪自己", "家人", "告别", "离开"],
    avoid: ["技术问题", "代码", "部署", "RAG", "Cloudflare"],
    intensity: "medium",
  },
  {
    id: "vow_no_drink_001",
    text: "神明大人、佛祖大人、欧德·拉格纳大人。我发誓，此生绝不饮酒。",
    tags: ["誓言", "戒断", "克制", "自我约束"],
    triggers: ["发誓", "戒掉", "不再", "绝不", "克制"],
    avoid: ["技术问题", "代码", "部署", "饮酒建议", "医疗建议"],
    intensity: "medium",
  },
  {
    id: "vow_never_give_up_001",
    text: "神明大人、佛祖大人、欧德·拉格纳大人。我发誓，此生绝不放弃。",
    tags: ["誓言", "坚持", "不放弃", "不低头", "承受"],
    triggers: ["不放弃", "撑下去", "坚持", "低头", "发誓", "选择"],
    avoid: ["技术问题", "代码", "部署", "强烈危机"],
    intensity: "high",
  },
  {
    id: "vow_no_regret_001",
    text: "神明大人、佛祖大人、欧德·拉格纳大人。我发誓，此生绝不后悔自己的选择。",
    tags: ["誓言", "选择", "后悔", "承担", "命运"],
    triggers: ["后悔", "选择", "选错", "承担", "决定", "命运"],
    avoid: ["技术问题", "代码", "部署", "普通寒暄"],
    intensity: "high",
  },
  {
    id: "memory_loved_all_001",
    text: "神明大人、佛祖大人、欧德·拉格纳大人。我发誓，此生绝不忘记我曾爱过的一切。",
    tags: ["记忆", "爱过", "失去", "告别", "曾经重要", "不否定过去", "回不去"],
    triggers: ["以前喜欢", "曾经喜欢", "爱过", "不想忘记", "回不去", "失去", "过去是假的", "告别回忆"],
    avoid: ["技术问题", "代码", "部署", "普通寒暄", "强烈危机"],
    intensity: "high",
  },
  {
    id: "return_home_001",
    text: "神明大人、佛祖大人、欧德·拉格纳大人。我发誓，此生绝不回到故乡。",
    tags: ["故乡", "回不去", "告别", "断绝", "离开"],
    triggers: ["故乡", "家乡", "回不去", "重游故地", "离开", "不回去"],
    avoid: ["技术问题", "代码", "部署", "旅游攻略"],
    intensity: "high",
  },
];

const quoteById = new Map(NEMESIS_QUOTE_CATALOG.map((quote) => [quote.id, quote]));
const TECHNICAL_TERMS = [
  "cloudflare",
  "rag",
  "ai search",
  "vectorize",
  "workers",
  "worker",
  "remix",
  "vite",
  "typescript",
  "代码",
  "部署",
  "数据库",
  "迁移",
  "架构",
  "接口",
  "报错",
];
const CRISIS_TERMS = ["自杀", "轻生", "活不下去", "不想活", "结束生命"];

function compact(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function includesAny(value: string, terms: string[]) {
  const normalized = compact(value);
  return terms.some((term) => normalized.includes(compact(term)));
}

function intensityRank(intensity: "none" | NemesisQuoteIntensity | undefined) {
  if (intensity === "high") {
    return 3;
  }
  if (intensity === "medium") {
    return 2;
  }
  if (intensity === "low") {
    return 1;
  }
  return 0;
}

function quoteLimit(intensity: "none" | NemesisQuoteIntensity | undefined) {
  const rank = intensityRank(intensity);
  if (rank >= 2) {
    return 2;
  }
  if (rank === 1) {
    return 1;
  }
  return 0;
}

function scoreQuote(quote: NemesisQuote, input: { message: string; tags: string[]; intensity?: "none" | NemesisQuoteIntensity }) {
  let score = 0;
  const message = compact(input.message);

  for (const tag of input.tags) {
    if (quote.tags.some((quoteTag) => compact(quoteTag) === compact(tag))) {
      score += 4;
    }
  }

  for (const trigger of quote.triggers) {
    if (message.includes(compact(trigger))) {
      score += 3;
    }
  }

  if (input.intensity && input.intensity !== "none" && quote.intensity === input.intensity) {
    score += 1;
  }

  if (quote.avoid.some((term) => message.includes(compact(term)))) {
    score -= 8;
  }

  return score;
}

function inferRuleTags(message: string): string[] {
  const tags: string[] = [];

  if (includesAny(message, ["缘分", "只能陪", "走一段路", "家人", "陪自己", "离开"])) {
    tags.push("缘分", "距离", "告别");
  }

  if (includesAny(message, ["以前喜欢", "曾经喜欢", "爱过", "不想忘记", "回不去", "过去是假的", "告别回忆"])) {
    tags.push("记忆", "爱过", "失去", "不否定过去");
  }

  if (includesAny(message, ["发誓", "绝不", "不放弃", "不低头", "后悔", "选择"])) {
    tags.push("誓言", "选择", "坚持");
  }

  if (includesAny(message, ["故乡", "家乡", "重游故地", "不回去"])) {
    tags.push("故乡", "回不去", "告别");
  }

  return tags;
}

export function getNemesisQuote(id: string) {
  return quoteById.get(id) ?? null;
}

export function resolveNemesisQuoteText(id: string) {
  return getNemesisQuote(id)?.text ?? null;
}

export function selectNemesisQuoteCandidates(input: {
  message: string;
  recentMessages?: NemesisRecentMessage[];
  quoteTags?: string[];
  quoteIntensity?: "none" | NemesisQuoteIntensity;
}) {
  const message = input.message.trim();
  if (!message || includesAny(message, TECHNICAL_TERMS) || includesAny(message, CRISIS_TERMS)) {
    return [];
  }

  const tags = [...new Set([...inferRuleTags(message), ...(input.quoteTags ?? [])])];
  const intensity =
    input.quoteIntensity && input.quoteIntensity !== "none"
      ? input.quoteIntensity
      : tags.length > 0
        ? "medium"
        : "none";
  const limit = quoteLimit(intensity);

  if (limit === 0 || tags.length === 0) {
    return [];
  }

  return NEMESIS_QUOTE_CATALOG.map((quote) => ({
    quote,
    score: scoreQuote(quote, { message, tags, intensity }),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.quote.id.localeCompare(b.quote.id))
    .slice(0, limit)
    .map((item) => item.quote);
}

export function buildNemesisQuotePromptAppendix(candidates: NemesisQuote[]) {
  if (candidates.length === 0) {
    return "";
  }

  const markerExample = "[quote" + ":语录id]";
  const markerGeneric = "[quote" + ":id]";
  const lines = candidates.map((quote) => {
    const semantics = quote.tags.slice(0, 8).join("、");
    return `${quote.id}：${quote.text} — ${semantics}`;
  });

  return [
    "[Nemesis Quote Candidates]",
    "以下是本轮最多可用的抽象语录候选。它们是风格素材，不代表宿主真实誓言或事实经历。",
    `如果适合引用，只能在正文中单独输出 ${markerExample} 标记；语录 id 必须来自下列候选。`,
    `不要手写、改写、续写、翻译、拆分、润色语录原文。服务端会把 ${markerGeneric} 替换为完整原文。`,
    "引用必须自然嵌入回答：先用一句话说明为什么这句适合当前语境，再输出 quote 标记，随后继续用 1-2 句话回到用户问题。",
    "不要把 quote 标记当作孤立结尾、签名、装饰、口号或最后一句；如果只能硬贴在末尾，就不要使用。",
    "如果不适合引用，就完全不要使用 quote 标记。技术问题、普通寒暄、强危机场景不要使用。",
    ...lines,
  ].join("\n");
}
