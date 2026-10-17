# 移动端 OAuth 回调来源与 state 问题排查报告

日期：2026-05-30  
范围：生产环境 Google OAuth、Microsoft OAuth、Google One Tap、Better Auth、Cloudflare Workers

## 1. 先说结论

这次问题不是 Google Client ID、Microsoft Client ID、OAuth Provider、Better Auth、生产 callback 整体配置失效。

桌面端 Google 登录、Microsoft 登录、Google One Tap 都能跑通，已经证明生产主链路可用。真正异常点集中在移动端和 iPad：同一个生产环境下，移动设备可能使用了和桌面端不同的入口 origin，导致 OAuth 发起和 OAuth 回调不再落在同一个“站点身份”上。

修复方向是：OAuth 相关的 `baseURL` 不再跟随当前设备看到的 `window.location.origin` 或 `request.url` 变化，而是在生产环境统一固定到 canonical 站点 URL，也就是 `BETTER_AUTH_URL` / `APP_URL`。

## 2. 两个错误分别意味着什么

Google 的错误是：

```text
错误 400: redirect_uri_mismatch
```

这说明应用发给 Google 的授权 URL 里，`redirect_uri` 不在 Google Console 允许列表里。更具体地说，移动端生成的 `redirect_uri` 很可能和桌面端生成的不一样，例如：

```text
桌面端: https://xn--cckl9nsb.com/api/auth/callback/google
移动端: https://www.xn--cckl9nsb.com/api/auth/callback/google
移动端: https://エミリア.com/api/auth/callback/google
移动端: https://my-remix-worker.your-subdomain.workers.dev/api/auth/callback/google
```

只要协议、域名、端口、路径任意一处不同，Google 都会把它当成另一个 callback。

Microsoft 的错误是：

```text
Error Code: state_mismatch
```

OAuth 登录不是只看 callback URL。发起登录时，Better Auth 会生成一个 `state`，并用 cookie 或内部存储方式保存“这是我刚发起的一次登录”。回调回来时，Better Auth 要拿回同一个 `state` 来校验。

如果 state cookie 写在 A origin，但 Microsoft 回调回到 B origin，浏览器不会把 A origin 的 cookie 带给 B origin。Better Auth 就会认为“我找不到之前发出去的 state”，于是报 `state_mismatch`。

## 3. 为什么桌面端正常反而是关键证据

桌面端三条链路都正常：

- Google OAuth 正常
- Microsoft OAuth 正常
- Google One Tap 正常

这排除了大部分全局配置问题。比如如果 Client ID 错了，桌面端也应该失败；如果 Better Auth callback 路由整体不可用，桌面端 Microsoft 也应该失败；如果生产环境 OAuth Provider 完全不可用，Google One Tap 也不会正常。

所以更合理的模型是：

```text
桌面端入口 origin 稳定
  -> 生成的 OAuth redirect_uri 符合 provider 配置
  -> state cookie 写入和回调读取发生在同一站点
  -> 成功

移动端 / iPad 入口 origin 不稳定
  -> Google redirect_uri 变成另一个 origin
  -> Google 直接拒绝 redirect_uri_mismatch

移动端 / iPad 入口 origin 不稳定
  -> Microsoft 能回到应用
  -> 但 state cookie 不在回调 origin 下
  -> Better Auth 报 state_mismatch
```

## 4. 原来的链路里哪里容易出问题

### 4.1 客户端 Better Auth 以前依赖当前浏览器 origin

相关文件：[app/lib/auth-client.client.ts](../app/lib/auth-client.client.ts)

修复前，客户端 Better Auth 的 `baseURL` 是：

```ts
baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
```

这在单一域名访问时没问题。但如果移动端实际进入的是 `www`、中文域名 Unicode 形态、Punycode 形态、workers.dev，或者 Cloudflare 因 UA / 区域 / 协议做了不同重定向，那么 `window.location.origin` 就会变。

OAuth 发起端一旦使用这个动态 origin，授权 URL 里的 `redirect_uri` 就可能跟着变。

### 4.2 服务端 Better Auth 以前也会从 request.url 推断 baseURL

相关文件：[app/lib/auth.server.ts](../app/lib/auth.server.ts)

修复前，服务端 `createAuth(request)` 里会优先使用：

```ts
const requestOrigin = request ? new URL(request.url).origin : undefined;
const appUrl = requestOrigin || productionAppUrl;
```

这意味着只要生产请求打到不同 host，Better Auth 实例就可能把这个 host 当作自己的 `baseURL`。这个行为适合某些多域名架构，但对 OAuth callback 来说风险很高，因为 Provider 后台通常只允许少数固定 callback。

### 4.3 Microsoft 还有 workers.dev callback relay

Microsoft 配置里存在显式的 workers.dev callback：

```ts
MICROSOFT_REDIRECT_URI=https://my-remix-worker.your-subdomain.workers.dev/api/auth/callback/microsoft
```

