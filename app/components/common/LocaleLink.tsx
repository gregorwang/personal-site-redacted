import { forwardRef } from "react";
import { Link as RemixLink, useLocation, type LinkProps } from "react-router";
import { defaultPrefetch } from "~/components/transitions/prefetch-policy";
import { armRouteReveal, shouldReveal } from "~/components/transitions/route-reveal";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";

export type { LinkProps };

/** 当前页面的语言，来自 URL 前缀；错误页里拿不到 loader 数据时也能用。 */
export function useLocale(): Locale {
  return getLocaleFromPathname(useLocation().pathname);
}

/**
 * 站内链接统一用这个：自动给 to 加上当前语言前缀，切换页面不会掉回中文。
 * 跳到另一个页面时，默认开启圆形展开过渡（见 route-reveal.ts）；
 * 链接进入视口就预取目标页（见 prefetch-policy.ts）。
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function LocaleLink(
  { to, onClick, viewTransition, prefetch, ...props },
  ref,
) {
  const { pathname } = useLocation();
  const locale = getLocaleFromPathname(pathname);
  const reveal =
    typeof to === "string" &&
    !props.reloadDocument &&
    (!props.target || props.target === "_self") &&
    shouldReveal(pathname, to);

  return (
    <RemixLink
      ref={ref}
      to={typeof to === "string" ? localizePath(to, locale) : to}
      viewTransition={viewTransition ?? reveal}
      prefetch={prefetch ?? defaultPrefetch(to)}
      onClick={(event) => {
        onClick?.(event);
        if (!reveal || viewTransition === false || event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
        armRouteReveal();
      }}
      {...props}
    />
  );
});
