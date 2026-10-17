请帮我排查并修复网站的 CLS 布局偏移问题。

背景：
项目是 Remix / React Router 前端，部署在 Cloudflare。
我最近做了中文字体分片方案：使用 Noto Serif SC / Source Han Serif 的 woff2 分片，通过 @font-face + unicode-range 加载。
正文应该继续使用系统字体，只有少量标题类元素使用 serif 中文字体。

当前 Lighthouse / PageSpeed 报告显示：
- CLS 总分约 0.984，非常严重
- 布局偏移元素主要是 main
- 触发原因和以下网络字体有关：
  - /fonts/noto-serif-sc-extralight-cjk-8a00-8dff.woff2
  - /fonts/noto-serif-sc-extralight-cjk-6600-69ff.woff2
- 说明字体加载完成后导致 main 重新排版、文字高度/宽度变化，引发布局偏移。

请不要直接盲目加 preload，而是按下面步骤排查：

1. 搜索全项目里的字体定义：
   - @font-face
   - font-family
   - font-display
   - unicode-range
   - noto-serif
   - source-han
   - hero-title
   - site-title
   - emotional-heading
   - legal-title

2. 找出哪些元素实际用了这个中文 serif 字体。
   重点检查是否错误地把 body、main、section、p、普通正文、按钮、导航也套用了 Noto Serif SC。
   要求：
   - body / main / 正文 / 导航 / 按钮必须使用系统字体：
     system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif
   - 只有标题类元素可以使用 serif 字体。

3. 检查 @font-face 是否导致字体加载后替换 fallback 引起 reflow。
   请评估以下修复：
   - 给 @font-face 增加或调整 font-display，优先考虑 font-display: optional；
   - 如果必须 swap，请用 size-adjust / ascent-override / descent-override / line-gap-override 让 fallback metrics 接近目标字体；
   - 不要让大段正文使用会异步加载的中文 webfont；
   - 不要让 main 的整体高度依赖 webfont 加载后的排版结果。

4. 检查标题区域是否没有固定高度或最小高度。
   对 hero、标题卡片、首页主区域等首屏模块：
   - 如果标题字体加载会改变高度，请设置合理的 min-height；
   - 避免字体加载后推动下面所有内容；
   - 对图片、装饰图、卡片也检查是否缺少 width / height / aspect-ratio。

5. 检查是否存在 JS hydration 后改变布局：
   - 首屏组件是否在 useEffect 后插入内容；
   - 登录状态、Q&A、公告、hero 文案、动态组件是否 hydration 后改变高度；
   - 如果有，需要预留空间或使用 skeleton / min-height。

6. 请输出：
   - 具体导致 CLS 的 CSS/组件文件路径；
   - 哪些选择器错误使用了网络中文字体；
   - 修改后的 CSS；
   - 是否需要 preload，理由是什么；
   - 修改前后如何验证 CLS 是否下降。

修复目标：
- CLS 降到 0.1 以下，最好 0.05 以下。
- 不牺牲网站整体视觉风格。
- 中文 serif 字体只用于少量标题，不用于正文。
- 字体加载失败或延迟时，页面布局也不能明显跳动。
请帮我排查并修复网站的 CLS 布局偏移问题。

背景：
项目是 Remix / React Router 前端，部署在 Cloudflare。
我最近做了中文字体分片方案：使用 Noto Serif SC / Source Han Serif 的 woff2 分片，通过 @font-face + unicode-range 加载。
正文应该继续使用系统字体，只有少量标题类元素使用 serif 中文字体。

当前 Lighthouse / PageSpeed 报告显示：
- CLS 总分约 0.984，非常严重
- 布局偏移元素主要是 main
- 触发原因和以下网络字体有关：
  - /fonts/noto-serif-sc-extralight-cjk-8a00-8dff.woff2
  - /fonts/noto-serif-sc-extralight-cjk-6600-69ff.woff2
- 说明字体加载完成后导致 main 重新排版、文字高度/宽度变化，引发布局偏移。

请不要直接盲目加 preload，而是按下面步骤排查：

1. 搜索全项目里的字体定义：
   - @font-face
   - font-family
   - font-display
   - unicode-range
   - noto-serif
   - source-han
   - hero-title
   - site-title
   - emotional-heading
   - legal-title

2. 找出哪些元素实际用了这个中文 serif 字体。
   重点检查是否错误地把 body、main、section、p、普通正文、按钮、导航也套用了 Noto Serif SC。
   要求：
   - body / main / 正文 / 导航 / 按钮必须使用系统字体：
     system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif
   - 只有标题类元素可以使用 serif 字体。

3. 检查 @font-face 是否导致字体加载后替换 fallback 引起 reflow。
   请评估以下修复：
   - 给 @font-face 增加或调整 font-display，优先考虑 font-display: optional；
   - 如果必须 swap，请用 size-adjust / ascent-override / descent-override / line-gap-override 让 fallback metrics 接近目标字体；
   - 不要让大段正文使用会异步加载的中文 webfont；
   - 不要让 main 的整体高度依赖 webfont 加载后的排版结果。

4. 检查标题区域是否没有固定高度或最小高度。
   对 hero、标题卡片、首页主区域等首屏模块：
   - 如果标题字体加载会改变高度，请设置合理的 min-height；
   - 避免字体加载后推动下面所有内容；
   - 对图片、装饰图、卡片也检查是否缺少 width / height / aspect-ratio。

5. 检查是否存在 JS hydration 后改变布局：
   - 首屏组件是否在 useEffect 后插入内容；
   - 登录状态、Q&A、公告、hero 文案、动态组件是否 hydration 后改变高度；
   - 如果有，需要预留空间或使用 skeleton / min-height。

6. 请输出：
   - 具体导致 CLS 的 CSS/组件文件路径；
   - 哪些选择器错误使用了网络中文字体；
   - 修改后的 CSS；
   - 是否需要 preload，理由是什么；
   - 修改前后如何验证 CLS 是否下降。

修复目标：
- CLS 降到 0.1 以下，最好 0.05 以下。
- 不牺牲网站整体视觉风格。
- 中文 serif 字体只用于少量标题，不用于正文。
- 字体加载失败或延迟时，页面布局也不能明显跳动。