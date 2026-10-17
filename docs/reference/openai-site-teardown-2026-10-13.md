# openai.com 前端拆解与借鉴手册

> 日期：2026-10-13
> 来源：在 openai.com 文章页（`/zh-Hans-CN/index/gpt-6-for-everyone/`）用 Playwright 实测：读 DOM、`getComputedStyle`、响应头、cookie、JS 包特征字符串
> 用途：以后把 openai.com 的某个组件或交互搬到本站时，先读这份文档，再针对具体组件现场测量
> 已落地的样例：`app/components/ui/VideoPlayer.tsx`（首页羊蹄山视频，提交 `e1ef1f6`）

---

## 1. 用户对「借鉴」的要求（先读这节）

- **要还原，不要「仿」。** 站长明确不接受「参考了一下、做个类似的」。要以 openai.com 的真实 DOM、尺寸、颜色、缓动、显隐逻辑为准，做到和原站一致；确实做不到的地方要单独说明原因。
- 本站是个人非商业站点，站长已确认可以直接借用对方的交互规格和图标 SVG。**例外：OpenAI Sans 字体不能用**。这不是站长定的规矩，是授权问题：2026-10-15 读字体文件的 name 表确认，拉丁版版权归 Dinamo Typefaces GmbH（abcdinamo.com，给 OpenAI 定制），中文版 OpenAI Sans SC 版权归 OpenAI OpCo. L.L.C.，授权条款明确禁止修改、重新打包、改名、放到公开服务器和再分发。想要类似风格，用开源字体替代（见 7.5）。
- **以实测为准，不凭截图猜。** 截图只能当辅助。之前凭截图量出的进度条宽度就错了：截图里看着是一段短白条，实际是 `flex-1` 撑满的轨道，白色只是已播放部分。
- 遇到 Cloudflare 人机验证（页面标题「请稍候…」、HTTP 403），**直接请站长在打开的浏览器窗口里点一下**，不要放弃，也不要尝试绕过。
- 要套进本站时，遵守本站自己的设计方向：每个页面单独设计，不要把一个页面的布局搬到另一个页面。方向不明确时，先给 2～3 个方案，用本地 HTML 预览让站长挑。

## 2. 怎么测（方法）

用 Playwright（MCP 里的 `browser_navigate` / `browser_evaluate` / `browser_run_code_unsafe`）：

1. **定位组件**：先找特征元素。例如视频不是 `<video>`，而是 `iframe[src*="vimeo"]`；按钮可以用 `button[aria-label*="视频"]` 找。
2. **导出结构**：`el.cloneNode(true).outerHTML` 拿到完整 DOM 和 Tailwind 类名。长内容用 `filename` 参数存到文件，别直接打进对话。
3. **量计算样式**：`getComputedStyle` 看字号、字重、行高、圆角、颜色、`transition`。只看类名不够，他们有自定义 token，比如 `text-cta`、`duration-medium`。
4. **拿图标**：图标是 SVG sprite，`<use href="/icons/cms/<hash>/<name>.svg#size-16">`。直接 `fetch` 这个文件，取 `<symbol id="size-16">` 里的 path。每个图标都有 12/16/20/24/28/32 几种尺寸。
5. **测交互**：用 `page.mouse.move` 产生真实指针事件，在不同时间点读 `opacity-*` 类名或计算后的 opacity，测出显隐规律和计时。注意：`browser_hover` 可能顺带滚动页面，导致坐标错位，测时序时要先取 `boundingBox` 再移动鼠标。
6. **查技术栈**：读 `window.next.version`、`self.__next_f`、响应头；把 `/_next/` 下的 JS 全部 `fetch` 下来，用正则搜库的特征字符串，比如 `[React Intl]`、`QueryClient`、`radix-ui`。

## 3. 技术栈（实测结论）

