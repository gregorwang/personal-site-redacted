# 字体系统审计 - 2026-06-04

## 结论

当前项目的字体问题不是单一页面的缓存问题，而是“字体资源、运行时变量、Tailwind 工具类、页面专用样式”四层没有完全统一。

`/updates` 看起来没有明显变化的直接原因是：新增的 `ui-display-title` 等工具类使用了 `var(--font-serif)`，但 `--font-serif` 原本只写在 `@theme reference` 中。`@theme reference` 主要给 Tailwind 编译期引用，不等同于稳定输出到浏览器运行时的 `:root` 变量。如果浏览器拿不到 `--font-serif`，`font-family: var(--font-serif)` 会失效，页面就会退回原本继承字体，看起来像没生效。

本次已修复运行时变量：`app/styles/theme.css` 的真实 `:root` 现在包含 `--font-sans` 和 `--font-serif`，同时 `app/tailwind.css` 的 display 工具类加了 fallback。

## 2026-06-04 落地记录

已按本文档的 P0/P1 方向完成第一轮统一：

- 增加真实运行时字体变量，避免 `var(--font-serif)` 在浏览器里失效。
- 增加语义字体类：`ui-display-hero`、`ui-display-title`、`ui-display-subtitle`、`ui-section-label`、`ui-body-text`、`ui-meta-text`、`ui-quote-text`。
- 已迁移 `/updates`、`/game`、`/cv`、`/gallery`、`/terms`、`/xiao` 的主要标题、正文、说明、引用和统计文字。
- 已迁移 `changelog-section`、`cyber-terminal` 的外层标题/说明文字。
- 已把 music/gallery 的页面专用 CSS 字体栈改为引用全局字体变量。
- 保留代码、终端、Canvas 绘制等有明确功能或品牌图形目的的特殊字体，不强行统一。

## 当前字体资产

主要字体资源：

- Adobe Fonts：`source-han-serif-sc`
- fallback：`Noto Serif SC`
- fallback：`Georgia`
- fallback：`serif`
- 系统 fallback：`system-ui`
- 代码/终端类 fallback：`monospace`, `Courier New`
- Canvas footer 单独使用：`Inter`, `Arial Black`, sans-serif

当前全局意图：

- `app/styles/theme.css`
  - `--font-sans`: `"source-han-serif-sc", "Noto Serif SC", serif, system-ui`
  - `--font-serif`: `"source-han-serif-sc", "Noto Serif SC", Georgia, serif`
- `app/tailwind.css`
  - `html, body` 使用 `var(--font-sans)`
  - 新增 display 工具类使用 `var(--font-serif)`

问题点：`--font-sans` 实际上也指向宋体/衬线字体，命名上叫 sans 但内容不是 sans。这会让维护者误判 `font-sans` 是无衬线。

## 已发现的不一致类型

### 1. 运行时变量和编译期变量混用

位置：

- `app/styles/theme.css`
- `app/tailwind.css`

问题：

- 字体变量原本只存在于 `@theme reference`，运行时不一定可用。
- `ui-display-title` 使用 `var(--font-serif)` 时可能失效。

状态：

- 已补真实 `:root` 变量。
- 已给 `ui-display-title`、`ui-display-subtitle`、`ui-section-label` 加 fallback。

优先级：P0

### 2. `font-sans` 命名误导

位置：

- `app/styles/theme.css`
- `app/routes/_index.tsx`
- `app/routes/cv.tsx`
- `app/routes/anime.tsx`
- `app/components/cyber-terminal.tsx`

问题：

- `font-sans` 名字暗示无衬线，但项目里它实际会落到 `source-han-serif-sc`。
- 这使得“想用主站字体”和“想用工具 UI 字体”都写成 `font-sans`，语义混乱。

建议：

- 保留当前视觉时，把 `font-sans` 从业务代码里逐步替换为语义类。
- 新增语义层级，而不是继续在页面里写 `font-sans` / `font-serif`。

优先级：P1

### 3. 标题层级各写各的

典型位置：

- `app/components/HomeHero.client.tsx`
- `app/routes/updates.tsx`
- `app/routes/game._index.tsx`
- `app/routes/cv.tsx`
- `app/routes/gallery.tsx`
- `app/routes/terms.tsx`
- `app/routes/xiao.tsx`
- `app/components/changelog-section.tsx`

常见写法：

- `text-5xl font-bold leading-tight tracking-tight`
- `text-4xl font-semibold leading-tight tracking-tight`
- `text-2xl font-semibold leading-tight tracking-tight`
- `stellar-text`
- `hero-title`

