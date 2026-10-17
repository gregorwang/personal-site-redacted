# 主站样式与动画一致性审计

审计日期：2026-06-04
范围：`remix/app` 主站代码，包括 `components`、`routes`、`styles`、`tailwind.css`、`theme.css`。
目的：梳理当前动画、悬停、按钮、圆角、阴影、渐变、动效节奏是否统一，并给出后续统一方向。

## 结论摘要

当前主站不是没有设计语言，而是同时存在多套局部设计语言：

1. 新主页/更新日志体系：偏克制、温暖、纸感、`primary-50/100/950 + accent`，动效多用 `ease-expo-out`，圆角偏大，按钮多为胶囊或柔和圆角。
2. 导航栏体系：较传统导航按钮，`rounded-md`、浅色背景 hover、轻微上浮、阴影增强。
3. Hero 语言切换体系：文字下划线、颜色变化、轻微上移，几乎没有背景块。
4. 番剧/视频区 CTA：视觉上互相接近，但圆角不同，一个是小方角 `rounded`，一个是 `rounded-[12px]`。
5. 更新日志 CTA：胶囊按钮、光扫过、实心 accent hover，是目前比较完整的一套按钮风格。
6. 游戏页：更强烈，头像光晕、卡片大阴影、平台色渐变、图标放大。
7. 音乐页：独立沉浸式系统，大量玻璃、星空、粒子、长循环动画。
8. 留言旧样式：仍然有紫色体系，与主站 `accent` 色系明显断裂。

所以你的感受是准确的：目前“每个区块各做各的”比较明显。尤其按钮、链接、卡片 hover、圆角半径和动画时间没有统一 token，导致同一页面里的元素也会显得不是一个系统。

## 样式库存统计

扫描 `app/**/*.tsx` 和 `app/**/*.css` 后，出现频率最高的视觉/动效类大致如下：

| 类型 | 高频项 | 观察 |
| --- | --- | --- |
| 圆角 | `rounded-full` 114 次、`rounded-lg` 88 次、`rounded-2xl` 50 次、`rounded-xl` 42 次、`rounded-md` 16 次 | 圆角层级没有明确语义。按钮、卡片、徽章、头像都在自由选择。 |
| 缓动 | `ease-expo-out` 97 次、`ease-in-out` 6 次、`ease-out` 6 次、CSS 里还有 `ease` 和 `cubic-bezier(0.4,0,0.2,1)` | 主流是 `ease-expo-out`，但旧 CSS 和个别页面仍用其他节奏。 |
| 时长 | `duration-300` 92 次、`duration-500` 20 次、`duration-600` 16 次、`duration-700` 10 次、`duration-200` 6 次 | 300ms 是主流，但 CTA、弹窗、卡片、页面进入动效混在一起，没有分层。 |
| 阴影 | `shadow-lg` 63 次、`shadow-sm` 22 次、`shadow-2xl` 19 次、自定义 `shadow-[...]` 23 次 | 阴影表达差异大，有些克制，有些非常重。 |
| 渐变 | `bg-gradient-to-r` 51 次、`bg-gradient-to-b` 24 次、`bg-gradient-to-t` 11 次 | 渐变大量存在，但有主站暖色、蓝色游戏、紫色留言、平台色等多套。 |
| hover 位移 | `hover:-translate-y-0.5` 18 次、`hover:-translate-y-1` 8 次、`hover:scale-105/110` 20 次左右 | hover 反馈不统一，有些是上浮，有些是缩放，有些只是变色。 |
| 循环动画 | `animate-pulse` 26 次、`animate-fade-in` 9 次、`animate-scale-up` 8 次，还有自定义 float、shimmer、breathe、starfield | 装饰性循环动效偏多，缺少统一的使用边界。 |

动效密度最高的文件：

