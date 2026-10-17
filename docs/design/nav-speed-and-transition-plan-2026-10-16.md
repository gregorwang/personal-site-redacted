# 站内跳转提速 + 页面过渡：工程设计 · 2026-10-16

> **📦 已归档（2026-10-17）**：本文档现在是历史记录，不是待办。跳转提速和圆形转场已全部上线，短期内不再改这块逻辑。以后要改，先读下面的「归档摘要」，再按需查后面各节的来龙去脉。
>
> 起因：用 Playwright 拆解 https://newopen.design（Framer 站）的页面过渡和"秒开"体验，对照本站做了测量。
> 相关：`docs/reference/openai-site-teardown-2026-10-13.md` §8（OpenAI 跳转=硬切+预取）、`docs/notes/font-frequency-subset-plan-2026-10-15.md`（字体）、`docs/notes/locale-auto-redirect-2026-10-15.md`（语言跳转与缓存的冲突）。

## 归档摘要（最终状态，2026-10-17）

**效果**：站内跳转（除 `/chat`）点击到转场开始 15–42ms（本地模拟 330ms 延迟实测），不出进度条；不同页面之间圆形展开，后退/前进和同模块内硬切。最后一次上线提交 `8fcbdae`。

**机制在哪里**

| 部分 | 文件 | 要点 |
|---|---|---|
| 圆形转场 | `app/components/transitions/route-reveal.ts`、`app/tailwind.css` 末尾 | `shouldReveal` 比较去掉语言前缀后的第一段路径；只有 `<html data-route-reveal>` 时播圆，其余 view transition 一律 `animation: none` |
| 链接 | `app/components/common/LocaleLink.tsx` | 自动加语言前缀、`viewTransition`、默认 `prefetch` |
| 预取策略 | `app/components/transitions/prefetch-policy.ts` | 默认 `viewport`；`/chat` 和省流量/2G 用 `intent` |
| 空闲预取 | `app/components/transitions/HomePrefetch.tsx` | 首页：全部模块一次；子页面：只预取首页 |
| root 不重跑 | `app/root.tsx` 的 `shouldRevalidate` | 只有表单提交、换语言、同 URL 时才重跑 root loader |
| 静态资源缓存 | `public/_headers` | `/assets/*` 一年 immutable |
| 慢跳转进度条 | `app/components/transitions/RouteTransition.tsx` | 超过 300ms 才出；转场中用 `:active-view-transition` 隐藏 |

**踩过的坑（改这块前必看）**
1. **跳转慢的真正原因不是 Worker，也不只是没预取**，而是点击时仍有预取挡不住的请求：root loader 每次导航都重跑；`/assets/*` 默认 `max-age=0, must-revalidate`，预取过的 CSS 还要回源 304。排查方法：Playwright 包一层 `document.startViewTransition` 记录「点击 → 转场开始」耗时，同时记点击后的请求列表（见 0.1 节）。
2. **不要给会在转场中途卸载的元素设 `view-transition-name`**：它一卸载，Chrome 就提前结束整个转场，圆只播一半，看起来像"没动画"。
3. **加了新的全站数据到 root loader 时**，要想清楚它在普通跳转时会不会变；会变的话要改 `shouldRevalidate`，否则客户端拿到的是旧值。
4. View Transition 要等新页准备好才开始，所以"转圈本身慢下来盖住等待"做不到，除非改成点击即开始的自绘动画（讨论过，因为跳转已经够快，没做）。

**没做的事**
- **D5 字体按字频切片**：未做，与本文无依赖，按 `docs/notes/font-frequency-subset-plan-2026-10-15.md` 单独做。
- **`/chat`**：仍约 350ms、会出进度条。原因是 loader 每次要在服务端查登录，结果因人而异，不能共享预取；页面包也大，只在悬停时预取。可选优化：只给已登录用户 viewport 预取，加上 `private` 短缓存 + `Vary: Cookie`，但要处理登录/退出后的缓存失效。站长决定先不做。

---

## 0. 进度（2026-10-16 第二个 session）

