import type { LinksFunction, LoaderFunctionArgs, MetaFunction, HeadersFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { BackHome } from "~/components/ui/BackHome";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, defineMessages, useIntl, type MessageDescriptor } from "react-intl";
import { forwardLoaderCacheControl } from "~/lib/cache-headers.server";
import { getMetaIntl, pageMeta } from "~/utils/seo";
import { formatUpdateShortDate, type UpdateLog, type UpdateType } from "~/data/updates";
import { getRouteLocale } from "~/lib/i18n.server";
import { getLocalizedUpdates } from "~/lib/updates.server";

interface UpdatesPageData {
  updates: UpdateLog[];
}

export const links: LinksFunction = () => [];

export const meta: MetaFunction = ({ matches }) => pageMeta.updates(getMetaIntl(matches));

// 按语言下发整本更新日志（日文 / 英文按 id 盖上覆盖层）
export async function loader({ params }: LoaderFunctionArgs) {
  const pageData: UpdatesPageData = {
    updates: getLocalizedUpdates(getRouteLocale(params)),
  };

  return data(pageData, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    }
  });
}

export const headers: HeadersFunction = forwardLoaderCacheControl;

type UpdateFilter = "all" | UpdateType;

const TYPE_LABELS = defineMessages({
  feature: { defaultMessage: "新功能", description: "更新日志类型" },
  improvement: { defaultMessage: "改进", description: "更新日志类型" },
  fix: { defaultMessage: "修复", description: "更新日志类型" },
  breaking: { defaultMessage: "重大变更", description: "更新日志类型" },
}) satisfies Record<UpdateType, MessageDescriptor>;

const ALL_FILTER_LABEL = defineMessages({
  all: { defaultMessage: "全部", description: "更新日志筛选：全部类型" },
});

const FILTERS: Array<{ id: UpdateFilter; label: MessageDescriptor }> = [
  { id: "all", label: ALL_FILTER_LABEL.all },
  { id: "feature", label: TYPE_LABELS.feature },
  { id: "improvement", label: TYPE_LABELS.improvement },
  { id: "fix", label: TYPE_LABELS.fix },
];

function getReleaseAnchor(update: UpdateLog): string {
  return `release-${update.id}`;
}

// 数据里的标题带 emoji 前缀，列表展示时去掉
function stripLeadingEmoji(title: string): string {
  return title.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, "").trim();
}

function groupByYear(updates: UpdateLog[]): Array<{ year: string; updates: UpdateLog[] }> {
  const groups: Array<{ year: string; updates: UpdateLog[] }> = [];

  for (const update of updates) {
    const year = update.date.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last.year === year) {
      last.updates.push(update);
    } else {
      groups.push({ year, updates: [update] });
    }
  }

  return groups;
}

