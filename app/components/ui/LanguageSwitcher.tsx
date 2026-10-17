import { Link as RemixLink, useLocation } from "react-router";
import { useIntl } from "react-intl";
import { LOCALES, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALE_HTML_LANG, LOCALE_LABELS, getLocaleFromPathname, localizePath, stripLocale, type Locale } from "~/lib/i18n";

const SHORT_LABELS: Record<Locale, string> = {
  zh: "中",
  ja: "日",
  en: "EN",
};

/** 记住手动选择：之后打开不带前缀的地址，服务端按这个语言跳转，不再看浏览器语言。要在导航前写好。 */
function rememberLocale(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/** 导航栏里的语言选择：同一页面换语言前缀，保留 query 和 hash。 */
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const location = useLocation();
  const intl = useIntl();
  const current = getLocaleFromPathname(location.pathname);
  const basePath = stripLocale(location.pathname);

  return (
    <nav
      aria-label={intl.formatMessage({ defaultMessage: "切换语言", description: "导航栏语言选择的无障碍名称" })}
      className={`flex items-center gap-0.5 text-xs tracking-[0.08em] text-primary-950/45 ${className}`}
    >
      {LOCALES.map((locale, index) => (
        <span key={locale} className="flex items-center">
          {index > 0 && (
            <span aria-hidden="true" className="px-1 text-primary-950/20">
              ·
            </span>
          )}
          <RemixLink
            to={`${localizePath(basePath, locale)}${location.search}${location.hash}`}
            hrefLang={LOCALE_HTML_LANG[locale]}
            lang={LOCALE_HTML_LANG[locale]}
            aria-label={LOCALE_LABELS[locale]}
            aria-current={locale === current ? "page" : undefined}
            preventScrollReset
            onClick={() => rememberLocale(locale)}
            className={`rounded px-1 py-1 transition-colors duration-200 hover:text-primary-950 focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary-950/40 ${
              locale === current ? "text-primary-950" : ""
            }`}
          >
            {SHORT_LABELS[locale]}
          </RemixLink>
        </span>
      ))}
    </nav>
  );
}
