import type { NemesisQuoteIntensity } from "~/nemesis/quote-catalog.server";

/**
 * 路由字段由统一分类器（nemesis-guard.server.ts）和安全策略在同一次 Gemini 调用里给出；
 * 这里只负责把模型输出的 unknown 值收敛到受控 union 和默认值。
 */

export type NemesisQueryType =
  | "FACT_QUERY"
  | "REASONING_QUERY"
  | "COMPLEX_QUERY"
  | "STYLE_OR_PERSONA_QUERY"
  | "ROAST_TRIGGER"
  | "FOLLOW_UP"
  | "UNKNOWN";

export type NemesisPreferredRoute = "gemini_lite" | "grok_complex" | "grok_roast";

export type NemesisQuoteIntensityHint = "none" | NemesisQuoteIntensity;

export type NemesisQueryRouteDecision = {
  queryType: NemesisQueryType;
  preferredRoute: NemesisPreferredRoute;
  confidence: number;
  reason: string;
  quoteTags: string[];
  quoteIntensity: NemesisQuoteIntensityHint;
};

const VALID_QUERY_TYPES = new Set<NemesisQueryType>([
  "FACT_QUERY",
  "REASONING_QUERY",
  "COMPLEX_QUERY",
  "STYLE_OR_PERSONA_QUERY",
  "ROAST_TRIGGER",
  "FOLLOW_UP",
  "UNKNOWN",
]);

const VALID_PREFERRED_ROUTES = new Set<NemesisPreferredRoute>([
  "gemini_lite",
  "grok_complex",
  "grok_roast",
]);
const VALID_QUOTE_INTENSITIES = new Set<NemesisQuoteIntensityHint>(["none", "low", "medium", "high"]);

export const DEFAULT_NEMESIS_ROUTE_DECISION: NemesisQueryRouteDecision = {
  queryType: "UNKNOWN",
  preferredRoute: "gemini_lite",
  confidence: 0,
  reason: "Default route",
  quoteTags: [],
  quoteIntensity: "none",
};

function normalizeQueryType(value: unknown): NemesisQueryType {
  return typeof value === "string" && VALID_QUERY_TYPES.has(value as NemesisQueryType)
    ? (value as NemesisQueryType)
    : "UNKNOWN";
}

function normalizePreferredRoute(value: unknown, queryType: NemesisQueryType): NemesisPreferredRoute {
  if (typeof value === "string") {
    if (value === "workers_roast") {
      return "grok_roast";
    }
    if (value === "gemini_flash") {
      return "grok_complex";
    }
    if (VALID_PREFERRED_ROUTES.has(value as NemesisPreferredRoute)) {
      return value as NemesisPreferredRoute;
    }
  }

  if (queryType === "ROAST_TRIGGER") {
    return "grok_roast";
  }

  if (queryType === "COMPLEX_QUERY") {
    return "grok_complex";
  }

  return "gemini_lite";
}

function normalizeQuoteTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeQuoteIntensity(value: unknown): NemesisQuoteIntensityHint {
  return typeof value === "string" && VALID_QUOTE_INTENSITIES.has(value as NemesisQuoteIntensityHint)
    ? (value as NemesisQuoteIntensityHint)
    : "none";
}

/** record 来自模型输出的 JSON，所有字段都按 unknown 处理。 */
export function normalizeNemesisRouteDecision(record: Record<string, unknown>): NemesisQueryRouteDecision {
  const queryType = normalizeQueryType(record.queryType);
  const confidence =
    typeof record.confidence === "number" && Number.isFinite(record.confidence) ? record.confidence : 0;

  return {
    queryType,
    preferredRoute: normalizePreferredRoute(record.preferredRoute, queryType),
    confidence,
    reason: typeof record.reason === "string" ? record.reason : "No reason",
    quoteTags: normalizeQuoteTags(record.quoteTags),
    quoteIntensity: normalizeQuoteIntensity(record.quoteIntensity),
  };
}