function ReleaseRow({
  update,
  isOpen,
  onToggle,
}: {
  update: UpdateLog;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const intl = useIntl();
  const anchor = getReleaseAnchor(update);
  const detailId = `${anchor}-detail`;
  const typeLabel = intl.formatMessage(TYPE_LABELS[update.type]);

  return (
    <li id={anchor} className="scroll-mt-8 border-b border-primary-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={detailId}
        className="grid min-h-14 w-full grid-cols-[3.5rem_minmax(0,1fr)_1.5rem] items-baseline gap-x-4 px-2 py-4 text-left text-primary-950 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover sm:grid-cols-[4.5rem_6rem_minmax(0,1fr)_4.5rem_1.5rem] sm:gap-x-6"
      >
        <span className="text-sm text-primary-600 tabular-nums">{formatUpdateShortDate(update.date)}</span>
        <span className="hidden text-sm text-primary-800 tabular-nums sm:block">{update.version}</span>
        <span className="text-[1.0625rem] leading-relaxed">{stripLeadingEmoji(update.title)}</span>
        <span
          className={`hidden text-right text-xs tracking-[0.08em] sm:block ${
            update.type === "fix" || update.type === "breaking" ? "text-accent-hover" : "text-primary-600"
          }`}
        >
          {typeLabel}
        </span>
        <span aria-hidden="true" className="text-right text-base text-primary-500">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div id={detailId} className="pb-7 pl-2 pr-2 sm:pl-[12.5rem] sm:pr-14">
          <p className="text-sm text-primary-600 sm:hidden">
            {update.version} · {typeLabel}
          </p>
          <p className="text-[0.9375rem] leading-[1.9] text-primary-700">{update.description}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {update.items.map((item, index) => (
              <li
                key={index}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)] text-[0.90625rem] leading-[1.8] text-primary-800"
              >
                <span aria-hidden="true" className="text-primary-400">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export default function Updates() {
  const { updates } = useLoaderData<typeof loader>();
  const intl = useIntl();
  const [filter, setFilter] = useState<UpdateFilter>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(updates[0] ? [updates[0].id] : []));

  const latestUpdate = updates[0];

  const counts = useMemo(() => {
    const result: Record<UpdateFilter, number> = { all: updates.length, feature: 0, improvement: 0, fix: 0, breaking: 0 };
    for (const update of updates) result[update.type] += 1;
    return result;
  }, [updates]);

  const groups = useMemo(
    () => groupByYear(filter === "all" ? updates : updates.filter((update) => update.type === filter)),
    [updates, filter],
  );

  // 支持 /updates#release-xx 直接打开对应版本
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const target = updates.find((update) => getReleaseAnchor(update) === hash);
    if (!target) return;

    setFilter("all");
    setOpenIds((prev) => new Set(prev).add(target.id));
    requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
  }, [updates]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-primary-50 text-primary-950">
      <main className="mx-auto max-w-[65rem] px-6 pb-section-md pt-10">
        <BackHome />

        <header className="flex flex-wrap items-end justify-between gap-8 pb-8 pt-16 sm:pt-[4.5rem]">
          <div>
            <h1 className="ui-display-title text-5xl sm:text-[3.5rem]">
              <FormattedMessage defaultMessage="更新日志" description="更新日志页标题" />
            </h1>
            {latestUpdate && (
              <p className="mt-4 text-[0.9375rem] text-primary-700 tabular-nums">
                <FormattedMessage
                  defaultMessage="{count} 个版本，最近一次更新于 {date}"
                  description="更新日志页标题下的统计，{count} 是版本数，{date} 是最近更新日期"
                  values={{
                    count: updates.length,
                    date: intl.formatDate(latestUpdate.date, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
                  }}
                />
              </p>
            )}
          </div>

          <div role="group" aria-label={intl.formatMessage({ defaultMessage: "按类型筛选", description: "更新日志筛选按钮组的无障碍标签" })} className="flex flex-wrap gap-1">
            {FILTERS.filter((item) => item.id === "all" || counts[item.id] > 0).map((item) => {
              const isActive = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={isActive}
                  className={`min-h-11 rounded-full border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-hover ${
                    isActive
                      ? "border-primary-950 bg-primary-950 text-primary-50"
                      : "border-primary-300 text-primary-800 hover:border-primary-500"
                  }`}
                >
                  {intl.formatMessage(item.label)}
                  <span className="ml-1.5 text-xs opacity-70 tabular-nums">{counts[item.id]}</span>
                </button>
              );
            })}
          </div>
        </header>

        {groups.map((group) => (
          <section key={group.year} aria-labelledby={`year-${group.year}`} className="mt-10">
            <div className="flex items-baseline justify-between border-b border-primary-950 pb-3">
              <h2 id={`year-${group.year}`} className="ui-display-title text-[1.75rem] tabular-nums">
                {group.year}
              </h2>
              <span className="text-[0.8125rem] text-primary-600">
                <FormattedMessage
                  defaultMessage="{count} 次更新"
                  description="更新日志年份分组右侧的条数，{count} 是该年更新次数"
                  values={{ count: group.updates.length }}
                />
              </span>
            </div>
            <ol>
              {group.updates.map((update) => (
                <ReleaseRow
                  key={update.id}
                  update={update}
                  isOpen={openIds.has(update.id)}
                  onToggle={() => toggle(update.id)}
                />
              ))}
            </ol>
          </section>
        ))}
      </main>
    </div>
  );
}