代码里也有一个 relay，把 workers.dev callback 转回 canonical 站点：

```ts
return `${primaryURL.origin}${url.pathname}${url.search}`;
```

这个设计本身是为了兼容 Microsoft 后台 callback 限制。但如果 state cookie 写入的 origin 和最终处理 callback 的 origin 不一致，就仍然可能出现 `state_mismatch`。所以关键还是要让“发起 OAuth 的 Better Auth baseURL”和“最终处理 callback 的 Better Auth baseURL”保持一致。

## 5. 这次修复改了什么

### 5.1 客户端固定使用 APP_URL 作为 auth baseURL

相关实现：[app/lib/auth-client.client.ts](../app/lib/auth-client.client.ts)

现在客户端逻辑是：

```ts
const configuredAppUrl = typeof window !== "undefined" ? window.ENV?.APP_URL || "" : "";

function getClientAuthBaseURL() {
  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }

  if (configuredAppUrl) {
    return new URL(configuredAppUrl).origin;
  }

  return window.location.origin;
}
```

`APP_URL` 来自 root loader 注入的 `window.ENV`：

```ts
window.ENV = {
  GOOGLE_CLIENT_ID: "...",
  APP_URL: "https://xn--cckl9nsb.com"
}
```

对应位置：[app/root.tsx](../app/root.tsx)

这样做以后，即使用户当前在移动端看到的是另一个入口 origin，Better Auth client 发起 OAuth 时仍优先打到 canonical 站点。

效果是：

```text
移动端当前页面 origin != canonical APP_URL
  以前: OAuth baseURL = 移动端当前 origin
  现在: OAuth baseURL = canonical APP_URL
```

### 5.2 服务端生产环境固定 canonical baseURL

相关实现：[app/lib/auth.server.ts](../app/lib/auth.server.ts)

现在新增了统一入口：

```ts
function getProductionAppOrigin() {
  return normalizeOrigin(getEnvVar("BETTER_AUTH_URL")) || normalizeOrigin(getEnvVar("APP_URL")) || DEFAULT_PRODUCTION_APP_URL;
}

export function getAuthBaseURL(request?: Request) {
  const requestOrigin = request ? new URL(request.url).origin : undefined;
  if (requestOrigin?.startsWith(LOCAL_APP_URL)) {
    return LOCAL_APP_URL;
  }

  return getProductionAppOrigin();
}
```

含义是：

- 本地开发仍然允许 `http://localhost:3000`
- 生产环境不再按当前 request host 动态变动
- 生产环境统一使用 `BETTER_AUTH_URL` / `APP_URL`

Better Auth 初始化时使用这个稳定值：

```ts
const appUrl = getAuthBaseURL(request);

return betterAuth({
  baseURL: appUrl,
  trustedOrigins,
  ...
});
```

这让 Google 和 Microsoft 的 redirect/callback 生成逻辑有一个稳定基准。

### 5.3 trustedOrigins 保留当前请求 origin

修复不是简单拒绝所有非 canonical origin，而是把当前请求 origin 也加入 `trustedOrigins`：

```ts
const trustedOrigins = [
  appUrl,
  productionAppUrl,
  requestOrigin,
  normalizeOrigin(getEnvVar("APP_URL")),
  normalizeOrigin(getEnvVar("BETTER_AUTH_URL")),
  normalizeOrigin(getEnvVar("MICROSOFT_AUTH_BASE_URL")),
  new URL(microsoftWorkerRedirectURI).origin,
  LOCAL_APP_URL,
]
```

这样做的目的是：生产 OAuth 的“身份基准”固定到 canonical URL，但仍允许 Cloudflare、workers.dev、中间跳转或非 canonical 入口通过 Better Auth 的 origin 校验。

可以理解成：

```text
baseURL: 我是谁，用哪个地址生成 OAuth callback
trustedOrigins: 哪些入口请求我愿意接受
```

这两个概念不能混用。之前的问题就是“我是谁”被移动端当前入口影响了。

## 6. 新增诊断日志怎么看

相关实现：[app/routes/api.auth.$.ts](../app/routes/api.auth.$.ts)

现在只对 OAuth 发起和 callback 记录 `AuthDebug` 日志：

- `/api/auth/sign-in/social`
- `/api/auth/callback/google`
- `/api/auth/callback/microsoft`

请求日志会记录：

```ts
{
  path,
  method,
  origin,
  authBaseURL,
  headers: {
    host,
    forwardedHost,
    forwardedProto,
    cfVisitor,
    origin,
    referer,
    userAgent
  },
  signIn: {
    provider,
    callbackURL
  },
  callback: {
    provider,
    hasCode,
    hasState,
    hasStateCookie
  }
}
```

响应日志会记录：

```ts
{
  path,
  status,
  setCookieNames,
  oauthRedirect: {
    origin,
    pathname,
    redirectURI,
    clientIdSuffix
  }
}
```

其中敏感字段已经做了控制：

