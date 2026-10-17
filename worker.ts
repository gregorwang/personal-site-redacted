import { createRequestHandler } from "react-router";
// eslint-disable-next-line import/no-unresolved
import * as build from "./build/server/index.js";
import { RateLimiterDO } from "./app/lib/rate-limiter-do";
import { setRuntimeEnv } from "./app/utils/cloudflare-env.server";

export interface Env {
  [key: string]: unknown;
  ASSETS?: Fetcher;
  DB: D1Database;
  RATE_LIMITER: DurableObjectNamespace;
  MEDIA_BUCKET?: R2Bucket;
  AI: Ai;
  AUTH_KEY_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  IMAGE_BASE_URL?: string;
  MEDIA_BASE_URL?: string;
  APP_URL?: string;
  BETTER_AUTH_URL?: string;
  LOCAL_APP_URL?: string;
  APP_NAME?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  ADMIN_EMAILS?: string;
  MESSAGE_MODERATION_ALLOWED_IPS?: string;
  MESSAGE_NOTIFICATION_WEBHOOK_URL?: string;
  MESSAGE_NOTIFICATION_WEBHOOK_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_AI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  XAI_API_KEY?: string;
  NEMESIS_GEMINI_MODEL?: string;
  NEMESIS_GEMINI_LITE_MODEL?: string;
  NEMESIS_GEMINI_FLASH_MODEL?: string;
  NEMESIS_GEMINI_THINKING_LEVEL?: string;
  NEMESIS_DEEPSEEK_MODEL?: string;
  NEMESIS_GROK_MODEL?: string;
  NEMESIS_MODEL_ROUTE?: string;
  NEMESIS_CLASSIFIER_GEMINI_MODEL?: string;
  NEMESIS_AI_GATEWAY_ID?: string;
  CF_AIG_TOKEN?: string;
  NEMESIS_AI_GATEWAY_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  NEMESIS_MAX_PER_MINUTE?: string;
  NEMESIS_MAX_PER_DAY?: string;
  NEMESIS_MAX_MESSAGE_LENGTH?: string;
  MICROSOFT_AUTH_BASE_URL?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  MICROSOFT_REDIRECT_URI?: string;
  NODE_ENV?: string;
}

type RequestHandlerBuild = Parameters<typeof createRequestHandler>[0];
const handleRequest = createRequestHandler(build as unknown as RequestHandlerBuild);
const FONT_CACHE_CONTROL = "public, max-age=31536000, immutable";
const STICKER_CACHE_CONTROL = "public, max-age=31536000, immutable";

function guessStickerContentType(pathname: string) {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg") || lower.endsWith(".jfif")) return "image/jpeg";
  return "application/octet-stream";
}

function r2ObjectKeyFromPathname(pathname: string): string {
  return decodeURIComponent(pathname.replace(/^\//, ""));
}

async function serveR2Object(
  bucket: R2Bucket | undefined,
  objectKey: string,
  cacheControl: string,
  contentType: string,
): Promise<Response | null> {
  if (!bucket) {
    return new Response("Media bucket unavailable", { status: 503 });
  }

  const object = await bucket.get(objectKey);
  if (!object) {
    return null;
  }

  const headers = new Headers();
  // 先写 R2 存储的元数据，再用我们的显式值覆盖，保证 Cache-Control/Content-Type 以代码为准。
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", cacheControl);
  headers.set("Content-Type", contentType);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("X-Content-Type-Options", "nosniff");
  if (object.httpEtag) {
    headers.set("ETag", object.httpEtag);
  }
  return new Response(object.body, { headers });
}

function mediaNotFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "public, max-age=60",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function syncProcessEnv(env: Env) {
  const processRef = ((globalThis as unknown as { process?: { env?: Record<string, string> } }).process ??=
    { env: {} });

  if (!processRef.env) {
    processRef.env = {};
  }

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      processRef.env[key] = value;
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    setRuntimeEnv(env);
    syncProcessEnv(env);

    const url = new URL(request.url);

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      url.pathname.startsWith("/fonts/")
    ) {
      const served = await serveR2Object(
        env.MEDIA_BUCKET,
        r2ObjectKeyFromPathname(url.pathname),
        FONT_CACHE_CONTROL,
        "font/woff2",
      );
      if (served) {
        return request.method === "HEAD"
          ? new Response(null, { status: served.status, headers: served.headers })
          : served;
      }
      return mediaNotFound();
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      url.pathname.startsWith("/stickers/")
    ) {
      const served = await serveR2Object(
        env.MEDIA_BUCKET,
        r2ObjectKeyFromPathname(url.pathname),
        STICKER_CACHE_CONTROL,
        guessStickerContentType(url.pathname),
      );
      if (served) {
        return request.method === "HEAD"
          ? new Response(null, { status: served.status, headers: served.headers })
          : served;
      }
      return mediaNotFound();
    }

    if ((request.method === "GET" || request.method === "HEAD") && env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return handleRequest(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;

export { RateLimiterDO };