| 项 | 状态 | 说明 |
|---|---|---|
| D1 全站圆形转场 | ✅ 已做 | `shouldRevealFromHome` → `shouldReveal`，按去掉语言前缀后的第一段路径比较 |
| D4 去 loader | ✅ 已做 | music / cv / xiao / gallery / anime 去掉 loader，`headers` 直接返回原来的 Cache-Control；文案改成组件里 `useIntl()`，id 未变 |
| D3 首页预取 | ✅ 已做 | `app/components/transitions/HomePrefetch.tsx`，挂在 root。注意：React Router 默认按需发现路由，首页没有直达链接的模块（/xiao）靠组件里隐藏的 `<Link discover="render">` 先发现，否则 `PrefetchPageLinks` 匹配不到 |
| D6 进场动画 | ✅ 已做 | xiao 的 Framer Motion 全删；gallery 的 GSAP 揭示和 `.gallery-reveal-mask` 全删；anime 按 A/B/C 改完 |
| D6-C 首帧图 | ✅ 已做 | 视频开头 0.5 秒是黑场，poster 取第 0.6 秒（`anime_poster`，已过图片管线并上传），视频 `src` 加 `#t=0.6` 从同一帧开始播 |
| D5 字体切片 | ⏳ 未做 | 按第 6 节单独开 session |
| 0.1 进度条修复 | ✅ 已做（2026-10-17） | 见 0.1 节末尾「完成情况」 |
| 死代码清理 | ✅ 已做（2026-10-17） | `GamePageClient` / `GamePlatformPage` / `GamePageBackground` / `GamePlatformPicker` / `GamePlatformIcons` 及 `gamePlatformHref`、`GamePlatformPageData`、game.css 里的 Vue 过渡类 |

### 0.1 上线后发现的问题（2026-10-16 晚发现，2026-10-17 已修）

**现象**：站长反馈跳转时"还有一个奇怪的进度条"。

**原因**（两个叠在一起）：
1. **不少跳转仍超过 300ms**，所以 `RouteTransition` 的进度条和压暗层会出现：
   - 预取只在首页空闲时做一次（`HomePrefetch`）。从子页面跳到子页面大多没预取，手机上没有悬停，`prefetch="intent"` 基本无效，点击时要现拉 JS/CSS（东京节点一来一回约 330ms）。
   - `/game`、`/updates` 保留了 loader，从子页面进入要现拉 `.data`。
   - 首页刚打开就点，空闲预取还没跑完。
2. **进度条被拍进转场截图**（第 3 节"已知风险"成真）：View Transition 等新页数据回来才开始，开始时给旧页截图，此时进度条和压暗层已经显示，就被拍进去，跟旧页一起淡出，同时圆形在展开，看起来像进度条卡在转场里。

**明天的改法**（两项都做）：
1. **进度条不进截图**：给 `.route-progress` 加 `view-transition-name: route-progress`，再在 `app/tailwind.css` 的转场规则里加
   `::view-transition-old(route-progress), ::view-transition-new(route-progress) { display: none; }`，转场一开始进度条就消失。
   检查：后退时（POP 回放，默认 `animation: none`）也不能出残影；reduced-motion 下正常。
2. **子页面也预取**：`LocaleLink` 的默认 `prefetch` 从 `intent` 改成 `viewport`（第 4 节里的可选项），从任何页面出发，屏幕里看得到的链接都提前拉好。
   注意：显式写了 `prefetch="intent"` 的链接要逐个改掉或删掉显式值（`grep -rn 'prefetch="intent"' app`）；`/chat` 链接保持 `intent` 或 `none`（要登录、包大）。
   验证：从 `/cv` 页面停 2 秒再点"音乐"，Network 里不应有新的 JS/CSS 请求。

**完成情况（2026-10-17）**：
- 改法 1：~~`.route-progress` 加 `view-transition-name`~~ **上线后发现会把圆形转场掐断**：进度条在转场中途（约 250ms）被卸载，Chrome 随即结束整个转场，圆只播一半，看起来像"没有动画"。已改成 `app/tailwind.css` 里 `:root:active-view-transition .route-progress { display: none }`，不再给它命名。
- 改法 2：预取策略集中在 `app/components/transitions/prefetch-policy.ts`。`LocaleLink` 没传 `prefetch` 时用 `defaultPrefetch(to)`：默认 `viewport`；`/chat` 和省流量/2G 下退回 `intent`。全站显式的 `prefetch="intent"` 已删光（`GsapFillLink` 也走 `LocaleLink`，自动生效）。`HomePrefetch` 保留（首页链接分散在长页面里，进视口才拉太晚），`shouldSkipForNetwork` 移到了 prefetch-policy。
- 只做改法 1、2 之后线上仍然每次点击约 350ms。Playwright 实测（线上 + 本地 wrangler dev 模拟 330ms 延迟）找到两个真正的原因，2026-10-17 已修：
  1. **root loader 每次跳转都重跑**：没有 `shouldRevalidate`，React Router 默认每次导航都重新请求 root 数据（`/music.data` 里只有 root 的词典/主题/session），预取省不掉这一步。`app/root.tsx` 加了 `shouldRevalidate`：只有提交表单、换语言、同 URL revalidate 时才重跑。
  2. **`/assets/*` 的缓存头是 `max-age=0, must-revalidate`**：预取下来的 CSS 点击时还要再问一次服务器（304 也是一次往返）。新增 `public/_headers`，`/assets/*` 改成一年 + `immutable`。
  3. 子页面回首页的链接常在页底，进不了视口；首页有 loader。`HomePrefetch` 在子页面空闲时单独预取首页。
