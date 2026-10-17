import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FormattedMessage, defineMessages, useIntl, type MessageDescriptor } from "react-intl";
import Header from "~/components/ui/Header";
import { imageSrcSet } from "~/lib/resolve-image";
import type { GamePlatformFilter, PlatformId, UnifiedGame, UnifiedGamePageData } from "~/types/game";

const messages = defineMessages({
  all: { defaultMessage: "全部", description: "游戏库平台筛选：全部" },
  rating: { defaultMessage: "评分", description: "游戏库排序：评分" },
  hours: { defaultMessage: "时长", description: "游戏库排序：游玩时长" },
  progress: { defaultMessage: "完成度", description: "游戏库排序：完成度" },
  filterByPlatform: { defaultMessage: "按平台筛选" },
  sort: { defaultMessage: "排序" },
  searchPlaceholder: { defaultMessage: "搜游戏名或标签" },
});

const PLATFORM_LABELS: Record<PlatformId, string> = {
  playstation: "PlayStation",
  switch: "Switch",
  pc: "PC",
};

const PLATFORM_FILTERS: Array<{ id: GamePlatformFilter; label: MessageDescriptor | string }> = [
  { id: "all", label: messages.all },
  { id: "playstation", label: "PlayStation" },
  { id: "switch", label: "Switch" },
  { id: "pc", label: "PC" },
];

// 平台分布条：颜色同时拉开明度，不只靠色相区分
const PLATFORM_BAR_COLORS: Record<PlatformId, string> = {
  playstation: "var(--color-primary-800)",
  switch: "var(--color-accent)",
  pc: "var(--color-primary-400)",
};

// 依次是白金 / 黄金 / 白银 / 黄铜；按顺序取色，标签翻译后也不受影响
const TROPHY_COLORS = ["#8e9aa6", "#c19a2e", "#b5b2ab", "#9c5b34"];

type SortKey = "rating" | "hours" | "progress";

const SORT_OPTIONS: Array<{ id: SortKey; label: MessageDescriptor }> = [
  { id: "rating", label: messages.rating },
  { id: "hours", label: messages.hours },
  { id: "progress", label: messages.progress },
];

const LIBRARY_PREVIEW_COUNT = 12;

function playHours(game: UnifiedGame) {
  const hours = Number.parseFloat(game.playTime);
  return Number.isFinite(hours) ? hours : 0;
}

// 封面大图：lg 以上在 max-w-[1360px] 容器的 7/12 栏里（约 690px），以下撑满
const FEATURED_SIZES = "(min-width: 1024px) min(58vw, 700px), 100vw";
// 卡片网格：lg 四列 / sm 两列 / 手机一列
const GRID_CARD_SIZES = "(min-width: 1024px) min(25vw, 300px), (min-width: 640px) 50vw, 100vw";

function heroImageOf(game: UnifiedGame) {
  return game.heroImage ?? game.cover;
}

const sorters: Record<SortKey, (a: UnifiedGame, b: UnifiedGame) => number> = {
  rating: (a, b) => b.rating - a.rating || (b.progress ?? 0) - (a.progress ?? 0),
  hours: (a, b) => playHours(b) - playHours(a),
  progress: (a, b) => (b.progress ?? -1) - (a.progress ?? -1),
};

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs tracking-[0.16em] text-primary-600">{children}</p>;
}

function GameMeta({ game }: { game: UnifiedGame }) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-primary-600">
      <span>{PLATFORM_LABELS[game.platform]}</span>
      <span>{game.playTime}</span>
      {game.trophies.platinum > 0 && (
        <span>
          <FormattedMessage defaultMessage="白金 ×{count}" values={{ count: game.trophies.platinum }} />
        </span>
      )}
    </span>
  );
}