| 层 | 用的什么 | 证据 |
|---|---|---|
| 框架 | Next.js 16.3.3，App Router（React 服务端组件） | `window.next.version`、`self.__next_f` |
| 构建 | Turbopack | chunk 文件名 `turbopack-*.js` |
| 部署 | Vercel，前面套 Cloudflare | 响应头 `x-vercel-id: sin1::pdx1`、`server: cloudflare` |
| 渲染 | 预渲染静态页 + 缓存，约 5 分钟后台刷新 | `x-nextjs-prerender: 1`、`x-nextjs-stale-time: 300` |
| 路由技巧 | URL 只带语言前缀，服务端内部改写成 `/[locale]/[country]/[flags]/[...slug]` | `x-matched-path` 响应头；国家来自 cookie `country`，功能开关来自 Statsig。每种组合都能单独静态缓存 |
| 样式 | Tailwind CSS v4 + 自定义 token | `aspect-(--video-aspect-ratio)` 是 v4 语法 |
| 组件 | Radix UI | `radix-ui` 标记 |
| 动画 | Framer Motion | `motionValue` |
| 3D | three.js + react-three-fiber | `WebGLRenderer`、R3F store |
| 数据 | TanStack Query | `QueryClient` |
| CMS | Contentful | 图片来自 `images.ctfassets.net`，代码里有 `contentfulToJsLocale` |
| 视频 | Vimeo iframe，参数 `controls=0&muted=1`，控件是自己做的 | 见第 5 节 |
| 实验 / 埋点 | Statsig、Segment、Datadog RUM、Cloudflare Web Analytics | 全局变量 `__STATSIG__`、`DD_RUM` 等 |

## 4. 多语言（i18n）

- **界面文案用 react-intl（FormatJS）。** 报错前缀是 `[React Intl]`，组件是 `<IntlProvider>`。
- **消息 ID 是 6 位内容哈希**，例如 `"FgAt0H":"登录"`、`"+oCh08":"更改语言"`、`"1ZrTcC":"探索 {category}"`。代码里写的是 `defaultMessage` 原文，由 FormatJS 工具提取后自动生成 ID，所以代码里看不到占位符 key，可读性不受影响。
- **ICU 语法**：用 `{var}` 占位、复数规则，文案里还能嵌 `<privacy_policy_link>…</privacy_policy_link>` 这样的标签。
- **当前语言的整本词典直接嵌在 HTML 里**（`"messages":{…}`），随服务端组件一起下发，浏览器不再单独请求翻译文件。
- **文章正文按语言存在 Contentful 里**，不放进 JSON 词典。
- **URL 规则**：英文不带前缀；其他语言用 `/zh-Hans-CN/…` 这类前缀，共 69 个 hreflang。用户选过的语言存在 cookie `locale`。
- **自动识别语言（2026-10-15 用 Playwright 有头 Chrome 实测，推翻 10-14 的 curl 结论）**：
  - 10-14 curl 拿到的 200 是假象：curl / 无头浏览器会被 Cloudflare 挡（307 → 403 人机验证），真实浏览器才看得到真实行为。
  - **服务端 302 重定向，跟 cookie 无关**。清空全部 cookie、`Accept-Language: zh-CN` 打开 `/`，第一个响应就是 `302 Location: /zh-Hans-CN/`，同时 `Set-Cookie: locale={"computedPreferredLocale":"zh-Hans-CN","v":1}`（会话 cookie）和 `country=SG`（一年）。没有客户端 JS 跳转。这就是「换新浏览器也直接进中文」的原因：新浏览器照样发系统语言的 `Accept-Language`。
  - 实测矩阵（`/` = 无前缀英文）：

    | 场景 | 结果 |
    |---|---|
    | 无 cookie，AL `ja-JP` / `fr-FR` | `302 → /ja-JP/` / `/fr-FR/` |
    | 无 cookie，AL `en-US` | `200 /`（默认语言不跳） |
    | 已有 computed=zh，AL 改成 `ja-JP` | `302 → /ja-JP/`，cookie 改写成 ja。**computed 每次按请求头重算，不是记忆** |
    | 直接打开 `/ja-JP/`，AL `zh-CN` | `200 /ja-JP/`，不跳（只写 cookie）。**带前缀的 URL 一律尊重** |
    | 深链接 `/news/`，AL `zh-CN` | `302 → /zh-Hans-CN/news/`。**无前缀的所有页面都会跳，不止首页** |
    | 在切换器选 English | 客户端改 URL 到 `/`，cookie 变成 `{"computedPreferredLocale":"en-US","explicitlyOverriddenLocale":"en-US","v":1}` |
    | explicit=en，AL `zh-CN`，访问 `/` 和 `/news/` | 都 `200`，不跳。**手动选择优先于浏览器语言** |
    | explicit=en，访问 `/zh-Hans-CN/` | `200`，不跳 |
    | explicit=ja，AL `en-US`，访问 `/` | `302 → /ja-JP/` |
  - 302 响应：`Cache-Control: public, max-age=0, must-revalidate`，`cf-cache-status: DYNAMIC`（不进边缘缓存），没有 `Vary: Accept-Language`。
  - 底部那个弹窗是 **Cookie 同意横幅**（「我们使用 Cookie…管理 Cookie / 拒绝非必要 / 全部接受」，写 `analytics_consent` 等），跟语言无关，不是「切换语言」的提示。
  - Googlebot UA 请求被 Cloudflare 403（伪造 UA 没用），爬虫看到什么没测到。依据是浏览器语言，不是 IP（`country` 只用于内容地区），也不是时区。