- 不打印 OAuth `code`
- 不打印 OAuth `state`
- 不打印 access token / refresh token / id token
- 不打印 client secret
- `client_id` 只打印末尾一小段用于对照

## 7. 用日志对比桌面端和移动端

真正要看的不是“有没有报错”，而是桌面端和移动端的同一阶段字段是否一致。

### 7.1 Google sign-in 阶段

看 `/api/auth/sign-in/social` 的 response：

```text
oauthRedirect.redirectURI
oauthRedirect.origin
```

期望桌面端和移动端一致，例如都为：

```text
https://xn--cckl9nsb.com/api/auth/callback/google
```

如果移动端还是出现 `www`、中文 Unicode 域名、workers.dev、http，就说明还有某处在绕过 canonical baseURL。

### 7.2 Microsoft sign-in 阶段

看 Microsoft 授权 URL 的：

```text
oauthRedirect.redirectURI
```

它可能仍然是配置中的 workers.dev callback，这是当前设计允许的：

```text
https://my-remix-worker.your-subdomain.workers.dev/api/auth/callback/microsoft
```

重点是 state cookie 是否在发起阶段被设置，以及 callback 是否能带回来。

### 7.3 Microsoft callback 阶段

看 `/api/auth/callback/microsoft` 的 request：

```text
callback.hasState = true
callback.hasStateCookie = true
origin == authBaseURL 或经过 relay 后能回到 authBaseURL
```

如果 `hasState = true` 但 `hasStateCookie = false`，就是浏览器没有把 Better Auth 写入的 state cookie 带回 callback。此时继续看：

```text
headers.host
headers.referer
headers.forwardedHost
headers.forwardedProto
origin
authBaseURL
setCookieNames
```

这些字段可以判断 cookie 是不是写到了另一个 host，或者中间有没有发生跨域跳转。

## 8. 为什么 Google One Tap 正常不矛盾

Google One Tap 和普通 Google OAuth 的入口形态不同。

当前 One Tap 配置使用 `uxMode: "popup"`，并且组件里有一层保护：

```ts
if (new URL(appUrl).origin !== window.location.origin) return;
```

这意味着 One Tap 只有在当前页面 origin 和 `APP_URL` 一致时才尝试运行。桌面端正常说明 canonical origin 下 One Tap 没问题，但它不能证明移动端普通 Google OAuth 也一定生成了同一个 `redirect_uri`。

所以这两个现象并不冲突：

```text
桌面端 One Tap 正常
移动端普通 Google OAuth redirect_uri_mismatch
```

它们反而支持同一个判断：canonical origin 下正常，非 canonical 或移动端特殊入口下出错。

## 9. 仍需观察的外部因素

这次代码修复了应用内部最主要的不稳定点，但生产环境还应该继续观察这些外部因素：

- Cloudflare 是否对移动 UA、iPad、WebView、区域、协议做了不同跳转
- 是否存在 `www` 和非 `www` 混用
- 是否存在中文域名 Unicode 和 Punycode 混用
- 是否存在 `http` 到 `https` 的中间跳转
- 是否有人从 workers.dev 域名直接打开站点
- 移动浏览器是否禁用第三方 cookie 或在 WebView 中限制 cookie
- Microsoft callback relay 是否导致 cookie domain 与最终处理 origin 不一致

如果修复后 Google 正常但 Microsoft 仍偶发 `state_mismatch`，优先看 AuthDebug 中：

```text
hasStateCookie
setCookieNames
origin
authBaseURL
host
referer
```

这几个字段足够判断是 cookie 没写入、没带回，还是 callback 被转到了另一个 origin。

## 10. 验证结果

本次修复后已完成：

```text
npm run typecheck
npx eslint app/data/updates.ts app/lib/auth-client.client.ts app/lib/auth.server.ts app/routes/api.auth.$.ts
npm run build
```

构建第一次遇到 Windows 上已知的 `EBUSY: resource busy or locked, rmdir 'build/client'`，按仓库说明确认目标路径在本仓库内后清理 stale build 输出，重跑构建通过。

## 11. 生产排查建议

部署后建议按这个顺序验证：

1. 桌面端 Google OAuth，确认仍正常。
2. 桌面端 Microsoft OAuth，确认仍正常。
3. 移动端 Google OAuth，观察 Google 授权 URL 中的 `redirect_uri` 是否和桌面端一致。
4. 移动端 Microsoft OAuth，观察 callback 日志里 `hasStateCookie` 是否为 `true`。
5. iPad Safari 单独验证一次，因为 iPadOS 的桌面模式 UA 可能和手机 Safari 不同。
6. 如果存在微信、QQ、微博、Chrome Custom Tab 等内置 WebView，单独记录一组日志，因为它们的 cookie 行为可能和系统浏览器不同。

判断是否完全修复，不要只看“用户能否登录”，还要看桌面端和移动端的 `AuthDebug` 字段是否收敛到同一套 canonical origin。

