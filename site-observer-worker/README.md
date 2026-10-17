# Site Observer Worker

独立的 Cloudflare Worker，用于每 5 分钟查询 `my-remix-worker` 的 Workers Logs，将错误脱敏、去重并聚合为事故，经现有 `my-ai-gateway` 调用 Workers AI 生成分析，再把“AI 结论 + 最多 3 条脱敏错误摘录”通过签名 Webhook 投递给 VPS/Hermes 微信链路。

该 Worker 与主站请求链路隔离。即使监控、AI 或微信通知失败，也不会阻塞主站访问或留言提交。

## 当前生产资源

- Worker：`site-observer-worker`
- 健康检查：`https://site-observer-worker.your-subdomain.workers.dev/health`
- D1：`site-observer-db`
- Queue：`site-observer-incidents`
- DLQ：`site-observer-incidents-dlq`
- Cron：每 5 分钟
- 目标 Worker：`my-remix-worker`
- AI Gateway：`my-ai-gateway`

三个生产 Secret 均已配置，Observability 查询和 Cron 状态为 `healthy`，当前 `DELIVERY_ENABLED=true`。合法心跳 revision `:2` 已用完全相同的 443 字节正文重放两次，两次 SHA-256 均为 `1d183f5ee11a42882909fbbfd12a7be6474022b1bcf33e8c9fd325058c8fa778`，VPS 均返回 HTTP 202 `queued`；第二次被 VPS 识别为 duplicate，并未新增即时 iLink 调用。VPS 已可靠接收，但 iLink 当前返回 `ret=-2 / prepare failed`，截至 08:43 UTC 已重试 4 次且 `sent_at` 仍为空，因此尚不能宣称微信已送达。

## 数据流

```text
my-remix-worker Workers Logs
        ↓ 每 5 分钟查询
site-observer-worker
        ↓ 脱敏、去重、聚合、阈值判断
D1
        ↓ my-ai-gateway → Workers AI 分析
Cloudflare Queue
        ↓ AI 结论 + 脱敏错误摘录
签名 HTTPS Webhook
        ↓
VPS /webhooks/site-incident
        ↓
Hermes 微信发送器
```

## 本地检查

```bash
cd site-observer-worker
npm install
npm run check
```

`npm run check` 会依次生成 Cloudflare 类型、执行 TypeScript 检查、运行基于本地 D1 的 Worker 测试，并执行 Wrangler 部署 dry-run。

本地开发时复制 `.dev.vars.example` 为 `.dev.vars`，只在本地文件中填写真实值；`.dev.vars` 已被忽略，不得提交。

## 生产 Secret

需要三个独立 Secret：

- `CF_OBSERVABILITY_API_TOKEN`：Cloudflare 自定义 API Token，账户范围只选择当前账户，权限为 `Account / Workers Observability / Read`。
- `SITE_INCIDENT_WEBHOOK_URL`：VPS 的公开 HTTPS 地址，例如 `https://example.com/webhooks/site-incident`。
- `SITE_INCIDENT_WEBHOOK_SECRET`：仅用于事故通知的新随机密钥，不与留言通知共用。

事故分析使用 Cloudflare Workers AI binding，并通过 `AI_GATEWAY_ID=my-ai-gateway` 进入主站现有 AI Gateway。Worker binding 在同一账户内会预认证，因此不需要复制主站的 `CF_AIG_TOKEN`，也不需要模型供应商 API Key。AI Gateway Token 与 Observability Token 用途不同，不能互相替代。

配置命令：

```bash
cd site-observer-worker
npx wrangler secret put CF_OBSERVABILITY_API_TOKEN
npx wrangler secret put SITE_INCIDENT_WEBHOOK_URL
npx wrangler secret put SITE_INCIDENT_WEBHOOK_SECRET
```

命令会交互式读取 Secret，不要把真实值写入命令参数、仓库或部署日志。

## 启用顺序

1. 在 Cloudflare 控制台创建并写入 Observability API Token。
2. 确认 `/health` 的 `poll_status` 变为 `healthy` 且 `last_success_at` 有值。
3. 在 VPS 完成 `/webhooks/site-incident`、持久幂等和微信投递。
4. 写入 VPS URL 与双方共享的新 Secret。
5. 保持 `DELIVERY_ENABLED=false`，先执行签名与负载联调。
6. 将 `wrangler.jsonc` 中的 `DELIVERY_ENABLED` 改为 `"true"`，运行 `npm run check` 后执行 `npm run deploy`。
7. 验证 opened、updated、recovered、heartbeat、degraded 与重复请求幂等。

## Webhook 协议

请求头：

```text
Content-Type: application/json
X-Request-ID: <delivery_id>
X-Webhook-Timestamp: <Unix 秒>
X-Webhook-Signature-V2: <小写十六进制 HMAC-SHA256>
```

签名原文是 `${timestamp}.${rawBody}`。签名值没有 `sha256=` 前缀。

事件类型：

- `site.incident.opened`
- `site.incident.updated`
- `site.incident.recovered`
- `site.monitor.heartbeat`
- `site.monitor.degraded`

事故投递 ID：

```text
site-incident:<incident_id>:<opened|updated|recovered>:<revision>
```

VPS 必须以 `delivery_id` / `X-Request-ID` 做持久幂等，验签必须使用收到的原始请求字节。

Worker 在首次发送前把已经序列化的正文冻结到 D1
`deliveries.webhook_body_json`，重试时直接复用同一字符串，不重新生成动态字段。
`delivery_attempts` 为每次出站保存正文 SHA-256、字节数、HTTP 状态和最多
300 字符的脱敏响应摘要，以便验证重试字节一致性和 VPS 幂等行为。

事故对象同时包含：

- AI 结论：`title`、`summary`、`likely_cause`、`confidence`、`user_impact`、`evidence[]`、`recommended_checks[]`
- 事实摘录：`error_samples_redacted=true` 和最多 3 条 `error_samples[]`

每条错误摘录包含时间、脱敏消息、路由、HTTP 状态、Worker outcome 和日志 level。发送前会再次删除邮箱、IP、凭据、长 Token 和 URL 查询参数，并限制长度；完整原始日志和完整堆栈不会进入 AI Gateway 或微信。

## 常用运维命令

```bash
cd site-observer-worker
npm run d1:migrate:remote
npm run deploy
npx wrangler tail site-observer-worker
```

查看健康状态：

```bash
curl https://site-observer-worker.your-subdomain.workers.dev/health
```

健康接口只返回配置状态与监控状态，不返回 Token、Webhook URL、Secret、日志正文或事故样本。
