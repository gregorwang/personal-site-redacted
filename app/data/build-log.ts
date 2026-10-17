import type { BuildLogBlock, BuildLogTask } from "~/types/build-log";
import localeRedirectDoc from "../../docs/notes/locale-auto-redirect-2026-10-15.md?raw";
import guestbookRadioDoc from "../../docs/design/guestbook-radio-handoff-2026-10-13.md?raw";

/**
 * 首页「构建记录」的内容。
 * - 用户消息（prompt、me()）是 Claude Code 会话记录里的原话，包括语音输入的错字；太长的地方用「……」省略，不改写。
 * - AI 回复（say()）是当时实际回复的节选，英文进度行翻成了中文。
 * - 提交号、行数、提交列表、热力图和 token 数来自 app/generated/build-log-stats.ts（脚本生成）。
 * 新增一条：从会话记录里挑原话贴进来，不要编。
 */

const me = (text: string, at?: number): BuildLogBlock => ({ type: "user", text, at });
const say = (html: string, at?: number): BuildLogBlock => ({ type: "text", html, at });
const firstLines = (doc: string, count: number) => doc.split("\n").slice(0, count).join("\n");

export const BUILD_LOG_TOUR: [seconds: number, taskId: string][] = [
  [0, "terminal"],
  [7.5, "tokens"],
];

