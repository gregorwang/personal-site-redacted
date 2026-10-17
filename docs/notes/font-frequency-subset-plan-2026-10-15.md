# 思源宋体按字频重新切片：实施方案

> 日期：2026-10-15
> 背景调研：`docs/reference/openai-site-teardown-2026-10-13.md` 第 7 节（OpenAI / Cursor 字体加载实测）
> 建议执行模型：Sonnet（任务边界清楚，主要是脚本和配置改动；不建议用 Haiku，见第 8 节）

---

## 1. 目标和已定的决定

- **保留全站思源宋体 ExtraLight**（站长看过系统字体 / 混合方案预览后决定的），不换字体，不加字重。
- 把字体分片从「按码位顺序切」改成「按字频切」，让一页中文只下载少数几片。
- 去掉首页的字体 preload。
- 顺手修掉更新日志组件的字体不统一。

**不在本次范围**：换字体、加字重、把界面元素改成系统字体、图片和视频优化。

## 2. 现状（2026-10-15 实测）

| 项 | 现状 |
|---|---|
| 源字体 | `assets/fonts/NotoSerifCJKsc-ExtraLight.otf`（脚本可用 `--download` 从 notofonts/noto-cjk 下载） |
| 切片脚本 | `scripts/build-font-subsets.py`，`npm run fonts:build` |
| 切法 | latin / cjk-symbols / kana 三片，加上 CJK 基本区 U+4E00–9FFF **每 0x400 码位一片**，共 24 个文件，11.6MB，CJK 单片 400–670KB |
| 字体 CSS | `app/styles/fonts.css`，由脚本生成，`app/tailwind.css` 第 8 行 import |
| 后备字体 | `app/styles/fonts-fallback.css`：`SiteSourceHanSerif Fallback`，用 PingFang / 微软雅黑加 size-adjust 等对齐尺寸，**保留不动** |
| 字体栈 | `app/styles/theme.css` 的 `--font-main` |
| preload | `app/lib/font-preloads.ts`，只在 `app/routes/($lang)._index.tsx` 第 27、42 行使用：`fontPreloadHrefs(HOME_HERO_PRELOAD_TEXT, 8)` |
| 线上怎么提供 | `public/.assetsignore` 排除了 `fonts/*`，所以 `/fonts/*` **不随 Worker 静态资源发布**，而是 `worker.ts` 第 134 行起从 R2 bucket `gregorwang`（binding `MEDIA_BUCKET`）的 `fonts/<文件名>` 读取，`Cache-Control: public, max-age=31536000, immutable` |
| 实测问题 | 首页整页只有 532 个不同汉字（首屏 160 个），但浏览器下载了**全部 24 个文件、11,593,784 字节** |

**关键约束**：字体缓存是一年 + immutable，现在的文件名不带 hash。新分片**必须用新文件名**（建议带内容 hash），不能覆盖同名旧文件，否则老访客的浏览器会一直用旧缓存。

## 3. 切片方案

### 3.1 字频分组从哪来

推荐**直接复用 Google Fonts 对 Noto Serif SC 的分片方案**：Google 已经按字频把简体中文切成 100 多片，每片带一份 `unicode-range`，第一片是最常用的字。我们只取它的 unicode-range 列表，**字体文件仍然用自己的源字体切**（Noto Serif SC 是 OFL 授权，自己子集化没问题）。

获取方法：

```
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@200&display=swap"
```

- 必须带现代浏览器 UA，否则 Google 返回的是不分片的旧格式。
- 返回的 CSS 里每个 `@font-face` 前面有 `/* [N] */` 注释，N 就是分片序号。按 N 排序，提取每片的 `unicode-range`。
- 把结果存成 `scripts/data/noto-serif-sc-slices.json`（数组，下标 = 分片序号，值 = unicode-range 字符串）并提交。之后脚本只读这个 JSON，**构建时不联网**。
- 拿到之后检查：所有分片的码位并集应该覆盖 U+4E00–9FFF 的全部 20992 个字。如果有遗漏，在脚本里把剩下的码位补成最后一片。

备选：如果 Google CSS 拿不到或格式变了，改用 npm 包 `cn-font-split`（自带字频排序），但要额外引入 Node 依赖，优先用上面的方案。

### 3.2 改 `scripts/build-font-subsets.py`