- 对本站的启示：站长担心多语言会让代码变得难读（文字全变成 JSON key）。如果要做，用「原文即 key」的写法：FormatJS 的 `defaultMessage`，或 Lingui 的 `<Trans>`。

## 5. 视频播放器规格（已在本站还原）

**DOM 结构**

```
div.group.relative.flex.size-full.overflow-hidden.rounded-md.border.border-primary-12   ← tabindex=0，aspect 用 CSS 变量
├─ div.size-full.pointer-events-none
│   └─ iframe（cover：min-h/min-w-full，top/left 50% + translate -50%）
├─ button.absolute.inset-0.z-1.flex.items-center.justify-center   ← 整个画面就是播放/暂停热区；中心大图标在这里面
│   └─ svg（54px，md 断点 80px；opacity-90；透明度过渡 500ms）
└─ div.absolute.inset-x-0.bottom-0.z-1.flex.flex-col.gap-3.p-2.md:p-5   ← 底栏，透明度过渡 300ms
    ├─ div.flex.w-full.md:hidden → 手机端进度条单独一行
    └─ div.flex.w-full.items-center.gap-4
        播放键 | 时间 | flex-1（md 以上显示进度条） | 静音 | 全屏 | 设置（…）
```

**尺寸与样式**

| 项 | 值 |
|---|---|
| 外框 | 圆角 6.08px（`rounded-md`），边框 `rgba(0,0,0,.12)` |
| 按钮 | 24px（`size-6`）圆形，图标 16px；悬停时图标 opacity 60%，过渡 200ms linear |
| 时间 | 14px / 行高 14px / 字重 500，`tabular-nums`，格式 `00:28 \| 01:10`（用 `before:content-['\|']` 画分隔线） |
| 进度条 | 高 8px（`h-2`），圆角 6px，轨道白色 40%，已播放部分纯白，宽度 `flex-1` |
| 底栏渐变 | 16 段缓动渐变，从 `rgba(0,0,0,.5)` 到 0，具体数值见 `VideoPlayer.tsx` 里的 `CONTROLS_GRADIENT` |
| 缓动 | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 设置菜单 | 在按钮上方 `bottom-8`，最小宽 130px，圆角 6px，背景黑 80% + `backdrop-blur-3xl`；只有两项：「质量 auto」和「复制链接」 |

**显隐逻辑（关键）**

- 中心大图标和底栏**一起**显隐，**跟播放还是暂停无关**。
- 鼠标在画面内移动就显示；静止约 3 秒（实测 2.5 秒时还在，3 秒时已消失）或移出画面就淡出。
- 暂停状态下鼠标不动，控件同样会消失。
- 进入视口后静音自动播放。