- 本地模拟 330ms 延迟的结果：首页→cv/music/gallery/game/updates、cv→首页，点击到转场开始 15–42ms，进度条不出现，圆形转场完整播完（约 660ms）。

**可选**：如果做完还有偶发进度条，把 `SHOW_AFTER_MS` 从 300 调到 400–500，或在 `data-route-reveal` 存在时不显示压暗层，只留 2px 细条。

---

## 1. 已上线的现状（不要重做）

提交 `c303154`、`0f4b541`，已推送部署。

| 文件 | 作用 |
|---|---|
| `app/components/common/LocaleLink.tsx` | 站内 `Link`。目标符合条件时自动加 `viewTransition`，点击时调 `armRouteReveal()` 给 `<html>` 加 `data-route-reveal` |
| `app/components/transitions/route-reveal.ts` | `shouldRevealFromHome()` 判断要不要播；`armRouteReveal()` / `disarmRouteReveal()` |
| `app/tailwind.css` 末尾 | `::view-transition-*` 规则：默认 `animation: none`（硬切）；有 `data-route-reveal` 时新页 `clip-path: circle(0 → 71% at 50% 50%)` 500ms，旧页淡出 550ms，缓动 `cubic-bezier(0.27, 0, 0.51, 1)`；reduced-motion 关闭 |
| `app/components/transitions/RouteTransition.tsx` | 旧幕布已删。现在只有：跳转超过 300ms 才出顶部 2px 进度条 + 旧页轻微压暗；`location.key` 变化 700ms 后 `disarmRouteReveal()` |

关键机制：
- 后退/前进（POP）时 React Router 会**自动回放**之前用过的 view transition。因为那时 `<html>` 上没有 `data-route-reveal`，CSS 默认规则让它变成硬切。**这就是"后退硬切"的实现方式，不要删掉 tailwind.css 里的默认 `animation: none` 规则。**
- 圆心固定在视口中心，不跟点击位置（站长明确选择：中心扩散更优雅）。

## 2. 已定的决定（站长确认过）

| # | 决定 |
|---|---|
| D1 | **所有站内页面之间的跳转都用圆形展开**，不再限于首页出发 |
| D2 | **后退/前进一律硬切**（理由：手机滑动返回时浏览器已有原生动画，会重复播放；返回不是"打开新内容"） |
| D3 | 做第 1 项：预加载各模块 |
| D4 | 做第 2 项：纯静态页面去掉 loader |
| D5 | 做第 3 项：字体按字频切片，**思源宋体 ExtraLight 不换** |
| D6 | 子页面自带的进场动画全部去掉：`/xiao` 飞入、`/gallery` 的 GSAP、`/anime` 按第 7 节 A/B/C 改造（见第 7 节） |
| D7 | **只在不同页面（不同一级路径）之间转圈**。同一模块内部切换（如 `/game` 换平台）不转 |
| D8 | **不加**统一的"慢浮入"层 |

建议执行顺序：**第 3 节（D1）→ 第 5 节（D4）→ 第 4 节（D3）→ 第 6 节（D5）**。D4 要放在 D3 前面：先去掉 loader，预加载时才不会白拉 `.data`。

---

## 3. D1：所有站内跳转都播圆形展开

### 改动

`route-reveal.ts` 里的 `shouldRevealFromHome(current, to)` 改成 `shouldReveal(current, to)`：

