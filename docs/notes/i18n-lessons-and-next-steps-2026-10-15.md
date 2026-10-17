# 多语言：经验教训、背景知识与下一步（自动识别语言） · 2026-10-15

> 接着 `docs/notes/i18n-handoff-2026-10-14.md`。中 / 日 / 英迁移已完成并上线（`c0f917b`、`5fc0a90`）。
> 这份文档给下一阶段用：先把这套多语言是怎么搭的、踩过什么坑讲清楚，再整理「像 OpenAI 那样自动识别语言」要做什么。

---

## 1. 现在这套是怎么搭的（一张图）

```
请求 /ja/cv
  → app/routes/($lang).cv.tsx          ($lang) 是可选段：/cv 和 /ja/cv 都进这个路由
  → root loader: resolveLocale()       /zh/* 301 去前缀；非法前缀 404；返回 locale + 当前语言整本词典
  → <IntlProvider> 在 root Layout       语言从 URL 推（错误页拿不到 loader 数据也能对）
  → 页面 loader: getRouteLocale(params) 取语言；长内容用 localized()/localizedById() 盖覆盖层
  → meta: getMetaIntl(matches)          meta 里不能用 hooks，从 root 数据造 intl
  → <Link>（LocaleLink）               站内链接自动带 /ja、/en 前缀
  → root Layout 输出 <html lang> 和 hreflang（只对 TRANSLATED_PATHS 里的页面）
```

| 文件 | 作用 |
|---|---|
| `app/lib/i18n.ts` | 语言列表、`localizePath` / `stripLocale`、`TRANSLATED_PATHS` |
| `app/lib/i18n.server.ts` | `resolveLocale`、`getRouteLocale`、`getServerIntl`（loader / action 里出文案） |
| `app/components/common/LocaleLink.tsx` | `Link`、`useLocale()` |
| `app/locales/{zh,ja,en}.json` | `zh.json` 是抽取结果（别手改），`ja` / `en` 是翻译 |
| `app/lib/localized-content.ts` | 覆盖层：`localized`（按字段 / 下标）、`localizedById`（按 id） |
| `app/data/i18n/*.ts` | 覆盖层数据：游戏、简历、更新日志 |
| `app/components/ui/LanguageSwitcher.tsx` | Header 里的语言切换 |
| `scripts/i18n-check.mjs` | 列缺失 / 过期翻译，`-- --strict` 可进 CI |

日常流程：写代码时只写中文 `defaultMessage` → `npm run i18n:extract` → `npm run i18n:check` → 缺的交给 Haiku 子代理翻 → 合进 `ja.json` / `en.json`。

---

## 2. 背景知识（下次不用再查）

- **消息 ID 是内容哈希**（`[sha512:contenthash:base64:6]`）。改了中文原文，ID 就变了，旧翻译变成 stale，新的变成 missing。改原文 = 要重翻。`description` 不参与哈希，可以随便改。
- **ICU 语法**：占位 `{count}`；复数 `{count, plural, one {# update} other {# updates}}`（中文不用写复数，英文译文里可以加）；分支 `{expanded, select, true {…} other {…}}`。
- **富文本**用标签：`"请检查 <email>{address}</email> 的收件箱"` + `values={{ email: (chunks) => <span>…</span> }}`。换行用 `<br></br>` + `values={{ br: () => <br /> }}`，自闭合的 `<br/>` 不行。
- **两类文案两种放法**：界面短句进词典；长内容（简历、日志、评价、演示对话）用覆盖层，中文原文留在 `app/data`，日 / 英只写要翻的字段，没写的回落中文。会在头部插新条目的列表一律用 `localizedById`，不用下标。
- **服务端出文案**：loader / action 里用 `getServerIntl(getRouteLocale(params))`；共享的服务端函数需要文案时把 `intl` 当参数传进去（例：`createPendingMessage(…, intl, …)`）。
- **缓存**：不同语言是不同 URL，所以 `public` 缓存没问题。**一旦响应内容取决于 cookie / 请求头，就不能再无脑 public**，见第 4 节。

---

## 3. 这次踩的坑（经验教训）

### 3.1 漏翻的来源
- **数据数组和 props 里的纯字符串**扫不出来。`donghua.tsx` 卡片的 `description: "…"` 不是 `defaultMessage`，所以 extract 和 check 都看不见，上线后才发现。
  - 兜底检查：在组件目录里 grep 中文，排除注释、`defaultMessage`、`description` 后人工过一遍：
    `rg -n "[一-鿿]" app/components app/routes | rg -v "defaultMessage|description|//|/\*"`