**本站版本和原版的差异**：循环播放（为了不停在片尾的 PlayStation 画面上）；设置菜单把「质量」换成「速度」（本站是单个 mp4，没有多码率）；还没开始播放时中心图标常驻显示；开启减少动态效果时不自动播放；内联播放按 1280/548 比例裁掉片源自带的电影黑边。

## 5.5 图片 / 视频优化（2026-10-15 Playwright + curl 实测）

**OpenAI 首页的做法**

- 用的是 Next.js `<Image>` 加自定义 loader，图片本身放在 Contentful 的图片 CDN（`images.ctfassets.net`，背后是 CloudFront）。loader 的源码就一行：`${src}?w=${width}&q=${quality ?? 90}&fm=webp`；SVG 不加 `fm`，GIF 宽度小于 1920 时加 `&fit=pad`。
- **图片只上传一张原图**（PNG/JPG，常见 2～4MB），各种尺寸都靠 URL 参数现场裁切，第一次请求生成后进 CDN 缓存，`Cache-Control: max-age=31536000`。
- `srcset` 的宽度档位用的是 Next 默认值：大图 `640/750/828/1080/1200/1920/2048/3840`，小图 `32/48/64/96/128/256/384`。浏览器按 `sizes` × DPR 自己挑一档。
- `sizes`：大卡片写 `(min-width:1728px) 1728px, 100vw`；小缩略图写 `(min-width:768px) 185px, 120px`。**这里 OpenAI 自己也有浪费**：267px 的方形卡片也写成 `100vw`，结果下载的是 w=1080。
- 质量分两档：普通卡片 `q=90`；**被视频盖住的首屏占位图用 `q=50`**（视频 16:9 卡片上，图片只在视频加载出来前垫底）。
- 所有 `<img>` 都是 `loading="lazy" decoding="async"`，用 fill 模式（`position:absolute; 100%` + `object-cover`），外层容器控制比例，所以不会有布局跳动。首屏也没有 `fetchpriority=high` 和图片 preload。
- 同一张图（math-breakthroughs，原图 PNG 4.1MB）实测体积：w=256 q90 webp **2.4KB**，w=640 **17KB**，w=1080 **52KB**，w=1080 q50 **10KB**；同尺寸 AVIF q90 只要 **8.7KB**，但 OpenAI 没有用 AVIF。
- 视频：`cdn.openai.com` 上一个 mp4（13.5MB），`<video preload="metadata">`，不写 autoplay，靠 JS 进入视口后播放。没有多码率，也没有 HLS。

**「按网速给不同图片」是误解**

- OpenAI 的 JS 里出现的 `navigator.connection` / `effectiveType` / `saveData`，一处是 SWR 的「慢网络时少重新请求」，一处是 React 内部估算带宽，**都和图片选哪张无关**。
- Cursor（cursor.com）用的是 Vercel 自带的 `/_next/image`。实测它只做两件事：① 按 `srcset` 宽度给不同尺寸；② 看请求头 `Accept` 选格式（浏览器支持 webp 就给 webp，否则给 jpeg，响应头 `Vary: Accept`），缓存 30 天。宽度和质量都有白名单，`q=75` 这种不在白名单里的值直接 400，防止别人刷参数消耗算力。
- 所以「Vercel 检测用户网速」其实是：**按屏幕宽度和像素密度挑尺寸 + 按浏览器支持挑格式**。手机和慢网络本身屏幕小，自然拿到小图，看起来像是按网速适配。

**本站当时的状态（同一天实测首页，视口 929px）**

- `process-images.mjs` 每张图只出一个原尺寸 webp（q=82），`<img>` 没有 `srcset`。
- 例子：`emt1` 原图 3072×4096（386KB）只显示成 123×181；`photo-17` 2744×4080（696KB）只显示成 99×184；`photo-14` 584KB 显示成 99×146。
- 首页图片约 3MB，羊蹄山视频 `yotei.mp4` 约 10MB，`oss.` 域名下的文件缓存只有 4 小时（`max-age=14400`），`cdn.` 域名下的是一年 + immutable。

