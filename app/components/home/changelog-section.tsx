import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "~/components/common/LocaleLink";
import ChangelogCard from "./changelog-card";
import type { ChangelogPreviewEntry } from "~/data/updates";

// 条目由首页 loader 按语言下发（已盖好翻译），这里只负责按当前语言格式化日期。
export default function ChangelogSection({ updates }: { updates: ChangelogPreviewEntry[] }) {
  const intl = useIntl();
  const entries = updates.map((update) => ({
    id: update.id,
    version: update.version,
    date: intl.formatDate(update.date, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }),
    datetime: `${update.date}T00:00:00.000Z`,
    title: update.title,
    href: `/updates#release-${update.id}`,
  }));

  return (
    <section className="mx-auto w-full max-w-[1280px]">
      {/* 标题样式：精确对应 h2.text-theme-text.mb-v1.type-md */}
      <h2 className="mb-[22.4px] text-[22px] font-normal leading-[1.3] tracking-[-0.11px] text-[#26251E] dark:text-[#EDEDEA]">
        <FormattedMessage defaultMessage="更新日志" description="首页更新日志区块标题" />
      </h2>

      {/* 
        滚动容器逻辑：
        - 移动端（< 1024px）：采用无滚动条横向滑动 (no-scrollbar snap-x)，
          负外边距配合内边距延伸到屏幕边缘，给用户卡片轮播体验（下一张卡片露出一角提示可滑动）。
        - 桌面端（>= 1024px）：取消滚动，转化为标准 Grid 布局。
      */}
      <div className="-mx-6 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory lg:mx-0 lg:overflow-visible lg:px-0 lg:snap-none">
        {/* 
          桌面端响应式 Breakpoints:
          - 1024px (lg): 转化为 3 列 Grid，第 4 张卡片隐去，保持 3 列对齐
          - 1280px (xl): 转化为 4 列 Grid，显示全部 4 张卡片
        */}
        <div className="flex w-max gap-[10px] lg:grid lg:w-full lg:grid-cols-3 lg:gap-[10px] xl:grid-cols-4">
          {entries.map((entry, index) => (
            <ChangelogCard
              key={entry.version}
              {...entry}
              className={index >= 3 ? "lg:hidden xl:block" : ""}
            />
          ))}
        </div>
      </div>

      {/* 
        底部的动态链接：
        - 文字颜色 #F54E00 / 深色 #FF5A1F
        - 悬浮时带透明度变化与轻微箭头右移微交互
      */}
      <div className="mt-[16.8px]">
        <Link
          to="/updates"
          className="group inline-flex items-center gap-[6px] rounded-[2px] text-[16px] leading-[24px] tracking-[0.08px] text-[#F54E00] transition-[color,opacity] duration-180 hover:text-[#F54E00]/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F54E00] dark:text-[#FF5A1F] dark:hover:text-[#FF5A1F]/80 dark:focus-visible:outline-[#FF5A1F]"
        >
          <span><FormattedMessage defaultMessage="查看完整更新日志" description="首页更新日志区块底部链接" /></span>
          <span className="inline-block transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}

