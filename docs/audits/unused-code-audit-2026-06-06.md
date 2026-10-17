# Remix 项目多余代码审计报告

审计日期：2026-06-06  
范围：`C:\Users\汪家俊\mynuxt\remix`

## 结论摘要

项目里确实存在一批已经不再被运行时代码使用的文件和依赖。最明显的是旧 3D 留言板残留、旧媒体 token 客户端 hook、重复歌词文件、备份文件、旧 CSS 入口和若干未接入的工具模块。

建议只清理“确认未使用”项。`worker.ts`、`app/lib/rate-limiter-do.ts`、`app/styles/music/_*.css`、`app/lib/data/lyrics/*.lrc` 这几类容易被工具误报，但当前仍有引用或部署配置依赖，不能删除。

## 审计方法

使用了以下方式交叉验证：

1. `npx --yes knip --reporter json`
   - 产出了一批未使用文件、依赖、导出候选。
   - 注意：本次 `knip` 因 `wrangler.toml` TOML 解析报错没有完整成功，因此只作为候选来源。

2. `git grep`
   - 手动搜索 import、动态 import、Remix `links()`、public 资源路径、依赖包名。

3. 自定义导入图
   - 将 `app/routes/*`、`app/root.tsx`、`app/entry.client.tsx`、`app/entry.server.tsx`、`worker.ts`、`vite.config.ts`、`tailwind.config.ts` 作为入口。
   - 解析静态 import、re-export、常见动态 import。

## 确认可清理

### 1. 旧 3D 留言板残留

这些代码和资源看起来已经被新的气泡留言板替代：

- `public/asset/002.glb`
- `public/draco/draco_decoder.js`
- `public/draco/draco_decoder.wasm`
- `public/draco/draco_wasm_wrapper.js`
- 依赖：`@react-three/drei`
- 依赖：`@react-three/fiber`
- 依赖：`three`

证据：

- 首页仍传入 `modelUrl="/asset/002.glb"`：`app/routes/_index.tsx:176`
- 但 `DynamicShellMessageBoard` 只声明了 `modelUrl?: string`，组件内部没有读取它：`app/components/messages/DynamicShellMessageBoard.client.tsx:37`
- 全项目没有 `@react-three/*`、`three`、`Canvas`、`useFrame` 等有效使用。

建议：

1. 删除 `DynamicShellMessageBoardProps.modelUrl`。
2. 删除首页传参 `modelUrl="/asset/002.glb"`。
3. 删除上述 public 资源。
4. 从 `package.json` 删除 `@react-three/drei`、`@react-three/fiber`、`three`，然后 `npm install` 更新 lockfile。

### 2. 旧媒体 token 客户端 hook

- `app/hooks/useMediaToken.client.tsx`
- `app/hooks/useLazyLoad.client.tsx`

证据：

- 当前仅互相引用，没有任何路由或组件导入它们。
- 当前媒体 token 逻辑已由服务端工具和 API 路由承担：
  - `app/lib/media-token.server.ts`
  - `app/utils/imageToken.server.ts`
  - `app/routes/api.image-token.tsx`
  - `app/routes/api.media.tsx`
- `git grep` 中 `useImageToken`、`useVideoToken`、`useMediaToken` 只出现在这组旧 hook 内。

建议：直接删除两文件。删除后保留服务端 token 路径即可。

### 3. 重复 public 歌词文件

这些 public 根目录歌词文件没有运行时引用：

- `public/Goodbye.lrc`
- `public/Moments.lrc`
- `public/Nine Point Eight.lrc`
- `public/You're the Shine(Night Butterflies).lrc`
- `public/まっしろな雪.lrc`
- `public/コネクト.lrc`

证据：

- 当前首页歌曲数据从 `app/lib/data/home-songs.server.ts` 通过 `?raw` 导入 `app/lib/data/lyrics/*.lrc`。
- `?raw` 是 Vite/Remix 的构建期导入写法，意思是“把这个文件内容作为字符串导入”，不是网络请求，也不是从 `public/` 目录读取。
- `app/lib/data/home-songs.server.ts:1-6` 明确使用 app 内歌词文件。
- 没有路由或组件请求 `/Goodbye.lrc`、`/Moments.lrc` 等 public 根路径。

