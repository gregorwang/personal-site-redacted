import { redirect } from "react-router";
import ja from "~/locales/ja.json";
import en from "~/locales/en.json";
import { createIntl, type IntlShape } from "react-intl";
import { isbot } from "isbot";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HTML_LANG,
  isLocale,
  isUnprefixedPath,
  localizePath,
  pickLocaleFromAcceptLanguage,
  type Locale,
} from "~/lib/i18n";

// 中文直接用代码里的 defaultMessage，不需要词典。
const CATALOGS: Record<Locale, Record<string, string>> = { zh: {}, ja, en };

/**
 * 从 ($lang) 路由参数解析当前语言。
 * - 没有前缀：中文，但访客偏好别的语言时 302 到对应前缀（见 getPreferredLocale）
 * - /zh/...：重定向到不带前缀的地址，避免同一内容有两个 URL
 * - 未知前缀（例如 /foo 被 ($lang)._index 匹配）：404
 */
export function resolveLocale(request: Request, lang: string | undefined): Locale {
  if (lang === undefined) {
    redirectToPreferredLocale(request);
    return DEFAULT_LOCALE;
  }
  if (lang === DEFAULT_LOCALE) {
    const url = new URL(request.url);
    throw redirect(`${url.pathname.replace(/^\/zh(?=\/|$)/, "") || "/"}${url.search}`, 301);
  }
  if (!isLocale(lang)) throw new Response("Not Found", { status: 404 });
  return lang;
}

function readLocaleCookie(request: Request): Locale | null {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return isLocale(value) ? value : null;
}

/**
 * 访客偏好的语言（参照 openai.com 实测）：
 * 1. 切换器里手动选过的（cookie）优先；
 * 2. 否则看 Accept-Language：中文→zh，日文→ja，其它→en；
 * 3. 爬虫、没带 Accept-Language 的请求返回 null，保持中文 200，hreflang 才不会乱。
 */
export function getPreferredLocale(request: Request): Locale | null {
  const chosen = readLocaleCookie(request);
  if (chosen) return chosen;
  if (isbot(request.headers.get("User-Agent") || "")) return null;
  return pickLocaleFromAcceptLanguage(request.headers.get("Accept-Language"));
}

/** 只处理不带前缀的 GET 请求；带 /ja、/en 前缀的 URL 一律尊重，不跳。 */
function redirectToPreferredLocale(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const url = new URL(request.url);
  if (isUnprefixedPath(url.pathname)) return;
  const preferred = getPreferredLocale(request);
  if (!preferred || preferred === DEFAULT_LOCALE) return;
  // 客户端导航（single fetch）时 URL 带着 Remix 内部的 _routes 参数，跳转地址里要去掉
  url.searchParams.delete("_routes");
  // 结果取决于 cookie 和请求头，不能进共享缓存
  throw redirect(`${localizePath(url.pathname, preferred)}${url.search}`, {
    status: 302,
    headers: { "Cache-Control": "private, no-store", Vary: "Accept-Language, Cookie" },
  });
}

export function getMessages(locale: Locale): Record<string, string> {
  return CATALOGS[locale];
}

/** 页面 loader 里取当前语言（root loader 已经校验过前缀，这里只做收窄）。 */
export function getRouteLocale(params: { lang?: string }): Locale {
  return isLocale(params.lang) ? params.lang : DEFAULT_LOCALE;
}

/** 给服务端生成的固定文案（loader 返回的提示、错误信息）用的 intl 实例。 */
export function getServerIntl(locale: Locale): IntlShape {
  return createIntl({
    locale: LOCALE_HTML_LANG[locale],
    defaultLocale: LOCALE_HTML_LANG[DEFAULT_LOCALE],
    messages: CATALOGS[locale],
    onError: (error) => {
      if (error.code !== "MISSING_TRANSLATION") console.error(error);
    },
  });
}