```ts
// 只在不同页面之间播（比较去掉语言前缀后的第一段路径）：
// /music → /anime 播；/game → /game/xbox、只改 query、同页 hash、只换语言 都不播
function pageKey(pathname: string): string {
  return stripLocale(pathname).split("/")[1] ?? "";
}

export function shouldReveal(currentPathname: string, to: string): boolean {
  if (!to.startsWith("/") || to.startsWith("//") || isUnprefixedPath(to)) return false;
  const targetPathname = to.split(/[?#]/)[0] || "/";
  return pageKey(targetPathname) !== pageKey(currentPathname);
}
```

注意 `LocaleLink` 拿到的 `to` 是**本地化之前**的路径（例如 `/music`），`currentPathname` 是带前缀的（例如 `/ja/gallery`），所以两边都要 `stripLocale` 再比较（上面已处理）。

### 需要逐个确认的边界

| 情况 | 期望 | 说明 |
|---|---|---|
| `/game` ↔ `/game/xbox`（换平台） | 不播（D7） | 第一段路径都是 `game`，`pageKey` 相同 |
| `/game?platform=x` 只改 query | 不播 | 上面的规则已经排除 |
| 语言切换器 | 不播 | `LanguageSwitcher.tsx` 用的是原生 `RemixLink`，本来就不会触发；`stripLocale` 也会让它判定为同页 |
| 聊天侧栏 `NemesisChatSidebar` 回首页 | 播 | 走的是 `LocaleLink`，自动生效 |
| `/auth`、`/api/*` | 不播 | `isUnprefixedPath` 已排除 |
| `<Form>` 提交、`navigate()` 跳转 | 不播 | 只有 `LocaleLink` 点击才会 arm。本次 grep 没有发现组件里调 `navigate()` 跳页 |
| 链接带 `reloadDocument` / `target="_blank"` / 修饰键点击 | 不播 | 已处理 |

### 已知风险

- **慢页面会出现"先进度条，再转圈"**：View Transition 要等新页 loader 返回才开始。超过 300ms 时，进度条和压暗层会被一起拍进"旧页截图"里，然后淡出。可以接受；如果看着别扭，就在 `armRouteReveal` 时给进度条加 `view-transition-name: none`，或者在截图前隐藏。做完 D4 和 D3 之后，大部分跳转都会在 300ms 内完成，这个问题会自然变少。
- 改完后在桌面 Chrome 手动点 3 组：子页→子页、子页→首页、后退。确认后退仍是硬切。

---

## 4. D3：首页空闲时预加载各模块

### 测量（2026-10-16，同一台机器，清空缓存）

| | newopen.design | 本站 |
|---|---|---|
| 点击到 URL 变化 | **57ms** | **576–945ms** |
| 跳转时请求 | 14KB 的 CMS 数据分片（CDN immutable）+ 图片；JS 在首屏已全部 `modulepreload` | `/xxx.data` + 路由 JS + 路由 CSS（画廊还要加 47KB GSAP），每个请求等约 330ms |

**瓶颈是网络往返，不是 Worker。** 从这里请求 Cloudflare 边缘缓存命中的 `favicon.ico`、纯静态的 `/assets/*.js`，和动态的 `/music.data` 耗时一样（curl 都是约 1.3s，浏览器里都是约 330ms，节点是 NRT 东京）。所以给 HTML 开边缘缓存帮不了跳转速度，**只有"点击时不发请求"才有用**。

### 现状

大部分链接是 `prefetch="intent"`（悬停或聚焦才预取）。手机上基本没有悬停，等于没有预取。

### 方案

在 root 渲染一个组件：首页 `load` 完成后，用 `requestIdleCallback`（不支持时用 `setTimeout` 1500ms 兜底）挂载 React Router 的 `<PrefetchPageLinks page="..." />`。它会输出这一页的 `modulepreload`（JS）和 `stylesheet prefetch`（CSS）；路由有 loader 时还会预取 `.data`。

- 预取列表就用顶栏导航 `app/components/ui/Header.tsx` 第 24–31 行：`/cv /gallery /music /game /anime /updates`，再加 `/messages`、`/xiao`。**不包括 `/chat`**：需要登录，包也大。
- 路径要先过 `localizePath(path, locale)`，只预取当前语言的版本。
- **只在首页触发一次**。子页面不做全量预取，靠 `prefetch="intent"` 就够，避免每进一个页面都把所有模块拉一遍。
- 尊重省流量模式：`navigator.connection?.saveData === true` 或 `effectiveType` 是 `2g`/`slow-2g` 时跳过。
- 可选：再给 `LocaleLink` 的默认值从 `intent` 改成 `viewport`，覆盖首页以外入口。先不做，观察 D3 的效果再决定。

