type CounterState = {
  count: number;
  expiresAt: number;
};

type RateLimiterRequest =
  | {
      op: "incrementWindow";
      limit: number;
      windowSeconds: number;
    }
  | {
      op: "checkCooldown";
      cooldownSeconds: number;
    }
  | {
      op: "peek";
    }
  | {
      op: "incrementFixedExpiry";
      expiresAt: number;
    }
  | {
      op: "incrementFixedWindow";
      limit: number;
      expiresAt: number;
    };

const STATE_KEY = "state";

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export class RateLimiterDO {
  constructor(private readonly state: DurableObjectState) {}

  private async loadActiveState(now: number): Promise<CounterState | null> {
    const value = await this.state.storage.get<CounterState>(STATE_KEY);
    if (!value || value.expiresAt <= now) {
      if (value) {
        await this.state.storage.delete(STATE_KEY);
      }
      return null;
    }
    return value;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body: RateLimiterRequest;
    try {
      body = (await request.json()) as RateLimiterRequest;
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    if (body.op === "incrementWindow") {
      if (!isPositiveInteger(body.limit) || !isPositiveInteger(body.windowSeconds)) {
        return Response.json({ error: "Invalid limit/windowSeconds" }, { status: 400 });
      }

      let current = await this.loadActiveState(now);
      if (!current) {
        current = { count: 0, expiresAt: now + body.windowSeconds };
      }

      if (current.count >= body.limit) {
        return Response.json({
          allowed: false,
          remaining: 0,
          resetAt: current.expiresAt,
          count: current.count,
        });
      }

      current.count += 1;
      await this.state.storage.put(STATE_KEY, current);

      return Response.json({
        allowed: true,
        remaining: Math.max(0, body.limit - current.count),
        resetAt: current.expiresAt,
        count: current.count,
      });
    }

    if (body.op === "checkCooldown") {
      if (!isPositiveInteger(body.cooldownSeconds)) {
        return Response.json({ error: "Invalid cooldownSeconds" }, { status: 400 });
      }

      const current = await this.loadActiveState(now);
      if (current) {
        return Response.json({
          allowed: false,
          remainingSeconds: Math.max(0, current.expiresAt - now),
        });
      }

      const next = { count: 1, expiresAt: now + body.cooldownSeconds };
      await this.state.storage.put(STATE_KEY, next);

      return Response.json({
        allowed: true,
        remainingSeconds: 0,
      });
    }

    if (body.op === "peek") {
      const current = await this.loadActiveState(now);
      return Response.json({
        count: current?.count ?? 0,
        expiresAt: current?.expiresAt ?? 0,
      });
    }

    if (body.op === "incrementFixedExpiry") {
      if (!isPositiveInteger(body.expiresAt)) {
        return Response.json({ error: "Invalid expiresAt" }, { status: 400 });
      }

      if (body.expiresAt <= now) {
        await this.state.storage.delete(STATE_KEY);
        return Response.json({
          count: 0,
          expiresAt: body.expiresAt,
        });
      }

      const current = await this.loadActiveState(now);
      const next =
        current && current.expiresAt === body.expiresAt
          ? { count: current.count + 1, expiresAt: current.expiresAt }
          : { count: 1, expiresAt: body.expiresAt };

      await this.state.storage.put(STATE_KEY, next);

      return Response.json(next);
    }

    if (body.op === "incrementFixedWindow") {
      if (!isPositiveInteger(body.limit) || !isPositiveInteger(body.expiresAt)) {
        return Response.json({ error: "Invalid limit/expiresAt" }, { status: 400 });
      }

      if (body.expiresAt <= now) {
        await this.state.storage.delete(STATE_KEY);
        return Response.json({
          allowed: false,
          remaining: 0,
          resetAt: body.expiresAt,
          count: 0,
        });
      }

      const current = await this.loadActiveState(now);
      const count =
        current && current.expiresAt === body.expiresAt
          ? current.count
          : 0;

      if (count >= body.limit) {
        return Response.json({
          allowed: false,
          remaining: 0,
          resetAt: body.expiresAt,
          count,
        });
      }

      const next = {
        count: count + 1,
        expiresAt: body.expiresAt,
      };
      await this.state.storage.put(STATE_KEY, next);

      return Response.json({
        allowed: true,
        remaining: Math.max(0, body.limit - next.count),
        resetAt: next.expiresAt,
        count: next.count,
      });
    }

    return Response.json({ error: "Unknown operation" }, { status: 400 });
  }
}