- **服务端返回的中文**不会走词典：Better Auth 的限流文案、留言 action 的错误、Nemesis SSE 状态和错误。三种处理办法，按情况选：
  1. 服务端文案是固定格式时，前端只解析数字（例：`请等待 (\d+) 秒`），提示按当前语言重新渲染。
  2. 能改服务端的，把语言带过去：表单提交到 `localizePath("/messages", locale)`，action 里用 `getServerIntl`。
  3. 改不动或不值得改的（Nemesis 服务端），中文页照原样显示，日 / 英页换成本地化通用文案（`describeError`、`NemesisThinkingBubble` 的 `useServerLabel`）。
- **存进 localStorage 的东西别存译好的文案**：会话标题原来存「新的对话」，换语言就不对了。现在存空字符串，显示时再按语言补。

### 3.2 写法上的坑
- `localized()` / `localizedById()` 的泛型会从覆盖层推断，推窄后报类型错。调用时显式写泛型：`localized<CvProfile>(…)`、`localizedById<UpdateLog, "id">(…)`。
- 组件里先 `if (…) return` 再 `useIntl()` 违反 hooks 规则。`useIntl()` 放在最前面。
- **命令式代码**（收音机 canvas 引擎）拿不到 React context。文案做成 `labels` 对象从组件传进去，`useMemo` 依赖 `intl`。
- **美术元素不能直接翻**：收音机 88.0 的开场句受两个约束，一是最多 16 个字符（一格的宽度），二是要定住的字按下标指定，所以按语言写死在 `RADIO_OPENING`，不进词典。竖排古诗、噪声词表、隐藏电台保留中文。
- **名台词别从中文回译**：动画台词要用原作日文和官方英文（Fate「体は剣で出来ている」/ "I am the bone of my sword"）。Haiku 背不准，不确定出处的要标出来让站长判断。
- **按中文名查表会在翻译后失效**（游戏大图那次）。按 id 或顺序查。
- 不在 `($lang)` 下的路由（`/auth`、`/api/*`）始终中文。`returnTo` 要带上语言前缀，登录完才会回到原来的语言。

### 3.3 翻译流程
- Haiku 子代理每批约 120 条，`{id: {zh, note}}` 进，`{id: 译文}` 出。并行 8 批，几分钟就能翻完。
- 合并前用脚本校验：id 一一对应、`{占位符}` 一致、`<标签>` 一致、数组长度一致、标题 emoji 保留、英文里没有残留中文。
- 人工抽查重点：作品官方译名（这次修了 アカメが斬る！、千歳くんはラムネ瓶のなか、Ling Cage、Ghost of Yōtei）、语气、名台词。
- `description` 写清楚语境（是谁说的、在哪显示），对翻译质量帮助很大。

### 3.4 工具和环境
- **在 Bash 里用 heredoc 塞大段 Python 会因为引号嵌套炸掉**。大段补丁先写成 `.py` 文件（scratchpad）再执行。
- **`build/client` EBUSY**：
  - 一个原因是 dev server 留下了孤儿进程。停掉后台任务只会结束外层 shell，`node … vite:dev` 和 `workerd` 还活着，要按 PID 一并结束。
  - 另一个原因是某个子目录的句柄被编辑器的文件监视或杀毒、索引服务占着（文件本身没锁，目录能改名）。办法是不杀进程，把 `build/client` 改名挪开再 build。
- **验证分工**：tsc + 测试 + build 通过就提交，浏览器逐页检查由站长手动做，别用 Playwright 逐页走（太费 token）。

---

## 4. 下一步：自动识别语言（像 OpenAI 那样）

### 4.1 OpenAI 已知的做法
（来源：`docs/reference/openai-site-teardown-2026-10-13.md` 第 4 节，2026-10-14 实测）
- 英文无前缀，其它语言 `/zh-Hans-CN/…` 前缀。
- 不带 cookie 访问 `https://openai.com/`，带 `Accept-Language: ja-JP / zh-CN / en-US` 都是 **200，服务端不重定向**。
- 服务端根据 `Accept-Language` 算出首选语言写进 cookie：`locale={"computedPreferredLocale":"ja-JP","v":1}`；按 IP 写 `country`。依据是浏览器语言 + IP，不是时区。

> **2026-10-15 已用 Playwright 有头浏览器测清楚，下面 4.1 / 4.2 的猜测作废**：OpenAI 是服务端按 `Accept-Language` 对所有无前缀 URL 做 302，跟 cookie 无关；手动选过的语言存在 cookie 的 `explicitlyOverriddenLocale` 字段，优先级更高；带前缀的 URL 从不跳。完整矩阵见 teardown 文档第 4 节。

