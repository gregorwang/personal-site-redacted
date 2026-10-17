import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { getDatabaseBinding } from "~/utils/cloudflare-env.server";

type StatementParam = string | number | null | Uint8Array | ArrayBuffer;

function normalizeParam(value: unknown): StatementParam {
  if (value === null || typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return value;
  }

  if (value === undefined) {
    return null;
  }

  return String(value);
}

class D1PreparedStatementWrapper<T = Record<string, unknown>> {
  constructor(private readonly query: string) {}

  private bind(params: unknown[]) {
    return getDatabaseBinding().prepare(this.query).bind(...params.map(normalizeParam));
  }

  async all(...params: unknown[]): Promise<T[]> {
    const result = await this.bind(params).all<T>();
    return (result.results ?? []) as T[];
  }

  async get(...params: unknown[]): Promise<T | undefined> {
    const result = await this.bind(params).first<T>();
    return result ?? undefined;
  }

  async run(...params: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = await this.bind(params).run();
    const meta = result.meta ?? {};

    return {
      changes: Number(meta.changes ?? 0),
      lastInsertRowid: Number(meta.last_row_id ?? 0),
    };
  }
}

type AuthDatabase = {
  user: {
    id: string;
    email: string;
    emailVerified: number;
    name: string | null;
    image: string | null;
    role: string | null;
    banned: number | null;
    banReason: string | null;
    banExpires: number | string | null;
    createdAt: number;
    updatedAt: number;
  };
  session: {
    id: string;
    expiresAt: number;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
    createdAt: number;
    updatedAt: number;
  };
  account: {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    expiresAt: number | null;
    accessTokenExpiresAt: number | null;
    refreshTokenExpiresAt: number | null;
    scope: string | null;
    password: string | null;
    createdAt: number;
    updatedAt: number;
  };
  verification: {
    id: string;
    identifier: string;
    value: string;
    expiresAt: number;
    createdAt: number;
    updatedAt: number;
  };
  messages: {
    id: number;
    user_id: string;
    username: string;
    content: string;
    status: string;
    frequency: number | null;
    created_at: string;
    updated_at: string;
  };
  rate_limits: {
    id: number;
    key: string;
    count: number;
    expires_at: number;
    created_at: number;
  };
};

let authDbCache: Kysely<AuthDatabase> | null = null;
let authDbBinding: D1Database | null = null;

export function getAuthDb(): Kysely<AuthDatabase> {
  const binding = getDatabaseBinding();

  if (!authDbCache || authDbBinding !== binding) {
    authDbBinding = binding;
    authDbCache = new Kysely<AuthDatabase>({
      dialect: new D1Dialect({ database: binding }),
    });
  }

  return authDbCache;
}

export const db = {
  prepare<T = Record<string, unknown>>(query: string) {
    return new D1PreparedStatementWrapper<T>(query);
  },
  async exec(sql: string) {
    return getDatabaseBinding().exec(sql);
  },
};

// Database schema is managed via Wrangler D1 migrations.
export async function initializeDatabase() {
  return;
}

export async function cleanupExpiredRateLimits() {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").run(now);
}
