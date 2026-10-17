/**
 * 生成首页「构建记录」的统计数据 → app/generated/build-log-stats.ts（不要手改）。
 *
 * 数据来源（都在本机，所以只能本地跑，跑完把生成文件一起提交）：
 * - git log：提交列表、按天的提交数和增删行数、按小时的提交分布
 * - ~/.claude/projects/<本项目>/*.jsonl：Claude Code 每次回复的 token 用量（本机只保留最近约 30 天）
 * - ~/.codex/sessions/**\/*.jsonl：工作目录是本项目的 Codex 会话的 total_tokens
 *
 * 用法：npm run build-log:stats
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "app", "generated", "build-log-stats.ts");

// 不计入行数的文件：锁文件、生成物、歌词数据、矢量图
const IGNORED_LINES = /package-lock\.json|app\/generated\/|app\/data\/lyrics\/|\.svg$|\.lrc$/;
const RECENT_COMMITS = 40;

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

function* jsonLines(file) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // 会话还在写入时最后一行可能不完整
    }
  }
}

/* ---------- git ---------- */
const commits = git(["log", "--format=%h%x09%ad%x09%s", "--date=short"])
  .trim()
  .split("\n")
  .map((line) => {
    const [hash, date, subject] = line.split("\t");
    return { hash, date, subject };
  });

const days = new Map();
let current = null;
for (const line of git(["log", "--format=@%ad", "--date=short", "--numstat"]).split("\n")) {
  if (line.startsWith("@")) {
    current = line.slice(1);
    const day = days.get(current) ?? { date: current, commits: 0, added: 0, removed: 0 };
    day.commits += 1;
    days.set(current, day);
    continue;
  }
  const [added, removed, path] = line.split("\t");
  if (!path || added === "-" || IGNORED_LINES.test(path)) continue;
  const day = days.get(current);
  day.added += Number(added);
  day.removed += Number(removed);
}

const hours = Array.from({ length: 24 }, () => 0);
for (const hour of git(["log", "--format=%ad", "--date=format:%H"]).trim().split("\n")) hours[Number(hour)] += 1;

/* ---------- Claude Code ---------- */
// ~/.claude/projects 下的目录名是把工作目录里所有非字母数字字符换成 "-"
const projectDirName = root.replace(/[^A-Za-z0-9]/g, "-");
const claudeDir = join(homedir(), ".claude", "projects", projectDirName);
const claude = { total: 0, cacheRead: 0, output: 0, responses: 0, sessions: 0, byDay: {}, byModel: {} };
const seen = new Set();
const claudeFiles = walk(claudeDir);
claude.sessions = claudeFiles.filter((file) => dirname(file) === claudeDir).length;
for (const file of claudeFiles) {
  for (const entry of jsonLines(file)) {
    const usage = entry.type === "assistant" ? entry.message?.usage : null;
    if (!usage) continue;
    const key = `${entry.message.id}:${entry.requestId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const sum =
      (usage.input_tokens ?? 0) +
      (usage.output_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0);
    if (!sum) continue;
    claude.total += sum;
    claude.cacheRead += usage.cache_read_input_tokens ?? 0;
    claude.output += usage.output_tokens ?? 0;
    claude.responses += 1;
    const day = String(entry.timestamp ?? "").slice(0, 10);
    claude.byDay[day] = (claude.byDay[day] ?? 0) + sum;
    const model = entry.message.model ?? "unknown";
    claude.byModel[model] = (claude.byModel[model] ?? 0) + sum;
  }
}

/* ---------- Codex ---------- */
const codex = { total: 0, sessions: 0, firstMonth: "", lastMonth: "", models: {} };
for (const file of walk(join(homedir(), ".codex", "sessions"))) {
  let cwd = "";
  let model = "";
  let started = "";
  let total = 0;
  for (const entry of jsonLines(file)) {
    const payload = entry.payload ?? {};
    if (entry.type === "session_meta") {
      cwd = payload.cwd ?? "";
      started = payload.timestamp ?? entry.timestamp ?? "";
    }
    if (entry.type === "turn_context") {
      model = payload.model ?? model;
      cwd ||= payload.cwd ?? "";
    }
    if (payload.type === "token_count" && payload.info?.total_token_usage) total = payload.info.total_token_usage.total_tokens ?? total;
  }
  if (!total || !cwd.replace(/\\/g, "/").toLowerCase().endsWith("mynuxt/remix")) continue;
  codex.total += total;
  codex.sessions += 1;
  codex.models[model || "unknown"] = (codex.models[model || "unknown"] ?? 0) + total;
  const month = started.slice(0, 7);
  if (month && (!codex.firstMonth || month < codex.firstMonth)) codex.firstMonth = month;
  if (month && month > codex.lastMonth) codex.lastMonth = month;
}

/* ---------- 输出 ---------- */
const stats = {
  generatedAt: new Date().toISOString().slice(0, 10),
  commitTotal: commits.length,
  firstCommit: commits.at(-1),
  latestCommit: commits[0],
  recentCommits: commits.slice(0, RECENT_COMMITS),
  days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
  hours,
  tokens: { claude, codex },
};

writeFileSync(
  outFile,
  `// AUTO-GENERATED by scripts/build-log-stats.mjs — 不要手改，重跑 npm run build-log:stats\n` +
    `import type { BuildLogStats } from "~/types/build-log";\n\n` +
    `export const buildLogStats: BuildLogStats = ${JSON.stringify(stats, null, 2)};\n`,
);

console.log(
  `build-log stats: ${stats.commitTotal} commits, ${stats.days.length} active days, ` +
    `claude ${(claude.total / 1e8).toFixed(2)}亿 (${claude.responses} responses), codex ${(codex.total / 1e8).toFixed(2)}亿 (${codex.sessions} sessions)`,
);
