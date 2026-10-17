# Nemesis Abstract Quote Selector Workflow

> 状态：已接入第一版本地 selector。  
> 目标：让 Nemesis 在合适语境下原文引用抽象语录，同时避免把全部语录常驻 prompt。  
> 核心原则：模型只能输出 `[quote:id]` 标记，最终原文由服务端白名单替换。

## 1. 当前链路

当前不新增第三个 AI 调用，复用已有 query router：

```txt
用户输入
  ↓
Nemesis Guard
  ↓
Workers AI query router
    - queryType
    - preferredRoute
    - quoteTags
    - quoteIntensity
  ↓
服务端 quote selector
    - 根据 tags / rule triggers 从本地 catalog 选 0-2 条候选
  ↓
最终生成模型
    - 只看到本轮候选 quote
    - 只能输出 [quote:id]
  ↓
parseNemesisReply
    - 用服务端 catalog 原文替换 [quote:id]
```

这样做的原因：

* 不把 500/1000 条语录塞进每轮 system prompt。
* 不让最终模型自由改写语录。
* 不增加第三次 Workers AI 判断，避免链路变长。
* router 只判断语义标签，不直接选择具体语录 ID。

## 2. 相关文件

| 文件 | 作用 |
| --- | --- |
| `app/nemesis/quote-catalog.server.ts` | 语录 catalog、规则兜底 selector、prompt appendix 构建 |
| `app/nemesis/query-router-prompt.server.ts` | 要求 query router 额外返回 `quoteTags` / `quoteIntensity` |
| `app/services/nemesis-query-router.server.ts` | 解析并规范化 router 返回的 quote 字段 |
| `app/services/nemesis.server.ts` | normal 模式下把 quote candidates 拼进 system instruction |
| `app/services/nemesis-reply.server.ts` | 把 `[quote:id]` 替换为 catalog 原文 |

## 3. 新增一条语录

在 `NEMESIS_QUOTE_CATALOG` 里新增：

```ts
{
  id: "memory_loved_all_001",
  text: "神明大人、佛祖大人、欧德·拉格纳大人。我发誓，此生绝不忘记我曾爱过的一切。",
  tags: ["记忆", "爱过", "失去", "告别", "曾经重要", "不否定过去", "回不去"],
  triggers: ["以前喜欢", "曾经喜欢", "爱过", "不想忘记", "回不去", "过去是假的", "告别回忆"],
  avoid: ["技术问题", "代码", "部署", "普通寒暄", "强烈危机"],
  intensity: "high",
}
```

字段说明：

* `id`：稳定主键。上线后不要随意改名，否则历史标记和测试样例会失效。
* `text`：最终展示给用户的原文。不要把同一句的多个版本塞在同一个 entry。
* `tags`：给 router / selector 用的语义标签。
* `triggers`：不依赖 AI 的关键词兜底。
* `avoid`：明显不该触发的场景。
* `intensity`：语录情绪重量，影响每轮候选数量和使用门槛。

新增语录时，不要只填字段就结束。每条语录都需要额外写一段“人工衔接说明”，哪怕暂时不进代码，也要写在语录整理表或后续 manifest 旁边：

```txt
这句适合回答什么问题：
用户在问“已经失去或变远的爱，还算不算数”。

引用前怎么引入：
先说明这不是否定过去，而是在承认变化之后保留重量。

引用后怎么落回：
强调热情变淡不等于过去作废，曾经认真喜欢过就是真的。

错误用法：
不要用在普通难过、技术讨论、寒暄、或者把它当作结尾签名。
```

ID 命名建议：

```txt
主题_语义_序号
fate_distance_001
memory_loved_all_001
vow_no_regret_001
return_home_001
```

## 4. 触发策略

当前 selector 有两条来源：

1. query router 返回的 `quoteTags` / `quoteIntensity`。
2. `inferRuleTags()` 的关键词兜底。

最终规则：

* 技术问题、部署问题、代码问题、Cloudflare / RAG 问题：不注入语录。
* safe boundary / roast 模式：不注入语录。
* 强危机场景：不注入重语录，避免加深情绪。
* `low` 最多 1 条候选。
* `medium` / `high` 最多 2 条候选。
* 没有 tags 或 score 不足：不注入。

## 5. 衔接策略必须由人决定

语录是否自然，不只取决于“选中了哪一句”，更取决于它如何进入回答。
这部分不能完全交给模型自由发挥，因为抽象语录很容易被模型贴成结尾口号、签名档或装饰句。

当前代码已经在 `buildNemesisQuotePromptAppendix()` 里要求模型：

* 引用前先说明为什么这句适合当前语境。
* 输出 quote 标记后，继续用 1-2 句话回到用户问题。
* 不要把 quote 标记当作孤立结尾、签名、装饰、口号或最后一句。

但这只是通用约束。真正决定衔接质量的，是每条语录背后的人工说明。

### 5.1 每条语录都要定义“语义位置”

不要只问“这句对应什么 tags”，还要问：

* 这句是在回答用户的哪一种问题？
* 它表达的是判断、安慰、反驳、承认、告别，还是自我约束？
* 它适合放在回答开头、中段转折，还是结尾前一段？
* 引用后应该把话题带回哪里？

例如：

```txt
quote: memory_loved_all_001
语义位置：承认失去之后，拒绝否定过去。
适合放置：中段转折，不适合做最后一句。
引用前：说明“变淡不等于过去作废”。
引用后：回到用户的问题，解释曾经喜欢过为什么仍然是真的。
```

