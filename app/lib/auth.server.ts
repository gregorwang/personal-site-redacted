import { redirect } from "react-router";
import { betterAuth } from "better-auth";
import { admin, magicLink, oneTap } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getAuthDb } from "./db.server";
import { sendMagicLinkEmail } from "./email.server";
import { MagicLinkRateLimitService } from "./rate-limit.server";
import { getEnvVar } from "~/utils/cloudflare-env.server";
import { getClientIP } from "~/utils/request.server";

const LOCAL_APP_URL = "http://localhost:3000";
const DEFAULT_PRODUCTION_APP_URL = "https://xn--cckl9nsb.com";
const DEFAULT_MICROSOFT_WORKER_REDIRECT_URI =
  "https://my-remix-worker.your-subdomain.workers.dev/api/auth/callback/microsoft";

function normalizeOrigin(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return new URL(value.trim()).origin;
}

function normalizeCredential(value: string | undefined) {
  const normalized = value?.replace(/^\uFEFF/, "").trim();
  return normalized || undefined;
}

function getProductionAppOrigin() {
  return normalizeOrigin(getEnvVar("BETTER_AUTH_URL")) || normalizeOrigin(getEnvVar("APP_URL")) || DEFAULT_PRODUCTION_APP_URL;
}

function buildMagicLinkRateLimitMessage(input: {
  cooldownSeconds?: number;
  emailRemaining?: number;
}) {
  if (input.cooldownSeconds && input.cooldownSeconds > 0) {
    const remainingText =
      typeof input.emailRemaining === "number" && input.emailRemaining > 0
        ? ` · 今天还剩 ${input.emailRemaining} 次`
        : "";
    return `请等待 ${input.cooldownSeconds} 秒后再试${remainingText}`;
  }

  return "请求过于频繁，请稍后再试";
}

export function getAuthBaseURL(request?: Request) {
  const requestOrigin = request ? new URL(request.url).origin : undefined;
  if (requestOrigin?.startsWith(LOCAL_APP_URL)) {
    return LOCAL_APP_URL;
  }

  return getProductionAppOrigin();
}

function createAuth(request?: Request) {
  const requestOrigin = request ? new URL(request.url).origin : undefined;
  const productionAppUrl = getProductionAppOrigin();
  const appUrl = getAuthBaseURL(request);
  const isLocalhost = appUrl.startsWith(LOCAL_APP_URL);
  const microsoftWorkerRedirectURI = getEnvVar("MICROSOFT_REDIRECT_URI") || DEFAULT_MICROSOFT_WORKER_REDIRECT_URI;
  const microsoftRedirectURI = isLocalhost
    ? `${LOCAL_APP_URL}/api/auth/callback/microsoft`
    : microsoftWorkerRedirectURI;
  const trustedOrigins = [
    appUrl,
    productionAppUrl,
    requestOrigin,
    normalizeOrigin(getEnvVar("APP_URL")),
    normalizeOrigin(getEnvVar("BETTER_AUTH_URL")),
    normalizeOrigin(getEnvVar("MICROSOFT_AUTH_BASE_URL")),
    new URL(microsoftWorkerRedirectURI).origin,
    LOCAL_APP_URL,
  ].filter((origin, index, origins): origin is string => Boolean(origin) && origins.indexOf(origin) === index);

  const configuredSecret =
    normalizeCredential(getEnvVar("BETTER_AUTH_SECRET")) ||
    normalizeCredential(getEnvVar("AUTH_KEY_SECRET"));
  // 生产（https）绝不能落到硬编码 secret，否则 session cookie 可被伪造；本地 http 允许开发兜底。
  if (!configuredSecret && !isLocalhost) {
    throw new Error("BETTER_AUTH_SECRET is required in production (set it with `wrangler secret put BETTER_AUTH_SECRET`)");
  }

  return betterAuth({
    database: {
      db: getAuthDb(),
      type: "sqlite",
    },
    baseURL: appUrl,
    secret: configuredSecret || "dev-only-better-auth-secret-change-me",
    appName: getEnvVar("APP_NAME") || "MyRemixApp",
    trustedOrigins,
    logger: {
      level: isLocalhost ? "debug" : "warn",
      log(level, message, ...args) {
        console.log(`[BetterAuth:${level}] ${message}`, ...args);
      },
    },
    onAPIError: {
      onError(error, ctx) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.error("[BetterAuth:onAPIError]", {
          ctx,
          message,
          stack,
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    socialProviders: {
      google: {
        clientId: getEnvVar("GOOGLE_CLIENT_ID") || "",
        clientSecret: getEnvVar("GOOGLE_CLIENT_SECRET") || "",
      },
      microsoft: {
        clientId: getEnvVar("MICROSOFT_CLIENT_ID") || "",
        clientSecret: getEnvVar("MICROSOFT_CLIENT_SECRET") || "",
        redirectURI: microsoftRedirectURI,
        tenantId: "common",
        prompt: "select_account",
      },
    },
    advanced: {
      useSecureCookies: !isLocalhost && appUrl.startsWith("https://"),
    },
    plugins: [
      {
        id: "microsoft-workers-callback",
        hooks: {
          before: [
            {
              matcher(context) {
                return context.path === "/callback/microsoft";
              },
              handler: createAuthMiddleware(async () => ({
                context: {
                  context: {
                    oauthConfig: {
                      skipStateCookieCheck: true,
                    },
                  },
                },
              })),
            },
          ],
        },
      },
      oneTap(),
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
      magicLink({
        disableSignUp: false,
        expiresIn: 300,
        rateLimit: {
          window: 60,
          max: 10,
        },
        async sendMagicLink({ email, url }, request) {
          const clientIP = request ? getClientIP(request) : undefined;

          // 先原子扣额度再发信：peek → send → consume 会让并发请求全部穿过 peek，绕过冷却和上限。
          const decision = await MagicLinkRateLimitService.consumeMagicLinkSend({ ip: clientIP, email });
          if (!decision.allowed) {
            console.warn("[MagicLink] Send blocked by rate limit:", {
              reason: decision.reason,
              ip: clientIP,
              cooldownSeconds: decision.cooldownSeconds,
            });

            if (decision.reason === "unavailable") {
              throw new APIError("SERVICE_UNAVAILABLE", {
                message: "登录邮件服务暂时不可用，请稍后再试或使用其他登录方式",
              });
            }

            throw new APIError("TOO_MANY_REQUESTS", {
              message: buildMagicLinkRateLimitMessage({
                cooldownSeconds: decision.cooldownSeconds,
                emailRemaining: decision.emailRemaining,
              }),
            });
          }

          try {
            await sendMagicLinkEmail(email, url);
          } catch (emailError: unknown) {
            // 原始错误只进日志；Resend 的报错可能包含发件域名、配额等内部信息，不能回给前端。
            console.error("[MagicLink] Email sending failed:", {
              name: emailError instanceof Error ? emailError.name : undefined,
              message: emailError instanceof Error ? emailError.message : String(emailError),
            });
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "邮件发送失败，请稍后重试",
            });
          }
        },
      }),
    ],
  });
}

const authInstances = new Map<string, ReturnType<typeof betterAuth>>();

export function getAuth(request?: Request) {
  const requestOrigin = request ? new URL(request.url).origin : "";
  const appUrl = getAuthBaseURL(request);
  const key = requestOrigin && requestOrigin !== appUrl ? `${appUrl}|${requestOrigin}` : appUrl;
  let authInstance = authInstances.get(key);

  if (!authInstance) {
    authInstance = createAuth(request);
    authInstances.set(key, authInstance);
  }

  return authInstance;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    return (getAuth() as Record<string, unknown>)[prop as string];
  },
});