### 验证

DevTools → Network，打开首页等 3 秒，应该能看到各模块的 `/assets/(_lang).xxx-*.js` 被提前下载。再点"音乐"，Network 里**不应该出现新的 JS/CSS 请求**，D4 做完之后也不应该有 `.data` 请求。

---

## 5. D4：纯静态页面去掉 loader

### 原则

loader 只放**浏览器自己拿不到的数据**：D1、session/cookie、密钥。写死在仓库里的内容直接在组件里 import，文案翻译用 `useIntl()`。词典已经由 root loader 嵌进页面，客户端有完整词典。这不违背 React Router 的规范：loader 本来就是可选的。没有 loader 的路由照样 SSR 出完整 HTML，客户端跳转时不发 `.data`。

### 逐路由决定

| 路由 | loader 现在做什么 | 决定 | 备注 |
|---|---|---|---|
| `($lang).music.tsx` | `data(null)`，只设缓存头 | **删除 loader** | 内容早就来自 `app/data/music-tree.ts` |
| `($lang).anime.tsx` | `getServerIntl` 翻译文案 + 写死的 11 部番 + `cdnUrl("you.mp4")` | **移到组件** | `cdnUrl` 是普通函数，客户端可用 |
| `($lang).cv.tsx` | `localized(locale, cvProfile, CV_TEXT)` + `resolveR2Image` | **移到组件** | `app/data/i18n/cv.ts` 只有 9KB，三语一起打进包可以接受 |
| `($lang).xiao.tsx` | 翻译 alt + `resolveR2Image` | **移到组件** | |
| `($lang).gallery.tsx` | 翻译 alt/文案 + `resolveR2Image` | **移到组件** | loader 注释里写的"批量生成图片 token、29 分钟缓存"**已经过时**：`resolveR2Image`（`app/lib/resolve-image.ts`）现在只是查图片 manifest 返回带 hash 的 CDN 地址，不签 token。缓存头可以放宽 |
| `($lang).updates.tsx` | `getLocalizedUpdates(locale)` | **保留 loader** | `app/data/updates.ts` 37KB + `app/data/i18n/updates.ts` 88KB，打进客户端包太重。靠 D3 预取 `.data` 解决 |
| `($lang).game._index.tsx` / `game.$platform.tsx` | `buildUnifiedGameData`（静态数据 + 三语） | **保留 loader** | `$platform` 要靠 loader `throw new Response(404)` 返回真实 404 状态码，组件里做不到。靠 D3 预取 |
| `($lang).messages.tsx` | D1 留言 + session | 保留 | 真动态 |
| `($lang).chat.tsx` | `requireNemesisUser` | 保留 | 真动态 |
| `($lang)._index.tsx` | 歌单 + 更新预览 + 按 auth cookie 决定缓存头 | 保留 | 首页不是跳转目标里的瓶颈 |

### 实施要点

1. **翻译 id 不能变**：`i18n:extract` 用 `[sha512:contenthash:base64:6]` 按 `defaultMessage`（加 `description`）生成 id。从 `intl.formatMessage({ defaultMessage })` 改成组件里 `useIntl().formatMessage({ defaultMessage })` 时，**文案和 description 一个字都不要改**，id 就不变，已有的日文、英文翻译继续命中。改完跑一次 `npm run i18n:extract`，确认 `app/locales/zh.json` 没有新增或删除条目（只允许顺序变化）。
2. **缓存头**：现在是 `headers: forwardLoaderCacheControl`，从 loader 响应转发。没有 loader 之后，改成 `export const headers: HeadersFunction = () => ({ "Cache-Control": "..." })` 直接返回。HTML 的首屏缓存行为保持不变。
3. **`useLoaderData` 的类型**：原来的 `AnimePageData` / `GalleryPageData` 等类型可以保留，改为在组件里组装出同样结构的对象，下游子组件不用动。
4. **语言**：组件里用 `useLocale()`（`~/components/common/LocaleLink`）取当前语言，替代 `getRouteLocale(params)`。
5. **不要引入 `.server` 模块**：`getServerIntl`（`~/lib/i18n.server`）不能在组件里用。`localized`（`~/lib/localized-content`）、`resolveR2Image`（`~/lib/resolve-image`）、`cdnUrl` 都是普通模块，可以直接用。
6. 每改一个路由，用 `curl -s https://localhost.../xxx | grep` 确认 SSR HTML 里仍然有正文，SEO 不能退化。