### 5.2 推荐的回答结构

自然引用通常用这个结构：

```txt
直接回答用户问题。

解释当前情绪/判断为什么成立。

用一句话引出语录。

[quote:id]

引用后回到用户问题，说明这句在当前语境里的意义。
```

示例：

```txt
不是假的。热情变淡，只说明人和生活状态都变了，不说明过去被注销。

如果要用一句话压住这种自我怀疑，应该是这一句：

[quote:memory_loved_all_001]

它放在这里的意思不是要求你永远保持同一种热情，而是承认：曾经认真喜欢过，就已经是真的。
```

服务端最终会把 `[quote:memory_loved_all_001]` 替换成原文。

### 5.3 不推荐的回答结构

不要让回答变成：

```txt
解释了一大段。

[quote:id]
```

这种写法的问题是：语录没有参与论证，只是被贴在尾巴上。
用户读起来会像模型突然念了一句台词，而不是自然地理解这句话为什么出现。

也不要让模型在每次情绪话题都硬塞语录。抽象语录应该像刀，不应该像背景音乐。

### 5.4 后续 manifest 建议

当语录数量变多时，建议把 catalog 从 TS 迁移到 JSON，并加入衔接字段：

```json
{
  "id": "memory_loved_all_001",
  "text": "神明大人、佛祖大人、欧德·拉格纳大人。我发誓，此生绝不忘记我曾爱过的一切。",
  "tags": ["记忆", "爱过", "失去", "不否定过去"],
  "triggers": ["以前喜欢", "曾经喜欢", "爱过", "不想忘记"],
  "avoid": ["技术问题", "普通寒暄", "强烈危机"],
  "intensity": "high",
  "placement": "middle_turn",
  "bridgeBefore": "用于说明变淡不等于过去作废。",
  "bridgeAfter": "引用后必须回到“曾经认真喜欢过就是真的”。",
  "badUses": ["孤立结尾", "签名档", "普通难过时硬贴"]
}
```

当前代码还没有读取 `bridgeBefore` / `bridgeAfter`，因为第一版先保持简单。
但文档和未来 manifest 应该先按这个思路整理，后续再把这些字段接入 prompt appendix。

## 6. 为什么不让 AI 直接选 ID

当 catalog 扩展到 500/1000 条时，小模型不可能凭空知道完整语录库。
如果每轮把全库塞给小模型，会重新回到 prompt 膨胀问题。

正确分工是：

```txt
小模型：判断这轮需要什么语义标签。
服务端：根据标签、关键词、后续向量检索选具体 ID。
大模型：决定回复中是否放 [quote:id]。
服务端：替换成原文。
```

## 7. 扩展到 500/1000 条后的迁移路径

### 阶段 A：本地 TS catalog

适合 1-100 条。

优点：

* 最简单。
* 类型检查直接覆盖。
* 不需要数据库或迁移。

缺点：

* catalog 增大后代码文件会变长。
* tags 维护容易混乱。

### 阶段 B：JSON manifest

适合 100-500 条。

建议迁移到：

```txt
app/nemesis/quote-manifest.json
```

然后由 `quote-catalog.server.ts` import JSON 并做类型收敛。

需要新增校验脚本：

```txt
scripts/verify-nemesis-quotes.mjs
```

校验项：

* ID 唯一。
* text 非空。
* tags 至少 2 个。
* intensity 合法。
* avoid / triggers 为数组。

### 阶段 C：向量检索

适合 500/1000 条以上。

建议使用 Cloudflare Vectorize 或 AI Search 的公开知识链路，但要分清用途：

* 抽象语录是内部风格素材，优先 Vectorize / 自管 manifest。
* 公开网站资料、docs、更新日志，适合 Cloudflare AI Search。

可迁移为：

```txt
query router 产出 quoteTags
  ↓
按 tags 粗筛 50-100 条
  ↓
embedding 检索 top 5
  ↓
服务端取 top 1-2 作为候选
```

不要把隐藏 Memory Canon 和公开 AI Search 索引混在一起。

## 8. 验收样例

输入：

```txt
以前喜欢过的东西变淡了，是不是说明那时候的喜欢都是假的？
```

期望：

* router 倾向 `STYLE_OR_PERSONA_QUERY`。
* `quoteTags` 包含 `记忆` / `爱过` / `不否定过去`。
* selector 选中 `memory_loved_all_001`。
* 最终模型若使用语录，只输出 `[quote:memory_loved_all_001]`。
* 前端最终看到完整原文：

```txt
“神明大人、佛祖大人、欧德·拉格纳大人。我发誓，此生绝不忘记我曾爱过的一切。”
```

输入：

```txt
Cloudflare AI Search 和 Vectorize 做 RAG 有什么区别？
```

期望：

* 不注入 quote candidates。
* 不输出 `[quote:id]`。

## 9. 后续 TODO

* 给 quote selector 增加单元测试或脚本级样例验证。
* 增加 `scripts/verify-nemesis-quotes.mjs`，防止 ID 重复和字段缺失。
* catalog 超过 100 条后迁移到 JSON manifest。
* catalog 超过 500 条后评估 Vectorize 检索，不急着提前引入。
* 后续将 `placement` / `bridgeBefore` / `bridgeAfter` 接入 quote prompt appendix，让每条语录拥有自己的衔接策略。