| 文件 | 命中数量 | 说明 |
| --- | ---: | --- |
| `app/components/cyber-terminal.tsx` | 99 | 终端演示组件动效最密集，包含大量状态、打字、toast、窗口、按钮样式。 |
| `app/components/music/MusicPageClient.client.tsx` | 63 | 音乐页视觉体系独立，沉浸式动效多。 |
| `app/components/game/GamePageClient.client.tsx` | 56 | 游戏详情页强动效和平台色较多。 |
| `app/routes/terms.tsx` | 41 | 条款页卡片和目录有大量独立样式。 |
| `app/routes/cv.tsx` | 34 | 简历页有自己的卡片/hover风格。 |
| `app/routes/xiao.tsx` | 32 | 影像/文字页面有自己的图像 hover 和 CTA。 |
| `app/routes/updates.tsx` | 31 | 更新日志页风格较完整，但与导航/旧页面不同。 |
| `app/routes/chat.tsx` | 30 | 聊天页独立操作界面风格。 |
| `app/components/ui/Header.tsx` | 23 | 导航悬停与首页 hero 的语言按钮不一致。 |

## 现有设计基底

### 颜色基底

核心 token 位于 `app/styles/theme.css`：

- `--color-primary-50: #faf9f5`
- `--color-primary-100: #f5f4ed`
- `--color-primary-950: #141413`
- `--color-accent: #d97757`
- `--color-accent-hover: #c96442`
- `--ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1)`

这套色彩是主站最新部分的核心语言，温暖、纸感、低对比、偏个人空间。更新日志、首页 hero、近期新增组件基本都在用它。

主要问题是还有几类旧/局部色系：

- 留言样式仍大量使用紫色：`purple-500`、`purple-700`、`purple-100`，见 `app/styles/messages.css`。
- 游戏页平台卡使用蓝/红/绿平台色，见 `app/routes/game._index.tsx`。
- 视频区标题下划线使用蓝色 `from-blue-500 to-blue-600`，见 `app/components/video-showcase.tsx:72`。
- 音乐页有独立的星空/玻璃/霓虹系统，虽然用到了 accent，但整体氛围独立。

建议：保留游戏/音乐这种“主题页局部身份”，但通用按钮、导航、卡片、表单应该回归 `primary + accent`。

## 具体不统一点

### 1. 导航 hover 与 Hero hover 是两套语言

导航项：

- 文件：`app/components/ui/Header.tsx:61`
- 样式：`rounded-md`、`hover:bg-primary-100`、`hover:text-accent`、`hover:-translate-y-0.5`、`hover:shadow-md`
- 视觉反馈：像一个浅色矩形按钮，hover 后有背景、上浮、阴影。

Hero 语言按钮：

- 文件：`app/styles/index-route.css:163-191`
- 样式：无背景、文字颜色变化、底部细线从中间展开、`transform: translateY(-1px)`
- 视觉反馈：像文章阅读模式切换，轻、安静、文字驱动。

这两者不是不能共存，但它们都出现在首页第一屏附近，会让“导航按钮”和“Hero 控件”像来自不同组件库。

建议：

- 导航不一定要变成 hero 下划线，但应和全站链接策略对齐。
- 如果导航是“主导航”，建议使用统一的 `nav-link` 样式：无阴影或极轻阴影，只做颜色/背景/下划线之一，不同时使用背景、上浮、阴影。
- Hero 语言按钮可以保留独特性，因为它是 segmented text control，但可改用同一 timing token：`duration-300 ease-expo-out`，不要用独立 `180ms ease`。

### 2. CTA 圆角不统一：你提到的例子成立

“探索完整榜单”：

- 文件：`app/components/donghua.tsx:79`
- 样式：`rounded`，也就是 Tailwind 默认 0.25rem。
- 动效：`hover:-translate-y-0.5 hover:shadow-lg bg-accent hover:bg-accent-hover`
- 观感：小方角、普通实心按钮。

“追随指引之风”：

- 文件：`app/components/video-showcase.tsx:95`
- 样式：`rounded-[12px]`
- 动效：同样上浮 + 阴影，但有 `bg-gradient-to-r from-accent to-accent-hover`
- 观感：更圆、更像现代 CTA。

“查看完整更新日志”：

- 文件：`app/components/changelog-section.tsx:31-40`
- 样式：`rounded-full`、浅 accent 背景、hover 变实心、光扫过、箭头移动。
- 观感：胶囊型、完整、精致。

三者都是“引导用户进入二级页面”的 CTA，但分别用了小圆角、12px 圆角、胶囊。它们职责相同，却长得不同，这就是最需要统一的一类。

建议：

- 定义主 CTA 统一形态：推荐 `rounded-full` 或 `rounded-xl` 二选一。
- 个人站当前气质更适合 `rounded-full` 用于文字 CTA，`rounded-xl/2xl` 用于卡片和工具面板。
- “探索完整榜单”和“追随指引之风”应使用同一个 `cta-primary` 样式。

