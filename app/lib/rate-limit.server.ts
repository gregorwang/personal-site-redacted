import { getRateLimiterBinding } from "~/utils/cloudflare-env.server";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  /** 限流 DO 不可用且调用方要求 fail-closed 时为 true。 */
  unavailable?: boolean;
}

interface CooldownResult {
  allowed: boolean;
  remainingSeconds: number;
  unavailable?: boolean;
}

type FailMode = {
  /**
   * DO 出错时是否拒绝请求。保护昂贵/可被滥用的资源（LLM 调用、发邮件）必须 fail-closed，
   * 否则 DO 故障 = 限流整体失效；留言等低成本场景保持 fail-open 以免误伤用户。
   */
  failClosed?: boolean;
};

type IncrementWindowResponse = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  count: number;
};

type CheckCooldownResponse = {
  allowed: boolean;
  remainingSeconds: number;
};

type PeekResponse = {
  count: number;
  expiresAt: number;
};

async function callRateLimiter<T>(key: string, payload: Record<string, unknown>): Promise<T> {
  const namespace = getRateLimiterBinding();
  const stub = namespace.get(namespace.idFromName(key));

  const response = await stub.fetch("https://rate-limiter/internal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Rate limiter DO request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

async function checkAndIncrementRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  { failClosed = false }: FailMode = {},
): Promise<RateLimitResult> {
  try {
    const result = await callRateLimiter<IncrementWindowResponse>(key, {
      op: "incrementWindow",
      limit,
      windowSeconds,
    });

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: new Date(result.resetAt * 1000),
    };
  } catch (error) {
    console.error("[RateLimit] Durable Object error:", { key, failClosed, error });

    return {
      allowed: !failClosed,
      remaining: failClosed ? 0 : Math.max(0, limit - 1),
      resetAt: new Date(Date.now() + windowSeconds * 1000),
      unavailable: failClosed || undefined,
    };
  }
}

async function checkAndIncrementFixedWindow(
  key: string,
  limit: number,
  expiresAt: number,
  { failClosed = false }: FailMode = {},
): Promise<RateLimitResult> {
  try {
    const result = await callRateLimiter<IncrementWindowResponse>(key, {
      op: "incrementFixedWindow",
      limit,
      expiresAt,
    });

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: new Date(result.resetAt * 1000),
    };
  } catch (error) {
    console.error("[RateLimit] Fixed-window Durable Object error:", { key, failClosed, error });
    return {
      allowed: !failClosed,
      remaining: failClosed ? 0 : Math.max(0, limit - 1),
      resetAt: new Date(expiresAt * 1000),
      unavailable: failClosed || undefined,
    };
  }
}

async function checkCooldown(
  key: string,
  cooldownSeconds: number,
  { failClosed = false }: FailMode = {},
): Promise<CooldownResult> {
  try {
    return await callRateLimiter<CheckCooldownResponse>(key, {
      op: "checkCooldown",
      cooldownSeconds,
    });
  } catch (error) {
    console.error("[RateLimit] Cooldown Durable Object error:", { key, failClosed, error });
    return {
      allowed: !failClosed,
      remainingSeconds: 0,
      unavailable: failClosed || undefined,
    };
  }
}

async function peekCounter(key: string): Promise<PeekResponse> {
  return callRateLimiter<PeekResponse>(key, { op: "peek" });
}

// “每日”额度以东京时区（UTC+9，无夏令时）的自然日为界，
// 与站点其他 JST 时间语义一致；Workers 里 new Date() 是 UTC，直接用会在 JST 上午 9 点才重置。
const DAY_BOUNDARY_UTC_OFFSET_SECONDS = 9 * 3600;

function getEndOfDayTimestamp(): number {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const daySeconds = 86_400;
  const shifted = nowSeconds + DAY_BOUNDARY_UTC_OFFSET_SECONDS;
  const endOfShiftedDay = (Math.floor(shifted / daySeconds) + 1) * daySeconds;
  return endOfShiftedDay - DAY_BOUNDARY_UTC_OFFSET_SECONDS;
}

export type CheckRateLimitResult =
  | { allowed: true; minuteRemaining: number; dayRemaining: number }
  | { allowed: false; reason: "minute" | "day" | "unavailable"; resetAt?: Date };

export async function checkRateLimit(input: {
  key: string;
  scope: string;
  maxPerMinute: number;
  maxPerDay: number;
  /** DO 故障时拒绝请求，而不是放行。保护付费上游（LLM）时应开启。 */
  failClosed?: boolean;
}): Promise<CheckRateLimitResult> {
  const minuteKey = `${input.scope}:${input.key}:minute`;
  const dayKey = `${input.scope}:${input.key}:day`;
  const failMode = { failClosed: input.failClosed };

  const minuteResult = await checkAndIncrementRateLimit(minuteKey, input.maxPerMinute, 60, failMode);
  if (!minuteResult.allowed) {
    return {
      allowed: false,
      reason: minuteResult.unavailable ? "unavailable" : "minute",
      resetAt: minuteResult.resetAt,
    };
  }

  const dayResult = await checkAndIncrementFixedWindow(
    dayKey,
    input.maxPerDay,
    getEndOfDayTimestamp(),
    failMode,
  );
  if (!dayResult.allowed) {
    return {
      allowed: false,
      reason: dayResult.unavailable ? "unavailable" : "day",
      resetAt: dayResult.resetAt,
    };
  }

  return {
    allowed: true,
    minuteRemaining: minuteResult.remaining,
    dayRemaining: dayResult.remaining,
  };
}