问题：

- 字体族可能相同，但字号、字重、行高、字距完全不同。
- Hero 使用更强的舞台排版；updates 原本像普通管理后台文档；game/cv/gallery 又各自一套。
- 这会让用户感觉不是同一个网站。

建议语义层级：

- `ui-display-hero`: 首页 Hero / 页面首屏大标题
- `ui-display-title`: 普通页面主标题、版本标题、卡片标题
- `ui-display-subtitle`: 页面说明、段落导语
- `ui-section-label`: 英文 eyebrow、标签、目录小标题
- `ui-body-text`: 普通正文
- `ui-meta-text`: 日期、计数、次级说明

已开始：

- `ui-display-title`
- `ui-display-subtitle`
- `ui-section-label`

优先级：P1

### 4. 专题页面有独立字体系统

位置：

- `app/components/music/MusicPageClient.client.tsx`
- `app/styles/music/_base.css`
- `app/styles/music/_glass-effects.css`
- `app/styles/music/_music-cards.css`

问题：

- Music 页面手写了 `source-han-serif-sc`, `Noto Serif SC`, `system-ui`, `sans-serif`。
- `.stellar-text` 是独立风格，没有接入全站 display token。

建议：

- Music 可以保留独立宇宙感，但应引用全局 token：
  - `font-family: var(--font-serif, ...)`
  - 标题用 `ui-display-title` 或 music 专属 `music-display-title`
- 不要在多个 CSS 文件重复写字体栈。

优先级：P2

### 5. Cyber terminal 使用混合字体，有合理性但缺少边界

位置：

- `app/components/cyber-terminal.tsx`

现状：

- 大量 `font-mono`
- 大量 `font-sans`
- 局部 `font-serif`

判断：

- 终端、代码、token、日志使用 monospace 是合理的。
- 但说明文本、标题、按钮如果继续混用 `font-sans`，会和主站文字系统割裂。

建议：

- 保留代码/终端区域的 mono。
- 外层标题和描述改用 `ui-display-title` / `ui-display-subtitle`。
- 消息正文使用 `ui-body-text`，不要继续写散装 `font-sans font-medium`。

优先级：P2

### 6. Canvas footer 硬编码 Inter/Arial Black

位置：

- `app/components/creative-footer.tsx`

现状：

- Canvas 绘制使用 `Inter`, `Arial Black`, sans-serif。

判断：

- Canvas 图形文字需要更粗、更几何，硬编码有一定合理性。
- 但它不受全局字体系统控制。

建议：

- 如果 footer 是品牌图形，可保留。
- 如果希望全站统一，应改成从 CSS 变量读取，或者明确命名为 `--font-canvas-display`。

优先级：P3

### 7. 旧 Tailwind 字体/字距工具过多

高频模式：

- `font-bold`
- `font-semibold`
- `font-medium`
- `tracking-tight`
- `tracking-tighter`
- `tracking-wider`
- `uppercase`

问题：

- 这些工具本身没错，但大量直接写在业务组件里，会绕开设计系统。
- 后续任何字体调整都需要逐文件修改。

建议：

- 新功能不再直接组合标题字体工具。
- 页面标题优先使用语义类。
- 只在局部特殊组件中保留 Tailwind 原子类。

优先级：P2

## 页面审计摘要

### 首页 Hero

位置：

- `app/components/HomeHero.client.tsx`
- `app/styles/index-route.css`

状态：

- 当前视觉基准。
- 字体族跟全局一致，但排版舞台更强。

建议：

- 把 Hero 的标题风格抽象为 `ui-display-hero`，供其他一级页面标题复用。

### 更新日志 `/updates`

位置：

- `app/routes/updates.tsx`

状态：

- 已接入 `ui-display-title` / `ui-display-subtitle` / `ui-section-label`。
- 原本视觉不生效的根因是运行时字体变量缺失。

建议：

- 下一步可再强化字号和页面密度，让它更接近 Hero 的叙事气质。

### 游戏 `/game`

位置：

- `app/routes/game._index.tsx`
- `app/routes/game.tsx`
- `app/routes/game.$platform.tsx`

状态：

- 主标题仍是散装 `text-5xl font-bold leading-tight tracking-tight`。
- 平台卡片标题和数字使用散装 `font-semibold`。

建议：

- 平台选择页主标题改 `ui-display-title` 或未来 `ui-display-hero`。
- 卡片标题改 `ui-display-title`。
- 统计数字可以保留 `tabular-nums`，但字体层级应统一。