export default function GameArchive({
  userStats,
  platforms,
  allGames,
  followedGames,
  initialPlatform,
  featuredGameId,
}: UnifiedGamePageData) {
  const intl = useIntl();
  const [platform, setPlatform] = useState<GamePlatformFilter>(initialPlatform);
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [featuredId, setFeaturedId] = useState(featuredGameId);
  const coverRef = useRef<HTMLElement>(null);

  // /game/switch → /game/pc 复用同一组件实例，平台参数变化时同步筛选
  useEffect(() => {
    setPlatform(initialPlatform);
    setShowAll(false);
  }, [initialPlatform]);

  const featured = allGames.find((game) => game.id === featuredId) ?? allGames[0];

  const playstationStats = platforms.find((item) => item.id === "playstation")?.stats ?? [];

  const platformCounts = useMemo(() => {
    const counts: Record<PlatformId, number> = { playstation: 0, switch: 0, pc: 0 };
    allGames.forEach((game) => {
      counts[game.platform] += 1;
    });
    return counts;
  }, [allGames]);

  const perfectGames = useMemo(
    () => allGames.filter((game) => game.rating === 10).sort(sorters.hours),
    [allGames],
  );

  const filteredGames = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return allGames
      .filter((game) => platform === "all" || game.platform === platform)
      .filter((game) => {
        if (!keyword) return true;
        return (
          game.name.toLowerCase().includes(keyword) ||
          game.tags.some((tag) => tag.toLowerCase().includes(keyword))
        );
      })
      .sort(sorters[sortKey]);
  }, [allGames, platform, query, sortKey]);

  const visibleGames = showAll ? filteredGames : filteredGames.slice(0, LIBRARY_PREVIEW_COUNT);

  const selectGame = (gameId: number) => {
    setFeaturedId(gameId);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    coverRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-primary-50 text-primary-950">
      <Header />

      <main className="mx-auto max-w-[1360px] px-6 lg:px-14">
        {/* 01 页首 + 本期封面 */}
        <section
          ref={coverRef}
          className="grid scroll-mt-6 items-end gap-16 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-20"
        >
          <div className="flex flex-col gap-8">
            <SectionLabel><FormattedMessage defaultMessage="PLAYER ARCHIVE · 玩家典藏" /></SectionLabel>
            <h1 className="ui-display-hero text-7xl lg:text-[104px]"><FormattedMessage defaultMessage="游戏世界" description="游戏页主标题" /></h1>
            <p className="ui-body-text max-w-[440px] text-[17px] text-primary-800">
              <FormattedMessage
                defaultMessage="这里收录了 {count} 款游戏。让我熬夜的、通关后发呆的、拿下白金的，也有玩到一半后悔的——每一款都附一句当时的真心话。"
                values={{ count: allGames.length }}
              />
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-primary-300 pt-7">
              {userStats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[13px] text-primary-600">{stat.label}</dt>
                  <dd className="mt-1 text-[44px] font-extralight leading-tight">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {featured && (
            <article aria-labelledby="game-cover-title" className="flex flex-col gap-5">
              <div className="flex items-baseline justify-between">
                <SectionLabel><FormattedMessage defaultMessage="01 · 本期封面" /></SectionLabel>
                <p className="text-[13px] text-primary-600"><FormattedMessage defaultMessage="点下方任意一款，换成它" /></p>
              </div>
              <img
                key={featured.id}
                src={heroImageOf(featured)}
                srcSet={imageSrcSet(heroImageOf(featured))}
                sizes={FEATURED_SIZES}
                alt={intl.formatMessage({ defaultMessage: "{name} 主视觉" }, { name: featured.name })}
                className="aspect-video w-full rounded-xl bg-primary-200 object-cover shadow-[var(--shadow-panel)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
              />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-8">
                <div className="flex flex-col gap-2.5">
                  <h2 id="game-cover-title" className="text-[34px] font-light leading-tight">
                    {featured.name}
                  </h2>
                  <p className="ui-quote-text text-lg text-primary-800">“{featured.review}”</p>
                  <span className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-primary-600">
                    <span>{PLATFORM_LABELS[featured.platform]}</span>
                    <span>{featured.playTime}</span>
                    <span>
                      {featured.progress === null ? (
                        <FormattedMessage defaultMessage="无成就记录" />
                      ) : (
                        <FormattedMessage defaultMessage="完成度 {progress}%" values={{ progress: featured.progress }} />
                      )}
                    </span>
                    {featured.trophies.platinum > 0 && (
                      <span>
                        <FormattedMessage defaultMessage="白金 ×{count}" values={{ count: featured.trophies.platinum }} />
                      </span>
                    )}
                    <span>{featured.tags.join(" / ")}</span>
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-7xl font-extralight leading-[0.9] text-accent">{featured.rating}</p>
                  <p className="mt-1.5 text-xs tracking-[0.12em] text-primary-600"><FormattedMessage defaultMessage="/ 10 分" /></p>
                </div>
              </div>
            </article>
          )}
        </section>

        {/* 02 奖杯柜与平台分布 */}
        <section
          aria-labelledby="game-trophy-title"
          className="grid gap-16 border-y border-primary-300 py-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
        >
          <div className="flex flex-col gap-5">
            <h2 id="game-trophy-title" className="text-xs tracking-[0.16em] text-primary-600">
              <FormattedMessage defaultMessage="02 · PLAYSTATION 奖杯柜" />
            </h2>
            <dl className="grid grid-cols-4 gap-6">
              {playstationStats.map((stat, index) => (
                <div key={stat.label} className="flex flex-col gap-1.5">
                  <dt className="flex items-center gap-2 text-[13px] text-primary-700">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: TROPHY_COLORS[index] ?? "var(--color-primary-400)" }}
                    />
                    {stat.label}
                  </dt>
                  <dd className="text-5xl font-extralight leading-none">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-xs tracking-[0.16em] text-primary-600">
              <FormattedMessage defaultMessage="收录平台分布 · {count} 款" values={{ count: allGames.length }} />
            </p>
            <div aria-hidden="true" className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {PLATFORM_FILTERS.filter((item): item is { id: PlatformId; label: MessageDescriptor | string } => item.id !== "all").map(
                (item) => (
                  <span
                    key={item.id}
                    style={{
                      width: `${(platformCounts[item.id] / Math.max(allGames.length, 1)) * 100}%`,
                      background: PLATFORM_BAR_COLORS[item.id],
                    }}
                  />
                ),
              )}
            </div>
            <ul className="grid grid-cols-3 gap-4 text-sm text-primary-800">
              {(Object.keys(PLATFORM_LABELS) as PlatformId[]).map((id) => (
                <li key={id} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-sm"
                    style={{ background: PLATFORM_BAR_COLORS[id] }}
                  />
                  {PLATFORM_LABELS[id]}
                  <span className="text-primary-600">{platformCounts[id]}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 03 满分殿堂 */}
        <section aria-labelledby="game-hall-title" className="pt-24 pb-6">
          <div className="mb-8 flex items-end justify-between gap-8">
            <div className="flex flex-col gap-3">
              <SectionLabel>03 · HALL OF TEN</SectionLabel>
              <h2 id="game-hall-title" className="ui-display-title text-5xl"><FormattedMessage defaultMessage="满分殿堂" /></h2>
            </div>
            <p className="max-w-[360px] text-right text-[15px] text-primary-700">
              <FormattedMessage
                defaultMessage="打了 10 分的 {count} 款。排名不分先后，按游玩时长排列。"
                values={{ count: perfectGames.length }}
              />
            </p>
          </div>
          <ol className="grid gap-x-14 lg:grid-cols-2">
            {perfectGames.map((game, index) => (
              <li key={game.id} className="border-t border-primary-200">
                <button
                  type="button"
                  onClick={() => selectGame(game.id)}
                  aria-label={intl.formatMessage({ defaultMessage: "设为封面：{name}" }, { name: game.name })}
                  className="group grid w-full grid-cols-[36px_128px_minmax(0,1fr)_auto] items-center gap-5 py-4 text-left"
                >
                  <span className="text-sm text-primary-600">{String(index + 1).padStart(2, "0")}</span>
                  <img
                    src={heroImageOf(game)}
                    srcSet={imageSrcSet(heroImageOf(game))}
                    sizes="128px"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-[72px] w-32 rounded-md bg-primary-200 object-cover"
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-lg font-normal transition-colors duration-[var(--motion-base)] group-hover:text-accent-hover">
                      {game.name}
                    </span>
                    <span className="truncate text-sm italic text-primary-700">“{game.review}”</span>
                  </span>
                  <span className="whitespace-nowrap text-right text-[13px] leading-relaxed text-primary-600">
                    {PLATFORM_LABELS[game.platform]}
                    <br />
                    {game.playTime}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {/* 04 全部收藏 */}
        <section aria-labelledby="game-library-title" className="pt-24 pb-6">
          <div className="mb-7 flex flex-col gap-3">
            <SectionLabel>04 · THE LIBRARY</SectionLabel>
            <h2 id="game-library-title" className="ui-display-title text-5xl"><FormattedMessage defaultMessage="全部收藏" /></h2>
          </div>

          <div className="mb-9 flex flex-wrap items-center justify-between gap-6 border-y border-primary-300 py-3.5">
            <div role="group" aria-label={intl.formatMessage(messages.filterByPlatform)} className="flex gap-2">
              {PLATFORM_FILTERS.map((item) => {
                const active = platform === item.id;
                const count = item.id === "all" ? allGames.length : platformCounts[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setPlatform(item.id);
                      setShowAll(false);
                    }}
                    className={`min-h-11 rounded-full border px-[18px] text-sm font-normal transition-colors duration-[var(--motion-base)] ${
                      active
                        ? "border-primary-950 bg-primary-950 text-primary-50"
                        : "border-primary-300 text-primary-800 hover:border-primary-500"
                    }`}
                  >
                    {typeof item.label === "string" ? item.label : intl.formatMessage(item.label)}
                    <span className="ml-1 opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-7">
              <div role="group" aria-label={intl.formatMessage(messages.sort)} className="flex items-center gap-1 text-sm">
                <span className="mr-2 text-primary-600">{intl.formatMessage(messages.sort)}</span>
                {SORT_OPTIONS.map((option) => {
                  const active = sortKey === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSortKey(option.id)}
                      className={`min-h-11 border-b px-3 transition-colors duration-[var(--motion-base)] ${
                        active ? "border-accent text-primary-950" : "border-transparent text-primary-600 hover:text-primary-950"
                      }`}
                    >
                      {intl.formatMessage(option.label)}
                    </button>
                  );
                })}
              </div>
              <label className="flex min-h-11 w-60 items-center gap-2.5 rounded-full border border-primary-300 bg-white px-4 focus-within:border-accent">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-primary-600">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <span className="sr-only"><FormattedMessage defaultMessage="搜索游戏" /></span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShowAll(false);
                  }}
                  placeholder={intl.formatMessage(messages.searchPlaceholder)}
                  className="w-full bg-transparent text-sm text-primary-950 outline-none placeholder:text-primary-500"
                />
              </label>
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <p className="py-16 text-center text-base text-primary-600">
              <FormattedMessage
                defaultMessage="没有找到「{query}」。换个词试试，比如“开放世界”或“魂系”。"
                values={{ query: query.trim() }}
              />
            </p>
          ) : (
            <ul className="grid gap-x-7 gap-y-11 sm:grid-cols-2 lg:grid-cols-4">
              {visibleGames.map((game) => {
                const selected = game.id === featured?.id;
                return (
                  <li key={game.id}>
                    <button
                      type="button"
                      onClick={() => selectGame(game.id)}
                      aria-label={intl.formatMessage({ defaultMessage: "设为封面：{name}" }, { name: game.name })}
                      aria-current={selected ? "true" : undefined}
                      className="group flex w-full flex-col gap-3.5 text-left"
                    >
                      <span
                        className={`block overflow-hidden rounded-[10px] outline outline-2 outline-offset-[3px] transition-[outline-color] duration-[var(--motion-base)] ${
                          selected ? "outline-accent" : "outline-transparent"
                        }`}
                      >
                        <img
                          src={heroImageOf(game)}
                          srcSet={imageSrcSet(heroImageOf(game))}
                          sizes={GRID_CARD_SIZES}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="aspect-[16/10] w-full bg-primary-200 object-cover transition-transform duration-[var(--motion-slow)] ease-[var(--ease-standard)] group-hover:scale-[1.03]"
                        />
                      </span>
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-lg font-normal leading-snug">{game.name}</span>
                        <span className="whitespace-nowrap text-[22px] font-extralight">{game.rating}</span>
                      </span>
                      <GameMeta game={game} />
                      {game.progress === null ? (
                        <span className="text-xs text-primary-600"><FormattedMessage defaultMessage="该平台无成就记录" /></span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <span className="block h-[3px] flex-1 overflow-hidden rounded-full bg-primary-200">
                            <span className="block h-full bg-accent" style={{ width: `${game.progress}%` }} />
                          </span>
                          <span className="min-w-9 text-right text-xs text-primary-700">{game.progress}%</span>
                        </span>
                      )}
                      <span className="line-clamp-2 text-sm italic leading-relaxed text-primary-800">“{game.review}”</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {filteredGames.length > LIBRARY_PREVIEW_COUNT && (
            <div className="flex justify-center pt-14">
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                className="ui-button-secondary min-h-12 rounded-full border border-primary-800 px-8 text-[15px] font-normal"
              >
                {showAll ? (
                  <FormattedMessage defaultMessage="收起" />
                ) : (
                  <FormattedMessage defaultMessage="展开全部 {count} 款" values={{ count: filteredGames.length }} />
                )}
              </button>
            </div>
          )}
        </section>

        {/* 05 在等的 */}
        {followedGames.length > 0 && (
          <section aria-labelledby="game-wish-title" className="pt-24 pb-24">
            <div className="grid items-center gap-16 rounded-2xl border border-primary-200 bg-primary-100 px-14 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="flex flex-col gap-3">
                <SectionLabel>05 · ON THE HORIZON</SectionLabel>
                <h2 id="game-wish-title" className="ui-display-title text-[40px]"><FormattedMessage defaultMessage="在等的" /></h2>
                <p className="text-[15px] leading-relaxed text-primary-700"><FormattedMessage defaultMessage="还没发售，但已经在日历上画了圈。" /></p>
              </div>
              <ul className="flex flex-col gap-8 lg:border-l lg:border-primary-300 lg:pl-14">
                {followedGames.map((game) => (
                  <li key={game.id} className="flex items-end justify-between gap-8">
                    <div className="flex flex-col gap-2">
                      <p className="text-8xl font-extralight leading-[0.95] tracking-tight">{game.name}</p>
                      <p className="text-[15px] text-primary-700">
                        <FormattedMessage defaultMessage="预计发售 · {date}" values={{ date: game.releaseDate }} />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs tracking-[0.12em] text-primary-600"><FormattedMessage defaultMessage="期待值" /></p>
                      <p className="text-[56px] font-extralight leading-none text-accent">{game.rating}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-primary-200">
        <div className="mx-auto flex max-w-[1360px] justify-between px-6 py-7 text-[13px] text-primary-600 lg:px-14">
          <span><FormattedMessage defaultMessage="游戏世界 · 汪家俊的玩家典藏" /></span>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-primary-700 hover:text-accent-hover"
          >
            <FormattedMessage defaultMessage="回到顶部 ↑" />
          </button>
        </div>
      </footer>
    </div>
  );
}