- 保留 `latin`、`cjk-symbols`、`kana` 三片基础分片（它们本来就小，60–95KB）。
- 删掉 `CJK_SUBSETS` 的码位切法，改为读 `scripts/data/noto-serif-sc-slices.json`。
- 每片 unicode-range 要**减去基础分片已覆盖的码位**，避免同一个字出现在两片里。
- 文件名：`noto-serif-sc-200-<序号三位>-<内容 sha256 前 8 位>.woff2`，例如 `noto-serif-sc-200-000-1a2b3c4d.woff2`。
- 子集化参数沿用现有的 `fontTools.subset` 调用（`--flavor=woff2 --layout-features=*` 等）。
- 生成 `app/styles/fonts.css`：每片一个 `@font-face`，`font-family: "SiteSourceHanSerif"`、`font-weight: 200`、`font-display: swap`、对应的 `unicode-range`。**unicode-range 写这一片实际包含的码位**（用子集化后字体的 cmap 生成，而不是照抄 Google 的范围），这样浏览器不会为不存在的字去下载。
- 文件头保留「由脚本生成，不要手改」的注释。
- 生成前清空 `public/fonts/` 里旧的 `noto-serif-sc-extralight-*.woff2`（本地文件；R2 上的旧文件先别删，见第 5 节）。
- 脚本最后打印：分片数、总字节、最大 / 最小单片。

### 3.3 预期结果（估算，以实测为准）

- 分片数约 100–120 片，单片几十到一两百 KB。
- 首页字体下载量从 11.6MB 降到约 0.3–0.6MB。

## 4. 应用代码改动

1. **去掉字体 preload**
   - `app/routes/($lang)._index.tsx`：删掉第 27 行的 import 和 `links` 里 `...fontPreloadHrefs(...)` 那一段。
   - 删除 `app/lib/font-preloads.ts`（确认没有别的引用：`grep -rn font-preloads app`）。
   - 理由：OpenAI 也不 preload 字体；首页现在 preload 的 8 片会和首屏大图抢带宽。有 `font-display: swap` + 尺寸校准过的后备字体，不 preload 也不会明显跳动。
2. **`app/styles/fonts-fallback.css`**：只更新顶部注释里引用的旧文件名（度量值是按同一款字体量的，不用改）。
3. **更新日志字体统一**：`app/components/home/changelog-section.tsx` 第 18 行 `<section>` 上删掉 `font-['Space_Grotesk',…]` 这一整段 class，让它继承 `--font-main`。实测日期和底部链接继承了 body 的字重 200，卡片标题写了 `font-normal`（400）；统一成全站的 200 即可，**删掉 `changelog-card.tsx` 里 `<p>` 的 `font-normal`**。改完后整个组件和全站一样是宋体 ExtraLight。
4. **不要动**：`theme.css` 的 `--font-main`、`GuestbookRadio.client.tsx` 自己的 `--gr-sans`（留言电台有独立设计，站长没要求改）、`cv.css`、`email.server.ts`。

## 5. 上线顺序（重要）

字体文件在 R2 上，代码靠 git push 自动部署（**不要手动跑 `npm run deploy`**）。顺序错了线上会 404 掉字体：

1. 本地跑 `npm run fonts:build`，检查输出。
2. 跑 `npx tsc --noEmit`、`npm run build`。
3. **先把新分片上传到 R2**，key 为 `fonts/<文件名>`：
   ```
   for f in public/fonts/noto-serif-sc-200-*.woff2; do
     npx wrangler r2 object put "gregorwang/fonts/$(basename "$f")" --file "$f" --content-type font/woff2 --remote
   done
   ```
   上传是对外操作，**执行前先跟站长确认**。上传后抽一个文件 `curl -I https://xn--cckl9nsb.com/fonts/<文件名>` 确认 200。
4. 提交并 `git push origin main`（站长说「提交部署」就是这个意思）。
5. 部署完成后，站长确认线上正常，再考虑删除 R2 上旧的 `fonts/noto-serif-sc-extralight-*.woff2`（老页面缓存期间可能还会引用，建议至少等一两天；删除也要先问）。

## 6. 验证

- **脚本层**：用 fontTools 读所有新分片的 cmap，确认 U+4E00–9FFF 的 20992 个字全部覆盖、没有字同时出现在两片里，latin / symbols / kana 也都在。
- **首页实际下载量**：用无头 Chromium 打开线上首页（或 `npm run dev` 的本地页），统计 `.woff2` 请求数和总字节。可以复用这个思路：监听 `page.on('response')`，筛 `.woff2`，累加 `content-length`。playwright-core 在 `%APPDATA%/npm/node_modules/@playwright/test/node_modules/playwright-core`。目标：首页明显低于 1MB。
- **渲染**：用 CDP `CSS.getPlatformFontsForNode` 抽查 Hero 标题、正文、更新日志卡片，实际渲染字体应该是 `Noto Serif CJK SC ExtraLight`（网络字体）。
- 站长的习惯：tsc / build 通过就可以提交，**不需要用 Playwright 逐页走查**，页面由站长自己看。上面的下载量统计是为了给出前后对比数字，跑一次即可。
- 部署后请站长跑一次 Lighthouse，和改动前对比。