### 验证

`npm run typecheck && npm test && npm run build`。本地 `npm run dev`：从首页点进 music / anime / cv / xiao / gallery，Network 里不应出现 `*.data` 请求；切到 `/ja/anime`、`/en/cv`，文案仍然是对应语言。

---

## 6. D5：字体按字频切片

**已经有完整方案，直接照做**：`docs/notes/font-frequency-subset-plan-2026-10-15.md`。

要点复述（以那份文档为准）：
- 保留思源宋体 ExtraLight，字形不变，只改切片方式。
- 现状：按码位每 0x400 切一片，共 24 个文件、11.6MB。首页只用到 532 个汉字，却下载了全部 24 片。
- 改成复用 Google Fonts 对 Noto Serif SC 的按字频 `unicode-range` 分组，用自己的源字体切。
- **新文件名必须带内容 hash**：旧文件的缓存是一年 + immutable，同名覆盖会让老访客一直用旧文件。
- 字体放在 R2（`gregorwang` bucket 的 `fonts/`），由 `worker.ts` 提供，不在静态资源目录里。
- 去掉首页的字体 preload。

这一项和第 3–5 节互不依赖，可以单独开一个 session 做。

---

## 7. D6：子页面进场动画（已定）

### 背景

圆形展开动画只处理"一张旧截图 → 一张新截图"。截图换完以后，子页面自己的进场动画才开始播，所以两者会**连着播两段**。现状（只看了代码，没看过实际画面）：

| 页面 | 现有动画 | 性质 | 建议 |
|---|---|---|---|
| `/xiao` | Framer Motion 7 处：`x: ±100`、`y: 100`、`scale: 0.8`、`scaleX: 0` | 进场飞入 | **去掉**：方向乱、幅度大，和圆形展开叠在一起会很花 |
| `/anime` | 全屏背景视频页。进场时默认弹出**音频选择弹窗**（`showAudioModal` 初始为 `true`，`fixed inset-0 bg-black/80 backdrop-blur-md`），下面还有**加载遮罩**（`bg-black/90`，视频 `loadeddata` 后才消失），再下面是标题区上浮（`y: 50`，被弹窗盖住，从来没人看到过）；排行榜抽屉（默认收起在屏幕外）里 11 个条目在**页面加载时**就错峰飞入（`x: 50`），播完时抽屉还没打开，同样没人看到 | 进场叠了 4 层 | 见下方「/anime 的冲突」 |
| `/gallery` | GSAP ScrollTrigger：每张照片滚到视口时，遮罩右→左擦除 + 图片 1.045→1 缩放；hero 也参与 | 滚动揭示 | **全部去掉**（站长倾向，Claude 同意）：hero 会闪一下（SSR 可见 → GSAP 隐藏 → 再揭示）；页面还因此多加载 47KB 的 GSAP；而且和全站「一个克制的转场」的风格不一致。去掉后照片直接显示，最多加一个图片加载完成后的 opacity 淡入 |
| `/game` | 路由渲染的是 `GameArchive`，未发现进场动画 | | 无需处理。另：`GamePageClient.client.tsx`（GSAP 横向 pin）只被 `GamePlatformPage.tsx` 引用，而 `GamePlatformPage` 已经没有任何地方 import，**两者都是死代码**，可以另行清理 |
| `/music`、`/cv`、`/updates`、`/messages` | 未发现整页进场动画 | | 无需处理 |
| `/chat` | 应用型界面 | | 不加任何进场动画 |

更正：上一轮对话把"留言收音机"列进了这张表，是**错的**。`GuestbookRadio` 只在首页（`HomeGuestbook.client.tsx`）使用，和子页面跳转无关。

### /anime 的冲突

圆形展开截到的"新页面"，是一块盖着 `backdrop-blur` 的黑色弹窗，加上黑色加载遮罩。所以用户看到的是**一个黑圈扩开，里面紧接着弹出一个对话框**，视频根本没露出来，转场白做了；标题飞入被盖在弹窗下面，也看不见。另外，全屏视频上的 `backdrop-blur` 本身就很耗性能。

> 注意：`docs/design/anime-tv-handoff-2026-10-15.md` 讲的「小电视」重构的是**首页的「纵览番剧」组件**（`app/components/home/donghua.tsx`），**和 `/anime` 子页面无关**，不要混为一谈。`/anime` 的问题要单独改。

