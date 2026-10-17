// 站点语言：中文是默认语言，URL 不带前缀；其它语言用 /ja、/en 前缀（路由文件里的 ($lang) 可选段）。
export const LOCALES = ["zh", "ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE = "zh" satisfies Locale;

/** 需要翻译（有 URL 前缀）的语言 */
export type TranslatedLocale = Exclude<Locale, typeof DEFAULT_LOCALE>;

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  zh: "zh-CN",
  ja: "ja",
  en: "en",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  zh: "中文",
  ja: "日本語",
  en: "English",
};

export const LOCALE_OG: Record<Locale, string> = {
  zh: "zh_CN",
  ja: "ja_JP",
  en: "en_US",
};

/** 已经翻译完成、需要输出 hreflang 的页面（去掉语言前缀后的路径）。迁完一个页面就加一个。 */
export const TRANSLATED_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/gallery",
  "/chat",
  "/cv",
  "/game",
  "/game/playstation",
  "/game/switch",
  "/game/pc",
  "/anime",
  "/music",
  "/updates",
  "/xiao",
]);

// 这些路径不在 ($lang) 段下，站内链接指向它们时不加前缀。
const UNPREFIXED_PATHS = ["/api/", "/auth", "/sitemap.xml"];

/** 不在 ($lang) 段下的路径（登录、接口、sitemap），不加前缀也不做语言跳转。 */
export function isUnprefixedPath(path: string): boolean {
  return UNPREFIXED_PATHS.some((prefix) => path === prefix || path.startsWith(prefix));
}

/** 用户在语言切换器里手动选的语言，存一年；优先级高于浏览器语言。 */
export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 从 Accept-Language 取首选语言：中文→zh，日文→ja，其它任何语言→en。
 * 没有这个请求头（多数爬虫）返回 null，调用方不跳转。
 */
export function pickLocaleFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter(({ tag, q }) => tag !== "" && tag !== "*" && Number.isFinite(q) && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  const first = ranked[0]?.tag;
  if (!first) return null;
  const primary = first.split("-")[0];
  if (primary === "zh") return "zh";
  if (primary === "ja") return "ja";
  return "en";
}

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.split("/")[1];
  return isLocale(segment) && segment !== DEFAULT_LOCALE ? segment : DEFAULT_LOCALE;
}

/** "/ja/gallery" → "/gallery"，"/ja" → "/"。 */
export function stripLocale(pathname: string): string {
  const segment = pathname.split("/")[1];
  if (!isLocale(segment) || segment === DEFAULT_LOCALE) return pathname;
  const rest = pathname.slice(segment.length + 1);
  return rest === "" ? "/" : rest;
}

/** 给站内绝对路径加上语言前缀；外链、相对路径、hash 和不在 ($lang) 段下的路径原样返回。 */
export function localizePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE || !path.startsWith("/") || path.startsWith("//")) return path;
  if (isUnprefixedPath(path)) return path;
  if (path === "/") return `/${locale}`;
  if (path.startsWith("/?") || path.startsWith("/#")) return `/${locale}${path.slice(1)}`;
  return `/${locale}${path}`;
}
