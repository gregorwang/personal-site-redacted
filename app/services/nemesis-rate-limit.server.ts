import { checkRateLimit } from "~/lib/rate-limit.server";
import { getEnvVar } from "~/utils/cloudflare-env.server";

const DEFAULT_MAX_PER_MINUTE = 5;
const DEFAULT_MAX_PER_DAY = 50;

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(getEnvVar(name));
  // 必须是正整数：限流 DO 会拒绝非整数 limit（400），配错成 "2.5" 时不能让限流静默失效。
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export async function checkNemesisRateLimit(user: { id: string; email?: string | null }) {
  const key = user.id || user.email || "unknown";
  return checkRateLimit({
    key,
    scope: "nemesis",
    maxPerMinute: getPositiveIntegerEnv("NEMESIS_MAX_PER_MINUTE", DEFAULT_MAX_PER_MINUTE),
    maxPerDay: getPositiveIntegerEnv("NEMESIS_MAX_PER_DAY", DEFAULT_MAX_PER_DAY),
    // 每次放行都会触发付费的 Gemini 分类器和主模型调用；限流 DO 故障时宁可拒绝。
    failClosed: true,
  });
}
