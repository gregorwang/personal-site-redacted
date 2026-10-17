import { FormattedMessage } from "react-intl";
import { Link } from "~/components/common/LocaleLink";

/**
 * 子页面统一出口：固定在左上角的「← 返回首页」。
 * 首页用完整 Header；其余子页面都只放这一个，位置和样式全站一致。
 */
export function BackHome() {
  return (
    <Link
      to="/"
      className="fixed left-4 top-4 z-[60] inline-flex min-h-10 items-center rounded-full border border-primary-200/80 bg-primary-50/85 px-4 text-sm tracking-[0.04em] text-primary-800 shadow-[0_4px_16px_rgba(20,20,19,0.08)] backdrop-blur-sm transition-colors duration-[var(--motion-base)] hover:border-primary-400 hover:text-primary-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)] md:left-6 md:top-6"
    >
      <FormattedMessage defaultMessage="← 返回首页" />
    </Link>
  );
}
