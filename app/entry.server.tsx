import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
// @ts-expect-error React 18 does not publish types for this server.browser entrypoint.
import { renderToReadableStream } from "react-dom/server.browser";
import { DEFAULT_LOCALE, getLocaleFromPathname, isUnprefixedPath } from "./lib/i18n";
import { setRuntimeEnv, type RuntimeEnv } from "./utils/cloudflare-env.server";

const ABORT_DELAY = 5_000;
// RR7 用 streamTimeout 取代 RemixServer 的 abortDelay：超时后拒绝仍在等待的流式 Promise。
export const streamTimeout = ABORT_DELAY;
type CloudflareLoadContext = AppLoadContext & {
  cloudflare?: {
    env?: RuntimeEnv;
  };
};

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadContext: AppLoadContext
) {

  const cloudflareEnv = (loadContext as CloudflareLoadContext).cloudflare?.env;
  if (cloudflareEnv) {
    setRuntimeEnv(cloudflareEnv);
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/.well-known/")) {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  let didError = false;

  // 不能用 AbortSignal.timeout：渲染完成、流已关闭后它照样触发 abort，
  // Node 下的 react-dom 会抛 "Controller is already closed"。渲染结束就清掉定时器。
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), ABORT_DELAY);

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: controller.signal,
      onError(error: unknown) {
        didError = true;
        console.error(error);
      },
    }
  );

  body.allReady.then(
    () => clearTimeout(abortTimer),
    () => clearTimeout(abortTimer),
  );

  if (isbot(request.headers.get("user-agent") || "")) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  // 不带前缀的页面是跳转还是中文 200，取决于语言 cookie 和 Accept-Language（i18n.server 的 getPreferredLocale）
  if (getLocaleFromPathname(url.pathname) === DEFAULT_LOCALE && !isUnprefixedPath(url.pathname)) {
    responseHeaders.append("Vary", "Accept-Language, Cookie");
  }

  return new Response(body, {
    headers: responseHeaders,
    status: didError ? 500 : responseStatusCode,
  });
}
