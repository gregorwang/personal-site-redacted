import { isUnprefixedPath, stripLocale } from "~/lib/i18n";

/**
 * 站内换页时的「圆形展开」过渡：React Router 用 View Transitions 换页，
 * 新页面的快照从屏幕中心按圆形展开（样式在 app/tailwind.css）。
 * 只有带这个属性时才播圆形；其它 view transition（比如后退时 React Router 自动回放）一律硬切。
 */
const REVEAL_ATTR = "data-route-reveal";

/** 页面标识：去掉语言前缀后的第一段路径。/game 和 /game/xbox 算同一页。 */
function pageKey(pathname: string): string {
  return stripLocale(pathname).split("/")[1] ?? "";
}

/**
 * 只在不同页面之间播圆形：/music → /anime 播；
 * /game → /game/xbox、只改 query、同页 hash、只换语言都不播。
 * to 是本地化之前的路径，currentPathname 带语言前缀，两边都去掉前缀再比。
 */
export function shouldReveal(currentPathname: string, to: string): boolean {
  if (!to.startsWith("/") || to.startsWith("//") || isUnprefixedPath(to)) return false;
  const targetPathname = to.split(/[?#]/)[0] || "/";
  return pageKey(targetPathname) !== pageKey(currentPathname);
}

export function armRouteReveal() {
  document.documentElement.setAttribute(REVEAL_ATTR, "");
}

export function disarmRouteReveal() {
  document.documentElement.removeAttribute(REVEAL_ATTR);
}
