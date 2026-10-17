/** 首页「构建记录」：这个网站和 AI 一起做出来的真实记录。 */
import type { ImageManifestKey } from "~/generated/image-manifest";

export type BuildLogTool = "claude" | "codex" | "cursor";

export type BuildLogModel = "Opus 5.5" | "Sonnet 5.5" | "GPT-5.6 Sol" | "Astra";

/** 巡演时间（秒，从区块进入视口开始算）。没写就是一开始就显示。 */
type Timed = { at?: number; done?: number };

export type BuildLogBlock =
  | (Timed & { type: "user"; text: string })
  | (Timed & { type: "text"; html: string })
  /** verb 为空时整行是一句进度说明；done 之前显示 ing + obj 的流光文字 */
  | (Timed & { type: "step"; verb: string; obj: string; ing?: string })
  | (Timed & { type: "think"; sec: string; ing?: string })
  | (Timed & { type: "chip"; path: string; label?: string; add?: number; del?: number })
  | (Timed & { type: "merged"; hash: string; date: string; files: number; add: number; del: number })
  | (Timed & { type: "question"; questions: { q: string; options: string[] }[] });

export type BuildLogHighlight = { x: number; y: number; w: number; h: number; label: string };

export type BuildLogFile =
  | { kind: "code"; lang: "ts" | "py" | "yaml" | "json" | "md"; diff?: boolean; label?: string; content: string }
  | { kind: "markdown"; label?: string; content: string }
  | { kind: "plan"; label?: string; title: string; body: { heading?: string; html: string }[]; tasksLabel: string; tasks: { text: string; done: boolean }[] }
  | { kind: "shot"; label?: string; url: string; image: ImageManifestKey; width: number; height: number; highlights: BuildLogHighlight[] }
  | { kind: "heatmap"; label?: string }
  | { kind: "tokens"; label?: string };

export type BuildLogTask = {
  id: string;
  title: string;
  /** 已合并的显示时间；进行中、统计类留空 */
  time?: string;
  /** 侧栏第二行，允许 <span class="add|del"> */
  sub: string;
  runningSub?: string;
  /** 统计类条目，固定在侧栏最上面 */
  pinned?: boolean;
  /** 巡演里什么时候完成；Infinity 表示一直进行中 */
  finishAt?: number;
  tool: BuildLogTool;
  model: BuildLogModel;
  prompt?: string;
  blocks: BuildLogBlock[];
  tabs: string[];
  files: Record<string, BuildLogFile>;
};

/* ---------- scripts/build-log-stats.mjs 生成的数据 ---------- */

export type BuildLogCommit = { hash: string; date: string; subject: string };

export type BuildLogStats = {
  generatedAt: string;
  commitTotal: number;
  firstCommit: BuildLogCommit;
  latestCommit: BuildLogCommit;
  recentCommits: BuildLogCommit[];
  days: { date: string; commits: number; added: number; removed: number }[];
  /** 下标是小时（0–23） */
  hours: number[];
  tokens: {
    claude: {
      total: number;
      cacheRead: number;
      output: number;
      responses: number;
      sessions: number;
      byDay: Record<string, number>;
      byModel: Record<string, number>;
    };
    codex: { total: number; sessions: number; firstMonth: string; lastMonth: string; models: Record<string, number> };
  };
};
