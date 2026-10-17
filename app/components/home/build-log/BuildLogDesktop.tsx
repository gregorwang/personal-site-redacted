import { useCallback, useEffect, useState } from "react";
import { defineMessage, defineMessages, useIntl, type MessageTag } from "react-intl";
import { Link } from "~/components/common/LocaleLink";
import { BUILD_LOG_TASKS, BUILD_LOG_TOUR } from "~/data/build-log";
import { buildLogStats } from "~/generated/build-log-stats";
import type { BuildLogModel, BuildLogTask, BuildLogTool } from "~/types/build-log";
import { BuildLogComposer } from "./BuildLogComposer";
import { BuildLogConversation, type ExtraMessage, type QuestionState } from "./BuildLogConversation";
import { BuildLogPane } from "./BuildLogPane";
import { ChartIcon, CheckIcon, SpinIcon } from "./icons";

const messages = defineMessages({
  pinned: { defaultMessage: "统计", description: "构建记录侧栏分组" },
  tasks: { defaultMessage: "任务", description: "构建记录：手机上的任务列表" },
  statusRight: { defaultMessage: "对话原文来自 Claude Code 会话记录", description: "构建记录状态栏右侧" },
});

// 带占位符的文案用 defineMessage 单独声明参数类型（同 hero-messages.ts），漏传参数会在编译期报错
const runningMessage = defineMessage<{ count: number }>({ defaultMessage: "进行中 {count}", description: "构建记录侧栏分组" });
const mergedMessage = defineMessage<{ count: number }>({ defaultMessage: "已合并 {count}", description: "构建记录侧栏分组" });
const heatSubMessage = defineMessage<{ commits: number; days: number }>({ defaultMessage: "{commits} 次提交 · {days} 天", description: "构建记录侧栏：热力图第二行" });
const tokenSubMessage = defineMessage<{ verified: string; estimate: string }>({ defaultMessage: "本机实测 {verified} · 估算 {estimate}+", description: "构建记录侧栏：Token 账本第二行" });
const statusMessage = defineMessage<{ count: number; hash: string; date: string }>({ defaultMessage: "{count} 次提交 · 最近一次 {hash} · {date}", description: "构建记录状态栏" });
const replyMessage = defineMessage<{ link: MessageTag }>({ defaultMessage: "要和真的 AI 聊，请去 <link>Nemesis</link>。", description: "构建记录：发送消息后的固定回复，句式照 Cursor 的「要试用 Cursor 智能体，请下载 Cursor。」" });

type TaskState = {
  open: string[];
  active: string | null;
  extra: ExtraMessage[];
  tool: BuildLogTool;
  model: BuildLogModel;
  question: QuestionState;
};

const initialTaskState = (task: BuildLogTask): TaskState => ({
  open: [...task.tabs],
  active: task.tabs[0] ?? null,
  extra: [],
  tool: task.tool,
  model: task.model,
  question: { index: 0, selected: {}, done: false },
});

/**
 * 巡演时钟：区块进入视口后开始计时，只在数据里写到的时间点更新一次（十几次），
 * 不是每帧刷新。减少动态效果时直接跳到终点。
 */
function useTourClock(started: boolean, tourActive: boolean, onTourStep: (taskId: string) => void) {
  const [now, setNow] = useState(-1);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNow(Number.MAX_SAFE_INTEGER);
      return;
    }
    const times = new Set<number>([0]);
    for (const task of BUILD_LOG_TASKS) {
      for (const block of task.blocks) {
        times.add(block.at ?? 0);
        if (block.done !== undefined && Number.isFinite(block.done)) times.add(block.done);
      }
      if (task.finishAt !== undefined && Number.isFinite(task.finishAt)) times.add(task.finishAt);
    }
    const timers = [...times].map((t) => window.setTimeout(() => setNow((n) => Math.max(n, t)), t * 1000));
    return () => timers.forEach(window.clearTimeout);
  }, [started]);

  useEffect(() => {
    if (!started || !tourActive) return;
    const timers = BUILD_LOG_TOUR.map(([t, id]) => window.setTimeout(() => onTourStep(id), t * 1000));
    return () => timers.forEach(window.clearTimeout);
  }, [started, tourActive, onTourStep]);

  return now;
}

type DesktopProps = {
  /** 区块进入视口后才开始巡演 */
  started: boolean;
  /** 访客点过窗口后，巡演不再自动切换任务 */
  tourActive: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
};

