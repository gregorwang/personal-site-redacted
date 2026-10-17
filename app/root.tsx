import { lazy, Suspense, useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
  data,
  useLocation,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import type { LinksFunction, LoaderFunctionArgs, ActionFunctionArgs, ShouldRevalidateFunction } from "react-router";
import { IntlProvider } from "react-intl";

import tailwindStyles from "./tailwind.css?url";
import { getTheme, setTheme, type Theme } from "~/utils/theme.server";
import { getEnvVar } from "~/utils/cloudflare-env.server";
import { getSessionCached, requestHasAuthSessionCookie, toPublicSession } from "~/lib/auth.server";
import { getSafeReturnTo } from "~/lib/auth-return";
import LoginSuccessVeil from "~/components/auth/LoginSuccessVeil";
import { ClientOnly } from "~/components/common/ClientOnly";
import RouteTransition from "~/components/transitions/RouteTransition";
import HomePrefetch from "~/components/transitions/HomePrefetch";
import NotFound404 from "~/components/error/NotFound404";
import RouteErrorBoundary from "~/components/error/RouteErrorBoundary";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_HTML_LANG,
  TRANSLATED_PATHS,
  getLocaleFromPathname,
  localizePath,
  stripLocale,
} from "~/lib/i18n";
import { getMessages, resolveLocale } from "~/lib/i18n.server";
import { SITE_URL } from "~/utils/seo";

const LoginDialog = lazy(() => import("~/components/auth/LoginDialog"));
const GoogleOneTap = lazy(() => import("~/components/auth/GoogleOneTap.client"));

// Root loader - Better Auth integration
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // 语言来自 URL 前缀；当前语言的整本词典随 loader 数据嵌进 HTML，浏览器不再单独请求翻译文件
  const locale = resolveLocale(request, params.lang);

  // 获取主题
  const theme = await getTheme(request);

  // Anonymous requests often only carry theme/visitor cookies; avoid a Better Auth/D1 read until an auth cookie exists.
  const session = requestHasAuthSessionCookie(request) ? await getSessionCached(request) : null;

  return data({
    locale,
    messages: getMessages(locale),
    theme,
    session: toPublicSession(session),
    googleClientId: getEnvVar("GOOGLE_CLIENT_ID") || "",
    appUrl: getEnvVar("APP_URL") || "",
    authPreviewEnabled: getEnvVar("APP_URL")?.startsWith("http://localhost") || request.url.startsWith("http://localhost"),
  });
};

/**
 * 普通站内跳转不重跑 root loader：它的数据（语言词典、主题、session）跟着语言走，换页不变。
 * 否则每次点击都要等一次 `xxx.data` 往返（东京节点约 330ms），预取也省不掉这一步。
 * 提交表单（切主题、退出登录）、换语言、主动 revalidate 时照常重跑；登录走整页跳转，不经过这里。
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }) => {
  if (formMethod || currentUrl.href === nextUrl.href) return defaultShouldRevalidate;
  if (getLocaleFromPathname(currentUrl.pathname) !== getLocaleFromPathname(nextUrl.pathname)) return true;
  return false;
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStyles },
  // CDN 预连接优化 - 减少公开静态资源加载延迟
  { rel: "preconnect", href: "https://cdn.xn--cckl9nsb.com" },
  { rel: "dns-prefetch", href: "https://cdn.xn--cckl9nsb.com" },
];

// Root loader - Better Auth integration

// 处理主题切换
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const theme = formData.get("theme") as Theme;

  if (theme !== "light" && theme !== "dark") {
    return data({ error: "Invalid theme" }, { status: 400 });
  }

  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await setTheme(theme, request),
      },
    }
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = data?.theme || "light";
  const location = useLocation();
  // 从 URL 推导语言：root loader 抛 404 时 data 为空，错误页也要有正确的 lang
  const locale = getLocaleFromPathname(location.pathname);
  const basePath = stripLocale(location.pathname);
  const isMusic = basePath.startsWith("/music");

  return (
    <html lang={LOCALE_HTML_LANG[locale]} className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {TRANSLATED_PATHS.has(basePath) && (
          <>
            {LOCALES.map((alternate) => (
              <link
                key={alternate}
                rel="alternate"
                hrefLang={LOCALE_HTML_LANG[alternate]}
                href={`${SITE_URL}${localizePath(basePath, alternate)}`}
              />
            ))}
            <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${localizePath(basePath, DEFAULT_LOCALE)}`} />
          </>
        )}
        {/* 防止主题闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || 'light';
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body className={isMusic ? undefined : "bg-primary-50 text-primary-950"}>
        <IntlProvider
          locale={LOCALE_HTML_LANG[locale]}
          defaultLocale={LOCALE_HTML_LANG[DEFAULT_LOCALE]}
          messages={data?.locale === locale ? data.messages : undefined}
          onError={ignoreMissingTranslation}
        >
          {children}
        </IntlProvider>
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify({ GOOGLE_CLIENT_ID: data?.googleClientId || "", APP_URL: data?.appUrl || "" })};`,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

// 没翻译的文案会回落到中文 defaultMessage，这是预期行为，不刷屏；其它格式错误照常报。
function ignoreMissingTranslation(error: { code?: string }) {
  if (error.code === "MISSING_TRANSLATION") return;
  console.error(error);
}

function App() {
  const { session, googleClientId, appUrl, authPreviewEnabled } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [previewSuccessActive, setPreviewSuccessActive] = useState(false);
  const returnTo = getSafeReturnTo(`${location.pathname}${location.search}${location.hash}`);

  return (
    <>
      <Outlet context={{ session, openLoginDialog: () => setLoginDialogOpen(true), loginDialogOpen }} />
      <RouteTransition />
      <HomePrefetch />
      {!session?.user && (
        <>
          {loginDialogOpen && (
            <Suspense fallback={null}>
              <LoginDialog
                open={loginDialogOpen}
                onClose={() => setLoginDialogOpen(false)}
                returnTo={returnTo}
                previewEnabled={authPreviewEnabled}
                onPreviewSuccess={() => {
                  setLoginDialogOpen(false);
                  setPreviewSuccessActive(false);
                  window.requestAnimationFrame(() => setPreviewSuccessActive(true));
                }}
              />
            </Suspense>
          )}
          <ClientOnly>
            {() => (
              <Suspense fallback={null}>
                <GoogleOneTap enabled={Boolean(googleClientId)} returnTo={returnTo} appUrl={appUrl} debug={authPreviewEnabled} />
              </Suspense>
            )}
          </ClientOnly>
        </>
      )}
      <LoginSuccessVeil active={Boolean(session?.user && location.search.includes("login=success"))} />
      <LoginSuccessVeil active={previewSuccessActive} cleanUrl={false} onDone={() => setPreviewSuccessActive(false)} />
    </>
  );
}

export default App;

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound404 />;
  }

  return <RouteErrorBoundary />;
}
