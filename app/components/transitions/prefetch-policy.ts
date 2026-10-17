import type { LinkProps } from "react-router";
import { stripLocale } from "~/lib/i18n";

type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };

/** 省流量模式或 2G 网络下不做后台预取。服务端没有 navigator，按正常网络处理。 */
export function shouldSkipForNetwork(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!connection) return false;
  return connection.saveData === true || connection.effectiveType === "2g" || connection.effectiveType === "slow-2g";
}

// 要登录、包也大，只在悬停/聚焦时预取
const INTENT_ONLY_PAGES = new Set(["/chat"]);

/**
 * 站内链接默认的预取方式：链接进入视口就提前拉好目标页的 JS / CSS（有 loader 的再加 .data），
 * 点击时不用再等网络往返（东京节点一来一回约 330ms）。手机没有悬停，intent 基本不起作用。
 */
export function defaultPrefetch(to: LinkProps["to"]): NonNullable<LinkProps["prefetch"]> {
  if (shouldSkipForNetwork()) return "intent";
  if (typeof to === "string") {
    const pathname = stripLocale(to.split(/[?#]/)[0] || "/");
    if (INTENT_ONLY_PAGES.has(pathname)) return "intent";
  }
  return "viewport";
}