## 6. 全站可复用的设计 token（这次顺带看到的）

- 正文 `text-p1`，颜色 `text-primary-100`，背景 `bg-background`（白）；白色半透明 token 用 `white-40` 这类命名。
- 时长 token：`duration-medium` 为 300ms，图标切换 500ms，按钮 200ms。
- 圆角普遍偏小：卡片和视频框用 `rounded-md`（约 6px），按钮用全圆角。
- 版面变量写在 `<html style>` 上：`--document-width`、`--nav-width: 200px`、`--content-width`、`--gutter-*`。
- 顶部导航：左边 Logo + 一排文字链接，右边是「登录」（浅灰胶囊）和「试用 ChatGPT ↗」（黑色胶囊）。

（以上只是这次顺带观察到的，没有系统测量。要搬某个组件时，按第 2 节的方法现场测。）

## 7. 字体与多语言字体加载（2026-10-15 curl 实测 openai.com / cursor.com）

> 只读了 HTML、CSS 和字体文件的响应头（大小、缓存），没有下载字体本体。OpenAI Sans 不公开，不要扒。

### 7.1 OpenAI：拉丁一套小字体 + 按语言加载、按字频切片的 CJK 字体

- **拉丁字母**：全局 CSS 里 `OpenAI Sans` 的 Light / Regular / Medium / Semibold（含斜体），每个约 **53KB**，都带 `unicode-range: U+0-36F, U+2000-206F…`（拉丁 + 标点符号）。放在 `cdn.openai.com`，`max-age=31536000`。
- **其他书写系统**：阿拉伯 / 希伯来 / 天城文 / 韩文各一个可变字体（字重 300–700），全部挂在同一个族名 `OpenAI Sans Variable Scripts` 下，靠 `unicode-range` 区分。页面上没出现这种文字，浏览器就不下载。韩文这个是 **989KB** 整文件，没切片（OpenAI 自己也有偷懒的地方）。
- **泰文**：`:lang(th){font-family:sans-serif}`，直接用系统字体。
- **中文 / 日文：按语言单独一份 CSS**。中文页 `<head>` 多一行 `<link rel="stylesheet" href="/fonts/openai-sans/zh-hans.css">`，日文页是 `ja.css`，繁中是 `zh-hant.css`；其他语言页面没有这一行。
- **字体栈用 `:lang()` 切换**，拉丁字母仍由 OpenAI Sans 负责，CJK 字体只补汉字：
  ```css
  --font-sans: "OpenAI Sans", "OpenAI Sans Variable Scripts", sans-serif;
  :lang(zh-Hans){ --font-sans: "OpenAI Sans SC", "OpenAI Sans", "OpenAI Sans Variable Scripts", sans-serif }
  :lang(ja)     { --font-sans: "OpenAI Sans JP", ... }
  ```
- **CJK 按字频切片（关键）**：`zh-hans.css` 文件头写着 `Generated by scripts/fonts/subset-openai-sans-cjk.py`，共 **131 片**（日文 123 片），每片是可变字体（300–700）。`000` 号片是最常用的约 240 个字，**87KB**；001 约 99KB，002 约 207KB，003 约 408KB，越往后越生僻。
- 实测中文首页：正文 794 个汉字、238 个不同的字，**只命中 000–003 共 4 片，约 0.8MB**。
- 不用字体 preload，全部 `font-display: swap`。

### 7.2 Cursor：根本不给中文配字体

