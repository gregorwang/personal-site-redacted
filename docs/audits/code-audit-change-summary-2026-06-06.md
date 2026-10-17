# 代码审计变更总结

日期：2026-06-06  
仓库：`gregorwang/remix-cloudflare`  
分支：`main`

## 已完成并推送的清理

提交：`037e81f chore: remove unused remix code and assets`

本次提交主要做了未使用代码和资源清理：

- 删除旧 3D 留言板残留资源：
  - `public/asset/002.glb`
  - `public/draco/*`
- 删除旧客户端媒体 token hook：
  - `app/hooks/useMediaToken.client.tsx`
  - `app/hooks/useLazyLoad.client.tsx`
- 删除重复的 public 根目录歌词文件。
- 保留仍在使用的 `app/lib/data/lyrics/*.lrc`。
- 删除备份文件、根目录旧文件、未使用 CSS 入口、旧工具模块、旧 Nemesis 孤立模块。
- 从首页留言板移除无效的 `modelUrl="/asset/002.glb"` 传参。
- 移除未使用依赖：
  - `@gsap/react`
  - `@react-three/drei`
  - `@react-three/fiber`
  - `three`
  - `nodemailer`
  - `@types/nodemailer`
  - `clsx`
  - `tailwind-merge`
- 新增审计文档：
  - `docs/audits/unused-code-audit-2026-06-06.md`

明确保留：

- `worker.ts`
- `app/lib/rate-limiter-do.ts`
- `app/lib/data/lyrics/*.lrc`
- `app/styles/music/_*.css`
- `app/lib/utils/timeUtils.ts`

## 当前准备提交的纯代码小修

这些改动不涉及组件结构、样式、视觉效果或动效逻辑。

### `app/components/MessageContent.tsx`

- 将 `oneDark as any` 改为更明确的类型转换。
- 目的：减少不必要的 `any`，不改变 Markdown 或代码高亮渲染行为。

### `app/entry.server.tsx`

- 将 `@ts-ignore` 改为 `@ts-expect-error`。
- 为 Cloudflare `loadContext.cloudflare.env` 增加局部类型。
- 目的：让 TypeScript 注释和 Cloudflare 环境注入更明确。

### `vite.config.ts`

- 为 `globalThis.__REMIX_RUNTIME_ENV__` 增加局部类型。
- 去掉 `args as any`。
- 目的：减少配置文件里的显式 `any`。

### `app/hooks/useMusicAnimations.client.ts`

- 删除未使用的 `musicTimeline` 解构变量。
- 补充 hook dependency 中的 `refs`。
- 没有改 GSAP 动画参数、选择器、时间线或事件行为。

### 路由文件

以下文件只删除未使用的 Remix `Link` 导入：

- `app/routes/anime.tsx`
- `app/routes/chat.tsx`
- `app/routes/cv.tsx`
- `app/routes/gallery.tsx`
- `app/routes/xiao.tsx`

说明：这里的 `Link` 是 Remix 的站内跳转组件，不是资源文件。因为这些文件里没有使用 `<Link />`，删除 import 不影响页面行为。

## 明确没有改的内容

以下内容没有在当前纯代码小修中改动：

- `app/components/ui/question.tsx`
- `app/components/creative-footer.tsx`
- 视觉组件的 DOM 结构
- Tailwind className
- Canvas 绘制逻辑
- GSAP 动效参数
- 音频交互逻辑

原因：

- `question.tsx` 和 `creative-footer.tsx` 剩余 lint 问题都涉及视觉组件或交互组件。
- 后续如果要修这些规则，需要先确认方案，再修改并做视觉预览。

## 当前验证状态

已通过：

```bash
npm run typecheck
npm run build
```

仍未通过：

```bash
npm run lint
```

剩余 lint 错误只在以下两个文件：

- `app/components/creative-footer.tsx`
- `app/components/ui/question.tsx`

这些错误已暂时保留，避免为了规则直接改变视觉组件结构、样式或动效。

## 后续建议

1. 对 `question.tsx` 做独立可访问性方案评审。
2. 对 `creative-footer.tsx` 做独立类型收敛方案评审。
3. 处理 Cloudflare Durable Object 本地开发警告。
4. 做 `npm audit` 安全依赖审计。
5. 给 `knip` 增加 Remix/Cloudflare 项目配置，减少误报。