### 3. 卡片 hover 有三套强度

轻量卡片：

- 更新日志预览卡：`app/components/changelog-card.tsx`
- 动效：`hover:-translate-y-0.5`，背景稍亮，轻微自定义阴影。
- 适合：信息卡、日志卡、普通内容。

中量卡片：

- 番剧卡：`app/components/donghua.tsx:91`
- 动效：`hover:-translate-y-1`，没有阴影，只上浮。
- 适合：内容卡，但阴影反馈缺失导致和其他卡不统一。

重量卡片：

- 游戏平台卡：`app/routes/game._index.tsx:84`
- 动效：`hover:-translate-y-1 hover:shadow-2xl`，图标 `group-hover:scale-110`，背景渐变显现。
- 适合：游戏专题页，但不适合作为全站默认卡片。

音乐卡片：

- 文件：`app/styles/music/_music-cards.css`
- 动效：`.card-hover:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 25px 50px -12px rgba(...) }`
- 这是沉浸式页面的特殊强动效。

建议：

- 定义三档卡片动效：
  - `card-subtle`：普通内容卡，`-translate-y-0.5`，轻阴影。
  - `card-interactive`：可点击入口卡，`-translate-y-1`，中等阴影，边框变 accent。
  - `card-feature`：专题页/游戏/音乐可使用，但不要在普通内容区混用。
- 不要每个卡片自由选择 `shadow-lg`、`shadow-2xl`、`shadow-[...]`。

### 4. 动画时间不分层

当前常见时长：

- 180ms：Hero 语言按钮 CSS，`app/styles/index-route.css:168`
- 200ms：旧留言样式，`app/styles/messages.css`
- 300ms：导航、按钮、卡片最常见。
- 500ms：登录、部分 CTA、页面组件。
- 600ms：弹窗、页面进入、更新日志卡片。
- 700ms：光扫过效果。
- 900ms：Hero GSAP 字符进入。
- 980ms：更新日志路由遮罩，`app/components/transitions/UpdatesRouteTransition.tsx`。

问题不是时长多，而是没有语义：

- `duration-300` 有时用于按钮，有时用于大块卡片。
- `duration-600` 有时用于弹窗，有时用于普通容器。
- Hero 的 `180ms ease` 和主系统 `300ms ease-expo-out` 节奏不同。

建议建立 motion token：

| token | 建议值 | 用途 |
| --- | ---: | --- |
| `motion-fast` | 150ms | 图标、颜色、细小反馈 |
| `motion-base` | 240ms 或 300ms | 按钮、链接、输入框 |
| `motion-slow` | 420ms | 卡片、面板、状态切换 |
| `motion-enter` | 600ms | 弹窗、页面局部进入 |
| `motion-hero` | 700-900ms | Hero 字符/大面积内容进入 |

缓动建议默认使用 `--ease-expo-out`。除非是连续循环、物理拖拽或线性星空，否则不要再用裸 `ease`、`ease-in-out`、`cubic-bezier(0.4,0,0.2,1)`。

### 5. 旧 CSS 与 Tailwind 组件风格混在一起

`app/styles/gallery.css`：

- 图片 hover：`transition: transform 0.3s ease; transform: scale(1.05);`
- 问题：使用裸 `ease`，没有 `ease-expo-out`；图片 hover 风格只有 scale，没有统一阴影/遮罩策略。

`app/styles/game.css`：

- 使用 `cubic-bezier(0.4, 0, 0.2, 1)` 和 `ease`。
- 这更像 Material 默认曲线，和主题里的 `--ease-expo-out` 不一致。

`app/styles/messages.css`：

- 使用大量 `purple-*`、`duration-200 ease-in-out`、旧式圆角。
- 和现在主站 `accent` 色系差异最大。

建议：

- 旧 CSS 不一定一次全删，但应逐步迁移到主题 token。
- 新组件不要继续写裸 CSS transition，优先用 Tailwind token 或抽象类。
- `messages.css` 是最明显的旧系统，应单独列为迁移目标。

### 6. 圆角没有语义

当前圆角使用很分散：