export const BUILD_LOG_TASKS: BuildLogTask[] = [
  {
    id: "heat",
    pinned: true,
    title: "提交热力图",
    sub: "",
    tool: "claude",
    model: "Opus 5.5",
    prompt:
      "这个项目是2024年启动了20424年5月 2然后那个github插件你能够读取到我这个项目 对应的云端项目的整个构建 构建热力图吗应该是有这种类似的吧",
    blocks: [
      { type: "step", verb: "", obj: "gh api repos/gregorwang/remix-cloudflare：私有仓库，2026-02-22 建" },
      { type: "step", verb: "", obj: "gh api graphql：账号贡献日历 2024–2026" },
      { type: "step", verb: "", obj: "git log --numstat：按天统计提交数和增删行数" },
      say(
        "能读到。不过有两件事要先说清楚：\n\n1. GitHub 上找不到 2024 年的仓库。这个项目最早的提交是 2025-11-16 的「init: clean history (no secrets)」，那次为了去掉密钥重建了历史，更早的提交已经不在了。\n2. 账号的贡献日历里看不到这个仓库：它是私有的，贡献没有公开计入。\n\n所以热力图按这个仓库自己的提交来画（本地 git 和 GitHub 是同一份）：提交都是成批的，5 月 29 日一天 16 次，7 月 16 日一天 15 次。",
      ),
    ],
    tabs: ["heatmap"],
    files: { heatmap: { kind: "heatmap", label: "热力图" } },
  },
  {
    id: "tokens",
    pinned: true,
    title: "Token 账本",
    sub: "",
    tool: "claude",
    model: "Opus 5.5",
    prompt:
      "然后我想了一下我用了这么多token 你为什么不不放一页我为这个项目构建了多少token呢这个项目起码50个亿是有的 灵活就一点好吧",
    blocks: [
      { type: "step", verb: "已统计", obj: "~/.claude 里这个项目的会话记录" },
      { type: "step", verb: "已统计", obj: "~/.codex 里工作目录是这个项目的会话" },
      say(
        "本机还能查实的分两块：Claude Code 只剩 10 月 1 日以后的记录（更早的已被自动清理），Codex 是 7 到 9 月的 GPT-5.6 Sol。Cursor 不在本机存 token 数。你说的 50 亿以上，差的就是这几块查不到的，账本里按「估算」单独标出来。",
      ),
      say("顺带一个有意思的数：Claude Code 的用量里绝大部分是<b>缓存读取</b>，也就是每一轮都把整个上下文重新读一遍；它真正写出来的只是零头。"),
    ],
    tabs: ["tokens"],
    files: { tokens: { kind: "tokens", label: "账本" } },
  },
  {
    id: "terminal",
    title: "重构首页赛博终端",
    sub: "",
    runningSub: "把真实提示词放进来",
    finishAt: Infinity,
    tool: "claude",
    model: "Opus 5.5",
    prompt:
      "（两张截图）这张图是我们自己网站的 然后这张图 是cursor官方，感觉我完全没有官方做的优雅呀 而且我那个有卡顿还有整个创意也有问题 你尝试看一下用playwright 先把cusor这里的结构明白弄明白弄清楚在本地进行复现 给一个html 可以 边复现边研究我们这里看我们这里该怎么跟跟cursor这里实现同样的效果 也可以做我们自己独特的东西 开始吧",
    blocks: [
      { type: "step", verb: "已拆解", ing: "正在拆解", obj: "cursor.com/cn 首页演示区（逐项点过）", at: 1.0, done: 1.8 },
      { type: "step", verb: "已读取", ing: "正在读取", obj: "app/components/home/cyber-terminal.tsx", at: 1.8, done: 2.4 },
      say(
        "卡顿原因基本确认了：打字机每 15ms 触发整个 1500 行组件重渲染，而窗口叠了 4 层 backdrop-blur 在油画上，每帧都要重算模糊。",
        2.4,
      ),
      me(
        "还原的基本及格了 但是我感觉我得重构啊我这个 我这是一个个人网站 我怎么感觉我现在一看感觉有点问题啊别人进来看我的个人网站 …… 说说你的看法呗",
        3.0,
      ),
      say(
        "我的结论是：问题不在做得好不好看，而在这个模块的<b>定位</b>不对。它在一个个人网站上，模仿了一个产品的演示。……把假演示换成真记录，主题是「这个网站是怎么跟 AI 一起做出来的」。",
        3.4,
      ),
      me("可以按照你的想法 来吧 搞一个给我预览看看", 3.9),
      me("微信入口不要了不给token也不要了全删了 …… 既然要做真的就把真的提示词改进去呗", 4.4),
      me(
        "回放那个地方 改成对应的使用工具 比如codex Claude code 和 cursor 模型就改成我现在正在用的模型 …… 然后我想了一下我用了这么多token 你为什么不不放一页我为这个项目构建了多少token呢",
        4.9,
      ),
      me("可以就这样开始接入吧", 5.4),
      { type: "step", verb: "", ing: "正在把它接进首页", obj: "", at: 5.9, done: Infinity },
    ],
    tabs: ["preview", "cyber-terminal.tsx"],
    files: {
      preview: {
        kind: "shot",
        label: "预览",
        url: "build-log-preview.html",
        image: "build_log_preview",
        width: 1233,
        height: 720,
        highlights: [
          { x: 2.6, y: 9.2, w: 17.9, h: 76.1, label: "真实提交 · git log" },
          { x: 20.5, y: 9.2, w: 27.5, h: 64.9, label: "原话 · Claude Code 会话记录" },
          { x: 48.1, y: 9.2, w: 40.6, h: 76.1, label: "文档 / 代码 / 截图" },
          { x: 66.6, y: 60.8, w: 30.8, h: 34.7, label: "git log --oneline" },
        ],
      },
      "cyber-terminal.tsx": {
        kind: "code",
        lang: "ts",
        diff: true,
        content: `-  const t4 = setTimeout(() => setStepProgress(4), 1600); // 1600ms 后启动伙伴打字机
-  const timer = setInterval(() => { … }, speed); // 15ms 一次，整个窗口重渲染
+  // 任务和原话在 app/data/build-log.ts，提交和用量由 scripts/build-log-stats.mjs 生成
+  const stats = buildLogStats;
-<div className="… bg-[#faf9f5]/30 backdrop-blur-2xl">
+<div className="build-log-win">  {/* 实心底色 + 三层阴影，零 backdrop-filter */}
-  fetch("/api/claim-token", { method: "POST", … }); // 1111 → 领 token → 复制微信
+  // 不再有 token，也不再有微信入口`,
      },
    },
  },
  {
    id: "images",
    title: "图片管线出多宽度 webp",
    time: "10/15",
    sub: '<span class="add">+223</span> <span class="del">−15</span> · 首页与相册改用 srcset',
    tool: "claude",
    model: "Opus 5.5",
    prompt:
      "我这个网站的性能很糟糕我觉得绝大多数性能问题可能是因为图片这里的逻辑引起了因为图片这里我没有做很好的优化我记得 cursor的图片优化就做的很好他用的那个vercel的高级功能 就是网站检测用户的 电脑网速传不同的图片 然后open ai这里图片也很多它跟我的网站有一定相似之处有很多图片然后还有视频有一大堆内容 我觉得你可以先探索一下OpenAI是怎么做的好吧 看奥本埃亚有没有值得学习的地方因为我们之前的多语言切换就是偷open ai的学open ai的 看一下它的相关的图片优化功能是怎么做的 先探索一下好吧 用play right或者说其他更好的方式",
    blocks: [
      { type: "step", verb: "已实测", obj: "openai.com 首页每张图的 srcset、sizes 和传输体积" },
      { type: "step", verb: "已实测", obj: "cursor.com 的 /_next/image" },
      { type: "step", verb: "已实测", obj: "你的首页（视口 929px）" },
      say(
        "<b>结论：OpenAI 和 Cursor 都没有「检测网速换图片」。</b>它们做的事情很朴素：同一张图准备好几种宽度，浏览器按自己的屏幕宽度和像素密度挑最合适的一档。手机和慢网络的设备屏幕通常小，自然拿到小图，所以看起来像按网速适配。\n\n你的首页问题很明确：一张图只有一个原尺寸版本。<code>photo-17</code> 原图 2744×4080，实际只显示 99×184，却下载了 <b>696KB</b>。首页图片一共约 3MB。",
      ),
      me("…… 2.方案A这个可以吗不想花钱啊 …… 重要的是复杂度这里方案a如果复杂方太复杂了然后手艺又小那感觉做也没必要"),
      say(
        "方案 A：完全不花钱，复杂度中等偏低，值得做。各种尺寸的图在你本地跑 <code>images:process</code> 时一次性生成好，再上传到 R2。线上访问的只是普通静态文件，没有现场缩放，也就没有可以被爬虫刷完的额度。",
      ),
      me("可以开始吧"),
      { type: "chip", path: "scripts/process-images.mjs", add: 44, del: 2 },
      { type: "chip", path: "app/lib/resolve-image.ts", add: 15, del: 2 },
      { type: "chip", path: "app/components/home/photo-section.tsx", add: 17, del: 5 },
      me("突然想起来我们之前那个图片好像做过一个哈希指纹 我也不知道为什么 哈希指纹就是什么缓存之类的 这个应该不影响吧可以快速看一下呗"),
      say(
        "不影响。这次的改动正是在原来的哈希指纹机制上做的。文件名里那段 <code>11330d7a</code> 是根据图片内容算出来的：内容不变，名字就不变，所以 CDN 可以放心让浏览器把图片缓存一年。",
      ),
      { type: "merged", hash: "cbd9d31", date: "2026-10-15", files: 10, add: 223, del: 15 },
    ],
    tabs: ["preview", "app/lib/resolve-image.ts", "app/components/home/photo-section.tsx"],
    files: {
      preview: {
        kind: "shot",
        label: "预览",
        url: "エミリア.com/",
        image: "build_log_photo_wall",
        width: 1585,
        height: 1000,
        highlights: [
          { x: 52.4, y: 7.6, w: 12.1, h: 21.2, label: "img · n4.w320.webp" },
          { x: 28.7, y: 10.6, w: 12.1, h: 20, label: "srcset 320w / 640w / 1080w" },
          { x: 73.2, y: 22.2, w: 9.7, h: 17.2, label: "sizes · min(13.3vw, 192px)" },
        ],
      },
      "app/lib/resolve-image.ts": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "resolve-image.ts",
        content: `-import { images, r2KeyIndex, type ImageManifestKey } from "~/generated/image-manifest";
+import { imageWidths, images, r2KeyIndex, type ImageManifestKey } from "~/generated/image-manifest";
 import { cdnUrl, ossUrl } from "~/lib/media-cdn";

 export function resolveImage(key: ImageManifestKey): string {
   return images[key] ?? "";
 }

+/**
+ * 管线生成过缩小版的图片返回 srcset（如 \`….w320.webp 320w, …, ….webp 3072w\`），否则 undefined。
+ * 必须同时给 <img> 写 sizes，浏览器才知道该挑哪一档。
+ */
+export function imageSrcSet(src: string): string | undefined {
+  const widths = imageWidths[src];
+  if (!widths) return undefined;
+  const original = widths[widths.length - 1];
+  return widths
+    .map((width) => (width === original ? \`\${src} \${width}w\` : \`\${src.replace(/\\.webp$/, \`.w\${width}.webp\`)} \${width}w\`))
+    .join(", ");
+}`,
      },
      "app/components/home/photo-section.tsx": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "photo-section.tsx",
        content: `-import { resolveImage } from "~/lib/resolve-image";
+import { imageSrcSet, resolveImage } from "~/lib/resolve-image";

+// 桌面端最大一格是舞台宽 min(76vw, 1100px) 的 17.45%；900px 以下 CSS 固定为 112px
+const PORTRAIT_SIZES = "(max-width: 900px) 112px, min(13.3vw, 192px)";
+
   {
     key: "right-upper",
-    src: "https://oss.xn--cckl9nsb.com/n10.webp",
+    src: resolveImage("n10"),
     alt: intl.formatMessage({ defaultMessage: "个人摄影作品九" }),
   },`,
      },
      "scripts/process-images.mjs": {
        kind: "code",
        lang: "ts",
        label: "process-images.mjs",
        content: `// 每张静态图额外输出的宽度档，只出比原图窄的
const RESPONSIVE_WIDTHS = [320, 640, 1080, 1600];

for (const width of RESPONSIVE_WIDTHS) {
  if (width >= meta.width) continue;
  const out = file.replace(/\\.webp$/, \`.w\${width}.webp\`);
  await sharp(input).resize({ width }).webp({ quality: 82 }).toFile(out);
  widths.push(width);
}`,
      },
    },
  },
  {
    id: "title",
    title: "窗口标题变成了一行代码",
    time: "10/15",
    sub: '<span class="add">+6</span> <span class="del">−6</span> · 调研图片时顺手发现的',
    tool: "claude",
    model: "Opus 5.5",
    blocks: [
      say(
        "（上一轮调研图片时的附注）还有一个不相关的问题：首页控制台有 <b>171 条</b> <code>@formatjs FORMAT_ERROR</code>，消息 ID 是 <code>ncqjBm</code>，可能是 i18n 某条文案的占位符写错了，后面可以顺手修。",
      ),
      me("1.不相关的顺手修了"),
      { type: "step", verb: "已搜索", obj: "ncqjBm、windowTitle" },
      say(
        "找到了：之前做多语言批量替换时，赛博终端窗口标题的原文被换成了代码 <code>{intl.formatMessage(messages.windowTitle)}</code> 本身。花括号又被当成占位符，于是每次渲染都报 FORMAT_ERROR。",
      ),
      { type: "step", verb: "已查", obj: "git 历史里的原文：Cyber Terminal — 汪家俊的个人空间" },
      { type: "chip", path: "app/components/home/cyber-terminal.tsx", label: "cyber-terminal.tsx", add: 1, del: 1 },
      { type: "chip", path: "app/locales/zh.json", add: 3, del: 3 },
      say("中、英、日三份词典都已更新，<code>i18n:check</code> 显示两种语言都是 491/491，<code>tsc</code> 也通过了。"),
      { type: "merged", hash: "85bad9c", date: "2026-10-15", files: 4, add: 6, del: 6 },
    ],
    tabs: ["app/components/home/cyber-terminal.tsx", "app/locales/zh.json"],
    files: {
      "app/components/home/cyber-terminal.tsx": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "cyber-terminal.tsx",
        content: `   title: { defaultMessage: "赛博终端", description: "首页赛博终端区块标题" },
-  windowTitle: { defaultMessage: "{intl.formatMessage(messages.windowTitle)}" },
+  windowTitle: { defaultMessage: "Cyber Terminal — 汪家俊的个人空间" },
   author: { defaultMessage: "汪家俊", description: "赛博终端里提问者的名字" },`,
      },
      "app/locales/zh.json": {
        kind: "code",
        lang: "json",
        diff: true,
        label: "zh.json",
        content: `+  "8+E3u+": {
+    "defaultMessage": "Cyber Terminal — 汪家俊的个人空间"
+  },
-  "ncqjBm": {
-    "defaultMessage": "{intl.formatMessage(messages.windowTitle)}"
-  },`,
      },
    },
  },
  {
    id: "rr7",
    title: "Remix v2 升级到 React Router v7",
    time: "10/15",
    sub: '<span class="add">+2843</span> <span class="del">−8162</span> · 44 个文件',
    tool: "claude",
    model: "Opus 5.5",
    prompt:
      "看一下我这个项目有必要升级到 reactor v七吗 也就是那个新版 我这个是remix2有点太老了 或者直接 整个项目转成open next 也就是cloudflare的next.Js，快速看看",
    blocks: [
      say(
        "<b>结论：值得升级到 React Router v7，而且你这个项目升级成本很低。不建议转 OpenNext/Next.js。</b>\n你在 <code>vite.config.ts</code> 里已经打开了全部 5 个 v3 future flag，这几项正是官方迁移的前置条件，难的部分你已经做完了。",
      ),
      me("好，开个分支升级到 RR7"),
      { type: "step", verb: "", obj: "分支 upgrade/react-router-v7 已建好" },
      { type: "step", verb: "", obj: "批量改导入路径；json() 改成 data()" },
      { type: "step", verb: "", obj: "RemixServer → ServerRouter，RemixBrowser → HydratedRouter" },
      { type: "chip", path: "app/routes.ts", add: 5 },
      { type: "chip", path: "app/entry.client.tsx", add: 2, del: 8 },
      say("tsc 通过，测试 48/48 通过，生产构建和 wrangler 打包都正常。"),
      me("这么快嘛？你觉得有必要升到v八去吗 2.本地npm run devil报错了 （TypeError: Cannot read properties of null (reading 'useContext')"),
      say(
        "这是我的疏漏：上一轮只测了生产构建和 wrangler，没跑 dev 模式。Vite 启动时没扫到 react-intl、framer-motion、gsap 这些包，打开页面后才重新打包依赖，刷新途中新旧两份 React 混在一起，就报了这个错。已经把它们列进 <code>optimizeDeps.include</code>。",
      ),
      me("ok那就合并吧"),
      say("已经快进合并进本地 main。push 到 main 会触发自动部署，所以先跟你确认：要现在推吗？"),
      me("push"),
      { type: "merged", hash: "af3df0c", date: "2026-10-15", files: 44, add: 2843, del: 8162 },
    ],
    tabs: ["app/routes.ts", "app/entry.client.tsx"],
    files: {
      "app/routes.ts": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "routes.ts",
        content: `+import type { RouteConfig } from "@react-router/dev/routes";
+import { flatRoutes } from "@react-router/fs-routes";
+
+// 沿用 Remix v2 的扁平文件路由约定（($lang).xxx.tsx 等），路由文件名无需改动。
+export default flatRoutes() satisfies RouteConfig;`,
      },
      "app/entry.client.tsx": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "entry.client.tsx",
        content: `-import { RemixBrowser } from "@remix-run/react";
+import { HydratedRouter } from "react-router/dom";
 import { startTransition, StrictMode } from "react";
 import { hydrateRoot } from "react-dom/client";

 startTransition(() => {
   hydrateRoot(
     document,
     <StrictMode>
-      <RemixBrowser />
+      <HydratedRouter />
     </StrictMode>
   );
 });`,
      },
    },
  },
  {
    id: "locale",
    title: "按浏览器语言自动跳转",
    time: "10/15",
    sub: '<span class="add">+363</span> <span class="del">−6</span> · 照着 openai.com 实测',
    tool: "claude",
    model: "Opus 5.5",
    prompt:
      "看一下我们不是最近在研究多语言对吧多语言切换我们已经做完了但是我们没有做到像那种流畅的识识别用户 然后跳转到对应的语言页 你现在看一下 OpenAI官网 https://openai.com是怎么实现语言跳转呢我每次进去都是自动跳中文的就算我换了不同的浏览器我们从来没有访问这个网站我一进去也是跳中文的跟cookie没有关系我刚才开了一个新的浏览器访问了这个会直接跳中文然后下面会弹一个cookie说明它这个手手段策略可以我们可以先用play right研究一下学习一下 然后然后迁移到我们的网站来当然啊我们还是先研究好好吧 开始干吧",
    blocks: [
      { type: "step", verb: "", obj: "有头浏览器没被拦，清掉 cookie 后直接跳到了 /zh-Hans-CN/" },
      { type: "step", verb: "", obj: "点 English (United States)，看 cookie 怎么变" },
      say(
        "OpenAI 是<b>服务端按浏览器语言直接 302 跳转</b>的，跟 cookie 无关，也没有用前端 JS 跳转。新浏览器同样会带上系统语言的请求头 <code>Accept-Language: zh-CN</code>。\n\n你看到的底部弹窗是 Cookie 同意横幅，跟语言识别没关系。另外要更正一点：10-14 用 curl 测出「200，不重定向」是假象，curl 被 Cloudflare 拦在了人机验证页上。",
      ),
      me(
        "跳英文，按你的方案开始做吧 韩文法文这种直接跳到英文 其他懂吧其他的语言任何语言直接跳到英文韩文法文后续但是会做好吧 是中文跳中文是英文跳英文是日语跳日语其他的不知道什么语言好吧一律跳英文 开始干吧",
      ),
      { type: "step", verb: "", obj: "确认：客户端导航时 URL 会带 _routes 参数，跳转地址里去掉" },
      { type: "chip", path: "app/lib/i18n.server.ts", add: 54, del: 3 },
      { type: "chip", path: "test/locale-redirect.test.mjs", add: 114 },
      say(
        "自动跳转已经做好。48 个测试全部通过，其中 13 个是新写的跳转测试。手动选过语言的按选的来；没选过的看浏览器语言：中文不跳，日语跳 <code>/ja</code>，其它任何语言跳 <code>/en</code>。爬虫不跳，搜索收录不受影响。",
      ),
      me(
        "去提交部署吧我来手动测试了 然后你这次改动你觉得有没有什么需要背景知识进行沉淀下来作为文档 因为后续可能如果这里有bug我需要进行排查修改",
      ),
      { type: "chip", path: "docs/notes/locale-auto-redirect-2026-10-15.md", label: "locale-auto-redirect-2026-10-15.md", add: 96 },
      { type: "merged", hash: "a7e94d6", date: "2026-10-15", files: 7, add: 363, del: 6 },
    ],
    tabs: ["docs/notes/locale-auto-redirect-2026-10-15.md", "app/lib/i18n.server.ts", "test/locale-redirect.test.mjs"],
    files: {
      "docs/notes/locale-auto-redirect-2026-10-15.md": {
        kind: "markdown",
        label: "locale-auto-redirect.md",
        content: firstLines(localeRedirectDoc, 47),
      },
      "app/lib/i18n.server.ts": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "i18n.server.ts",
        content: ` export function resolveLocale(request: Request, lang: string | undefined): Locale {
-  if (lang === undefined) return DEFAULT_LOCALE;
+  if (lang === undefined) {
+    redirectToPreferredLocale(request);
+    return DEFAULT_LOCALE;
+  }

+/**
+ * 访客偏好的语言（参照 openai.com 实测）：
+ * 1. 切换器里手动选过的（cookie）优先；
+ * 2. 否则看 Accept-Language：中文→zh，日文→ja，其它→en；
+ * 3. 爬虫、没带 Accept-Language 的请求返回 null，保持中文 200，hreflang 才不会乱。
+ */
+export function getPreferredLocale(request: Request): Locale | null {
+  const chosen = readLocaleCookie(request);
+  if (chosen) return chosen;
+  if (isbot(request.headers.get("User-Agent") || "")) return null;
+  return pickLocaleFromAcceptLanguage(request.headers.get("Accept-Language"));
+}`,
      },
      "test/locale-redirect.test.mjs": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "locale-redirect.test.mjs",
        content: `+import assert from "node:assert/strict";
+import { after, describe, it } from "node:test";
+
+const { pickLocaleFromAcceptLanguage } = await vite.ssrLoadModule("/app/lib/i18n.ts");
+const { resolveLocale } = await vite.ssrLoadModule("/app/lib/i18n.server.ts");
+
+function request(path, { acceptLanguage, cookie, userAgent = CHROME_UA, method = "GET" } = {}) {
+  const headers = new Headers({ "User-Agent": userAgent });
+  if (acceptLanguage) headers.set("Accept-Language", acceptLanguage);
+  if (cookie) headers.set("Cookie", cookie);
+  return new Request(\`https://example.com\${path}\`, { method, headers });
+}`,
      },
    },
  },
  {
    id: "radio",
    title: "留言板改成收音机",
    time: "10/13",
    sub: '<span class="add">+1227</span> <span class="del">−614</span> · 每条留言是一个电台',
    tool: "claude",
    model: "Opus 5.5",
    prompt: "（截图）看一下这个留言板好丑陋啊你觉得它为什么丑陋啊说说你的看法好吧你作为一个专业的网站设计师我想听听你的看法",
    blocks: [
      say(
        "我觉得它丑不在某个颜色或圆角上，而是<b>同时用了三种隐喻，却哪一种都没做到位</b>：气泡左右交替像聊天应用，大圆角外框加右侧表单像仪表盘，背景里还有装饰性泡泡。结果它看起来既不像留言簿，也不像聊天窗口，更像一个后台表单页。",
      ),
      me(
        "你这给的好啥玩意儿完全都不行毫无创意完全不贴合我这个个人网站我这只是一个个人网站不是商业化网站没有独特的逻辑和特性啊也不好玩儿你看一下我其他的组件设计的多有意思 我那个qa问答我都是钢琴我最后那个 foot那个尾页做的是多好啊你看看那个 留言板这里完全差太多了你完全想不出来更好玩更有意思的方式吗",
      ),
      say("你说得对，三个方案只是照搬大公司的做法，没有先看你站里其他组件的个性。这次先认真读一遍问答区和页脚。"),
      { type: "step", verb: "已读取", obj: "钢琴问答、creative-footer.tsx" },
      say(
        "这次三个方向都照着钢琴问答和页脚的路子来：用一个具体的物件当玩法，配声音，再藏一点只属于你的彩蛋。\n\n<b>B · 收音机</b>：每条留言是一个电台。拖动刻度或者自动搜台，台与台之间是真的白噪声，越接近电台，乱码越少，留言逐渐变清楚。刻度上还有几个不标点的隐藏电台，播的是页脚里那些词：hope、miku、love、rezero。",
      ),
      me("收音机这个做的是相当强 相当有创意哥们儿这个真的比那个解码墙打字机强的不是一星半点儿 但是我不想要黑色呀 他得与我那个项目的背景颜色相贴合呀"),
      { type: "chip", path: "docs/design/guestbook-radio-handoff-2026-10-13.md", label: "guestbook-radio-handoff-2026-10-13.md", add: 132 },
      { type: "chip", path: "app/lib/guestbook-radio.ts", add: 75 },
      { type: "chip", path: "migrations/0010_message_radio_frequency.sql", label: "0010_message_radio_frequency.sql", add: 9 },
      me("咋又说英语了？说中文你就告诉我是不是完成了好吧"),
      say("抱歉，又说成英语了。以后都用中文。\n\n<b>完成了。</b>收音机留言板已经上线，我在线上测过一遍，正常。"),
      { type: "merged", hash: "f28a091", date: "2026-10-13", files: 10, add: 1227, del: 614 },
    ],
    tabs: ["docs/design/guestbook-radio-handoff-2026-10-13.md", "app/lib/guestbook-radio.ts", "migrations/0010_message_radio_frequency.sql"],
    files: {
      "docs/design/guestbook-radio-handoff-2026-10-13.md": {
        kind: "markdown",
        label: "guestbook-radio-handoff.md",
        content: firstLines(guestbookRadioDoc, 40),
      },
      "app/lib/guestbook-radio.ts": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "guestbook-radio.ts",
        content: `+/**
+ * 留言收音机的频率规则。服务端（创建留言时分配频率）和浏览器（渲染刻度、预告空频率）共用这一份，
+ * 所以这里不能引入任何 server-only 或 DOM 依赖。
+ */
+export const RADIO_MIN = 88;
+export const RADIO_MAX = 108;
+/** 离电台多近开始收到信号（MHz） */
+export const RADIO_LOCK = 0.45;
+
+/** 刻度上不标点的隐藏电台，播的是页脚词表里的词 */
+export const RADIO_HIDDEN_STATIONS = [
+  { f: 89.3, text: "hope" },
+  { f: 94.1, text: "miku" },
+  { f: 101.7, text: "love" },
+  { f: 107.3, text: "rezero" },
+] as const;
+
+/**
+ * 同时在播的留言上限：至少留 40% 的刻度给噪声。
+ * floor(20 MHz × 0.6 / (0.45 × 2)) − 4 个隐藏台 = 9。
+ */
+export const RADIO_ON_AIR_LIMIT = 9;`,
      },
      "migrations/0010_message_radio_frequency.sql": {
        kind: "code",
        lang: "md",
        diff: true,
        label: "0010_message_radio_frequency.sql",
        content: `+-- 留言收音机：每条留言在创建时分配一个 FM 频率（88.5 ～ 107.5），之后永不改变。
+-- 允许 NULL：分配失败或旧数据没有频率时，前端按 app/lib/guestbook-radio.ts 的同一规则临时补算。
+ALTER TABLE messages ADD COLUMN frequency REAL;
+
+UPDATE messages SET frequency = 90.5 WHERE id = 6 AND frequency IS NULL;
+UPDATE messages SET frequency = 91.7 WHERE id = 7 AND frequency IS NULL;
+UPDATE messages SET frequency = 92.9 WHERE id = 8 AND frequency IS NULL;`,
      },
    },
  },
  {
    id: "nemesis",
    title: "Nemesis 不再冷拒绝",
    time: "10/02",
    sub: '<span class="add">+2057</span> <span class="del">−382</span> · 117 条评测用例',
    tool: "claude",
    model: "Opus 5.5",
    prompt:
      "1.我这里的分类器真的能起到拦截识别的作用吗2.我觉得拦截可能是有点不太合乎产品的 并不是所有人都想了解我他可能觉得这个网页做的AI可能挺好玩的他随便问几个问题而不是我自己个人的问题因为我当初设计了逻辑就是希望别人能问我光物与我的问题不是关于我的问题就直接拦截返回固定的文案但如果想了一下这个真的很不合逻辑的 太冰冷了这种拒绝直接的拒绝会导致浏览这个网站的人可能马上退出这个页面 …… 所以我想做一个安全补充安全降级逻辑 但是我之前的项目代码里面好像有这个但是做的很糟糕 但我不太清楚这里到底该怎么做 …… 详细说说这里呗",
    blocks: [
      { type: "step", verb: "已查", obj: "git 历史里之前那套 SAFE_BOUNDARY 降级逻辑" },
      say(
        "先说结论：\n\n1. <b>分类器对它要防的东西基本防不住，对正常访客却在实打实地误伤。</b>它想防的是套提示词和越狱，这两件事它管不住；现在冰冷的固定回复，主要也就是它误伤造成的。\n2. <b>安全降级不需要微调。</b>把分类器的输出从「放不放行」改成「这一轮该怎么答」，交给主模型带着约束去回答。其实你以前的 SAFE_BOUNDARY 方向是对的，只是做坏了。",
      ),
      say(
        "……建议的顺序：1. 先查 D1，看误伤到底有多严重。2. 去掉 CLARIFY 直接回模板的逻辑。3. 合并两个分类器，引入策略表。4. 加输出侧的原文重合检查。5. 写评测脚本。",
      ),
      me(
        "12345都做吧，然后还有一点就是我希望即使用户在问一些无关我的话题的时候比如说今天的天气怎么样 最好能够串联到我的记忆把我的记忆串联到进来跟我沾上一点关系 这种能做到吗 然后这里评测 好像也没办法做你必须自己写问题自己手动去测试啊我感觉 人工我自己来一个一个问题问的话效率有点低啊 我也不知道该问啥问题",
      ),
      { type: "chip", path: "app/nemesis/response-policies.server.ts", label: "response-policies.server.ts", add: 114 },
      { type: "chip", path: "app/nemesis/guard-replies.ts", label: "guard-replies.ts", add: 21, del: 7 },
      { type: "chip", path: "scripts/eval-nemesis.mjs", label: "eval-nemesis.mjs", add: 510 },
      say(
        "提交和部署都完成了，线上已经在跑新版本。我没有登录态，没法在线上实际聊一轮。建议你登录后试几条：「今天天气怎么样」「为什么」「我不想活了」，再来一条孤独摇滚百合的。",
      ),
      { type: "merged", hash: "be04638", date: "2026-10-02", files: 26, add: 2057, del: 382 },
    ],
    tabs: ["安全降级计划.md", "app/nemesis/response-policies.server.ts", "app/nemesis/guard-replies.ts"],
    files: {
      "安全降级计划.md": {
        kind: "plan",
        title: "Nemesis 安全降级",
        body: [
          { html: "除了极少数硬红线，不在主模型前面拦人。分类器的工作从「判决」改成「给这一轮定一个回答策略」。" },
          {
            heading: "为什么不用微调",
            html: "每轮动态往 system prompt 里加一段策略，相当于在运行时给模型加条件。效果接近微调，几乎不多花钱，改策略只要改字符串。",
          },
          {
            heading: "策略分档",
            html: "<code>persona</code> · <code>general</code> · <code>careful</code> · <code>boundary</code> · <code>crisis</code> · <code>deflect</code> · <code>block</code>，只有 block 用固定文案。",
          },
        ],
        tasksLabel: "建议的顺序 · 5 Tasks",
        tasks: [
          { text: "先查 D1，看误伤到底有多严重", done: true },
          { text: "去掉 CLARIFY 直接回模板，故障时走降级而不是拒绝", done: true },
          { text: "合并两个分类器，引入策略表", done: true },
          { text: "加输出侧的原文重合检查", done: true },
          { text: "写评测脚本", done: true },
        ],
      },
      "app/nemesis/response-policies.server.ts": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "response-policies.server.ts",
        content: `+/**
+ * 分类器只决定「这一轮怎么答」，不决定「答不答」。
+ * 除 block 外，所有策略都会调用主模型，并把对应指令拼到 system instruction 末尾；
+ * block 是唯一不调用主模型、直接回固定文案的策略（见 guard-replies.ts）。
+ */
+export const NEMESIS_RESPONSE_POLICIES = [
+  "persona",
+  "general",
+  "careful",
+  "boundary",
+  "crisis",
+  "deflect",
+  "block",
+] as const;
+
+/** 求助和危机场景不发表情包、不推歌。 */
+export function policyAllowsMedia(policy: NemesisResponsePolicy) {
+  return policy !== "careful" && policy !== "crisis";
+}`,
      },
      "app/nemesis/guard-replies.ts": {
        kind: "code",
        lang: "ts",
        diff: true,
        label: "guard-replies.ts",
        content: `-/** Fixed guard replies for CLARIFY / REFUSE — not model-generated. */
-export const NEMESIS_GUARD_FIXED_REPLIES = {
-  CLARIFY:
-    "我可能判断得有点保守。你可以把想问的内容说具体一点，我会尽量在不涉及隐私和风险边界的情况下回答。",
+/**
+ * 不调用主模型时的固定回复——只剩硬红线、超长输入，以及输出侧拦下的原文泄露。
+ */
+export const NEMESIS_FIXED_REPLIES = {
+  block: "这个我不接。不是装正经，这类事我不会帮任何人做。换个话题吧——关于汪家俊、这个网站，或者别的你想聊的，都行。",
+  tooLong: "这段有点长，超出我一次能读的上限了。挑重点发，或者拆成几段，我接着看。",
+  empty: "你好像什么都没说。想聊点什么？",`,
      },
      "scripts/eval-nemesis.mjs": {
        kind: "code",
        lang: "ts",
        label: "eval-nemesis.mjs",
        content: `// npm run nemesis:eval —— 117 条用例，逐条打线上同一条链路，再让评审模型按策略打分
for (const testCase of cases) {
  const reply = await askNemesis(testCase.input, testCase.history);
  const verdict = await judge(testCase, reply);
  results.push({ ...testCase, reply, verdict });
}`,
      },
    },
  },
];