- 品牌字体全是拉丁字体：`CursorGothic`（正文，Regular 约 45KB / Bold 约 49KB）、`cursorDisplay`（大标题）、`berkeleyMono` / `cursorMono`（代码）、`EB Garamond`（衬线），另外还有 Lato。用 Next.js `next/font` 自托管，`max-age=31536000, immutable`。
- Cursor 支持 10 种语言（hreflang：en-US、zh、zh-Hant、ja、ko、es、fr、pt-BR、de、hi），**切换语言只换文案，不换字体**。
- **没有任何 CJK 字体，也没有 `:lang()` 规则**。中文页和英文页用同一套 CSS，`<html lang="zh">` 只是改了语言属性。
- 字体栈 `"CursorGothic", "CursorGothic Fallback", system-ui, Helvetica Neue, Helvetica, Arial, sans-serif`：拉丁字母显示 CursorGothic，汉字在 CursorGothic 里找不到，浏览器自动往后找，最后落到系统字体（Mac 苹方，Windows 微软雅黑）。**中文字体下载量为 0。**
- `next/font` 自动生成 fallback：`@font-face{font-family:CursorGothic Fallback;src:local(Arial);ascent-override:92.76%;descent-override:23.7%;line-gap-override:9.67%;size-adjust:103.38%}`，让 Arial 和品牌字体尺寸对齐，减少替换时的跳动。
- Linux 上直接放弃品牌字体：`html[data-os=linux]{--font-sans:var(--font-system)}`。
- 字体 preload 写在 HTTP `Link` 响应头里，一共约 20 个（包括 Lato 各字重、Berkeley Mono 等），每个几十 KB。preload 得比较多，不算精细。

### 7.3 本站当时的状态和教训

- 全站 `--font-main` 是思源宋体 ExtraLight（`SiteSourceHanSerif`），`public/fonts/` 24 个文件共 **11.6MB**。CJK 按**码位顺序**每 1024 个字切一片（`app/lib/font-preloads.ts` 的 `CJK_STEP = 0x400`），每片 400–670KB。常用字散落在整个 4E00–9FFF 区间，所以几乎每一片都会被碰到。
- 拿 OpenAI 中文首页的同一段文字按本站切法算：**命中 21 片中的 20 片，约 11MB**（OpenAI 是 0.8MB）。
- 首页还预加载了 8 片（`fontPreloadHrefs(HOME_HERO_PRELOAD_TEXT, 8)`）。
- 更新日志组件（`changelog-section.tsx`，提交 `ad41c04` 移植）里写死了 `font-['Space_Grotesk',…]`。**Cursor 官网并不用 Space Grotesk**（它用的是 CursorGothic），本站也没加载这个字体，实际退到系统黑体，所以和全站宋体不统一。Space Grotesk 是 Google Fonts 上的拉丁字体，本来就不含汉字。
  - 线上实测（Windows Chrome，CDP `CSS.getPlatformFontsForNode`）：标题「更新日志」→ Microsoft YaHei；卡片标题 → Microsoft YaHei + Segoe UI；日期 → **Segoe UI Light + Microsoft YaHei Light**；「查看完整更新日志」→ **Microsoft YaHei Light**。日期和底部链接没写字重，继承了 `body` 的 `font-weight: 200`，所以同一个组件里还混着两种粗细。全站其他地方实际渲染的是 `Noto Serif CJK SC ExtraLight`（网络字体）。Mac 上对应的是苹方。
- **以后移植组件时**：不要照搬组件上的 `font-family`，一律继承本站 `--font-main`。

### 7.4 可借鉴的做法（按收益排序）

1. CJK 字体**按字频切片**（cn-font-split 一类工具，原理和 OpenAI 的 `subset-openai-sans-cjk.py` 一样），常用字放在第一片。
2. 拉丁字母用单独的小字体，CJK 字体只补汉字（字体栈里拉丁在前、CJK 在后，或者用 `unicode-range` 区分）。
3. CJK 字体 CSS **按语言加载**，或者用 `:lang()` 切换字体栈，非中文页面不碰中文分片。
4. 不预加载大分片；如果要预加载，只预加载第一片常用字。
5. 最省事的方案就是学 Cursor：正文中文直接用系统字体，只给拉丁字母或标题配品牌字体。

### 7.5 OpenAI Sans 的授权，以及可以替代的开源字体

