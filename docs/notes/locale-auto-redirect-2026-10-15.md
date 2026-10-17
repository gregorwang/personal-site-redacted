# 按浏览器语言自动跳转：原理与排查手册 · 2026-10-15

> 提交 `a7e94d6`。行为参照 openai.com 实测（`docs/reference/openai-site-teardown-2026-10-13.md` 第 4 节）。
> 多语言整体结构见 `docs/notes/i18n-lessons-and-next-steps-2026-10-15.md`。

## 1. 一句话

**不带语言前缀的地址**，服务端按「手动选择的 cookie > 浏览器 `Accept-Language`」决定语言：中文留下（200），日文 302 到 `/ja/...`，其它任何语言 302 到 `/en/...`。带前缀的地址从不跳。

## 2. 判定流程

```
GET /cv?x=1
  → root loader → resolveLocale(request, params.lang)
      params.lang 有值（/ja/cv）           → 不跳，按 URL
      params.lang 为空 → redirectToPreferredLocale(request)
          非 GET/HEAD                       → 不跳
          /auth、/api/*、/sitemap.xml        → 不跳（isUnprefixedPath）
          getPreferredLocale(request)：
            cookie locale=zh|ja|en          → 用它（手动选择，优先级最高）
            isbot(User-Agent)               → null，不跳
            pickLocaleFromAcceptLanguage()  → 按 q 值取第一个语言：zh*→zh，ja*→ja，其它→en；没有请求头 / 只有 * → null
          结果是 null 或 zh                  → 不跳，中文 200
          否则 302 → localizePath(path, locale) + query（去掉 _routes）
```

| 文件 | 内容 |
|---|---|
| `app/lib/i18n.ts` | `pickLocaleFromAcceptLanguage`、`LOCALE_COOKIE`、`isUnprefixedPath` |
| `app/lib/i18n.server.ts` | `getPreferredLocale`、`redirectToPreferredLocale`（在 `resolveLocale` 里调用） |
| `app/components/ui/LanguageSwitcher.tsx` | 点击时 `rememberLocale()` 写 cookie |
| `app/entry.server.tsx` | 无前缀页面加 `Vary: Accept-Language, Cookie` |
| `test/locale-redirect.test.mjs` | 所有规则的测试，改规则先改这里 |

## 3. 背景知识

- **Accept-Language** 是浏览器按系统 / 浏览器语言设置自动发的请求头，例如 `ja-JP,ja;q=0.9,en;q=0.8`。新浏览器、无痕窗口一样会发，所以不依赖 cookie 也能识别。服务端拿不到时区，也不用 IP。
- **cookie `locale`** 只在点语言切换器时由前端写入（`Path=/; Max-Age=一年; SameSite=Lax`，https 下加 `Secure`），值只能是 `zh` / `ja` / `en`，其它值当作没选过。不是 HttpOnly，前端可读写。服务端从不写这个 cookie。
- 切换器的 `onClick` 在 Remix 导航前执行，所以紧接着的数据请求已经带上新 cookie。如果以后换成别的切换方式（按钮 + `navigate()`），**必须先写 cookie 再导航**，否则会被旧偏好跳回去。
- **single fetch**：客户端导航时请求的是 `/cv.data?_routes=…`，Remix 会去掉 `.data` 再交给 loader，但 `_routes` 参数还在 query 里，所以跳转地址要删掉它。
- **爬虫**：Googlebot 一般不发 Accept-Language，加上 `isbot` 双保险，爬虫永远拿到中文 200，hreflang / x-default 不乱。
- **缓存**：
  - 302 响应：`Cache-Control: private, no-store`，不会被缓存。
  - 无前缀的 200 页面仍是 `public, max-age=60`，但带 `Vary: Accept-Language, Cookie`，浏览器换了 cookie 就不会复用旧缓存。
  - HTML 目前没进 Cloudflare 边缘缓存（响应里没有 `cf-cache-status`）。**如果以后给 HTML 开边缘缓存（Cache Rules / Cache API），这套跳转会出问题**：CF 不按 Cookie 区分缓存，中文 200 可能被发给日文访客，或者反过来。到时要么无前缀页面绕过边缘缓存，要么改成客户端跳转。

## 4. 常见问题排查

| 现象 | 先查什么 |
|---|---|
| 「我是中文浏览器，却总被跳到英文 / 日文」 | DevTools → Application → Cookies 看 `locale`。以前点过切换器就会被记住，点一下「中」即可改回 |
| 「点了切换器，下次打开还是原来的语言」 | 点击后 cookie `locale` 有没有变（本地 http 不加 `Secure`，线上 https 加）；是不是被浏览器缓存的旧页面（看 Network 里是不是 `from disk cache`） |
| 跳转地址里出现奇怪参数 | single fetch 又加了新的内部参数，像 `_routes` 一样在 `redirectToPreferredLocale` 里删掉 |
| 某个新页面不该跳却跳了 | 路由不在 `($lang)` 下就把路径加进 `i18n.ts` 的 `UNPREFIXED_PATHS` |
| 跳转死循环 | 不应该出现：跳转目标都带前缀，带前缀不会再跳。出现了先看 `localizePath` 对该路径是否真的加了前缀 |
| 搜索引擎收录了 `/en` 而不是 `/` | 看爬虫 UA 是否被 `isbot` 识别；Search Console 看抓取 `/` 时的状态码 |

命令行复现（把域名换成线上或 `http://localhost:4000`）：

```bash
# 日文浏览器 → 302 /ja
curl -s -o /dev/null -D - -A "Mozilla/5.0 Chrome/146" -H "Accept-Language: ja-JP" https://xn--cckl9nsb.com/
# 手动选过中文 → 200
curl -s -o /dev/null -D - -A "Mozilla/5.0 Chrome/146" -H "Accept-Language: ja-JP" -H "Cookie: locale=zh" https://xn--cckl9nsb.com/
# 爬虫 → 200
curl -s -o /dev/null -D - -A "Googlebot/2.1" -H "Accept-Language: ja-JP" https://xn--cckl9nsb.com/
```

浏览器里测：Chrome 设置 → 语言，把日语拖到第一位（或用 DevTools → Sensors 改 locale），删掉 `locale` cookie，开无痕窗口访问 `/`。

## 5. 以后要改的地方

- **加新语言（韩文、法文…）**：`LOCALES` 加一项 → 词典和覆盖层 → `pickLocaleFromAcceptLanguage` 加 `if (primary === "ko") return "ko";` → 测试里把「韩文跳 /en」改成跳 `/ko`。
- **想区分简繁**（`zh-TW` 现在也算中文）：在 `pickLocaleFromAcceptLanguage` 里按完整 tag 判断。
- **想对日文访客改成「提示」而不是强制跳**：把 `redirectToPreferredLocale` 换成在 loader 数据里返回 `suggestedLocale`，前端显示可关闭的提示条。
