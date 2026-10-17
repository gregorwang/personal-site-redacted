# 项目文档

个人站点（Remix + Cloudflare Workers）的设计方案、审计报告、排查记录和笔记。按「这份文档是干什么用的」分目录。

| 目录 | 放什么 | 一句话判断 |
|------|--------|-----------|
| [`design/`](design/) | 功能设计与实施方案 | 要做 / 正在做 / 已做完的功能，怎么做 |
| [`audits/`](audits/) | 审计与评审 | 某一时刻对现状的体检和改进建议 |
| [`troubleshooting/`](troubleshooting/) | 问题排查报告 | 线上出过的问题：现象、原因、修法 |
| [`notes/`](notes/) | 问答与技术笔记 | 某个问题的解释、取舍讨论 |
| [`prompts/`](prompts/) | 给 AI 的原始需求 | 当时怎么提的需求，留档对照 |
| [`reference/`](reference/) | 参考数据与代码快照 | 被脚本读取的数据源、只读代码快照 |

## 命名规则

- 小写 kebab-case，日期放最后：`主题-YYYY-MM-DD.md`。日期是文档写成的日期，不是最后修改日期。
- 新文档直接放进对应子目录，不要放在 `docs/` 根目录，也不要另建 `doc/`。
- 说不清属于哪类时：讲「怎么做」进 `design/`，讲「现在怎么样」进 `audits/`，讲「为什么坏了」进 `troubleshooting/`。
- 更新日志不在这里，在 `app/data/updates.ts`（网站 `/updates` 页面的数据源）。

---

## design/ 功能设计与实施方案

| 文档 | 内容 |
|------|------|
| [nemesis-hermes-weixin-shared-media-integration-2026-07-23](design/nemesis-hermes-weixin-shared-media-integration-2026-07-23.md) | Nemesis、Hermes Agent、微信 iLink 共用图片与音乐的实施规范 |
| [site-observability-ai-weixin-alert-product-improvement-2026-07-24](design/site-observability-ai-weixin-alert-product-improvement-2026-07-24.md) | 网站运行状态感知与 AI 微信事故通知（site-observer-worker 主文档） |
| [nemesis-quote-selector-workflow-2026-06-12](design/nemesis-quote-selector-workflow-2026-06-12.md) | Nemesis 语录引用：模型只输出 `[quote:id]`，服务端白名单换原文 |
| [image-hash-cdn-migration-2026-06-09](design/image-hash-cdn-migration-2026-06-09.md) | 图片内容哈希文件名 + CDN 长缓存迁移（已落地） |
| [nemesis-sticker-feature-assessment-2026-06-08](design/nemesis-sticker-feature-assessment-2026-06-08.md) | Nemesis 表情包附件定稿（P1 已上线） |
| [nemesis-rich-media-roadmap-2026-06-08](design/nemesis-rich-media-roadmap-2026-06-08.md) | Nemesis 富媒体与彩蛋后续 backlog（P2～P4 暂缓） |
| [motion-interaction-ideas-2026-06-04](design/motion-interaction-ideas-2026-06-04.md) | 主站 GSAP / Motion 交互想法 |

## audits/ 审计与评审

| 文档 | 内容 |
|------|------|
| [remix-performance-review-2026-06-06](audits/remix-performance-review-2026-06-06.md) | 全项目性能 review：配置、路由、资源、鉴权 |
| [unused-code-audit-2026-06-06](audits/unused-code-audit-2026-06-06.md) | 多余代码与依赖审计 |
| [code-audit-change-summary-2026-06-06](audits/code-audit-change-summary-2026-06-06.md) | 上面这次审计之后实际清理了什么 |
| [font-system-audit-2026-06-04](audits/font-system-audit-2026-06-04.md) | 字体资源、CSS 变量、Tailwind、页面样式四层不统一的问题 |
| [style-animation-audit-2026-06-04](audits/style-animation-audit-2026-06-04.md) | 动画、悬停、圆角、阴影等视觉一致性审计 |
| [seo-audit-2026-05-29](audits/seo-audit-2026-05-29.md) | SEO 审计：结构化数据、OG、sitemap |
| [remix-cloudflare-worker-optimization-review-2026-02-22](audits/remix-cloudflare-worker-optimization-review-2026-02-22.md) | Workers + D1 + R2 + DO 架构深度优化审计 |
| [remix-cloudflare-worker-size-audit-2026-02-22](audits/remix-cloudflare-worker-size-audit-2026-02-22.md) | Worker 体积限制与适配审计 |

## troubleshooting/ 问题排查

| 文档 | 内容 |
|------|------|
| [mobile-oauth-origin-state-report-2026-05-30](troubleshooting/mobile-oauth-origin-state-report-2026-05-30.md) | 移动端 Google / Microsoft OAuth 回调来源与 state 校验失败 |

## notes/ 问答与技术笔记

| 文档 | 内容 |
|------|------|
| [assorted-qa-2026-06-12](notes/assorted-qa-2026-06-12.md) | 合集：cache-headers 文件是什么、Gallery 为什么要 token、Magic Link 要不要留、过时类型清理、更新日志该放哪 |
| [auth-ui-assets-chat-followup-2026-06-06](notes/auth-ui-assets-chat-followup-2026-06-06.md) | Google One Tap、Microsoft 登录、UI 套件、R2 静态资源、聊天页代码高亮的取舍 |

## prompts/ 给 AI 的原始需求

| 文档 | 内容 |
|------|------|
| [cls-font-layout-shift-request-2026-06-13](prompts/cls-font-layout-shift-request-2026-06-13.md) | 排查中文字体分片导致的 CLS 布局偏移 |
| [image-hash-cache-request-2026-06-09](prompts/image-hash-cache-request-2026-06-09.md) | 图片内容哈希 + 长缓存的原始需求（对应 design/image-hash-cdn-migration） |

## reference/ 参考数据与代码快照

| 文档 | 内容 |
|------|------|
| [openai-site-teardown-2026-10-13](reference/openai-site-teardown-2026-10-13.md) | openai.com 前端拆解：技术栈、i18n、视频播放器规格、实测方法。**借鉴 OpenAI 设计前先读** |
| [nemesis-sticker-semantics-2026-06-13](reference/nemesis-sticker-semantics-2026-06-13.md) | 表情包语义标注（JSON）。**被 `scripts/prepare-nemesis-stickers.mjs` 读取**，挪动或改名要同步改脚本 |
