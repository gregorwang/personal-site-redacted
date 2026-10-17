import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const vite = await createServer({
  root: projectRoot,
  configFile: false,
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true },
  plugins: [tsconfigPaths()],
  server: { hmr: false, middlewareMode: true, ws: false },
});

after(async () => {
  await vite.close();
});

const { pickLocaleFromAcceptLanguage } = await vite.ssrLoadModule("/app/lib/i18n.ts");
const { resolveLocale } = await vite.ssrLoadModule("/app/lib/i18n.server.ts");

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

function request(path, { acceptLanguage, cookie, userAgent = CHROME_UA, method = "GET" } = {}) {
  const headers = new Headers({ "User-Agent": userAgent });
  if (acceptLanguage) headers.set("Accept-Language", acceptLanguage);
  if (cookie) headers.set("Cookie", cookie);
  return new Request(`https://example.com${path}`, { method, headers });
}

/** 返回跳转地址；不跳返回 null。 */
function redirectOf(req, lang) {
  try {
    resolveLocale(req, lang);
    return null;
  } catch (thrown) {
    assert.ok(thrown instanceof Response, "resolveLocale 应该抛 Response");
    assert.equal(thrown.status, 302);
    assert.equal(thrown.headers.get("Cache-Control"), "private, no-store");
    return thrown.headers.get("Location");
  }
}

describe("pickLocaleFromAcceptLanguage", () => {
  it("中文跳中文、日文跳日文、英文跳英文", () => {
    assert.equal(pickLocaleFromAcceptLanguage("zh-CN,zh;q=0.9"), "zh");
    assert.equal(pickLocaleFromAcceptLanguage("zh-TW"), "zh");
    assert.equal(pickLocaleFromAcceptLanguage("ja-JP,ja;q=0.9,en;q=0.8"), "ja");
    assert.equal(pickLocaleFromAcceptLanguage("en-US,en;q=0.9"), "en");
  });

  it("其它任何语言一律英文", () => {
    assert.equal(pickLocaleFromAcceptLanguage("ko-KR,ko;q=0.9"), "en");
    assert.equal(pickLocaleFromAcceptLanguage("fr-FR"), "en");
  });

  it("按 q 值排序，不按书写顺序", () => {
    assert.equal(pickLocaleFromAcceptLanguage("en;q=0.5,ja;q=0.9"), "ja");
  });

  it("没有请求头或只有 * 时不判断", () => {
    assert.equal(pickLocaleFromAcceptLanguage(null), null);
    assert.equal(pickLocaleFromAcceptLanguage(""), null);
    assert.equal(pickLocaleFromAcceptLanguage("*"), null);
  });
});

describe("无前缀地址的语言跳转", () => {
  it("日文浏览器打开首页和深链接跳 /ja，保留 query", () => {
    assert.equal(redirectOf(request("/", { acceptLanguage: "ja-JP" })), "/ja");
    assert.equal(redirectOf(request("/cv?tab=1", { acceptLanguage: "ja-JP" })), "/ja/cv?tab=1");
  });

  it("客户端导航的 _routes 参数不带进跳转地址", () => {
    assert.equal(redirectOf(request("/cv?_routes=root,routes%2F(%24lang).cv", { cookie: "locale=ja" })), "/ja/cv");
  });

  it("韩文浏览器跳 /en", () => {
    assert.equal(redirectOf(request("/gallery", { acceptLanguage: "ko-KR" })), "/en/gallery");
  });

  it("中文浏览器不跳", () => {
    assert.equal(redirectOf(request("/", { acceptLanguage: "zh-CN" })), null);
  });

  it("手动选过的语言优先于浏览器语言", () => {
    assert.equal(redirectOf(request("/", { acceptLanguage: "ja-JP", cookie: "theme=dark; locale=zh" })), null);
    assert.equal(redirectOf(request("/music", { acceptLanguage: "zh-CN", cookie: "locale=en" })), "/en/music");
  });

  it("cookie 值不合法时当作没选过", () => {
    assert.equal(redirectOf(request("/", { acceptLanguage: "ja-JP", cookie: "locale=fr" })), "/ja");
  });

  it("带前缀的地址一律尊重，不跳", () => {
    assert.equal(redirectOf(request("/ja", { acceptLanguage: "zh-CN", cookie: "locale=en" }), "ja"), null);
  });

  it("爬虫、没带 Accept-Language 的请求、非 GET 请求不跳", () => {
    assert.equal(
      redirectOf(request("/", { acceptLanguage: "en-US", userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" })),
      null,
    );
    assert.equal(redirectOf(request("/")), null);
    assert.equal(redirectOf(request("/messages", { acceptLanguage: "ja-JP", method: "POST" })), null);
  });

  it("/auth 不在 ($lang) 段下，不跳", () => {
    assert.equal(redirectOf(request("/auth", { acceptLanguage: "ja-JP" })), null);
  });
});
