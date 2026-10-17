import { useEffect, useState } from "react";
import { Link, PrefetchPageLinks, useLocation } from "react-router";
import { getLocaleFromPathname, localizePath, stripLocale } from "~/lib/i18n";
import { shouldSkipForNetwork } from "./prefetch-policy";

/**
 * 首页加载完、浏览器空闲时，把各模块的 JS / CSS（有 loader 的再加 .data）提前拉下来，
 * 之后点进去时不用再发请求。首页链接分散在长页面各处，进视口才预取太晚，所以首页统一预取一次。
 * 不含 /chat：要登录，包也大。子页面不做全量预取，靠 LocaleLink 默认的 prefetch="viewport"；
 * 但子页面回首页的链接常在页底看不到，而首页有 loader，所以子页面空闲时单独预取首页。
 */
const PREFETCH_PATHS = ["/cv", "/gallery", "/music", "/game", "/anime", "/updates", "/messages", "/xiao"];
const HOME_PATH = "/";
const IDLE_FALLBACK_MS = 1500;

// 首页的全量预取每个文档只做一次：从子页面回到首页不再重复渲染
let prefetchedThisDocument = false;

function whenLoadedAndIdle(callback: () => void): () => void {
  let idleHandle: number | undefined;
  let timeoutHandle: number | undefined;

  const scheduleIdle = () => {
    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(callback, { timeout: IDLE_FALLBACK_MS * 2 });
    } else {
      timeoutHandle = window.setTimeout(callback, IDLE_FALLBACK_MS);
    }
  };

  if (document.readyState === "complete") {
    scheduleIdle();
  } else {
    window.addEventListener("load", scheduleIdle, { once: true });
  }

  return () => {
    window.removeEventListener("load", scheduleIdle);
    if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
    if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
  };
}

export default function HomePrefetch() {
  const { pathname } = useLocation();
  const isHome = stripLocale(pathname) === HOME_PATH;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    if (shouldSkipForNetwork() || (isHome && prefetchedThisDocument)) return;
    return whenLoadedAndIdle(() => {
      if (isHome) prefetchedThisDocument = true;
      setReady(true);
    });
  }, [isHome, pathname]);

  const locale = getLocaleFromPathname(pathname);
  const pages = (isHome ? PREFETCH_PATHS : [HOME_PATH]).map((path) => localizePath(path, locale));

  return (
    <>
      {/*
        React Router 默认按需发现路由：页面上渲染出来的 <a data-discover> 才会去 /__manifest 拿路由信息，
        没被发现的路由 PrefetchPageLinks 匹配不到。首页没有直达链接的模块（如 /xiao）靠这些隐藏链接先发现。
      */}
      <div hidden aria-hidden="true">
        {pages.map((page) => (
          <Link key={page} to={page} tabIndex={-1} prefetch="none" discover="render" />
        ))}
      </div>
      {ready && pages.map((page) => <PrefetchPageLinks key={page} page={page} />)}
    </>
  );
}