export function BuildLogDesktop({ started, tourActive, selectedId, onSelect }: DesktopProps) {
  const intl = useIntl();
  const [states, setStates] = useState<Record<string, TaskState>>(() =>
    Object.fromEntries(BUILD_LOG_TASKS.map((t) => [t.id, initialTaskState(t)])),
  );
  const now = useTourClock(started, tourActive, onSelect);

  const task = BUILD_LOG_TASKS.find((t) => t.id === selectedId) ?? BUILD_LOG_TASKS[0];
  const state = states[task.id];
  const update = useCallback(
    (id: string, patch: (s: TaskState) => Partial<TaskState>) => setStates((all) => ({ ...all, [id]: { ...all[id], ...patch(all[id]) } })),
    [],
  );

  const finished = (t: BuildLogTask) => t.finishAt === undefined || (t.finishAt !== Infinity && now >= t.finishAt);
  const pinned = BUILD_LOG_TASKS.filter((t) => t.pinned);
  const running = BUILD_LOG_TASKS.filter((t) => !t.pinned && !finished(t));
  const merged = BUILD_LOG_TASKS.filter((t) => !t.pinned && finished(t));

  const compact = (n: number) => intl.formatNumber(n, { notation: "compact", maximumFractionDigits: 2 });
  const { claude, codex } = buildLogStats.tokens;
  const subOf = (t: BuildLogTask) => {
    if (t.id === "heat") return intl.formatMessage(heatSubMessage, { commits: buildLogStats.commitTotal, days: buildLogStats.days.length });
    if (t.id === "tokens") return intl.formatMessage(tokenSubMessage, { verified: compact(claude.total + codex.total), estimate: compact(50e8) });
    return t.sub;
  };

  const renderRow = (t: BuildLogTask) => {
    const done = finished(t);
    return (
      <button key={t.id} type="button" className="bl-row" aria-current={t.id === task.id} onClick={() => onSelect(t.id)}>
        {t.pinned ? <ChartIcon /> : done ? <CheckIcon /> : <SpinIcon />}
        <span className="bl-row-text">
          <span className="bl-row-top">
            <span>{t.title}</span>
            {done && t.time && <span className="bl-time">{t.time}</span>}
          </span>
          {done ? (
            <span className="bl-sub" style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: subOf(t) }} />
          ) : (
            <span className="bl-sub" style={{ display: "block" }}>
              <span className="bl-shimmer">{t.runningSub}</span>
            </span>
          )}
        </span>
      </button>
    );
  };

  const renderReply = () =>
    intl.formatMessage(replyMessage, {
      link: (chunks) => (
        <Link key="nemesis" to="/chat">
          {chunks}
        </Link>
      ),
    });

  const latest = buildLogStats.latestCommit;

  return (
    <>
      <div className="bl-columns">
        <nav className="bl-side">
          <div className="bl-group">{intl.formatMessage(messages.pinned)}</div>
          {pinned.map(renderRow)}
          {running.length > 0 && <div className="bl-group">{intl.formatMessage(runningMessage, { count: running.length })}</div>}
          {running.map(renderRow)}
          <div className="bl-group">{intl.formatMessage(mergedMessage, { count: merged.length })}</div>
          {merged.map(renderRow)}
        </nav>
        <div className="bl-chat">
          <div className="bl-mobile-tasks" role="tablist" aria-label={intl.formatMessage(messages.tasks)}>
            {BUILD_LOG_TASKS.map((t) => (
              <button key={t.id} type="button" aria-current={t.id === task.id} onClick={() => onSelect(t.id)}>
                {t.title}
              </button>
            ))}
          </div>
          <BuildLogConversation
            key={task.id}
            task={task}
            now={now}
            extra={state.extra}
            question={state.question}
            onQuestion={(question) => update(task.id, () => ({ question }))}
            onOpenFile={(path) =>
              task.files[path] && update(task.id, (s) => ({ open: s.open.includes(path) ? s.open : [...s.open, path], active: path }))
            }
            renderReply={renderReply}
          />
          <BuildLogComposer
            tool={state.tool}
            model={state.model}
            onTool={(tool) => update(task.id, () => ({ tool }))}
            onModel={(model) => update(task.id, () => ({ model }))}
            onSend={(text) => {
              const id = task.id;
              update(id, (s) => ({ extra: [...s.extra, { role: "user", text }] }));
              window.setTimeout(() => update(id, (s) => ({ extra: [...s.extra, { role: "assistant", reply: true }] })), 380);
            }}
          />
        </div>
        <BuildLogPane
          files={task.files}
          open={state.open}
          active={state.active}
          model={state.model}
          onSelect={(path) => update(task.id, () => ({ active: path }))}
          onClose={(path) =>
            update(task.id, (s) => {
              const index = s.open.indexOf(path);
              const open = s.open.filter((p) => p !== path);
              return { open, active: s.active === path ? (open[Math.min(index, open.length - 1)] ?? null) : s.active };
            })
          }
        />
      </div>
      <div className="bl-status">
        <span className="bl-status-dot" aria-hidden="true" />
        <span>{intl.formatMessage(statusMessage, { count: buildLogStats.commitTotal, hash: latest.hash, date: latest.date })}</span>
        <span className="bl-status-right">{intl.formatMessage(messages.statusRight)}</span>
      </div>
    </>
  );
}

/** git log 小窗里哪些提交能跳到任务：任务自己的合并提交，加上几条同一件事的后续修复 */
export const COMMIT_TASK: Record<string, string> = (() => {
  const map: Record<string, string> = { e471615: "rr7", d3dafb1: "radio" };
  for (const task of BUILD_LOG_TASKS) {
    for (const block of task.blocks) if (block.type === "merged") map[block.hash] = task.id;
  }
  return map;
})();

