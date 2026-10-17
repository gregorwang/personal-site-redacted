import { useMemo } from "react";
import { defineMessage, defineMessages, useIntl } from "react-intl";
import { buildLogStats } from "~/generated/build-log-stats";

const messages = defineMessages({
  peakHour: { defaultMessage: "最常提交的时段", description: "热力图指标" },
  less: { defaultMessage: "少", description: "热力图图例" },
  more: { defaultMessage: "多", description: "热力图图例" },
  hoursTitle: { defaultMessage: "几点提交 · 按提交时间（JST）", description: "热力图小时分布标题" },
});

// 带占位符的文案用 defineMessage 单独声明参数类型（同 hero-messages.ts），漏传参数会在编译期报错
const commitsMessage = defineMessage<{ days: number }>({ defaultMessage: "次提交 · {days} 天有提交 · remix-cloudflare", description: "热力图大字旁的说明" });
const busiestDayMessage = defineMessage<{ date: string }>({ defaultMessage: "最多的一天 · {date}", description: "热力图指标" });
const biggestDayMessage = defineMessage<{ date: string }>({ defaultMessage: "改动最多的一天 · {date}", description: "热力图指标" });
const timesMessage = defineMessage<{ count: number }>({ defaultMessage: "{count} 次", description: "提交次数" });
const linesMessage = defineMessage<{ count: string }>({ defaultMessage: "+{count} 行", description: "新增行数" });
const noCommitMessage = defineMessage<{ date: string }>({ defaultMessage: "{date} · 没有提交", description: "热力图格子悬停" });
const dayTipMessage = defineMessage<{ date: string; commits: number; added: number; removed: number }>({ defaultMessage: "{date} · {commits} 次提交 · +{added} −{removed}", description: "热力图格子悬停" });
const heatNoteMessage = defineMessage<{ first: string }>({ defaultMessage:
      "项目 2024 年 5 月启动，但 GitHub 上最早的提交是 {first} 的「init: clean history (no secrets)」：那次为了去掉密钥重建了历史，更早的提交已经不在了。账号的贡献日历里也看不到这个仓库，因为它是私有仓库。行数不含锁文件、生成物和歌词数据。",
    description: "热力图说明", });
const claudeLegendMessage = defineMessage<{ value: string }>({ defaultMessage: "Claude Code · {value}（本机现存记录）", description: "Token 账本图例" });
const codexLegendMessage = defineMessage<{ value: string; range: string }>({ defaultMessage: "Codex · {value}（{range}）", description: "Token 账本图例" });
const unknownLegendMessage = defineMessage<{ value: string }>({ defaultMessage: "查不到的 · 约 {value}：更早的 Claude Code、Cursor", description: "Token 账本图例" });
const tokenNoteMessage = defineMessage<{ responses: string; sessions: number; date: string }>({ defaultMessage:
      "口径：Claude Code 是每次回复的输入 + 输出 + 缓存写入 + 缓存读取，共 {responses} 次回复；Codex 取工作目录为本项目的 {sessions} 个会话的 total_tokens。Claude Code 本机只保留最近约 30 天，Cursor 不在本机记 token 数，所以「50 亿+」是估算。统计于 {date}。",
    description: "Token 账本口径说明", });

const tokenMessages = defineMessages({
  estimate: { defaultMessage: "我的估算 · 2024 年 5 月启动至今", description: "Token 账本大字旁的说明" },
  verified: { defaultMessage: "本机还能查实的", description: "Token 账本指标" },
  cacheShare: { defaultMessage: "Claude Code 里是缓存读取", description: "Token 账本指标" },
  written: { defaultMessage: "Claude 真正写出来的", description: "Token 账本指标" },
  byTool: { defaultMessage: "按工具（以 50 亿为整条）", description: "Token 账本小标题" },
  byDay: { defaultMessage: "每天 · Claude Code", description: "Token 账本小标题" },
  byModel: { defaultMessage: "按模型 · Claude Code", description: "Token 账本小标题" },
});

const ESTIMATE = 50e8;
const monthDay = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