- `rounded-md`：导航桌面项，见 `Header.tsx:61`。
- `rounded`：番剧 CTA，见 `donghua.tsx:79`。
- `rounded-lg`：番剧卡、图库图片容器、游戏卡。
- `rounded-xl`：播放器、更新日志预览卡、留言面板。
- `rounded-2xl`：登录表单、更新目录项、移动用户卡。
- `rounded-[1.5rem]`、`rounded-[1.75rem]`、`rounded-[2rem]`：更新日志和登录弹窗。
- `rounded-full`：头像、胶囊按钮、徽章、图标按钮。

建议语义化：

| 用途 | 建议圆角 |
| --- | --- |
| 小按钮/导航项 | `rounded-lg` 或 `rounded-full`，不要混 `rounded-md` 和 `rounded` |
| 主 CTA | `rounded-full` |
| 次 CTA / 工具按钮 | `rounded-xl` |
| 内容卡片 | `rounded-2xl` |
| 大面板 / Hero box / modal | `rounded-[1.5rem]` 或 `rounded-[2rem]` |
| 头像 / 徽章 / pill | `rounded-full` |

如果采用这套语义，“探索完整榜单”就不应该是 `rounded`，它应和其他 CTA 一样是 `rounded-full` 或统一的 `rounded-xl`。

### 7. 阴影过多且层级不清

当前有：

- Tailwind 默认：`shadow-sm`、`shadow`、`shadow-md`、`shadow-lg`、`shadow-xl`、`shadow-2xl`
- 自定义：`shadow-[0_18px_55px_rgba(...)]`、`shadow-[0_24px_70px_rgba(...)]`、`shadow-[0_22px_55px_rgba(...)]`
- 彩色 glow：音乐页、游戏页、更新日志 bullet。

问题：

- 普通导航 hover 出现 `shadow-md`，而一些内容卡只上浮不加阴影。
- 游戏卡用 `shadow-2xl`，更新日志用自定义低透明阴影，质感不同。
- 有些 shadow 是黑灰，有些是暖棕，有些是 accent glow。

建议：

- 主站统一使用暖色阴影，不用默认黑色重阴影作为常规反馈。
- 定义：
  - `shadow-surface`: `0 8px 24px rgba(65,45,35,0.06)`
  - `shadow-surface-hover`: `0 14px 34px rgba(65,45,35,0.10)`
  - `shadow-panel`: `0 18px 55px rgba(65,45,35,0.08)`
  - `shadow-cta`: `0 14px 34px rgba(154,89,55,0.18)`
- 游戏/音乐可局部使用 glow，但通用按钮不要随意上 `shadow-2xl`。

### 8. 渐变使用过多，且含义不同

主站渐变用途混杂：

- CTA 背景：`from-accent to-accent-hover`
- 页面背景：`from-primary-100 to-primary-50`
- 光扫过：`from-transparent via-white/25 to-transparent`
- 游戏平台色：蓝/红/绿
- 留言紫色：`from-purple-500 to-purple-700`
- 视频区蓝线：`from-blue-500 to-blue-600`

建议：

- 通用 CTA 不需要每个都用渐变。可以统一为实心 `accent`，hover 到 `accent-hover`，更稳。
- 渐变保留给：
  - Hero/section 背景的轻层次
  - 光扫过装饰
  - 专题页平台色
- 旧紫色留言渐变应迁移。

### 9. 循环动画边界不清

当前循环动画很多：

- `animate-pulse` 26 次。
- `animate-bounce` 用于首页音乐入口箭头，见 `tab-showcase.tsx`。
- 音乐页自定义 `pulse-slow`、`float`、`streamFlow`、`starfield zoom`。
- 共享动画里还有 `shimmer`、`breathe`、`shake`、`bounceIn`。

问题：

- 装饰性 pulse/bounce 很容易让页面显得吵。
- 某些提示和 CTA 用 bounce，会和整体安静风格冲突。
- 音乐页可以沉浸，但通用页面不应大量常驻循环动画。

建议：

- 通用页面只允许少量状态动画：loading、typing、route transition。
- CTA 不建议常驻 bounce；可以改成 hover 时箭头位移。
- 音乐页的星空/粒子作为主题页例外，但要确保 `prefers-reduced-motion` 覆盖完整。

## 页面/组件逐项观察

### Header

文件：`app/components/ui/Header.tsx`