### /anime 改造方案

**A. 去掉音频选择弹窗，改成"能有声就有声"**

原理：浏览器的自动播放策略要求**这个文档里发生过用户激活**（click / tap / keydown；悬停、滚动不算），之后才允许 `play()` 有声播放。本站是 SPA：从站内任何链接点进 `/anime`，**那次点击就是激活**，文档没有重新加载，激活状态还在。所以站内进入可以直接有声播放。Netflix 悬停就出声也是同一个原理：用户之前点过别的东西（比如选个人资料），不是悬停本身拿到了权限。

实现：

```ts
// 进入页面后（useEffect 内）
const video = videoRef.current;
video.muted = false;
video.volume = 0.8;
video.play().catch(() => {
  // 没有用户激活（直接打开 / 刷新 / 外链进入）或 Safari 拒绝 → 退回静音
  video.muted = true;
  setNeedsSoundButton(true);
  return video.play();
});
```

- 可以先用 `navigator.userActivation?.hasBeenActive`（Chrome/Edge/Firefox/Safari 16.4+ 支持）预判；不支持或为 `false` 时直接走静音。**最终仍以 `play()` 的 Promise 结果为准**，因为 Safari 和 Chrome 的媒体参与度（MEI）规则不同，预判不一定准。
- `<video>` 的 SSR 属性保留 `muted autoPlay playsInline`，保证首帧和静音自动播放一定成功；有声切换在客户端 effect 里做。
- 退回静音时，左下角（现有 `fixed bottom-6 left-6` 控件附近）显示一个"🔇 开声音"按钮。点一下设 `muted = false` 并再 `play()`（这时处在点击事件里，任何浏览器都允许）。按钮要有 `aria-label`。
- 有声播放时也要有静音按钮，让用户能关掉。
- 删掉 `showAudioModal`、`handleAudioChoice`、`handleModalOverlayClick`、Escape 键里关弹窗的分支，以及 `content.audioModal.*` 文案。文案删除后跑 `npm run i18n:extract`。
- 预期：Chrome/Edge/Firefox 从站内进入时有声播放，圆形一展开声音就起来；直接打开或刷新时静音 + 按钮；Safari 多半是静音 + 按钮。

**B. 去掉两段看不见的进场动画**：标题区 `m.div` 的 `initial/animate` 和排行榜 `m.li` 的错峰飞入。**两段都删**（站长已定）。抽屉条目的飞入删掉，因为它在屏幕外播放，没有意义。抽屉本身的 `right` 过渡保留。

**C. 加载遮罩换成首帧图**：去掉 `bg-black/90` 加载遮罩，给 `<video>` 加 `poster`（视频首帧导出一张 webp，走图片管线 `scripts/image-assets.config.mjs`，不要手改 `app/generated`）。这样圆形展开时直接展开到画面上，不是黑屏。

### 通用原则（从这次冲突里总结）

- **一个时刻只有一个主角动效。** 全站有了转场之后，页面自己的进场动画要么删掉，要么做得很轻。
- **首屏必须是 SSR 时的样子**：不能先显示出来，等 JS 加载后再隐藏、再动画显现。否则接在转场后面一定会闪。
- **进页面第一眼不能是遮罩或弹窗**：转场展开的是首帧画面，首帧是黑色遮罩，转场就白做了。
- **转场期间别叠重效果**：全屏 `backdrop-blur`、大视频解码，都会让截图和动画变卡。

### 不加统一的"慢浮入"（D8，已定）

newopen 在圆形展开后还有一层内容浮入（`translateY(40px) → 0`，1.6s）。站长决定**不加**：本站只保留圆形转场这一个页面级动效。

---

## 8. 不做的事（及原因）

- **HTML 边缘缓存 / 构建期预渲染**：跳转瓶颈是网络往返，不是 Worker（见第 4 节测量）。而且有三个硬冲突：root loader 按 cookie 把主题写进 `<html class>`；无前缀地址要按 cookie / `Accept-Language` 做语言跳转，Cloudflare 缓存不按 cookie 区分；已登录用户的 HTML 嵌了 session。收益小、风险大，暂缓。
- **照搬 Framer 的内联 116KB 样式、在 React 接管前用内联脚本启动动画**：这是建站工具为通用性做的取舍，对本站是负担。