建议：如果确认没有外部页面或第三方直接访问这些 public URL，可以删除 public 根目录这 6 个 `.lrc`。必须保留 `app/lib/data/lyrics/*.lrc`。

### 4. 备份文件和孤立根文件

- `backup/HomeMessagesClient.client.tsx.bak`
- `backup/admin.messages.tsx.bak`
- `backup/messages.tsx.bak`
- `muscic.tsx`
- 根目录空文件：`{`

证据：

- `backup/*.bak` 被 git 跟踪，但没有任何运行时代码引用。
- `muscic.tsx` 位于项目根目录，不在 Remix `app` 路由/组件树内，也没有 import 引用。
- `{` 是 0 字节异常文件，当前未被 git 跟踪。

建议：删除。若需要保留历史，应该依赖 git 历史，不应把 `.bak` 放在源码树。

### 5. 未使用 CSS 入口

- `app/styles/auth.css`
- `app/styles/index.css`
- `app/styles/messages.css`
- `app/styles/music/index.css`
- `app/styles/shared/index.css`
- `app/styles/shared/_animations.css`
- `app/styles/shared/_glass-effects.css`
- `app/styles/shared/_scrollbars.css`

证据：

- 当前实际 CSS 入口：
  - `app/root.tsx` 导入 `app/tailwind.css`
  - `app/routes/_index.tsx` 导入 `app/styles/index-route.css`
  - `app/routes/music.tsx:5` 导入 `app/styles/music.css`
  - `app/styles/music.css` 再导入 `app/styles/music/_*.css`
- `app/styles/music/index.css` 是旧的聚合入口，内容与 `app/styles/music.css` 职责重复，但没有任何引用。
- `app/styles/shared/index.css` 只是一个“共享样式库入口”示例，没有被任何 CSS 或 TSX 导入。

注意：不要删除 `app/styles/music/_*.css`，这些仍被 `app/styles/music.css` 使用。

### 6. 未使用工具模块

- `app/components/ComponentErrorBoundary.tsx`
- `app/lib/fetch-wrapper.server.ts`
- `app/lib/i18n.ts`
- `app/lib/performance.ts`
- `app/lib/utils.ts`
- `app/lib/utils/index.ts`

证据：

- 导入图显示这些文件没有从任何 Remix 入口触达。
- `app/lib/utils.ts` 只提供 `cn()`，当前无调用；因此 `clsx` 和 `tailwind-merge` 也只被这个未使用文件引用。
- `app/lib/fetch-wrapper.server.ts` 里还保留 Supabase fetch 注释，但当前 `package.json` 没有 Supabase 依赖，源码也没有 Supabase 客户端。

建议：

- 如果短期没有计划接入这些通用工具，删除上述文件。
- 同步删除依赖 `clsx`、`tailwind-merge`。

保留说明：

- `app/lib/utils/timeUtils.ts` 当前也没有入口引用，但按你的要求保留，不放入删除清单。

### 7. Nemesis 旧规则/回复模块

- `app/nemesis/classifier-replies.server.ts`
- `app/nemesis/safety-rules.server.ts`

证据：

- 当前 Nemesis 服务链路使用：
  - `app/services/nemesis-guard.server.ts`
  - `app/services/nemesis-query-router.server.ts`
  - `app/nemesis/classifier-prompt.server.ts`
  - `app/nemesis/query-router-prompt.server.ts`
  - `app/nemesis/system-prompt.server.ts`
  - `app/nemesis/memory-canon.server.ts`
- 上述两个文件没有被服务或路由 import。

建议：删除。若这些规则仍有业务价值，应合并进当前 `nemesis-guard.server.ts` 或 prompt 文件，而不是作为孤立模块保留。

### 8. 未使用依赖

高置信可删：

- `@gsap/react`
- `@react-three/drei`
- `@react-three/fiber`
- `three`
- `nodemailer`
- `@types/nodemailer`

条件可删：

- `clsx`
- `tailwind-merge`

说明：