/** 中文「4.17亿」、日文「4.17億」、英文「417M」，交给 Intl 的 compact 记数法 */
function useCompact() {
  const intl = useIntl();
  return (n: number, digits = 2) => intl.formatNumber(n, { notation: "compact", maximumFractionDigits: digits });
}

export function HeatmapView() {
  const intl = useIntl();
  const { days, hours, commitTotal, firstCommit, generatedAt } = buildLogStats;

  const grid = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const end = new Date(`${generatedAt}T00:00:00Z`);
    const start = new Date(`${firstCommit.date}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // 从那一周的周日开始
    const cells: { key: string; col: number; row: number; level: number; tip: string }[] = [];
    const months: { col: number; label: number }[] = [];
    let col = 0;
    for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const row = d.getUTCDay();
      if (row === 0 && d > start) col++;
      if (row === 0 && d.getUTCDate() <= 7) months.push({ col, label: d.getUTCMonth() + 1 });
      const date = d.toISOString().slice(0, 10);
      const day = byDate.get(date);
      const n = day?.commits ?? 0;
      cells.push({
        key: date,
        col,
        row,
        level: !n ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4,
        tip: day
          ? intl.formatMessage(dayTipMessage, { date, commits: day.commits, added: day.added, removed: day.removed })
          : intl.formatMessage(noCommitMessage, { date }),
      });
    }
    return { cells, months, columns: col + 1 };
  }, [days, firstCommit.date, generatedAt, intl]);

  const busiest = days.reduce((a, b) => (b.commits > a.commits ? b : a));
  const biggest = days.reduce((a, b) => (b.added > a.added ? b : a));
  const activeHours = hours.map((count, hour) => ({ hour, count })).filter((h) => h.count > 0);
  const peak = activeHours.reduce((a, b) => (b.count > a.count ? b : a));
  const hourMax = peak.count;

  return (
    <div className="bl-stats">
      <div className="bl-big">
        <span className="bl-big-num">{commitTotal}</span>
        <span className="bl-big-label">{intl.formatMessage(commitsMessage, { days: days.length })}</span>
      </div>
      <div className="bl-heat">
        <div className="bl-heat-months" style={{ gridTemplateColumns: `repeat(${grid.columns}, 1fr)` }} aria-hidden="true">
          {grid.months.map((m) => (
            <span key={m.col} style={{ gridColumn: m.col + 1 }}>
              {intl.formatDate(Date.UTC(2026, m.label - 1, 1), { month: "short", timeZone: "UTC" })}
            </span>
          ))}
        </div>
        <div className="bl-heat-grid" style={{ gridTemplateColumns: `repeat(${grid.columns}, 1fr)` }}>
          {grid.cells.map((c) => (
            <i key={c.key} className={`l${c.level}`} style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }} title={c.tip} />
          ))}
        </div>
        <div className="bl-heat-scale" aria-hidden="true">
          {intl.formatMessage(messages.less)} <i className="l0" />
          <i className="l1" />
          <i className="l2" />
          <i className="l3" />
          <i className="l4" /> {intl.formatMessage(messages.more)}
        </div>
      </div>
      <div className="bl-kpis">
        <div className="bl-kpi">
          <b>{intl.formatMessage(timesMessage, { count: busiest.commits })}</b>
          <span>{intl.formatMessage(busiestDayMessage, { date: monthDay(busiest.date) })}</span>
        </div>
        <div className="bl-kpi">
          <b>{intl.formatMessage(linesMessage, { count: biggest.added.toLocaleString() })}</b>
          <span>{intl.formatMessage(biggestDayMessage, { date: monthDay(biggest.date) })}</span>
        </div>
        <div className="bl-kpi">
          <b>{peak.hour}:00</b>
          <span>{intl.formatMessage(messages.peakHour)}</span>
        </div>
      </div>
      <h4>{intl.formatMessage(messages.hoursTitle)}</h4>
      <div className="bl-bars">
        {activeHours.map(({ hour, count }) => (
          <div key={hour}>
            <em>{count}</em>
            <i style={{ height: (count / hourMax) * 80 }} />
            {hour}
          </div>
        ))}
      </div>
      <p className="bl-stats-note">{intl.formatMessage(heatNoteMessage, { first: firstCommit.date })}</p>
    </div>
  );
}

export function TokensView() {
  const intl = useIntl();
  const compact = useCompact();
  const yi = (n: number) => compact(n, 2);
  const { claude, codex } = buildLogStats.tokens;
  const rest = Math.max(0, ESTIMATE - claude.total - codex.total);
  const pct = (n: number) => `${((n / ESTIMATE) * 100).toFixed(1)}%`;

  const dayBars = useMemo(() => {
    const entries = Object.entries(claude.byDay).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return [];
    const result: { date: string; value: number }[] = [];
    const end = new Date(`${entries[entries.length - 1][0]}T00:00:00Z`);
    for (const d = new Date(`${entries[0][0]}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      result.push({ date, value: claude.byDay[date] ?? 0 });
    }
    return result;
  }, [claude.byDay]);
  const dayMax = Math.max(...dayBars.map((d) => d.value), 1);
  const models = Object.entries(claude.byModel)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const modelMax = models[0]?.[1] ?? 1;
  const modelName = (id: string) => id.replace(/^claude-/, "").replace(/-(\d+)-(\d+)$/, " $1.$2").replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="bl-stats">
      <div className="bl-big">
        <span className="bl-big-num">{compact(ESTIMATE, 0)}+</span>
        <span className="bl-big-label">{intl.formatMessage(tokenMessages.estimate)}</span>
      </div>
      <div className="bl-kpis">
        <div className="bl-kpi">
          <b>{yi(claude.total + codex.total)}</b>
          <span>{intl.formatMessage(tokenMessages.verified)}</span>
        </div>
        <div className="bl-kpi">
          <b>{Math.round((claude.cacheRead / claude.total) * 100)}%</b>
          <span>{intl.formatMessage(tokenMessages.cacheShare)}</span>
        </div>
        <div className="bl-kpi">
          <b>{compact(claude.output, 0)}</b>
          <span>{intl.formatMessage(tokenMessages.written)}</span>
        </div>
      </div>
      <h4>{intl.formatMessage(tokenMessages.byTool)}</h4>
      <div className="bl-stack" aria-hidden="true">
        <i style={{ width: pct(claude.total), background: "#d97757" }} />
        <i style={{ width: pct(codex.total), background: "#26251e" }} />
        <i style={{ flex: 1, background: "repeating-linear-gradient(135deg, transparent 0 5px, rgba(38,37,30,.1) 5px 6px)" }} />
      </div>
      <div className="bl-legend">
        <span style={{ "--sw": "#d97757" } as React.CSSProperties}>{intl.formatMessage(claudeLegendMessage, { value: yi(claude.total) })}</span>
        <span style={{ "--sw": "#26251e" } as React.CSSProperties}>
          {intl.formatMessage(codexLegendMessage, { value: yi(codex.total), range: `${codex.firstMonth} – ${codex.lastMonth}` })}
        </span>
        <span style={{ "--sw": "rgba(38,37,30,.15)" } as React.CSSProperties}>{intl.formatMessage(unknownLegendMessage, { value: yi(rest) })}</span>
      </div>
      <h4>{intl.formatMessage(tokenMessages.byDay)}</h4>
      <div className="bl-bars">
        {dayBars.map(({ date, value }) => (
          <div key={date}>
            {value > 0 && <em>{compact(value, 1)}</em>}
            <i style={{ height: value ? Math.max(2, (value / dayMax) * 82) : 0 }} />
            {Number(date.slice(8, 10))}
          </div>
        ))}
      </div>
      <h4>{intl.formatMessage(tokenMessages.byModel)}</h4>
      <div className="bl-models">
        {models.map(([id, value]) => (
          <div key={id}>
            <span>{modelName(id)}</span>
            <i style={{ width: `${Math.max(1, (value / modelMax) * 100)}%` }} />
            <span>{compact(value, 1)}</span>
          </div>
        ))}
      </div>
      <p className="bl-stats-note">
        {intl.formatMessage(tokenNoteMessage, { responses: claude.responses.toLocaleString(), sessions: codex.sessions, date: buildLogStats.generatedAt })}
      </p>
    </div>
  );
}