## 7. 风险和注意

- **缓存**：一定要用新文件名，见第 2 节的关键约束。
- **本地开发**：`public/fonts/` 在本地 dev 时会被 Vite 直接提供，所以本地能看到效果不代表 R2 上已经有文件。
- **日文页**：kana 分片和汉字分片照常工作，日文页显示行为和现在一致（仍是简体中文字形，这是已知问题，不在本次范围）。
- **字频来源的授权**：只用 Google CSS 里的 unicode-range 分组信息，不下载 Google 托管的字体文件。

## 8. 用什么模型执行

- **Sonnet 足够**。任务边界清楚、文件位置都已写明，主要工作是改一个 Python 脚本、删一段 preload、改两处 class、跑验证。
- **不建议 Haiku**：解析 Google CSS、处理分片之间的码位去重、按 cmap 生成 unicode-range，这几步容易出细节错误；R2 上传顺序也需要判断。
- 如果 Sonnet 在第 3.1 节拿不到 Google CSS，或者覆盖率校验不通过，再切到 Opus 处理。

---

## 9. 实施记录（2026-10-15）与方案的偏差

实际做法和上面的方案有几处不同，以本节为准。

| 项 | 方案 | 实际 |
|---|---|---|
| Google 分片序号 | CSS 里有 `/* [N] */` 注释，第一片最常用 | 没有注释，序号在 URL 的 `.N.woff2` 里；**N 越大越常用**（119 片装的是「的、一」），脚本按 N 降序取，存入 `scripts/data/noto-serif-sc-slices.json`（97 条，下标 0 = 最常用） |
| Google 覆盖范围 | 应覆盖 U+4E00–9FFF 全部 20992 字 | 只覆盖 12258 字，剩余 8734 个生僻字**按码位顺序每 400 字一片**补在最后（不合成一片，免得一个生僻字拖来几 MB） |
| 基础三片文件名 | 未提 | 也改成带 hash 的新名 `noto-serif-sc-200-latin-<hash>.woff2` 等，方便 `noto-serif-sc-200-*` 一次上传 |
| 首页下载量 | 预估 0.3–0.6MB | 只用 Google 字频片实测 30 个文件 / 2.81MB，没达标，原因见下 |

### 为什么只用 Google 字频片不够

Google 按全网用字分组，一个页面的 700 个汉字会散落在约 30 个片里；而且每个字在 ExtraLight 里约 400 字节，其中近一半是 `--layout-features=*` 带进来的 GSUB/GPOS。于是追加了两项扩展：

1. **站点核心字层**：`scripts/collect-site-chars.mjs` 用无头浏览器逐页收集实际渲染的汉字，写入 `scripts/data/site-core-chars.json`，分 `zh-home` / `zh-site` / `ja-site` 三层，排在 Google 字频片之前，一个字只属于最先需要它的那层。核心层之外的字（用户留言、新文案）仍落到 Google 字频片，不会缺字。
2. **CJK 片去掉 layout features**：`CJK_SUBSET_FLAGS` 对汉字片用 `--layout-features=`（latin / symbols / kana 三个基础片仍是 `*`）。站里没有竖排、没有 `font-feature-settings`，日文页本来就共用简体字形。若以后需要，改回 `*` 即可。

### 采集器踩过的坑（改文案后重跑时要注意）

- 首页有轮播 / 打字机文案，一次快照会漏字，所以多次采样并用 MutationObserver 抓瞬时文字。
- 不能用 `textContent`：它会把 `<style>` / `<script>` 里的中文注释算进去。现在只统计 `checkVisibility()` 为真的文本节点。
- `<textarea placeholder>` 会渲染但不是文本节点，要单独统计。漏一个字就会多拖一整层（实测 +260KB）。
- 懒加载区块（留言电台）要在视口里停留一会儿才挂载，滚动不能太快。
- 需要 dev server 在跑（默认 `http://localhost:3000`）；构建本身 `npm run fonts:build` 不依赖浏览器和网络。

### 实测结果（本地 dev server，无缓存，Chromium 1440×900）

| 页面 | 文件数 | 总字节 |
|---|---|---|
| 改前首页 | 24 | 11,593,784 |
| 首页 | 4 | 411,750 |
| 其它中文页 | 4–5 | 约 0.47–0.56MB |
| 日文页 `/ja` | 6 | 677,506 |

全库 112 片、7,612,344 字节，U+4E00–9FFF 20992 字全部覆盖、无重复。CDP `getPlatformFontsForNode` 确认 h1 / 正文 / 区块标题渲染的都是 `Noto Serif CJK SC ExtraLight`（网络字体）。线上数字待部署后另测。