- `gsap` 仍被大量动态 import 使用，不能删。
- `tone` 仍被 `app/components/ui/question.tsx` 动态 import 使用，不能删。
- `framer-motion`、`@headlessui/react`、`better-auth`、`kysely`、`kysely-d1`、`resend`、`react-markdown`、`react-syntax-highlighter`、`remark-gfm`、`isbot` 当前仍有实际引用。
- `nodemailer` 当前没有源码 import，邮件发送使用的是 `resend`。

## 明确保留，不建议删除

### 1. `worker.ts`

`knip` 报它未使用，但这是误报。`wrangler.toml:2` 配置了：

```toml
main = "worker.ts"
```

这是 Cloudflare Worker 部署入口，不能删。

### 2. `app/lib/rate-limiter-do.ts`

也是工具容易误报的文件，但 `worker.ts` 导入了 `RateLimiterDO`，`wrangler.toml` 也声明了 Durable Object：

- `wrangler.toml:17` `name = "RATE_LIMITER"`
- `wrangler.toml:18` `class_name = "RateLimiterDO"`
- `wrangler.toml:29` `new_sqlite_classes = ["RateLimiterDO"]`

不能删。

### 3. `app/lib/data/lyrics/*.lrc`

不要和 public 根目录歌词混淆。`app/lib/data/lyrics/*.lrc` 当前通过 `app/lib/data/home-songs.server.ts:1-6` 被 `?raw` 作为纯文本字符串导入，仍在使用。

### 4. `app/styles/music/_*.css`

这些模块被 `app/styles/music.css` 导入，仍在使用。只建议删除未引用的 `app/styles/music/index.css`。

### 5. `build/`、`.wrangler/`、`.history/`

这些目录不应参与源码清理：

- `build/` 是构建产物，已在 `.gitignore`。
- `.wrangler/` 是本地 Cloudflare 状态，已在 `.gitignore`。
- `.history/` 是编辑器历史，已在 `.gitignore`。

如果本地空间需要清理，可以删除这些目录，但它们不是源码层面的“未使用代码”。

### 6. `app/lib/utils/timeUtils.ts`

当前没有运行时入口引用，但按要求保留。

## 建议清理顺序

1. 删除根目录异常文件、`backup/*.bak`、`muscic.tsx`。
2. 删除旧 3D 留言板残留，并移除 React Three 相关依赖。
3. 删除旧媒体 token 客户端 hook。
4. 在确认没有外部直链依赖后，删除重复 public 歌词文件。
5. 删除未使用 CSS 入口和未使用工具模块。
6. 删除无引用依赖，运行 `npm install` 更新 `package-lock.json`。
7. 运行验证：

```bash
npm run typecheck
npm run build
```

可选：

```bash
npx --yes knip
```

注意：当前 `knip` 会受 `wrangler.toml` 解析问题影响，建议修复或为 knip 单独配置后再作为 CI 检查。

## 可直接删除清单

```text
backup/HomeMessagesClient.client.tsx.bak
backup/admin.messages.tsx.bak
backup/messages.tsx.bak
muscic.tsx
{
public/Goodbye.lrc
public/Moments.lrc
public/Nine Point Eight.lrc
public/You're the Shine(Night Butterflies).lrc
public/まっしろな雪.lrc
public/コネクト.lrc
public/asset/002.glb
public/draco/draco_decoder.js
public/draco/draco_decoder.wasm
public/draco/draco_wasm_wrapper.js
app/components/ComponentErrorBoundary.tsx
app/hooks/useLazyLoad.client.tsx
app/hooks/useMediaToken.client.tsx
app/lib/fetch-wrapper.server.ts
app/lib/i18n.ts
app/lib/performance.ts
app/lib/utils.ts
app/lib/utils/index.ts
app/nemesis/classifier-replies.server.ts
app/nemesis/safety-rules.server.ts
app/styles/auth.css
app/styles/index.css
app/styles/messages.css
app/styles/music/index.css
app/styles/shared/index.css
app/styles/shared/_animations.css
app/styles/shared/_glass-effects.css
app/styles/shared/_scrollbars.css
```

依赖清理候选：

```text
@gsap/react
@react-three/drei
@react-three/fiber
@types/nodemailer
nodemailer
three
clsx
tailwind-merge
```

其中 `clsx` 和 `tailwind-merge` 需要和 `app/lib/utils.ts` 一起删除才成立。
