// Better Auth API 路由
// 处理所有 /api/auth/* 的请求，包括OAuth回调
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getAuth, getAuthBaseURL } from "~/lib/auth.server";
import { getEnvVar } from "~/utils/cloudflare-env.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const relay = getMicrosoftCallbackRelay(request);
  if (relay) {
    throw redirect(relay);
  }

  return handleAuthRequest(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return handleAuthRequest(request);
}

async function handleAuthRequest(request: Request) {
  const authDebug = await getAuthDebugContext(request);

  try {
    const response = await getAuth(request).handler(request);
    await logAuthDebugResult(authDebug, response);
    return response;
  } catch (error) {
    const url = new URL(request.url);
    console.error("[BetterAuth] request failed", {
      path: url.pathname,
      search: sanitizeSearchParams(url),
      origin: url.origin,
      authBaseURL: getAuthBaseURL(request),
      headers: getRequestDebugHeaders(request),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

function getMicrosoftCallbackRelay(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/auth/callback/microsoft") {
    return null;
  }

  const microsoftRedirectURI = getEnvVar("MICROSOFT_REDIRECT_URI");
  const primaryAuthURL = getEnvVar("BETTER_AUTH_URL") || getEnvVar("APP_URL");
  if (!microsoftRedirectURI || !primaryAuthURL) {
    return null;
  }

  const microsoftCallback = new URL(microsoftRedirectURI);
  const primaryURL = new URL(primaryAuthURL);
  if (url.host !== microsoftCallback.host || url.host === primaryURL.host) {
    return null;
  }

  return `${primaryURL.origin}${url.pathname}${url.search}`;
}

type AuthDebugContext = {
  path: string;
  method: string;
  origin: string;
  authBaseURL: string;
  headers: ReturnType<typeof getRequestDebugHeaders>;
  signIn?: {
    provider?: unknown;
    callbackURL?: unknown;
  };
  callback?: {
    provider: string;
    hasCode: boolean;
    hasState: boolean;
    hasStateCookie: boolean;
  };
};

async function getAuthDebugContext(request: Request): Promise<AuthDebugContext | null> {
  const url = new URL(request.url);
  const provider = getOAuthCallbackProvider(url.pathname);
  const isSocialSignIn = url.pathname === "/api/auth/sign-in/social";

  if (!provider && !isSocialSignIn) {
    return null;
  }

  const context: AuthDebugContext = {
    path: url.pathname,
    method: request.method,
    origin: url.origin,
    authBaseURL: getAuthBaseURL(request),
    headers: getRequestDebugHeaders(request),
  };

  if (isSocialSignIn) {
    context.signIn = await readSocialSignInBody(request);
  }

  if (provider) {
    context.callback = {
      provider,
      hasCode: url.searchParams.has("code"),
      hasState: url.searchParams.has("state"),
      hasStateCookie: hasOAuthStateCookie(request),
    };
  }

  console.log("[AuthDebug] request", context);
  return context;
}

async function logAuthDebugResult(context: AuthDebugContext | null, response: Response) {
  if (!context) {
    return;
  }

  console.log("[AuthDebug] response", {
    path: context.path,
    status: response.status,
    setCookieNames: getSetCookieNames(response.headers),
    oauthRedirect: await getOAuthRedirectDebug(response),
  });
}

function getRequestDebugHeaders(request: Request) {
  return {
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    cfVisitor: request.headers.get("cf-visitor"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  };
}

async function readSocialSignInBody(request: Request) {
  try {
    const body = await request.clone().json() as { provider?: unknown; callbackURL?: unknown };
    return {
      provider: body.provider,
      callbackURL: body.callbackURL,
    };
  } catch {
    return undefined;
  }
}

function getOAuthCallbackProvider(pathname: string) {
  const match = pathname.match(/^\/api\/auth\/callback\/([^/]+)$/);
  return match?.[1] ?? null;
}

function hasOAuthStateCookie(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0];
    return name.toLowerCase().includes("state");
  });
}

function getSetCookieNames(headers: Headers) {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const values = getSetCookie ? getSetCookie.call(headers) : [headers.get("set-cookie") || ""];
  return values
    .flatMap((value) => value.split(/,(?=[^;,]+=)/))
    .map((value) => value.split("=")[0]?.trim())
    .filter(Boolean);
}

async function getOAuthRedirectDebug(response: Response) {
  const location = response.headers.get("location");
  if (location) {
    return sanitizeOAuthURL(location);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    const body = await response.clone().json() as { url?: unknown; redirect?: unknown };
    const authUrl = typeof body.url === "string" ? body.url : typeof body.redirect === "string" ? body.redirect : null;
    return authUrl ? sanitizeOAuthURL(authUrl) : null;
  } catch {
    return null;
  }
}

function sanitizeOAuthURL(value: string) {
  try {
    const url = new URL(value);
    return {
      origin: url.origin,
      pathname: url.pathname,
      redirectURI: url.searchParams.get("redirect_uri"),
      clientIdSuffix: url.searchParams.get("client_id")?.slice(-12),
    };
  } catch {
    return null;
  }
}

function sanitizeSearchParams(url: URL) {
  const sanitized = new URLSearchParams(url.searchParams);
  for (const key of ["code", "state", "id_token", "access_token", "refresh_token"]) {
    if (sanitized.has(key)) {
      sanitized.set(key, "[redacted]");
    }
  }

  return sanitized.toString() ? `?${sanitized.toString()}` : "";
}