const MAGIC_LINK_IP_LIMIT = 10;
const MAGIC_LINK_EMAIL_HOURLY_LIMIT = 3;
const MAGIC_LINK_GLOBAL_HOURLY_LIMIT = 100;
const MAGIC_LINK_COOLDOWN_SECONDS = 60;
const MAGIC_LINK_WINDOW_SECONDS = 3600;

export type MagicLinkSendDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "cooldown" | "email" | "ip" | "global" | "unavailable";
      cooldownSeconds?: number;
      emailRemaining?: number;
    };

export const MagicLinkRateLimitService = {
  /**
   * 发信前原子扣减额度。每一步都是 DO 内的 check-and-increment，并发请求无法同时通过；
   * 按「冷却 → 邮箱 → IP → 全局」顺序串行，前一步拒绝时不会消耗后面的额度。
   * 发信失败不退还额度：防止攻击者用失败请求无限重试。DO 故障时 fail-closed。
   */
  async consumeMagicLinkSend(input: { ip?: string; email: string }): Promise<MagicLinkSendDecision> {
    const email = input.email.toLowerCase();
    const failMode = { failClosed: true };
    const emailHourKey = `email:${email}:magic_link:hour`;

    const cooldown = await checkCooldown(
      `email:${email}:magic_link:cooldown`,
      MAGIC_LINK_COOLDOWN_SECONDS,
      failMode,
    );
    if (!cooldown.allowed) {
      if (cooldown.unavailable) {
        return { allowed: false, reason: "unavailable" };
      }

      const emailRemaining = await peekCounter(emailHourKey)
        .then((state) =>
          state.expiresAt > Math.floor(Date.now() / 1000)
            ? Math.max(0, MAGIC_LINK_EMAIL_HOURLY_LIMIT - state.count)
            : MAGIC_LINK_EMAIL_HOURLY_LIMIT,
        )
        .catch(() => undefined);

      return {
        allowed: false,
        reason: "cooldown",
        cooldownSeconds: cooldown.remainingSeconds,
        emailRemaining,
      };
    }

    const emailLimit = await checkAndIncrementRateLimit(
      emailHourKey,
      MAGIC_LINK_EMAIL_HOURLY_LIMIT,
      MAGIC_LINK_WINDOW_SECONDS,
      failMode,
    );
    if (!emailLimit.allowed) {
      return { allowed: false, reason: emailLimit.unavailable ? "unavailable" : "email" };
    }

    if (input.ip) {
      const ipLimit = await checkAndIncrementRateLimit(
        `ip:${input.ip}:magic_link`,
        MAGIC_LINK_IP_LIMIT,
        MAGIC_LINK_WINDOW_SECONDS,
        failMode,
      );
      if (!ipLimit.allowed) {
        return { allowed: false, reason: ipLimit.unavailable ? "unavailable" : "ip" };
      }
    }

    const globalLimit = await checkAndIncrementRateLimit(
      "global:magic_link:hour",
      MAGIC_LINK_GLOBAL_HOURLY_LIMIT,
      MAGIC_LINK_WINDOW_SECONDS,
      failMode,
    );
    if (!globalLimit.allowed) {
      return { allowed: false, reason: globalLimit.unavailable ? "unavailable" : "global" };
    }

    return { allowed: true };
  },
};

export const MessageRateLimitService = {
  async checkIPRateLimit(ip: string): Promise<boolean> {
    const key = `ip:${ip}:messages`;
    const result = await checkAndIncrementRateLimit(key, 20, 3600);
    return result.allowed;
  },

  async checkUserRateLimit(userId: string): Promise<boolean> {
    const key = `user:${userId}:messages:cooldown`;
    const result = await checkCooldown(key, 60);
    return result.allowed;
  },

  async getUserTodayCount(userId: string): Promise<number> {
    const key = `user:${userId}:messages:today`;

    try {
      const state = await peekCounter(key);
      return state.count;
    } catch (error) {
      console.error("[RateLimit] Get today count error:", error);
      return 0;
    }
  },

  async consumeDailyLimit(userId: string, limit: number = 10): Promise<boolean> {
    const key = `user:${userId}:messages:today`;
    const result = await checkAndIncrementFixedWindow(
      key,
      limit,
      getEndOfDayTimestamp(),
    );
    return result.allowed;
  },
};

export const RateLimitService = MessageRateLimitService;
export const MessageService = MessageRateLimitService;