现状：

- 桌面 nav：`rounded-md`、浅背景 hover、上浮、阴影。
- 登录按钮同 nav。
- 登录后的用户 pill：`rounded-full`、玻璃背景、轻阴影。
- 移动菜单：`duration-600 ease-expo-out`，侧滑。

问题：

- 桌面 nav 像普通管理后台按钮，和首页 hero 的诗性/文本型按钮不一致。
- 桌面 nav 是 `transition-all`，移动 nav 是 `transition-opacity`，反馈不一致。
- `rounded-md` 与全站更常见的 `rounded-lg/rounded-full` 不对齐。

建议：

- 桌面 nav 改成统一 `nav-link`。
- 如果要保留背景 hover，建议去掉 `hover:shadow-md`，只保留背景和文字色。
- 或改成 underline indicator，与 hero 语言按钮更接近。

### HomeHero

文件：`app/components/HomeHero.client.tsx`、`app/styles/index-route.css`

现状：

- GSAP 字符入场，`power3.out`，0.54-0.9s。
- 语言按钮用 180ms `ease`，下划线展开。
- notice 用 420ms `cubic-bezier(0.16,1,0.3,1)`。

优点：

- 首页第一屏有明确节奏，视觉比较细腻。

问题：

- 语言按钮没有使用 `ease-expo-out` token，和 Tailwind 类体系不同。
- `hero-manifesto` 有 `transition-all duration-600`，但没有明显状态变化，可能是遗留。

建议：

- 把 hero language 的 `180ms ease` 调整到 `240/300ms ease-expo-out`。
- 保留 GSAP hero 入场，不建议和普通 hover 统一到同一时长。

### Donghua

文件：`app/components/donghua.tsx`

现状：

- CTA 是 `rounded`。
- 卡片是 `rounded-lg`，hover 上浮 `-translate-y-1`，没有 shadow。

问题：

- CTA 圆角与其他 CTA 不一致。
- 卡片 hover 只有位移，无阴影或 border 反馈，和更新日志卡、游戏卡不一致。

建议：

- CTA 用统一 `cta-primary`。
- 卡片用统一 `card-interactive` 或 `card-subtle`。

### VideoShowcase

文件：`app/components/video-showcase.tsx`

现状：

- CTA 是 `rounded-[12px]`、accent 渐变、上浮、shadow。
- 标题下划线是蓝色渐变。
- 视频容器 `rounded-xl shadow-2xl hover:shadow-3xl`。

问题：

- CTA 与 Donghua 同职责但圆角不同。
- 蓝色标题线与主站 accent 系统不一致，除非视频内容明确需要蓝色。
- `hover:shadow-3xl` 不是 Tailwind 默认常见层级，可能没有实际效果或依赖自定义。

建议：

- CTA 与 Donghua 统一。
- 标题线改 `from-accent to-accent-hover`，除非保留游戏专题色。
- 视频容器阴影改用统一 panel shadow。

### Changelog / Updates

文件：`app/components/changelog-section.tsx`、`app/components/changelog-card.tsx`、`app/routes/updates.tsx`

现状：

- 这是目前比较系统的一套：大圆角面板、暖色自定义阴影、胶囊 CTA、光扫过、motion-reduce。
- `updates.tsx` 的返回首页 CTA 与首页更新日志 CTA 风格一致。

优点：

- 有比较完整的主站按钮语言。
- motion-reduce 考虑较好。

问题：

- 这套语言没有推广到 Donghua、Video、Header。
- 圆角大量使用 `[1.5rem]`、`[1.75rem]`、`[2rem]`，需要抽象成语义 token。

建议：

- 可以把 Changelog CTA 作为全站主 CTA 参考。
- 把这一套沉淀成 `Button` 或至少 CSS utility。

### Game

文件：`app/routes/game._index.tsx`、`app/components/game/GamePageClient.client.tsx`、`app/styles/game.css`

现状：

- 平台卡 hover：大阴影、上浮、图标 scale、平台色渐变显现。
- 游戏详情页头像光晕、pulse、平台状态色较强。
- CSS 里还有 `cubic-bezier(0.4,0,0.2,1)`。

问题：

- 游戏页可以更强，但它的按钮/卡片基础仍应继承全站基础层。
- `game.css` 的缓动与主系统不同。

建议：