type AuthSession = Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>;
const sessionCache = new WeakMap<Request, Promise<AuthSession>>();
const AUTH_COOKIE_MARKERS = ["better-auth", "session_token", "session-token", "authjs", "__secure-better-auth"];

type PublicSession = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: boolean;
    role?: string | null;
    banned?: boolean | null;
    banReason?: string | null;
    banExpires?: Date | string | number | null;
  };
};

export function requestHasAuthSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim().toLowerCase())
    .some((name) => Boolean(name) && AUTH_COOKIE_MARKERS.some((marker) => name.includes(marker)));
}

export function getSessionCached(request: Request) {
  const cached = sessionCache.get(request);
  if (cached) {
    return cached;
  }

  const sessionPromise = getAuth(request)
    .api
    .getSession({ headers: request.headers })
    .catch((error) => {
      sessionCache.delete(request);
      throw error;
    });

  sessionCache.set(request, sessionPromise);
  return sessionPromise;
}

function getAdminEmails() {
  return getEnvVar("ADMIN_EMAILS")?.split(",").map((item) => item.trim()).filter(Boolean) || [];
}

function parseBanExpires(value: Date | string | number | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numericValue)) {
    return new Date(numericValue < 10_000_000_000 ? numericValue * 1000 : numericValue);
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function isActiveBan(user: { banned?: boolean | number | null; banExpires?: Date | string | number | null }) {
  if (!user.banned) {
    return false;
  }

  const banExpires = parseBanExpires(user.banExpires);
  return !banExpires || banExpires.getTime() > Date.now();
}

async function getUserAccessRecord(userId: string) {
  return getAuthDb()
    .selectFrom("user")
    .select(["id", "email", "role", "banned", "banReason", "banExpires"])
    .where("id", "=", userId)
    .executeTakeFirst();
}

async function promoteConfiguredAdmin(user: { id: string; email?: string | null; role?: string | null }) {
  if (!isAdmin(user.email) || user.role === "admin") {
    return;
  }

  await getAuthDb().updateTable("user").set({ role: "admin" }).where("id", "=", user.id).execute();
}

export function toPublicSession(session: AuthSession): PublicSession | null {
  if (!session?.user) {
    return null;
  }

  const user = session.user as PublicSession["user"];
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      emailVerified: user.emailVerified,
      role: user.role ?? null,
      banned: user.banned ?? null,
      banReason: user.banReason ?? null,
      banExpires: user.banExpires ?? null,
    },
  };
}

export async function requireAuth(request: Request) {
  const session = await getSessionCached(request);

  if (!session?.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const userRecord = await getUserAccessRecord(session.user.id);
  if (userRecord && isActiveBan(userRecord)) {
    throw new Response("Forbidden", { status: 403 });
  }

  return session.user;
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email);
}

export async function requireAdmin(request: Request) {
  const session = await getSessionCached(request);

  if (!session?.user) {
    const url = new URL(request.url);
    throw redirect(`/auth?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
  }

  const userRecord = await getUserAccessRecord(session.user.id);
  if (userRecord && isActiveBan(userRecord)) {
    throw redirect("/");
  }

  const email = userRecord?.email ?? session.user.email;
  const role = userRecord?.role ?? (session.user as { role?: string | null }).role ?? null;

  if (!isAdmin(email) && role !== "admin") {
    throw redirect("/");
  }

  await promoteConfiguredAdmin({
    id: session.user.id,
    email,
    role,
  });

  return session.user;
}