- 2026-10-15 读了两个字体文件的 name 表（只看元数据，看完已删除，没有放进项目）：
  - `OpenAISans-Regular.woff2`：版权 Dinamo Typefaces GmbH，设计方 Dinamo，授权说明「Lawful use … excludes modifying, reassembling, renaming, storing on publicly available servers, redistributing and selling」，授权链接 abcdinamo.com/licenses。
  - `OpenAISansSC-Variable-000.woff2`：版权 OpenAI OpCo. L.L.C.，厂商代码同样是 ABCD（Dinamo），可变字体，字重轴 `wght`，`fsType=8`。
- 结论：两个都是商业定制字体，不能下载下来自己托管或改名使用。
- 想要类似的干净黑体风格，可以用这些可免费商用、允许自托管的字体（选定前要再看一遍各自的授权原文）：
  - 拉丁：Inter、Geist（都是 OFL）。
  - 中文：思源黑体 / Noto Sans SC（OFL）、HarmonyOS Sans SC、MiSans（厂商免费商用授权）。
  - 中文字体同样要按字频切片（7.4 第 1 条）。

## 8. 页面跳转过渡（2026-10-16 Playwright 实测，1440×900，zh-Hans-CN）

**结论：OpenAI 页面之间没有任何过渡动画，是硬切。** 他们靠「提前把下一页准备好」让跳转看起来是瞬间完成的，而不是靠动画遮住等待时间。

实测数据：

- **没有用 View Transitions**：`document.startViewTransition` 浏览器支持，但跳转时从没被调用；所有样式表里没有 `::view-transition` / `@view-transition` 规则。
- **没有幕布、进度条、加载转圈**：跳转期间 `<main>` 的 opacity 一直是 1，`document.getAnimations()` 里只有导航按钮的 color 过渡，没有页面级动画；新页面的内容也没有入场淡入。
- **正常网速**：点击后约 150ms 调 `pushState`，约 280ms 新内容整块替换上去。
- **为什么这么快：Next.js Link 预取**。
  - 首页加载完约 1.5s 后，顶栏 4 个链接（研究 / 企业 / 开发人员 / 公司）的 RSC 数据就已经预取好了（请求头 `next-router-prefetch: 1`）。
  - 链接滚动进入视口就会预取；hover 打开大菜单时，菜单里的链接也会被预取。
  - 所以点击的时候多数页面的数据已经在本地了，不需要等网络。
- **慢网速**（CDP 模拟 2.5s 延迟、40KB/s，点一个没预取过的文章）：旧页面原样停留 3.5s 以上，URL 不变、光标不变、没有任何「正在加载」的提示，数据到了以后直接切到新页面。这是他们的取舍：宁可没有反馈，也不加遮罩。
- **滚动**：新页面直接从 `scrollY=0` 开始；浏览器后退会恢复到原来的位置（`history.scrollRestoration=auto`，实测从 1200 回到 1200）。
- **动效只用在组件上**：大菜单用 `height 0.2s cubic-bezier(.4,0,.2,1)` 展开，背后的内容加模糊遮罩；按钮 hover 用 `duration-250` 改颜色。全站的 duration / easing token 见下：
  - duration：fast .1s / short .2s / medium .3s / long .4s / sidebar .64s
  - easing：primary `cubic-bezier(.17,.17,.3,1)`、curve-sidebar `cubic-bezier(.22,1,.36,1)`、out-cubic `cubic-bezier(.33,1,.68,1)`

**对本站的启示**：本站 `app/components/transitions/RouteTransition.tsx` 在 `navigation.state` 不为 idle 时拉起幕布，幕布至少盖 430ms，再花 360ms 淡出。就算数据已经预取好，新页面也要过约 0.4–0.8s 才能完整看到（「先等 260ms 再 navigate」那条自定义事件分支，2026-10-16 时已经没有代码在触发）。OpenAI 的做法正好相反：先把延迟做到接近 0，有剩下的等待再考虑给反馈。