- 平台色只用于 icon、badge、细节，不要替代通用按钮系统。
- `game.css` 改用 `--ease-expo-out`。

### Gallery

文件：`app/routes/gallery.tsx`、`app/styles/gallery.css`

现状：

- 图片 hover 是简单 `scale(1.05)`，300ms `ease`。
- 页脚 CTA 是 `rounded-full`、gradient、光扫过。

问题：

- 图片 hover 和其他图像卡 hover 不共享 token。
- `gallery.css` 仍然用裸 CSS 值，和主题 token 不完全一致。

建议：

- 图片 hover 使用 `transition-transform duration-500 ease-expo-out` 或统一 image-hover utility。
- 如果图片只是浏览，不一定需要强 scale，可降到 1.025-1.04。

### Messages

文件：`app/styles/messages.css`

现状：

- 紫色体系非常明显。
- 按钮 `duration-200 ease-in-out`。
- 气泡 `purple-500/600`，头像边框紫色。

问题：

- 和主站 `accent` 完全断裂。
- 旧式 `@apply` 组件样式和新 Tailwind inline 风格混用。

建议：

- 这是优先级最高的旧样式迁移目标之一。
- 迁移到 `accent`，按钮和输入框用通用表单 token。

### Music

文件：`app/components/music/MusicPageClient.client.tsx`、`app/styles/music/*.css`

现状：

- 独立沉浸式页面，有玻璃、星空、粒子、歌词流、卡片浮动。
- 大量使用 `cubic-bezier(0.16,1,0.3,1)`，基本和 `ease-expo-out` 同源。

问题：

- 特效合理，但数量多。
- 如果音乐页内部按钮和全站按钮完全不同，会削弱站点一致性。

建议：

- 允许音乐页保留主题化背景和动画。
- 但返回、导航、基础 CTA、表单仍应复用全站组件。

## 建议建立的统一样式规则

### 统一按钮层级

建议至少定义四种按钮：

1. `button-primary`
   - 用途：进入重要页面、提交、核心 CTA。
   - 外观：`rounded-full bg-accent text-primary-50`。
   - hover：`bg-accent-hover -translate-y-0.5 shadow-cta`。
   - 可选：只有重要营销/入口 CTA 才加光扫过。

2. `button-secondary`
   - 用途：次级操作、返回、普通跳转。
   - 外观：`rounded-full border border-primary-950/10 bg-primary-100/70 text-primary-950/72`。
   - hover：`bg-primary-50 text-accent border-accent/25`。

3. `button-ghost`
   - 用途：导航、轻链接、工具栏。
   - 外观：无边框或透明背景。
   - hover：只变色或加极浅背景，不加阴影。

4. `button-icon`
   - 用途：播放、关闭、上一首/下一首。
   - 外观：正圆或 `rounded-full`，固定尺寸。
   - hover：背景色变化或轻微 scale，不要同时上浮。

这样 “探索完整榜单”“追随指引之风”“查看完整更新日志”“返回首页” 就能按职责统一。

### 统一卡片层级

建议：

1. `surface-card`
   - 普通信息卡。
   - `rounded-2xl border border-primary-950/8 bg-primary-100/60 shadow-surface`

2. `interactive-card`
   - 可点击入口卡。
   - hover：`-translate-y-0.5 border-accent/18 shadow-surface-hover`

3. `feature-panel`
   - 大区块/专题面板。
   - `rounded-[1.5rem]` 或 `rounded-[2rem]`，`shadow-panel`

4. `media-frame`
   - 图片、视频、播放器。
   - `rounded-xl` 或 `rounded-2xl`，不要和内容卡完全一样。

### 统一动效规则

推荐默认：

```css
--motion-fast: 150ms;
--motion-base: 300ms;
--motion-slow: 420ms;
--motion-enter: 600ms;
--ease-standard: cubic-bezier(0.16, 1, 0.3, 1);
```

使用原则：

- 链接颜色：150-240ms。
- 按钮 hover：300ms。
- 卡片 hover：300-420ms。
- 面板/弹窗进入：500-600ms。
- Hero 入场：700-900ms。
- 光扫过：600-700ms。
- 不再使用裸 `ease`，除非是非常普通的 CSS fallback。

### 统一 hover 语法

不要每个元素都同时使用颜色、背景、阴影、上浮、缩放。建议按类型限制：