优先级：P1

### 简历 `/cv`

位置：

- `app/routes/cv.tsx`

状态：

- 顶层强制 `font-sans`。
- 标题大量 `font-semibold tracking-tight`。

判断：

- 简历页面可以比主站更工具化，但字体仍应统一。

建议：

- 顶层去掉 `font-sans`。
- section 标题改 `ui-display-title`。
- 正文改 `ui-body-text`。

优先级：P2

### 相册 `/gallery`

位置：

- `app/routes/gallery.tsx`

状态：

- Hero 标题叠在图片上，使用 `font-bold tracking-tight`。
- 内容区标题使用 `font-semibold tracking-tight`。

建议：

- 图片 Hero 可以用 `ui-display-hero`。
- 区块标题用 `ui-display-title`。

优先级：P2

### 音乐 `/music`

位置：

- `app/components/music/MusicPageClient.client.tsx`
- `app/styles/music/*.css`

状态：

- 独立页面系统。
- `.stellar-text` 和 music CSS 重复写字体栈。

建议：

- 保留 music 独特视觉，但改用全局字体变量。
- 避免在多个 music CSS 文件重复声明字体。

优先级：P2

### terms

位置：

- `app/routes/terms.tsx`

状态：

- 法务/说明页面，标题和目录标题散装字体类。

建议：

- 主标题、目录标题、section 标题统一到 display 类。
- 正文统一到 body 类。

优先级：P3

### xiao

位置：

- `app/routes/xiao.tsx`

状态：

- 诗性页面，有 italic、blockquote、暗色模式。
- 字体风格可以独立，但应基于全局 token。

建议：

- 大标题改 display 类。
- 引文定义 `ui-quote-text`，避免散落 italic/font-normal/leading-relaxed。

优先级：P3

## 建议的整改顺序

### P0

- 确保运行时 `:root` 输出 `--font-sans` 和 `--font-serif`。
- 所有新建字体 utility 必须带 fallback。

状态：已处理。

### P1

- 建立完整语义字体类：
  - `ui-display-hero`
  - `ui-display-title`
  - `ui-display-subtitle`
  - `ui-section-label`
  - `ui-body-text`
  - `ui-meta-text`
- 优先迁移：
  - `/updates`
  - `/game`
  - 首页 `changelog-section`

### P2

- 迁移内容型页面：
  - `/cv`
  - `/gallery`
  - `/music`
  - `cyber-terminal` 外层标题/正文

### P3

- 处理特殊页面：
  - `/terms`
  - `/xiao`
  - `creative-footer` canvas 字体策略

## 推荐字体规范草案

```css
.ui-display-hero {
  font-family: var(--font-serif, "source-han-serif-sc", "Noto Serif SC", Georgia, serif);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.ui-display-title {
  font-family: var(--font-serif, "source-han-serif-sc", "Noto Serif SC", Georgia, serif);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0;
}

.ui-display-subtitle {
  font-family: var(--font-serif, "source-han-serif-sc", "Noto Serif SC", Georgia, serif);
  font-weight: 300;
  line-height: 1.85;
  letter-spacing: 0;
}

.ui-section-label {
  font-family: var(--font-serif, "source-han-serif-sc", "Noto Serif SC", Georgia, serif);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ui-body-text {
  font-family: var(--font-serif, "source-han-serif-sc", "Noto Serif SC", Georgia, serif);
  font-weight: 300;
  line-height: 1.8;
  letter-spacing: 0;
}

.ui-meta-text {
  font-family: var(--font-serif, "source-han-serif-sc", "Noto Serif SC", Georgia, serif);
  font-weight: 400;
  line-height: 1.55;
  letter-spacing: 0;
}
```

## 判断标准

迁移后，一个页面是否达标，看这几点：

- 页面主标题不再直接写 `font-bold tracking-tight`，而是使用 display 语义类。
- 正文说明不再每处手写 `leading-relaxed`，而是使用 body/subtitle 语义类。
- 英文 eyebrow、版本标签、日期标签统一使用 section/meta 类。
- 特殊页面可以有自己的风格，但必须建立在全局字体变量上。
- `font-mono` 只用于代码、token、终端、编号等真实等宽场景。

## 风险

- 全站一次性替换字体类会影响大量页面视觉，需要分页面验证。
- 思源宋体加载依赖 Adobe Fonts；若网络慢，会先显示 fallback。
- 如果希望字体变化更明显，仅改 font-family 不够，还需要同时调整字号、字重、行高和字距。