> **2026-10-15 已实现**（`resolveLocale` → `redirectToPreferredLocale`，测试 `test/locale-redirect.test.mjs`）：无前缀地址按「cookie `locale` 手动选择 > Accept-Language」302；中文不跳，日文 → `/ja`，其它任何语言 → `/en`；爬虫 / 无 Accept-Language / 非 GET / `/auth` 不跳；302 是 `private, no-store`，无前缀页面加 `Vary: Accept-Language, Cookie`。以后加韩文、法文等，只要在 `pickLocaleFromAcceptLanguage` 里加映射。

### 4.2 站长观察到的现象和待验证的猜测
- 现象：站长每次进 openai.com 都是中文。
- 猜测（**未验证**）：第一次选过中文后，cookie 里记住了选择；之后访问无前缀的 `/`，要么服务端读 cookie 302 到 `/zh-Hans-CN/`，要么前端读 cookie 后客户端跳转。
- 2026-10-15 再用 curl 测，openai.com 对 curl 直接 403（Cloudflare 拦截），**只能在真实浏览器里验证**。步骤：
  1. 无痕窗口 → DevTools Network 勾「Preserve log」→ 打开 `https://openai.com/`，看首个文档请求是 200 还是 30x、有没有 `Location`，以及响应里的 `Set-Cookie: locale=…`。
  2. 用语言切换器选中文，看 cookie `locale` 的值有没有变（会不会多出「用户手动选择」之类的字段）。
  3. 关掉页面重新打开 `https://openai.com/`：是服务端 30x，还是先 200 再前端跳转（看 Network 里有没有第二个文档请求，以及 Initiator 是不是脚本）。
  4. 把 Chrome 语言改成日语，清 cookie 再来一遍，看首次访问会不会弹提示或预选语言。
  - 遇到人机验证就请站长手动点。

### 4.3 本站落地时必须先想清楚的点
1. **只对「无前缀的首页」做自动处理**，带 `/ja`、`/en` 前缀或深链接的一律尊重 URL，不跳。
2. **区分「算出来的首选语言」和「用户手动选的语言」**：
   - 手动选的存 cookie（LanguageSwitcher 点击时写），优先级最高。
   - 只靠 `Accept-Language` 算出来的，不强制跳，最多给一条不打扰的提示：「このページは日本語でもご覧いただけます」。
3. **爬虫不能跳**：搜索引擎抓 `/` 必须拿到中文 200，否则 hreflang 和 x-default 会乱。重定向只针对带 cookie 的人。
4. **缓存是最大的坑**：
   - 首页 loader 现在返回 `public, max-age=60, s-maxage=300`。如果 root loader 根据 cookie 决定是否 302，这个 302 或 200 可能被共享缓存给错误的人。
   - Cloudflare 边缘缓存基本不按 `Vary: Cookie` 区分。
   - 安全的做法二选一：
     - 带语言 cookie 的请求才在 loader 里判断，并且这类响应设 `private, no-store`；
     - 或者完全不做服务端跳转，客户端读 cookie 后 `navigate()`，缺点是会闪一下。
   - 动手前先确认当前 HTML 实际有没有被边缘缓存（看响应头 `cf-cache-status`）。
5. **cookie 设计**：参照 OpenAI，`locale={"preferred":"ja","source":"user"|"accept-language","v":1}`，`Path=/`，`SameSite=Lax`，有效期一年。`source` 用来区分手动选择和自动推断。
6. **LanguageSwitcher** 已经在 Header 里，只要在切换时顺手写 cookie。
7. 页脚不动（站长的安排）。

### 4.4 建议的实现顺序
1. 先在浏览器里把 4.2 的行为测清楚，结论补进 teardown 文档第 4 节。
2. 切换语言时写 `locale` cookie（纯客户端，零风险）。
3. 首页按 `Accept-Language` 算首选语言；跟当前语言不同、且用户没手动选过时，显示一条可关闭的提示，关闭也记进 cookie。
4. 最后再决定要不要对「手动选过语言、访问无前缀首页」的用户做跳转。如果要做，按 4.3 第 4 条处理缓存。

---

## 5. 其它待办
- sitemap 加 `/ja`、`/en` 的子页面，并在 sitemap 里写 `xhtml:link` hreflang。
- 「心に残る言葉」里出处不确定的台词（海的那边是敌人等）请站长确认原台词。
- 把 `npm run i18n:check -- --strict` 加进 CI，防止以后新增文案忘了翻。