| 元素 | hover 反馈 |
| --- | --- |
| 文本链接 | 颜色变化 + 可选下划线/箭头移动 |
| 主按钮 | 背景变深 + 小上浮 + 阴影 |
| 次按钮 | 背景变亮 + 边框/文字变 accent |
| 卡片 | 小上浮 + 边框/阴影 |
| 图片 | 轻 scale 或遮罩，不加按钮式阴影 |
| 图标按钮 | 背景变化或 scale，避免上浮 |
| 导航 | 颜色/背景/下划线三选一为主 |

### 统一圆角规则

建议直接写进团队/个人规范：

- `rounded-full`：主 CTA、pill、头像、徽章、图标圆按钮。
- `rounded-xl`：普通按钮、输入框、小工具。
- `rounded-2xl`：内容卡片。
- `rounded-[1.5rem]`：大面板。
- `rounded-[2rem]`：弹窗、Hero 面板。
- 禁止普通 CTA 使用 `rounded` 或 `rounded-md`，除非是非常小的工具按钮。

## 推荐改造优先级

### P0：统一 CTA

先改用户最容易感知的入口按钮：

- `app/components/donghua.tsx:79` “探索完整榜单”
- `app/components/video-showcase.tsx:95` “追随指引之风”
- `app/components/changelog-section.tsx:31` “查看完整更新日志”
- `app/routes/updates.tsx:317` “返回首页”
- `app/routes/gallery.tsx` 页脚 CTA

目标：相同职责的 CTA 使用同一组件/utility。

### P1：统一 Header 与首页交互

重点：

- `Header.tsx` 桌面 nav hover。
- `index-route.css` hero language button timing。

目标：首页第一屏交互不割裂。

### P2：统一卡片

重点：

- `changelog-card.tsx`
- `donghua.tsx`
- `game._index.tsx`
- `updates.tsx`
- `terms.tsx`

目标：信息卡、入口卡、专题卡分层明确。

### P3：迁移旧 CSS

重点：

- `app/styles/messages.css`
- `app/styles/gallery.css`
- `app/styles/game.css`

目标：旧页面不再使用紫色体系、裸 `ease`、未命名阴影。

### P4：整理动画库

重点：

- `app/styles/shared/_animations.css`
- `app/styles/music/*.css`
- `app/styles/index-route.css`

目标：删除重复 keyframes，保留必要动画，明确哪些是全站可用，哪些只属于音乐页。

## 建议落地方式

最稳的做法不是马上全项目替换，而是先建立一小组 utility 或组件：

1. 在 `app/tailwind.css` 或新的 `app/styles/interactions.css` 中定义全站交互类：
   - `.ui-button-primary`
   - `.ui-button-secondary`
   - `.ui-button-ghost`
   - `.ui-card`
   - `.ui-card-interactive`
   - `.ui-link`
   - `.ui-nav-link`

2. 先替换首页可见区域：
   - Header
   - HomeHero language button timing
   - Donghua CTA
   - Video CTA
   - Changelog CTA

3. 再替换二级页面：
   - Updates
   - Gallery
   - Game
   - Terms
   - Messages

4. 最后处理主题页例外：
   - Music 保留沉浸式动画，但按钮/导航/返回统一。
   - Game 保留平台色，但基础卡片结构统一。

## 推荐目标风格

结合当前主站已经比较成熟的部分，建议目标风格定为：

- 色彩：`primary-50/100/950 + accent/accent-hover` 为主。
- 形状：胶囊 CTA、大圆角卡片、轻边框、暖色阴影。
- 动效：`ease-expo-out`、小幅上浮、轻阴影、少量光扫过。
- 页面节奏：Hero 可以更有戏剧性；普通交互要克制。
- 专题例外：音乐/游戏可以主题化，但不要改写全站基础控件。

这套方向和当前 `updates`、`changelog`、登录弹窗的气质最接近，也能解释为什么现在 `donghua` 的小方角按钮会显得突兀：它不符合当前最成熟的主站语言。

## 一句话判断

现在的问题不是“样式不好看”，而是“同类元素没有共享同一套规则”。先统一 CTA、导航、卡片 hover、圆角语义和 motion token，网站质感会立刻从“各区块独立发挥”变成“同一个人设计出来的系统”。
