/* eslint-env node, es2020 */
/**
 * 把 .nemesis-eval/ 下所有评测 JSON 合并成一个本地 HTML 预览：.nemesis-eval/index.html
 *   node scripts/nemesis-eval/report-html.mjs
 *
 * 分类器：每条用例取最新一次没被限流打断的结果。
 * 端到端：每条用例取最新一次成功的回复，并保留上一次成功的版本用于对比（换模型、改 prompt 前后）。
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dir = join(root, ".nemesis-eval");
const runs = readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => ({ name: name.replace(/\.json$/, ""), data: JSON.parse(readFileSync(join(dir, name), "utf8")) }));

const classified = new Map();
const e2e = new Map();

for (const run of runs) {
  for (const item of run.data.classified ?? []) {
    const previous = classified.get(item.id);
    const degradedRuns = (previous?.degradedRuns ?? 0) + (item.decision.degraded ? 1 : 0);
    if (!previous || !item.decision.degraded || previous.decision.degraded) {
      classified.set(item.id, { ...item, run: run.name, degradedRuns });
    } else {
      previous.degradedRuns = degradedRuns;
    }
  }

  for (const result of run.data.e2e ?? []) {
    const versions = e2e.get(result.id) ?? [];
    if (!result.error) versions.push({ ...result, run: run.name });
    e2e.set(result.id, versions);
  }
}

const data = {
  generatedAt: new Date().toISOString(),
  runs: runs.map((run) => run.name),
  classified: [...classified.values()].map((item) => ({
    id: item.id,
    group: item.group,
    message: item.message,
    note: item.note ?? null,
    expect: item.expect,
    expectRoute: item.expectRoute ?? null,
    recent: item.recent ?? null,
    policy: item.decision.policy,
    degraded: item.decision.degraded,
    category: item.decision.category,
    confidence: item.decision.confidence ?? null,
    reason: item.decision.reason,
    route: item.decision.route?.preferredRoute,
    queryType: item.decision.route?.queryType,
    pass: !item.decision.degraded && item.expect.includes(item.decision.policy),
    routePass: item.expectRoute ? item.decision.route?.preferredRoute === item.expectRoute : null,
    degradedRuns: item.degradedRuns,
  })),
  e2e: [...e2e.entries()]
    .filter(([, versions]) => versions.length)
    .map(([id, versions]) => ({ id, latest: versions.at(-1), previous: versions.length > 1 ? versions.at(-2) : null })),
};

const html = `<title>Nemesis 评测</title>
<style>
:root{--bg:#f6f7f9;--panel:#fff;--fg:#1d2330;--muted:#677084;--line:#dfe3ea;--accent:#3a5bd9;--good:#1f8a4c;--warn:#b26b00;--bad:#c23b3b;--chip:#eef1f7;
--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
@media (prefers-color-scheme:dark){:root{--bg:#12151c;--panel:#1a1f29;--fg:#e4e8f0;--muted:#98a1b3;--line:#2b3240;--accent:#8aa2ff;--good:#4cc283;--warn:#e0a240;--bad:#ff7a7a;--chip:#232a37;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-size:14px;line-height:1.6}
main{max-width:1180px;margin:0 auto;padding:24px 16px 64px;display:grid;gap:20px}
h1{font-size:22px;margin:0}h2{font-size:17px;margin:0}.muted{color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px}
.stat b{display:block;font-size:22px;font-variant-numeric:tabular-nums}.stat span{color:var(--muted);font-size:12px}
.tabs{display:flex;gap:6px;flex-wrap:wrap}.tabs button,.filters button{border:1px solid var(--line);background:var(--panel);color:var(--fg);border-radius:6px;padding:6px 12px;cursor:pointer;font:inherit}
.tabs button[aria-pressed=true],.filters button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}
.filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px;display:grid;gap:12px;min-width:0}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:860px}
th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;color:var(--muted);font-weight:600}
td.msg{max-width:300px;white-space:pre-wrap}td.reason{max-width:320px;color:var(--muted);font-size:13px}
.chip{display:inline-block;padding:1px 8px;border-radius:99px;background:var(--chip);font-size:12px;white-space:nowrap}
.ok{color:var(--good)}.no{color:var(--bad)}.warn{color:var(--warn)}
.p-persona{background:#e6efff;color:#2c4fbf}.p-general{background:#e5f6ec;color:#1f7a45}.p-careful{background:#fff1dc;color:#9a5a00}
.p-boundary{background:#f0e9ff;color:#6a3fc0}.p-crisis{background:#ffe3e3;color:#b42d2d}.p-deflect{background:#e8eef3;color:#45596b}.p-block{background:#2b2f38;color:#fff}
@media (prefers-color-scheme:dark){.p-persona{background:#22325c;color:#a9bdff}.p-general{background:#1d3b2b;color:#7fd6a3}.p-careful{background:#433014;color:#f0bd6a}
.p-boundary{background:#33264f;color:#c9b2ff}.p-crisis{background:#4a2222;color:#ff9c9c}.p-deflect{background:#28323c;color:#b4c4d2}.p-block{background:#e4e8f0;color:#12151c}}
.cards{display:grid;gap:12px}.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px 16px;display:grid;gap:10px;min-width:0}
.card header{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.card header code{font-family:var(--mono);font-size:12px;color:var(--muted)}
.user{border-left:3px solid var(--line);padding-left:10px;white-space:pre-wrap}
.reply{white-space:pre-wrap;line-height:1.75}.scores{display:flex;gap:6px;flex-wrap:wrap;font-size:12px}
.issue{font-size:13px;color:var(--warn)}details summary{cursor:pointer;color:var(--accent);font-size:13px}
.old{opacity:.8;border-top:1px dashed var(--line);padding-top:10px;margin-top:6px}
</style>
<main>
  <div><h1>Nemesis 策略评测</h1><div class="muted" id="meta"></div></div>
  <div class="stats" id="stats"></div>
  <div class="tabs" role="tablist">
    <button id="tab-e2e" aria-pressed="true">端到端回复</button>
    <button id="tab-cls" aria-pressed="false">分类器结果</button>
  </div>
  <section id="view-e2e" class="cards"></section>
  <section id="view-cls" class="panel" hidden>
    <div class="filters" id="groups"></div>
    <div class="scroll"><table><thead><tr><th>用例</th><th>消息</th><th>期望</th><th>实际</th><th>路由</th><th>置信度</th><th>分类理由</th></tr></thead><tbody id="rows"></tbody></table></div>
  </section>
</main>
<script>
const DATA = ${JSON.stringify(data).replace(/</g, "\\u003c")};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const chip = (p) => '<span class="chip p-' + esc(p) + '">' + esc(p) + "</span>";
const cls = DATA.classified, byId = Object.fromEntries(cls.map((c) => [c.id, c]));
const passed = cls.filter((c) => c.pass).length, hardStop = cls.filter((c) => c.policy === "block" && !c.expect.includes("block")).length;
const routes = cls.filter((c) => c.routePass !== null), e2e = DATA.e2e.map((e) => ({ ...e, c: byId[e.id] }));
const judged = e2e.filter((e) => e.latest.judgement);
const avg = (k) => (judged.reduce((s, e) => s + (e.latest.judgement[k] || 0), 0) / (judged.length || 1)).toFixed(2);
const general = judged.filter((e) => e.c?.group === "无关话题");
document.getElementById("meta").textContent = "合并了 " + DATA.runs.length + " 次运行（" + DATA.runs[0] + " → " + DATA.runs.at(-1) + "），生成于 " + new Date(DATA.generatedAt).toLocaleString();
const stats = [
  [passed + "/" + cls.length, "分类器判对"],
  [hardStop, "误硬拒（不该 block 却 block）"],
  [routes.filter((c) => c.routePass).length + "/" + routes.length, "路由检查"],
  [e2e.length, "端到端回复"],
  [avg("helpful") + " / " + avg("warm"), "平均 有用 / 温度（1–5）"],
  [general.filter((e) => e.latest.judgement.memoryLink === "natural").length + "/" + general.length, "无关话题串到汪家俊"],
  [judged.filter((e) => !e.latest.judgement.safe).length, "不安全回复"],
  [judged.filter((e) => e.latest.judgement.fabricated && e.latest.judgement.fabricated.length).length, "疑似编造记忆（新评审才有）"],
];
document.getElementById("stats").innerHTML = stats.map(([v, l]) => '<div class="stat"><b>' + esc(v) + "</b><span>" + esc(l) + "</span></div>").join("");

function replyBlock(v, label) {
  const j = v.judgement, m = v.meta || {};
  const scores = j ? [
    "有用 " + j.helpful, "温度 " + j.warm, "串记忆 " + j.memoryLink,
    j.safe ? '<span class="ok">安全</span>' : '<span class="no">不安全</span>',
    j.mentionsInternals ? '<span class="no">提到后台</span>' : "",
    j.fabricated && j.fabricated.length ? '<span class="no">疑似编造记忆</span>' : "",
  ].filter(Boolean) : ["评审失败"];
  const metaBits = [m.fixedReply ? "固定回复" : (m.route || "") + " · " + (m.model || ""), (m.attachments || []).join(", "), m.leak && m.leak.leaked ? "泄露检查拦下" : "", v.latencyMs ? v.latencyMs + "ms" : ""].filter(Boolean);
  return (label ? '<div class="muted" style="font-size:12px">' + label + "（" + esc((v.meta && v.meta.model) || "固定回复") + " · " + esc(v.run) + "）</div>" : "") +
    '<div class="reply">' + esc(v.reply || "（空回复）") + "</div>" +
    '<div class="scores">' + scores.map((s) => '<span class="chip">' + s + "</span>").join("") + '<span class="chip muted">' + esc(metaBits.join(" · ")) + "</span></div>" +
    (j && j.fabricated && j.fabricated.length ? '<div class="issue no">记忆里找不到依据：' + j.fabricated.map(esc).join("；") + "</div>" : "") +
    (j && j.issues ? '<div class="issue">评审：' + esc(j.issues) + "</div>" : "");
}

document.getElementById("view-e2e").innerHTML = e2e.map((e) => {
  const c = e.c || {};
  const recent = c.recent ? '<details><summary>上下文</summary><div class="user muted">' + c.recent.map((r) => esc((r.role === "user" ? "用户：" : "Nemesis：") + r.text)).join("\\n") + "</div></details>" : "";
  return '<article class="card"><header>' + chip(c.policy) + "<strong>" + esc(c.group) + "</strong><code>" + esc(e.id) + "</code>" +
    (e.previous ? '<span class="chip warn">有上一版可对比</span>' : "") + "</header>" + recent +
    '<div class="user">' + esc(c.message) + "</div>" + replyBlock(e.latest, e.previous ? "最新" : "") +
    (e.previous ? '<details class="old"><summary>看上一版回复</summary>' + replyBlock(e.previous, "上一版") + "</details>" : "") + "</article>";
}).join("");

const groups = ["全部", "只看问题", ...new Set(cls.map((c) => c.group))];
let current = "全部";
function renderRows() {
  const rows = cls.filter((c) => current === "全部" || (current === "只看问题" ? !c.pass || c.routePass === false || c.degradedRuns : c.group === current));
  document.getElementById("rows").innerHTML = rows.map((c) =>
    "<tr><td><code>" + esc(c.id) + "</code><br><span class=\\"muted\\" style=\\"font-size:12px\\">" + esc(c.group) + (c.note ? " · " + esc(c.note) : "") + "</span></td>" +
    '<td class="msg">' + esc(c.message) + "</td><td>" + c.expect.map(chip).join(" ") + (c.expectRoute ? '<br><span class="muted" style="font-size:12px">' + esc(c.expectRoute) + "</span>" : "") + "</td>" +
    "<td>" + chip(c.policy) + " " + (c.pass ? '<span class="ok">✓</span>' : '<span class="no">✗</span>') + (c.degradedRuns ? '<br><span class="warn" style="font-size:12px">曾被限流 ' + c.degradedRuns + " 次</span>" : "") + "</td>" +
    "<td>" + esc(c.route) + (c.routePass === null ? "" : c.routePass ? ' <span class="ok">✓</span>' : ' <span class="no">✗</span>') + '<br><span class="muted" style="font-size:12px">' + esc(c.queryType) + "</span></td>" +
    "<td>" + (c.confidence ?? "") + '</td><td class="reason">' + esc(c.reason) + "</td></tr>").join("");
  document.getElementById("groups").innerHTML = groups.map((g) => '<button aria-pressed="' + (g === current) + '">' + esc(g) + "</button>").join("");
  document.querySelectorAll("#groups button").forEach((b) => b.addEventListener("click", () => { current = b.textContent; renderRows(); }));
}
renderRows();

for (const [tab, view] of [["tab-e2e", "view-e2e"], ["tab-cls", "view-cls"]]) {
  document.getElementById(tab).addEventListener("click", () => {
    for (const [t, v] of [["tab-e2e", "view-e2e"], ["tab-cls", "view-cls"]]) {
      document.getElementById(t).setAttribute("aria-pressed", String(t === tab));
      document.getElementById(v).hidden = v !== view;
    }
  });
}
</script>
`;

const out = join(dir, "index.html");
writeFileSync(out, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${html.replace("<main>", "</head><body><main>")}</body></html>`, "utf8");
console.log(out);
