# 版权待办（2026-10-15）

> 状态：只是记录，暂不处理。站长明确要求：**先保留现有实现，不要拆、不要替换**。
> 对外说明：已写进 `terms-of-use-draft-2026-10-15.md` 的"致谢与灵感来源"。

## 待办 1：VideoPlayer 的 7 个图标来自 openai.com

- 位置：`app/components/ui/VideoPlayer.tsx` 的 `ICON_PATHS`
- 内容：`play`、`pause`、`speaker`、`speakerSlash`、`expand`、`collapse`、`ellipsis`
- 来源：从 openai.com 的 SVG sprite 里取出的 `<symbol>` path 原文（依据 `docs/reference/openai-site-teardown-2026-10-13.md` 第 2 节第 4 步）
- 风险：path 数据是对方文件原文，不是测量值。目前没有授权，只有站长自己的"可以借用"决定。
- 现状处理：保留；条款里有致谢和"权利人联系下架"条款兜底。
- 以后如果要处理：换成开源图标集的同类图标（Lucide ISC / Phosphor MIT），改动只在 `ICON_PATHS` 一个对象里。**需站长明确说"换"才动。**

## 已检查，无需处理

- `app/components/home/build-log/icons.tsx`：Claude / Codex / Cursor 图标是自绘通用图形，不是对方 logo。
- `app/styles/build-log.css` 与 `StageWindow.tsx`：颜色和定位为实测数值，非原文拷贝（未逐行对比过 cursor.com 原始 CSS）。
- OpenAI Sans 字体：已确认不能用，站内没有使用。
- 站内没有 OpenAI / Cursor 的 logo 或图片文件。

## 尚未检查

- 更新页（`app/data/updates.ts`、`changelog-card.tsx`）是否有从 Cursor changelog 拷贝的文案或资源。
- 赛博终端（`docs/design/cyber-terminal-lab-2026-10-15.html` 与对应组件）的参考来源，站长提到参考了 Cursor 一类终端界面。
- 歌词（`assets/lyrics`）、动漫 / 游戏图片的版权来源，条款第 5 节已写"权利人联系下架"。
- 站内各 npm 依赖的开源协议署名（若要写完整的致谢页）。
