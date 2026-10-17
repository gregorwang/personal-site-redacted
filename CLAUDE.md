# 代码 Coach 训练卡片设计文档 v1.0

## 0. 产品定位

这个系统不是普通代码教程，也不是八股题库。

它的核心目标是训练一个主要依赖 AI 写代码的人，具备以下能力：

1. 看懂项目里的真实代码在做什么。
2. 理解一个文件、函数、loader、组件在项目地图里的位置。
3. 判断数据从哪里来、到哪里去、什么时候执行。
4. 发现 AI 改代码时破坏了性能、权限、状态流、架构边界。
5. 能用准确语言给 Cursor / Codex / Claude 下修复指令。

所以每一关都必须同时包含：

* 教学卡片
* 基础题
* 进阶题
* 状态推演题
* AI 改坏审查题
* 自由复述 / PR Review 题

不要只出“填函数名”这种题。填空题可以有，但不能成为主体。

---

# 1. 每一关的标准结构

一关建议包含：

```txt
A. 项目地图卡片
B. 本关目标卡片
C. 教学卡片：职责解释
D. 教学卡片：关键代码逐行解释
E. 教学卡片：数据流 / 执行链
F. 主动回忆卡片
G. 基础练习题
H. 进阶练习题
I. AI 审查题
J. 本关总结题
```

---

# 2. 教学卡片范本

下面是教学卡片的标准写法。

## 2.1 项目地图卡片

### 标题

```txt
单元 1 · 项目地图
```

### 副标题

```txt
root.tsx 的 loader、Layout、Outlet 构成全站壳层。
```

### 项目背景

```txt
所有页面共享 root loader 注入的 theme 与 session。
root loader 是全站请求进入 React 树之前的服务端数据入口。
```

### 关卡列表示例

```txt
1. root loader 数据
2. Layout 与 html 壳
3. Outlet 路由出口
4. ErrorBoundary
5. 懒加载登录 UI
6. Shell capstone
```

---

## 2.2 本关目标卡片

### 标题

```txt
本关目标
```

### 内容

```txt
能解释 root loader 为什么是 theme/session 的全局入口，并识别 AI 局部补丁造成的性能风险。
```

### 标签

```txt
文件：remix/app/root.tsx
题量：基础 8 题 / 进阶 8 题 / 审查 6 题
知识点：root loader、theme/session、匿名优化、AI 审查
风险点：匿名访问误读 D1 session
```

---

## 2.3 教学卡片：先讲职责

### 标题

```txt
为什么 root loader 是全局状态入口？
```

### 正文

```txt
root.tsx 的 loader 会在页面请求时运行，负责把全站都要使用的数据注入 React 树。

theme 属于全站 UI 状态。
session 属于全站登录状态。

它们不应该散落在每个页面里重复读取，否则会出现重复请求、状态不一致、性能浪费、权限边界混乱等问题。
```

### 要点

```txt
- root 是 Remix / React Router 应用的外壳。
- Layout、侧边栏、主内容区、弹窗都挂在 root 下面。
- theme 影响全站外观，所以适合在 root loader 读取。
- session 影响登录态、用户菜单、权限按钮，所以也适合在 root loader 读取。
- 但 session 读取有成本，匿名用户不应该无条件触发 session 查询。
```

---

## 2.4 教学卡片：关键代码

### 代码

```ts
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = await getTheme(request);

  const session = requestHasAuthSessionCookie(request)
    ? await getSessionCached(request)
    : null;

  return json({
    theme,
    session: toPublicSession(session),
  });
};
```

### 逐行解释

```txt
第 2 行：读取 theme
getTheme(request) 从请求中解析主题信息，通常来自 cookie。
theme 是全站 UI 状态，所以每次请求都可以读取。

第 4 行：session 守门判断
requestHasAuthSessionCookie(request) 只负责判断请求中是否存在 auth session cookie。
它不是读取 session，而是判断是否值得进入 session 读取链路。

第 5 行：真正读取 session
只有存在 auth session cookie 时，才调用 getSessionCached(request)。
这个函数可能命中缓存，也可能在 cache miss 时访问 D1 或 session 存储。

第 6 行：匿名用户 session 为 null
没有 auth cookie 时，不读取 session，直接返回 null。

第 8-11 行：返回公开数据
loader 把 theme 和 public session 返回给 React 树。
session 需要经过 toPublicSession，避免把敏感字段暴露给前端。
```

---

## 2.5 教学卡片：数据流

### 标题

```txt
root loader 数据流
```

### 流程

```txt
1. 请求进入 root loader
2. getTheme(request) 读取 theme cookie
3. requestHasAuthSessionCookie(request) 检查 auth cookie
4. 如果有 auth cookie，调用 getSessionCached(request)
5. 如果没有 auth cookie，session = null
6. toPublicSession(session) 转成前端可用的公开 session
7. json 返回给 Layout / 子路由消费
```

### 关键判断

```txt
theme 是始终读取。
session 是条件读取。
D1 / session 存储不应该被匿名请求无条件触发。
```

---

## 2.6 主动回忆卡片

### 问题

```txt
匿名用户访问首页时，root loader 会不会读取 D1 session？为什么？
```

### 标准答案

```txt
不会。

因为 root loader 先通过 requestHasAuthSessionCookie(request) 判断请求里有没有 auth session cookie。

如果没有 auth cookie，就不会调用 getSessionCached(request)，session 会直接是 null。

因此匿名用户仍然可以读取 theme，但不会进入 session 读取链路。
```

---

# 3. 题目分层设计

每一关不要只出 8 道题。建议设计 20～24 道题，再根据页面节奏抽取展示。

## 3.1 基础层

目标：让用户认识变量、函数、文件职责。

题型：

```txt
- 单选题
- 函数匹配题
- 判断题
- 关键概念识别题
```

训练内容：

```txt
这个函数叫什么？
这个变量代表什么？
这个文件在项目里负责什么？
哪个函数是守门员？
哪个函数可能触发数据库读取？
```

---

## 3.2 读代码层

目标：让用户理解代码执行顺序和数据流。

题型：

```txt
- 执行链排序
- 关键行定位
- 代码填空
- 代码解释选择
```

训练内容：

```txt
代码先执行哪一步？
哪一行阻止了匿名用户读取 session？
为什么 theme 在 session 前面读取？
为什么 return json 要放最后？
```

---

## 3.3 状态推演层

目标：给定访问场景，让用户预测实际行为。

题型：

```txt
- 场景多选
- 状态表格题
- 结果预测题
```

训练内容：

```txt
匿名用户访问时会发生什么？
登录用户访问时会发生什么？
没有 theme cookie 时会发生什么？
auth cookie 存在但 session 失效时会发生什么？
```

---

## 3.4 AI 审查层

目标：训练用户判断 AI 改代码是否破坏项目。

题型：

```txt
- 错误诊断题
- diff 审查题
- 最小修复题
- PR Review 评论题
```

训练内容：

```txt
AI 把 session 改成无条件读取，问题是什么？
AI 把 theme 放到 useState 里，问题是什么？
AI 把 root loader 数据重复放到子路由 loader，问题是什么？
AI 去掉 toPublicSession，问题是什么？
```

---

# 4. root loader 真题样卷

以下是一份完整样卷。后续 AI 出题时，质量至少要接近这份样卷。

---

# 单元 1：root loader 数据入口

## 参考代码

```ts
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = await getTheme(request);

  const session = requestHasAuthSessionCookie(request)
    ? await getSessionCached(request)
    : null;

  return json({
    theme,
    session: toPublicSession(session),
  });
};
```

---

# 第一部分：基础识别题

## 第 1 题：root loader 的角色

### 题型

单选题

### 题目

`root.tsx` 里的 `loader` 最接近下面哪种角色？

### 选项

A. 只负责按钮点击事件
B. 页面请求进入时，在服务端准备全站需要的数据
C. 只负责 Tailwind 样式
D. 只负责浏览器 localStorage

### 正确答案

B

### 解析

root loader 是服务端数据入口。它在页面请求时运行，把 theme、session 等全站共享数据准备好，再交给 React 树使用。

### 错因反馈

如果选择 A 或 D，说明把服务端 loader 和客户端交互混淆了。按钮点击、localStorage 是浏览器侧逻辑；loader 是请求时的服务端逻辑。

---

## 第 2 题：theme 来自哪里？

### 题型

单选题

### 题目

下面哪一行负责读取主题？

```ts
const theme = await getTheme(request);

const session = requestHasAuthSessionCookie(request)
  ? await getSessionCached(request)
  : null;
```

### 选项

A. `getTheme(request)`
B. `getSessionCached(request)`
C. `requestHasAuthSessionCookie(request)`
D. `toPublicSession(session)`

### 正确答案

A

### 解析

`getTheme(request)` 负责从请求中解析主题信息，通常来自 cookie。

---

## 第 3 题：谁是 session 守门员？

### 题型

单选题

### 题目

哪个函数负责判断请求里是否存在 auth session cookie？

### 选项

A. `getTheme`
B. `json`
C. `requestHasAuthSessionCookie`
D. `toPublicSession`

### 正确答案

C

### 解析

`requestHasAuthSessionCookie(request)` 是 session 读取前的守门逻辑。它不负责读取 session，只负责判断是否值得进入 session 读取链路。

---

## 第 4 题：哪个函数可能触发 D1 或 session 存储读取？

### 题型

单选题

### 题目

下面哪个函数最可能涉及 session 查询、缓存读取或 D1 读取？

### 选项

A. `getTheme(request)`
B. `getSessionCached(request)`
C. `json(...)`
D. `toPublicSession(...)`

### 正确答案

B

### 解析

`getSessionCached(request)` 是真正读取 session 的函数。虽然名字里有 Cached，但 cache miss 时仍然可能触发数据库或 session 存储读取。

---

## 第 5 题：theme 和 session 的关系

### 题型

判断题

### 题目

匿名用户不会读取 session，所以也不会读取 theme。

### 正确答案

错误

### 解析

theme 和 session 是两条不同链路。
theme 可以始终读取；session 需要 auth cookie 守门。

---

# 第二部分：读代码理解题

## 第 6 题：执行顺序排序

### 题型

拖拽排序题

### 题目

请排列 root loader 读取数据的合理顺序。

### 待排序项

A. 返回 json，注入 React 树
B. 读取 theme cookie
C. 如果有 auth cookie，则读取 session
D. 检查是否存在 auth session cookie

### 正确顺序

B → D → C → A

### 解析

root loader 先读取 theme，然后检查 auth cookie。只有存在 auth cookie 时，才读取 session。最后把数据通过 json 返回。

---

## 第 7 题：关键行定位

### 题型

点击代码行 / 单选题

### 题目

哪一行阻止了匿名用户读取 session？

```ts
1 export const loader = async ({ request }: LoaderFunctionArgs) => {
2   const theme = await getTheme(request);
3
4   const session = requestHasAuthSessionCookie(request)
5     ? await getSessionCached(request)
6     : null;
7
8   return json({ theme, session: toPublicSession(session) });
9 };
```

### 选项

A. 第 2 行
B. 第 4 行
C. 第 5 行
D. 第 8 行

### 正确答案

B

### 解析

第 4 行是守门逻辑。只有 `requestHasAuthSessionCookie(request)` 为真，才会执行第 5 行。

---

## 第 8 题：代码填空

### 题型

填空题

### 题目

补全下面代码。

```ts
const session = requestHasAuthSessionCookie(request)
  ? await ________(request)
  : null;
```

### 正确答案

```ts
getSessionCached
```

### 解析

有 auth cookie 时才调用 `getSessionCached(request)`，否则 session 是 null。

### 题目质量备注

这个题只能作为基础巩固题，不能单独作为核心题。因为它主要考函数名，不一定考理解。必须搭配状态推演题和 AI 审查题。

---

## 第 9 题：代码意图识别

### 题型

单选题

### 题目

下面这段代码的主要意图是什么？

```ts
const session = requestHasAuthSessionCookie(request)
  ? await getSessionCached(request)
  : null;
```

### 选项

A. 让所有访问都读取 session，确保绝对安全
B. 只有请求里存在 auth cookie 时，才尝试读取 session
C. 禁止所有用户登录
D. 把 theme 写入数据库

### 正确答案

B

### 解析

这段代码的关键不是读取 session，而是条件读取 session。它通过 auth cookie 判断来避免匿名请求进入 session 读取链路。

---

## 第 10 题：返回数据识别

### 题型

多选题

### 题目

下面哪些数据会被 root loader 返回给 React 树？

```ts
return json({
  theme,
  session: toPublicSession(session),
});
```

### 选项

A. theme
B. public session
C. 原始 request 对象
D. 数据库连接对象

### 正确答案

A、B

### 解析

root loader 返回 theme 和经过 `toPublicSession` 处理后的 session，不应该把原始 request 或数据库连接对象返回给前端。

---

# 第三部分：状态推演题

## 第 11 题：匿名用户访问首页

### 题型

多选题

### 场景

用户匿名访问首页：

```txt
有 theme cookie
没有 auth session cookie
```

### 题目

这次请求会发生什么？

### 选项

A. 会执行 `getTheme(request)`
B. 会执行 `getSessionCached(request)`
C. `session` 最终是 `null`
D. 一定会访问 D1 session 表

### 正确答案

A、C

### 解析

有 theme cookie，所以会读取 theme。
没有 auth session cookie，所以不会执行 `getSessionCached(request)`。
因此 session 是 null，也不应该访问 D1 session 表。

---

## 第 12 题：登录用户访问任意页面

### 题型

多选题

### 场景

用户已登录，访问任意页面：

```txt
有 theme cookie
有 auth session cookie
```

### 题目

下面哪些说法正确？

### 选项

A. 会读取 theme
B. 会先检查 auth cookie
C. 可能读取 session
D. root loader 不会运行

### 正确答案

A、B、C

### 解析

root loader 是全站入口。已登录用户有 auth cookie，所以会进入 session 读取逻辑。

---

## 第 13 题：没有 theme cookie，也没有 auth cookie

### 题型

单选题

### 场景

用户第一次访问网站：

```txt
没有 theme cookie
没有 auth session cookie
```

### 题目

最合理的结果是什么？

### 选项

A. loader 必然报错
B. theme 使用默认值，session 是 null
C. session 自动变成登录状态
D. 页面无法渲染

### 正确答案

B

### 解析

正常设计里，theme 没有 cookie 时应该回落到默认主题。没有 auth cookie 时，session 是 null。

---

## 第 14 题：auth cookie 存在，但 session 已失效

### 题型

单选题

### 场景

用户请求里存在 auth session cookie，但服务端 session 已经过期或无效。

### 题目

最合理的行为是什么？

### 选项

A. 因为有 auth cookie，所以一定登录成功
B. 会进入 `getSessionCached(request)`，但最终可能得到 null 或无效 session
C. 不会读取 theme
D. 应该直接信任 cookie 里的所有用户信息

### 正确答案

B

### 解析

auth cookie 只是进入 session 读取链路的条件，不等于登录一定有效。真正的 session 仍然需要服务端验证。

---

## 第 15 题：性能成本判断

### 题型

单选题

### 题目

为什么要先判断 `requestHasAuthSessionCookie(request)`，再调用 `getSessionCached(request)`？

### 选项

A. 为了让代码更长
B. 为了避免匿名请求进入 session 读取链路
C. 为了让 Tailwind 生效
D. 为了让 React 组件重新渲染

### 正确答案

B

### 解析

匿名请求没有登录态，不应该触发 session 查询。这个守门判断可以减少不必要的 session 解析、缓存读取、D1 查询风险。

---

# 第四部分：进阶理解题

## 第 16 题：为什么不能把 session 全部放到前端 localStorage？

### 题型

单选题

### 题目

AI 建议：

```txt
为了减少 loader 复杂度，把 session 存到 localStorage，root loader 不再读取 session。
```

这个建议最大的问题是什么？

### 选项

A. localStorage 只能存 CSS
B. 登录态属于安全敏感状态，不能只依赖前端 localStorage 判断
C. root loader 不能返回 json
D. theme 不能使用 cookie

### 正确答案

B

### 解析

登录态和权限判断必须以服务端可信数据为准。localStorage 可以被用户修改，不能作为安全边界。

### 真实工程后果

如果只依赖 localStorage 判断登录态，用户可能伪造前端状态，导致 UI 和后端权限判断不一致。

---

## 第 17 题：为什么要用 toPublicSession？

### 题型

单选题

### 题目

`toPublicSession(session)` 的主要作用是什么？

### 选项

A. 把 session 转成前端安全可见的数据
B. 把 theme 写进数据库
C. 强制用户退出登录
D. 删除所有 cookie

### 正确答案

A

### 解析

原始 session 可能包含敏感字段，不应该直接返回给前端。`toPublicSession` 的作用是只暴露前端需要的公开字段。

---

## 第 18 题：重复读取 session 的架构问题

### 题型

单选题

### 题目

如果每个子路由 loader 都重复读取 session，而 root loader 也读取 session，最大的问题是什么？

### 选项

A. 所有代码都会变成 CSS
B. session 读取分散，容易造成重复查询、状态不一致和维护困难
C. React 不能使用 loader
D. D1 会自动消失

### 正确答案

B

### 解析

全站共享的登录态适合在 root loader 统一读取。重复分散读取会增加性能成本，也会让权限状态来源变得混乱。

---

## 第 19 题：theme 为什么适合放在 root loader？

### 题型

单选题

### 题目

theme 为什么适合在 root loader 读取？

### 选项

A. 因为 theme 只影响一个按钮
B. 因为 theme 影响全站外观，Layout 和页面都可能需要
C. 因为 theme 必须访问 D1
D. 因为 theme 不能存在 cookie

### 正确答案

B

### 解析

theme 是全站 UI 状态。放在 root loader 里可以保证 Layout、子路由、全局组件获得一致主题。

---

# 第五部分：AI 改坏审查题

## 第 20 题：无条件读取 session

### 题型

代码审查题

### 题目

Cursor 把代码改成了这样：

```ts
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = await getTheme(request);
  const session = await getSessionCached(request);

  return json({
    theme,
    session: toPublicSession(session),
  });
};
```

这个改动最大的问题是什么？

### 选项

A. 匿名请求也会读取 session，破坏了 auth cookie 守门逻辑
B. 代码更短，所以一定更好
C. 主要问题是 theme 应该放在 session 后面
D. 主要问题是 return json 写法错误

### 正确答案

A

### 解析

原代码中，`getSessionCached(request)` 只有在存在 auth cookie 时才执行。
AI 改完后，每个匿名请求也会执行 session 读取，可能增加性能成本，也破坏了 root loader 的边界。

### 真实工程后果

```txt
匿名访问量越大
→ session 读取越多
→ cache / D1 压力越大
→ 页面整体变慢
```

---

## 第 21 题：cached 不等于免费

### 题型

单选题

### 题目

AI 解释说：

```txt
getSessionCached 里面有 cached，所以无条件调用也没关系。
```

你应该如何判断？

### 选项

A. 完全同意，cached 等于没有成本
B. 不完全同意，cached 只能降低重复读取成本，但匿名请求本来就不该进入 session 链路
C. 同意，因为 root loader 查的数据越多越安全
D. 不同意，因为 cached 会导致 Tailwind 冲突

### 正确答案

B

### 解析

cached 不等于免费。
cache miss 仍然可能有成本。
更关键的是，匿名请求根本不应该进入 session 读取链路。

---

## 第 22 题：去掉 toPublicSession

### 题型

代码审查题

### 题目

AI 把代码改成了这样：

```ts
return json({
  theme,
  session,
});
```

它去掉了 `toPublicSession(session)`。这个改动有什么风险？

### 选项

A. 可能把原始 session 中的敏感字段暴露给前端
B. 可以显著提升 CSS 性能
C. 会导致 theme cookie 无法读取
D. 没有任何风险，越原始越好

### 正确答案

A

### 解析

`toPublicSession` 是服务端数据暴露给前端前的一层过滤。去掉它可能把不该给浏览器看的字段传出去。

---

## 第 23 题：把 theme 放进 useState

### 题型

代码审查题

### 题目

AI 建议：

```txt
不用在 root loader 读 theme，直接在 Layout 里 useState('light') 就行。
```

最大问题是什么？

### 选项

A. 这样会让全站初始主题不再来自请求 cookie，可能造成首屏主题不一致或闪烁
B. useState 不能用于 React
C. theme 必须来自 D1
D. Layout 不能读取任何状态

### 正确答案

A

### 解析

theme 是请求级状态，服务端渲染时就应该知道。
如果只在客户端 useState，首屏可能先渲染默认主题，再切换成用户主题，造成闪烁或不一致。

---

## 第 24 题：把 root loader 数据重复塞到子路由

### 题型

代码审查题

### 题目

AI 在多个子路由 loader 里都加了：

```ts
const session = await getSessionCached(request);
```

你应该如何评价？

### 选项

A. 不推荐。全站共享 session 应由 root loader 统一处理，子路由只在需要额外权限校验时再做专门读取
B. 完全正确，重复越多越安全
C. 这主要是 Tailwind 的问题
D. 子路由 loader 不能读取任何数据

### 正确答案

A

### 解析

root loader 适合提供全站公开 session。
子路由如果需要强权限校验，可以单独验证，但不应该无脑重复读取 session。

---

# 第六部分：最小修改题

## 第 25 题：修复无条件读取 session

### 题型

代码修改题

### 题目

下面代码有问题，请做最小修复：

```ts
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = await getTheme(request);
  const session = await getSessionCached(request);

  return json({
    theme,
    session: toPublicSession(session),
  });
};
```

### 标准答案

```ts
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = await getTheme(request);

  const session = requestHasAuthSessionCookie(request)
    ? await getSessionCached(request)
    : null;

  return json({
    theme,
    session: toPublicSession(session),
  });
};
```

### 解析

最小修复不是重构整个 loader，而是恢复 auth cookie 守门逻辑。

---

## 第 26 题：补充 public session 过滤

### 题型

代码修改题

### 题目

下面代码存在数据暴露风险，请做最小修复：

```ts
return json({
  theme,
  session,
});
```

### 标准答案

```ts
return json({
  theme,
  session: toPublicSession(session),
});
```

### 解析

服务端 session 不应该原样暴露给前端。应该通过 `toPublicSession` 只返回公开字段。

---

# 第七部分：PR Review 自由回答题

## 第 27 题：写一句 Review Comment

### 题型

自由回答题

### 题目

你看到 AI 提交了这个 diff：

```diff
 export const loader = async ({ request }: LoaderFunctionArgs) => {
   const theme = await getTheme(request);

-  const session = requestHasAuthSessionCookie(request)
-    ? await getSessionCached(request)
-    : null;
+  const session = await getSessionCached(request);

   return json({
     theme,
     session: toPublicSession(session),
   });
 };
```

请写一句 PR review comment，说明为什么不能接受。

### 参考答案

```txt
这里不能无条件调用 getSessionCached。root loader 会在全站请求中执行，匿名用户没有 auth session cookie 时不应该进入 session 读取链路，否则会让匿名访问也产生 session 查询成本，甚至增加 D1 压力。建议保留 requestHasAuthSessionCookie 作为守门判断。
```

### 满分标准

回答需要提到：

```txt
1. root loader 是全站入口
2. 匿名用户没有 auth cookie
3. 不应该无条件读取 session
4. 否则会增加性能 / D1 成本
5. 应保留 requestHasAuthSessionCookie 守门
```

---

## 第 28 题：用自己的话解释本关

### 题型

自由复述题

### 题目

用自己的话解释：

```txt
为什么 root loader 适合读取 theme/session？
为什么 session 读取必须有 auth cookie 守门？
```

### 参考答案

```txt
root loader 是全站入口，Layout 和子路由都会挂在它下面，所以 theme 和 session 这种全站共享数据适合在这里统一读取。

theme 是 UI 状态，可以每次请求都读取。

session 是登录状态，可能涉及缓存或 D1 查询，所以不能对匿名请求无条件读取。应该先通过 requestHasAuthSessionCookie 判断是否存在 auth cookie，只有存在时才调用 getSessionCached。

这样可以保证全站状态统一，也能避免匿名访问造成不必要的 session 查询成本。
```

### 评分标准

```txt
基础合格：
能说出 root loader 是全站入口。

良好：
能说出 theme/session 是全站共享数据。

优秀：
能说出 session 读取有成本，匿名用户不应该进入 session 链路。

满分：
能同时提到 Layout/子路由、auth cookie 守门、toPublicSession、D1/性能风险。
```

---

# 5. 题目质量标准

后续 AI 出题时，必须自检以下标准。

## 5.1 好题标准

一题至少命中下面一个能力：

```txt
1. 识别职责
2. 理解数据流
3. 判断执行顺序
4. 推演用户状态
5. 发现性能风险
6. 发现权限风险
7. 发现服务端 / 客户端边界错误
8. 判断 AI patch 能不能接受
9. 写出修复指令
```

---

## 5.2 烂题标准

下面这些题不合格：

```txt
1. 只问“这个函数叫什么”，但没有解释工程意义。
2. 干扰项太弱，一眼看出答案。
3. 离开真实代码，变成抽象八股。
4. 只考语法，不考项目影响。
5. 没有错因反馈。
6. 没有真实工程后果。
7. 没有 AI 改坏场景。
```

---

## 5.3 干扰项设计标准

错误选项不能太弱。

差的干扰项：

```txt
A. 匿名请求不应该读取 session
B. Tailwind 会爆炸
C. CSS 会变成红色
D. 电脑会关机
```

好的干扰项：

```txt
A. 匿名请求不应该读取 session，应先检查 auth cookie
B. getSessionCached 有 cached，所以无条件调用也没有任何成本
C. 应该把 theme 放到 session 后面，因为登录态比主题重要
D. 应该把 session 放到 localStorage，避免服务端读取
```

好的干扰项应该像真实初学者或 AI 可能说出来的错误理由。

---

# 6. 每关推荐题量

不要死卡 8 题。

建议每关设计：

```txt
基础题：6～8 题
读代码题：5～6 题
状态推演题：4～5 题
AI 审查题：5～8 题
自由回答题：2～3 题
```

总题量：

```txt
每关题库：22～30 题
页面实际展示：8～16 题
复习模式：随机抽题
错题模式：优先抽错因相同的题
```

---

# 7. 每道题的数据结构建议

每道题最好包含这些字段：

```ts
type CoachQuestion = {
  id: string;
  unitId: string;
  lessonId: string;

  layer: "basic" | "code-reading" | "state-reasoning" | "ai-review" | "free-response";

  type:
    | "single-choice"
    | "multiple-choice"
    | "true-false"
    | "order"
    | "fill-blank"
    | "line-pick"
    | "code-fix"
    | "review-comment"
    | "free-explain";

  difficulty: 1 | 2 | 3 | 4 | 5;

  title: string;
  question: string;
  codeSnippet?: string;

  options?: Array<{
    id: string;
    text: string;
  }>;

  correctAnswer: string | string[];

  explanation: string;

  wrongAnswerFeedback?: Record<string, string>;

  realWorldImpact?: string;

  aiReviewRisk?: string;

  tags: string[];
};
```

---

# 8. 后续出题时必须提供的输入

为了保证题目不是八股，后续每关至少需要提供：

```txt
1. 文件路径
例如：remix/app/root.tsx

2. 真实代码片段
建议 30～120 行，不要一次贴全项目。

3. 相关函数说明
例如：
getTheme：从 cookie 读取主题。
requestHasAuthSessionCookie：检查是否存在 auth session cookie。
getSessionCached：读取 session，可能命中缓存，也可能访问 D1。
toPublicSession：过滤 session，只返回前端安全字段。

4. 本关训练目标
例如：
理解 root loader 为什么是 theme/session 的全局入口，并识别匿名请求打 D1 的风险。

5. 常见 AI 改坏风险
例如：
- 无条件 getSessionCached
- 去掉 toPublicSession
- 把 theme 放到客户端 useState
- 在子路由重复读取 session
```

---

# 9. 最终原则

这套系统不是为了让用户背代码。

它是为了让用户形成这样的判断链：

```txt
AI 改了哪里？
这段代码属于哪个文件 / 哪个层级？
它影响全站还是局部？
数据从哪里来，到哪里去？
匿名用户、登录用户、异常状态分别会怎样？
有没有多打数据库？
有没有暴露敏感字段？
有没有把服务端状态错误挪到客户端？
我应该怎么写 review comment 让 AI 修回来？
```

只要题目能训练这条判断链，就是好题。

如果题目只是让用户记住函数名、背定义、选明显答案，就是不合格题。

---

# 10. 当前项目必须新增的训练范围

现有样卷把 `root.tsx` 讲得比较完整，但它只覆盖了全站 loader、theme/session、匿名访问性能这一个切面。

结合当前项目代码，后续题库至少还要覆盖下面这些真实复杂区：

```txt
1. Nemesis API 编排入口
文件：app/routes/api.nemesis.ts
重点：登录检查、请求校验、限流、Guard、SSE、模型调用、解析回复、审计 waitUntil。

2. Nemesis Guard
文件：app/services/nemesis-guard.server.ts
重点：unknown 输入解析、recentMessages 归一化、长度限制、Gemini JSON 分类器、固定拒绝文案、审计字段。

3. Nemesis 查询路由
文件：app/services/nemesis-query-router.server.ts
重点：queryType、preferredRoute、confidence、quoteTags、结构化 JSON 容错、路由默认值。

4. 多模型编排与 fallback
文件：app/services/nemesis.server.ts
重点：Gemini / DeepSeek / Grok provider 差异、AI Gateway、fallbackRoutes、finishReason、incomplete、onProgress。

5. SSE 服务端与客户端协议
文件：app/lib/nemesis-sse.server.ts、app/lib/nemesis-sse.client.ts、app/types/nemesis-sse.ts
重点：status/done/error 事件、ReadableStream、progress step 映射、流意外结束、客户端 settled 防重复 resolve。

6. 回复解析与附件白名单
文件：app/services/nemesis-reply.server.ts、app/lib/nemesis-message.ts、app/types/chat.ts
重点：[sticker:id] / [media:id] / [video:id] / [quote:id] 标签解析、只取最后一个附件、白名单 resolve、ChatAttachment discriminated union。

7. 客户端会话状态
文件：app/hooks/useNemesisChat.client.ts、app/lib/nemesis-chat-sessions.client.ts
重点：localStorage 不可信、类型守卫、会话上限、重新生成、反馈上下文、loading/typing/error 状态。

8. 反馈与审计链路
文件：app/routes/api.nemesis-feedback.ts、app/services/nemesis-guard-events.server.ts
重点：反馈字段归一化、分类枚举、模型结果记录、不要吞掉生产调试需要的信息。

9. AI Gateway 与生产密钥处理
文件：app/lib/nemesis-ai-gateway.server.ts、app/utils/cloudflare-env.server.ts
重点：secret trim/BOM 清理、直连与 Gateway 分支、provider header 差异、日志脱敏。
```

这些单元不能只出“哪个函数负责什么”的题。每个单元都必须包含状态推演、AI 改坏审查、TypeScript 类型安全审查。

---

# 11. Nemesis AI 编排单元设计

## 11.1 必须训练的执行链

Nemesis API 的核心链路是：

```txt
POST /api/nemesis
→ requireNemesisUser(request)
→ validateNemesisRequest(request)
→ checkNemesisRateLimit(user)
→ createNemesisSseResponse(...)
→ emit guard running
→ guardNemesisMessage(env, message, recentMessages)
→ getNemesisModeReply(guard.mode)
→ 如果 CLARIFY / REFUSE：返回固定文案，不调用主模型
→ emit route running
→ callNemesisModel(...)
→ selectNemesisModel(...)
→ routeNemesisQuery(...)
→ provider 调用 Gemini / DeepSeek / Grok
→ fallbackRoutes(...)
→ parseNemesisReply(result.text)
→ ensureNemesisFoodVideoAttachment(...)
→ recordNemesisGuardEvent(...) via ctx.waitUntil
→ emit done / error
```

出题时必须让用户能画出这条链，并能判断某个 AI patch 改动了链路中的哪一段。

## 11.2 必须覆盖的状态推演场景

```txt
1. 未登录用户 POST /api/nemesis
预期：在 requireNemesisUser 阶段返回登录错误，不进入请求校验、限流、Guard、模型调用。

2. 请求 JSON 格式错误
预期：validateNemesisRequest 返回 400，不进入限流和模型链路。

3. 用户超过分钟限流
预期：返回 429，不创建 SSE，不调用 Guard，不消耗 Gemini 分类器额度。

4. Guard 返回 CLARIFY / REFUSE
预期：SSE 先发 guard 状态，再发固定 done 文案；不调用 callNemesisModel；可按 shouldAudit 记录审计。

5. Guard PASS_TO_GEMINI，查询路由选择 gemini_lite
预期：进入 route/generate，Gemini 失败且状态可 fallback 时尝试 DeepSeek。

6. 查询路由选择 grok_roast / grok_complex
预期：provider 是 xai；当前 fallbackRoutes 对 Grok 路由返回空数组，失败后不应自动 fallback 到 DeepSeek。

7. 模型返回文本中带多个 sticker 标签
预期：parseNemesisReply 只解析最后一个 sticker id，并且必须经 resolveNemesisSticker 白名单映射。

8. SSE 连接中途结束，没有 done/error
预期：客户端 requestNemesisStream reject “流式响应意外结束”，不能静默成功。
```

## 11.3 必须出现的 AI 改坏题

```txt
1. AI 把 checkNemesisRateLimit 放到 guardNemesisMessage 后面。
风险：被限流请求仍然消耗 Gemini 分类器额度。

2. AI 在 Guard 拒绝时继续调用 callNemesisModel 生成“更自然的拒绝文案”。
风险：拒绝结果不再是固定文案，可能泄露分类原因、提示词、Memory Canon 或 provider 输出。

3. AI 把 guard.classifierReason 返回给前端。
风险：泄露安全分类器内部理由，帮助用户反向调 prompt / 绕过规则。

4. AI 删除 ctx.waitUntil，改成直接 await recordNemesisGuardEvent。
风险：审计变成主响应阻塞点；但如果审计是关键正确性要求，也不能 fire-and-forget。题目要让用户判断业务取舍，而不是死背。

5. AI 捕获 provider error 后只返回 “email failed” 或 “model failed”。
风险：生产调试丢失 status、provider、model、message 等边界证据。

6. AI 把 parseNemesisReply 改成直接信任模型输出的 URL。
风险：模型可以把任意外链塞进前端附件，破坏白名单资源边界。

7. AI 让 localStorage 里的历史消息直接提交给后端，不做 role/text 归一化。
风险：客户端存储不可信，可能污染 recentMessages、放大 prompt 注入或超长上下文。

8. AI 给 Grok 路由也默认 fallback 到 DeepSeek。
风险：roast/persona 语气和安全边界可能跨 provider 漂移，且改变了当前 route contract。
```

---

# 12. TypeScript 知识点必须补强

当前项目是严格 TypeScript 项目，`tsconfig.json` 已开启 `strict: true`、`isolatedModules: true`、`moduleResolution: "Bundler"`、`target: "ES2022"`。题目不能只考 Remix 概念，也要训练用户判断 AI 写出的 TypeScript 是否破坏类型边界。

## 12.1 每个高级单元必须覆盖的 TS 能力

```txt
1. unknown 输入收窄
真实位置：validateNemesisRequest、parseClassifierJson、parseRouterJson、readNemesisChatSessions、api.nemesis-feedback.ts
训练点：request.json()、localStorage、模型 JSON、第三方响应都应先当 unknown 处理，再用 typeof / Array.isArray / type guard 收窄。

2. discriminated union
真实位置：ChatAttachment 的 sticker/audio/video、NemesisRequestValidationResult 的 ok true/false、SSE done/status/error 事件。
训练点：不能用一堆 optional 字段表达互斥状态，否则会制造 impossible state。

3. 字面量联合类型
真实位置：NemesisMode、NemesisCategory、NemesisQueryType、NemesisPreferredRoute、NemesisSseStep。
训练点：模型输出必须 normalize 到受控 union，不能直接 `as NemesisMode` 信任字符串。

4. 类型守卫和 type predicate
真实位置：isValidAttachments、isPersistedMessage、normalizeRecentMessages。
训练点：`filter(Boolean)` 不等于完整类型验证；复杂对象要写 `value is T`。

5. `satisfies`
真实位置：applyStatusToProgress 中返回对象使用 `satisfies NemesisProgressStep`。
训练点：配置对象、进度 step、路由表适合用 satisfies 验证结构，避免 `as` 把错误压下去。

6. `as const`
真实位置：SSE headers、固定数组、route/status 常量。
训练点：保留 literal type，避免 `"guard"` 被扩大成 string。

7. `import type`
真实位置：大量类型导入，例如 `RuntimeEnv`、`ChatAttachment`、`NemesisProgressStep`。
训练点：类型导入不应变成运行时依赖，尤其是 `.server.ts` 和 `.client.tsx` 边界。

8. Worker/server/client 文件边界
真实位置：`.server.ts`、`.client.tsx` 后缀。
训练点：服务端 secret、AI Gateway、D1、ExecutionContext 不能被 client bundle 引入。

9. Exhaustive handling
真实位置：ChatAttachment renderer、SSE event 处理、model route/provider 分支。
训练点：新增 union 成员时，应让编译器提示未处理分支，而不是落到沉默默认值。

10. 避免 any
真实位置：第三方 provider 响应、模型 JSON、localStorage 数据。
训练点：`any` 会绕过所有安全检查；优先 unknown + parser / normalizer。
```

## 12.2 TypeScript 改坏审查题示例

### 第 TS-1 题：模型 JSON 不能直接断言

#### 题型

代码审查题

#### 题目

AI 把路由解析改成：

```ts
const parsed = JSON.parse(raw) as NemesisQueryRouteDecision;
return parsed;
```

这个改动为什么不能接受？

#### 参考答案

```txt
模型输出是不可信 JSON。直接 `as NemesisQueryRouteDecision` 只是在编译期压过类型检查，运行时并不会验证 queryType、preferredRoute、confidence、quoteTags 是否有效。

正确做法是继续把 parsed 当作 Record<string, unknown>，再通过 normalizeQueryType、normalizePreferredRoute、normalizeQuoteTags、normalizeQuoteIntensity 把未知输入收敛到受控 union 和默认值。
```

### 第 TS-2 题：附件类型不能改成可选字段大对象

#### 题型

AI 改坏审查题

#### 题目

AI 把：

```ts
export type ChatAttachment = StickerAttachment | AudioAttachment | VideoAttachment;
```

改成：

```ts
export type ChatAttachment = {
  type?: string;
  url?: string;
  previewUrl?: string;
  artworkUrl?: string;
  mime?: string;
};
```

有什么问题？

#### 参考答案

```txt
原来的 ChatAttachment 是 discriminated union，`type: "sticker" | "audio" | "video"` 能让渲染、复制、上下文格式化和类型守卫按附件种类安全收窄。

改成可选字段大对象后，会允许大量无效状态，例如 type 是 audio 但没有 previewUrl，或者 sticker 混入 video mime。这样编译器不能再帮助发现遗漏字段，运行时更容易渲染坏附件。
```

### 第 TS-3 题：server/client 边界

#### 题型

代码审查题

#### 题目

AI 为了让聊天页面显示当前模型，把下面导入加到 `app/hooks/useNemesisChat.client.ts`：

```ts
import { getGeminiLiteModel } from "~/services/nemesis.server";
```

为什么这是严重问题？

#### 参考答案

```txt
`useNemesisChat.client.ts` 是浏览器代码，不能导入 `.server.ts` 服务端模块。

`nemesis.server.ts` 会触达 system prompt、Memory Canon、AI Gateway、provider key 相关逻辑。即使只想用一个函数，也可能把服务端依赖拉进 client bundle，破坏 secret 和 Worker-only 边界。

正确做法是服务端在 SSE done/status 事件里返回可公开的 modelName/modelProvider/modelRoute，客户端只消费这些公开字段。
```

### 第 TS-4 题：SSE 事件类型不能随便扩大

#### 题型

最小修复题

#### 题目

AI 为了省事把类型改成：

```ts
export type NemesisSseStatusEvent = {
  step: string;
  state: string;
  label: string;
};
```

请说明风险，并给出更合适的方向。

#### 参考答案

```txt
`step` 和 `state` 原本是 literal union：`NemesisSseStep` 与 `NemesisSseStepState`。客户端 `applyStatusToProgress` 依赖这些受控值把 fallback/parse 映射到 UI progress。

扩大成 string 后，拼写错误、未知 step、错误 state 都不能在编译期暴露，UI 可能静默不更新。

更合适的是保留 union；如果要新增 step，应先扩展 `NemesisSseStep`，再更新客户端映射和对应题目。
```

---

# 13. 题目数据结构也要支持代码审查

原来的 `CoachQuestion` 结构可以表达基础题，但对真实 AI 审查还不够。建议扩展：

```ts
type CoachQuestion = {
  id: string;
  unitId: string;
  lessonId: string;

  layer:
    | "basic"
    | "code-reading"
    | "state-reasoning"
    | "ai-review"
    | "typescript-review"
    | "production-debugging"
    | "free-response";

  type:
    | "single-choice"
    | "multiple-choice"
    | "true-false"
    | "order"
    | "fill-blank"
    | "line-pick"
    | "code-fix"
    | "diff-review"
    | "review-comment"
    | "free-explain";

  difficulty: 1 | 2 | 3 | 4 | 5;

  title: string;
  question: string;
  codeSnippet?: string;
  diffSnippet?: string;

  options?: Array<{
    id: string;
    text: string;
  }>;

  correctAnswer: string | string[];
  explanation: string;
  wrongAnswerFeedback?: Record<string, string>;

  realWorldImpact?: string;
  aiReviewRisk?: string;
  typeSafetyRisk?: string;
  serverClientBoundary?: "server" | "client" | "shared" | "mixed-risk";
  touchedFiles?: string[];
  expectedFixScope?: "one-line" | "single-function" | "single-file" | "cross-file";

  tags: string[];
};
```

新增字段的目的不是让数据复杂，而是强迫出题时说清楚：

```txt
1. 这是普通 bug，还是类型安全 bug？
2. 是否跨 server/client 边界？
3. 是否影响生产调试？
4. 最小修复范围在哪里？
5. 这次 AI patch 触碰了哪些文件？
```

---

# 14. 后续每个单元的最低题量要求

对于 `root.tsx` 这种基础单元，22～30 题可以接受。

对于 Nemesis / AI 编排单元，题量必须更高：

```txt
基础识别题：6～8 题
执行链 / 数据流题：6～8 题
状态推演题：6～8 题
TypeScript 类型安全题：6～8 题
AI diff 审查题：8～12 题
生产调试题：3～5 题
自由复述 / PR Review 题：3～5 题
```

总题库建议：

```txt
每个 Nemesis 核心单元：36～54 题
页面实际展示：12～20 题
复习模式：优先抽错因相同、同一风险链路、同一 TS 概念的题
```

---

# 15. 出题前必须做的代码事实检查

后续让 AI 基于本项目出题前，必须先检查真实代码，不能凭记忆出题。

最低检查清单：

```txt
1. 读目标文件。
2. 读它直接 import 的本项目文件中最关键的 2～5 个。
3. 确认文件后缀：.server.ts、.client.tsx、普通 .ts。
4. 确认该函数是否运行在请求期、浏览器、Worker、SSE stream、localStorage、D1 或第三方 API 边界。
5. 确认输入是否可信：request.json、模型 JSON、localStorage、URL、cookie、env、第三方响应。
6. 确认输出是否会到前端：json、SSE done/status、附件 URL、错误消息。
7. 确认是否有成本边界：D1、Gemini 分类器、主模型、AI Gateway、Resend、R2。
8. 确认是否有审计/日志要求：不能吞 provider 原始错误对象中的 status/name/message。
```

如果没有做这一步，题目很容易变成旧代码题、抽象八股题或错误题。

---

# 16. 更新后的最终判断链

在原有判断链之外，新增下面这条 AI 编排判断链：

```txt
请求在链路的哪一层被拦住？
这一步是在 server、client、Worker stream，还是 third-party boundary？
输入是可信类型，还是 unknown 需要收窄？
这个 union 是否被完整处理？
模型输出是否被 normalize，而不是直接 as？
Guard 拒绝时有没有继续调用主模型？
限流是否在昂贵模型调用之前？
SSE 是否保证 done/error/意外结束都能被客户端处理？
附件是否来自白名单 catalog，而不是模型任意 URL？
fallback 是否符合当前 route contract？
日志是否保留生产调试证据，又没有泄露 secret？
AI patch 的最小修复应该在哪个文件完成？
```

这才更贴近当前项目的真实难度。

---

# 17. 不要让题库被少数文件垄断

后续 AI 生成几百道题时，必须按“项目维度”分桶，而不是读到哪个文件就围绕哪个文件狂出题。

## 17.1 推荐题库配比

如果一次生成 300 道题，建议按下面比例分配：

```txt
Remix / 路由 / loader / action：45～55 题
React 组件 / hooks / 状态管理：45～55 题
TypeScript 基础与项目类型安全：45～60 题
CSS / Tailwind / 响应式 / 可访问性：45～60 题
动画 / 动效库 / 性能：35～45 题
Nemesis AI 编排 / SSE / 多模型：45～60 题
数据、资源管线、缓存、构建脚本：25～35 题
生产调试 / 安全 / 边界审查：25～35 题
```

任何一个文件或单元的题量不应该超过总题库的 15%，除非明确要求只训练该单元。

## 17.2 覆盖优先级

出题时优先覆盖“模式”，再覆盖“文件”：

```txt
模式 1：服务端 loader 准备数据，客户端 useLoaderData 消费。
模式 2：action 处理 mutation，useFetcher 做局部提交。
模式 3：server-only 文件处理 secret、D1、AI Gateway。
模式 4：client-only hook 处理 localStorage、DOM、video、audio、SSE。
模式 5：CSS layer + Tailwind utility + scoped style 混合。
模式 6：Framer Motion 负责状态动画，GSAP 负责滚动时间线。
模式 7：资源脚本生成 app/generated 或 app/data 输出，不手改生成物。
模式 8：第三方/模型/浏览器输入全部先当 unknown 或不可信数据处理。
```

---

# 18. Remix / React 基础题必须覆盖

不要只围绕 root loader。这个项目有多种 Remix 模式。

## 18.1 可出题文件

```txt
app/root.tsx
app/routes/messages.tsx
app/routes/gallery.tsx
app/routes/anime.tsx
app/routes/game.$platform.tsx
app/routes/chat.tsx
app/routes/api.nemesis.ts
app/routes/api.nemesis-feedback.ts
app/components/messages/BubbleMessageBoard.client.tsx
app/components/transitions/RouteTransition.tsx
app/hooks/useNemesisChat.client.ts
```

## 18.2 必须覆盖的 Remix 知识点

```txt
1. loader 与 action 的区别
loader：请求时读取数据。
action：处理 POST / mutation。

2. useLoaderData<typeof loader>
训练点：客户端拿到的是 loader 返回类型；不要重复手写不一致类型。

3. meta / links / headers
训练点：meta 做 SEO；links 加载 route CSS；headers 转发 loader 的 Cache-Control。

4. 动态路由参数
真实位置：app/routes/game.$platform.tsx
训练点：params.platform 是 string | undefined，必须用 isPlatformId 收窄，不可信任 URL。

5. throw new Response 404
训练点：非法 platform 应走 404，不应该 fallback 成随机平台掩盖错误。

6. useFetcher
真实位置：BubbleMessageBoard.client.tsx
训练点：局部提交留言，不触发整页导航；fetcher.state 表示提交状态。

7. Link prefetch="intent"
训练点：用户表现出导航意图时预取，适合站内页面。

8. useNavigation
真实位置：RouteTransition.tsx
训练点：全局导航状态可驱动 route transition，但要处理 idle / loading / submitting。

9. route module 的薄路由原则
训练点：路由负责 loader/action/meta/headers，复杂 UI 放 app/components。

10. Cache-Control 与登录态
训练点：匿名页面可 public cache；含用户 pending/limitStatus 的响应必须 private/no-store。
```

## 18.3 Remix 改坏题示例

```txt
1. AI 把 messages loader 对登录用户也设成 public cache。
风险：用户 pending message / limitStatus 可能被共享缓存污染或泄露。

2. AI 在 game.$platform.tsx 里直接使用 params.platform as PlatformId。
风险：URL 输入未验证，buildGamePlatformData 可能收到非法平台。

3. AI 把 BubbleMessageBoard 的 useFetcher 改成普通 fetch，但没有处理 actionData、pending UI、错误状态。
风险：破坏 Remix mutation 语义和现有 UI 状态。

4. AI 删除 headers: forwardLoaderCacheControl。
风险：loader 设置的缓存策略不能正确透传。

5. AI 把所有 route CSS 全部塞进 root links。
风险：页面级 CSS 失去按路由加载的边界，初始包和样式影响面扩大。
```

---

# 19. React / Hooks 基础题必须覆盖

这个项目里很多问题不是 API 不懂，而是 hooks、状态、effect cleanup、派生状态没想清楚。

## 19.1 必须覆盖的 React 知识点

```txt
1. useState
真实位置：AnimePage、useNemesisChat、BubbleMessageBoard。
训练点：本地 UI 状态、输入框状态、loading/error/typing 分离。

2. useMemo
真实位置：BubbleMessageBoard initialBoardMessages、GamePageClient currentPlatformData / visiblePages。
训练点：昂贵或依赖明确的派生数据，不要滥用，也不要依赖漏项。

3. useCallback
真实位置：AnimePage handlers、useNemesisChat handlers。
训练点：传给 effect 或子组件的稳定回调；依赖数组必须完整。

4. useRef
真实位置：videoRef、GSAP root refs、RouteTransition timer refs、chatWindowRef。
训练点：保存 DOM、timer id、不会触发渲染的 mutable 值。

5. useEffect cleanup
真实位置：GSAP ctx.revert、document keydown removeEventListener、timer clearTimeout、video pause。
训练点：订阅、定时器、动画上下文必须清理。

6. 派生状态与服务端数据同步
真实位置：BubbleMessageBoard 根据 initialBoardMessages 重置 messages。
训练点：props 改变时如何同步本地状态，避免重复插入或 stale UI。

7. optimistic / pending UI
真实位置：fetcher.state、isLoading、requestStage。
训练点：提交中禁用按钮、显示进度、失败恢复。

8. controlled input
真实位置：textarea value/onChange/maxLength。
训练点：输入状态、trim、disabled、required、字数统计。

9. 事件处理
真实位置：keyboard Escape/Space、form preventDefault、video play promise catch。
训练点：浏览器事件、React SyntheticEvent、异步播放策略。

10. 组件拆分边界
训练点：通用 UI 放 components；route 不塞过大交互逻辑；client hook 不导入 server 模块。
```

## 19.2 React 改坏题示例

```txt
1. AI 给 useEffect 少写依赖，导致 sendMessage 用到旧 messages。
风险：用户连续发送或重新生成时历史上下文错误。

2. AI 删除 GSAP cleanup。
风险：路由切换后 ScrollTrigger、pointerenter listener 残留，造成重复动画和内存泄漏。

3. AI 把 submit 状态只存在 DOM disabled 上，不看 fetcher.state。
风险：重复提交、UI 与 action 真实状态不一致。

4. AI 在 render 期间直接调用 video.play()。
风险：副作用出现在渲染阶段，违反 React 模型，并可能触发浏览器播放策略错误。

5. AI 把 useRef timer 改成普通局部变量。
风险：重新渲染后丢失 timer id，RouteTransition 无法可靠 clearTimeout。
```

---

# 20. CSS / Tailwind / 响应式基础题必须覆盖

这个项目的样式不是“随便写 Tailwind class”。它同时使用 Tailwind v4、`@layer`、`@theme reference`、route CSS、scoped `<style>`、CSS 变量、媒体查询和 reduced motion。

## 20.1 可出题文件

```txt
app/tailwind.css
app/styles/theme.css
app/styles/music.css
app/styles/music/_animations.css
app/styles/gallery.css
app/styles/game.css
app/styles/index-route.css
app/components/messages/BubbleMessageBoard.client.tsx
app/components/transitions/RouteTransition.tsx
```

## 20.2 必须覆盖的 CSS 知识点

```txt
1. Tailwind v4 @import / @source
训练点：tailwind.css 是主入口；@source not "../docs" 避免扫描 docs。

2. @layer base / components / utilities
训练点：基础元素、复用组件类、工具类职责不同。

3. @theme reference
真实位置：theme.css
训练点：定义设计 token，让其他 CSS 可引用。

4. CSS custom properties
真实位置：--color-accent、--motion-base、--ease-expo-out、--bubble-size。
训练点：变量用于主题、动效、随机化视觉，不要硬编码到每个元素。

5. color-mix / oklch
训练点：现代 CSS 色彩函数；错误浏览器兼容或 fallback 要注意。

6. 响应式布局
真实位置：grid-template-columns、clamp、@media max-width、md/lg Tailwind。
训练点：桌面两列、移动端单列；固定高度要配合 overflow。

7. Flex vs Grid
训练点：整体二维布局用 grid，局部对齐用 flex；不要全部 flex 硬凑。

8. position / z-index / pointer-events
真实位置：RouteTransition、BubbleBackdrop、Anime modal overlay。
训练点：遮罩层、背景装饰、可点击覆盖层不能抢错事件。

9. transition 与 transform 性能
训练点：优先 transform/opacity，谨慎动画 width/top/left/filter。

10. @keyframes 与 animation-delay
真实位置：bubbleCardIn、pulse-typing、music float。
训练点：入场动画、错峰动画、变量驱动延迟。

11. prefers-reduced-motion
训练点：全局 CSS 和页面动效都要尊重用户减少动画偏好。

12. 可访问性基础
训练点：focus-visible、aria-live、aria-hidden、role="dialog"、aria-modal、aria-label。
```

## 20.3 CSS 改坏题示例

```txt
1. AI 删除 @media (prefers-reduced-motion: reduce)。
风险：动画敏感用户无法关闭大量动效。

2. AI 把 RouteTransition 的 pointer-events 改成 auto。
风险：遮罩可能拦截页面点击，甚至在 leaving 状态造成交互卡死。

3. AI 把 gallery reveal 从 transform 改成 animating clip-path + blur。
风险：大图滚动时触发重绘，低端设备卡顿。

4. AI 把 BubbleMessageBoard 移动端仍保持两列 grid。
风险：窄屏表单和留言流拥挤、文本溢出。

5. AI 把 CSS 变量全部替换为一次性颜色值。
风险：主题、hover、全局 token 失去统一维护能力。

6. AI 在所有元素上长期加 will-change。
风险：占用 GPU 内存，反而降低性能；项目已有注释要求谨慎使用。
```

---

# 21. 动画 / 动效库题必须覆盖

这个项目至少有三类动效系统：

```txt
1. CSS transition / keyframes
2. Framer Motion / LazyMotion / AnimatePresence
3. GSAP / ScrollTrigger / gsap.context
```

后续题库必须让用户知道什么时候用哪一类，不要把所有动效题都问成“这个 class 叫什么”。

## 21.1 Framer Motion 题目维度

```txt
真实位置：
app/routes/anime.tsx
app/components/nemesis/NemesisThinkingBubble.tsx
app/routes/cv.tsx

知识点：
1. LazyMotion + domAnimation 降低加载成本。
2. m.div 是 motion component。
3. initial / animate / exit / transition 的职责。
4. AnimatePresence 让卸载动画生效。
5. mode="wait" 适合单一内容切换。
6. exit 动画需要稳定 key 或条件子节点。
7. 动画参数应尊重 reduced motion 或页面性能。
```

## 21.2 GSAP 题目维度

```txt
真实位置：
app/hooks/useMusicAnimations.client.ts
app/routes/gallery.tsx
app/components/game/GamePageClient.client.tsx

知识点：
1. 动态 import("gsap") 只在客户端加载。
2. ScrollTrigger 需要 registerPlugin。
3. gsap.context 绑定 root，cleanup 用 ctx.revert。
4. ScrollTrigger.batch 适合批量滚动入场。
5. pin + scrub 适合横向滚动陈列。
6. root scoped selector 避免影响其他页面同名 class。
7. pointerenter/pointerleave listener 要手动 dispose。
8. prefers-reduced-motion 下要直接 set visibleState，而不是继续跑时间线。
9. 动画属性优先 transform / opacity。
```

## 21.3 CSS 动画题目维度

```txt
真实位置：
app/tailwind.css
app/styles/music/_animations.css
BubbleMessageBoard scoped style
RouteTransition scoped style

知识点：
1. @keyframes 定义和 animation shorthand。
2. transition-property 只列必要属性。
3. cubic-bezier 缓动变量复用。
4. transform-gpu / translateZ(0) 的使用边界。
5. animation-delay 做错峰入场。
6. loading spinner 可以在 reduced motion 中保留必要动画。
```

## 21.4 动画改坏题示例

```txt
1. AI 把 GSAP import 移到文件顶层。
风险：server render / build 阶段可能引入浏览器依赖，也增加初始包。

2. AI 删除 cancelled 标记。
风险：动态 import 还没完成时组件已卸载，then 里仍然操作 DOM。

3. AI 删除 ctx.revert。
风险：ScrollTrigger 和 inline style 残留到下一个页面。

4. AI 用 setInterval 手写 RouteTransition。
风险：更难与 Remix navigation.state、location.key、清理逻辑协调。

5. AI 把 AnimatePresence 外层去掉。
风险：exit 动画不会执行，modal/loading 消失突兀。
```

---

# 22. 数据、资源管线、构建脚本题必须覆盖

这个项目有不少“生成物不要手改”的管线。如果不出题，AI 很容易直接编辑 `app/generated` 或 `app/data/lyrics/*.json`。

## 22.1 图片管线

```txt
真实位置：
scripts/image-assets.config.mjs
scripts/fetch-image-sources.mjs
scripts/process-images.mjs
scripts/upload-public-images.mjs
app/generated/image-manifest.ts

训练点：
1. raw images 来源在 assets/images/raw。
2. process-images 用 sharp 转 webp，animated/gif 例外保留。
3. 文件名带 sha256 内容 hash 前 8 位。
4. public URL 指向 CDN_BASE 或 OSS_BASE。
5. manifest 是 AUTO-GENERATED，不手改。
6. upload-manifest 给上传脚本使用。
7. 新增图片应改 config + 跑 images:process / images:upload。
```

## 22.2 歌词管线

```txt
真实位置：
assets/lyrics/*.lrc
scripts/build-lyrics.mjs
app/data/lyrics/*.json

训练点：
1. LRC 时间戳解析成秒。
2. 毫秒位数用 padEnd 归一。
3. 空文本行跳过。
4. 输出按 time 排序。
5. app/data/lyrics 是生成结果，改歌词源应从 assets/lyrics 入手。
```

## 22.3 静态数据与领域类型

```txt
真实位置：
app/data/game.ts
app/types/game.ts
app/data/updates.ts
app/data/music-showcase.ts

训练点：
1. 静态内容放 app/data，不放 app/lib。
2. 共享领域类型放 app/types。
3. PlatformId 是受控 union，不是任意 string。
4. AllGamesData 用 mapped type 保证每个平台都有数据。
5. changelog 只改 app/data/updates.ts。
```

## 22.4 资源管线改坏题示例

```txt
1. AI 直接编辑 app/generated/image-manifest.ts。
风险：下次 images:process 会覆盖，且绕过 hash 和上传队列。

2. AI 把 raw 图片直接放 public 并引用。
风险：绕过 R2/CDN hash cache 策略，生产缓存不可控。

3. AI 直接编辑 app/data/lyrics/goodbye.json。
风险：下次 lyrics:build 覆盖；正确源头是 assets/lyrics。

4. AI 把 Platform.id 改成 string 后删除 PlatformId。
风险：gamePlatformHref、isPlatformId、AllGamesData 的类型约束失效。
```

---

# 23. TypeScript / CSS / Remix 经典基础题也可以有

题库不必全部是项目深水区。可以加入经典基础题，但必须和项目代码建立连接。

## 23.1 TypeScript 经典基础题

```txt
1. type 和 interface 的区别，以及本项目何时用 type union。
2. union / intersection 的含义。
3. nullable：number | null 和 number | undefined 的区别。
4. 泛型函数：paginateGames<T> 为什么返回 T[]。
5. 类型守卫：platformId is PlatformId 的意义。
6. Record<K, V> 和 mapped type 的区别。
7. ReturnType<typeof useNemesisChat> 的作用。
8. React.CSSProperties 何时需要类型断言。
9. request.json() 为什么不该直接 any。
10. `as const`、`satisfies`、`import type` 的具体用途。
```

## 23.2 CSS 经典基础题

```txt
1. position: absolute / fixed / sticky 的区别。
2. z-index 为什么需要定位上下文和 stacking context。
3. overflow hidden / auto 的行为。
4. object-fit: cover 适合图片/视频裁切。
5. grid-template-columns: minmax(0, 3fr) minmax(280px, 1fr) 的含义。
6. flex-wrap 解决小屏换行。
7. clamp(min, preferred, max) 做响应式字体/间距。
8. transition 和 animation 的区别。
9. transform 不影响文档流，width/top/left 会触发布局。
10. media query 和 Tailwind responsive prefix 的对应关系。
```

## 23.3 Remix / React 经典基础题

```txt
1. loader 在服务端运行，组件在服务端渲染和浏览器 hydration 后运行。
2. action 处理非 GET mutation。
3. useLoaderData 读取当前 route loader 数据。
4. Link 和 a 标签的差异。
5. Form / useFetcher / fetch 的取舍。
6. useEffect 不在服务端运行。
7. controlled component 是什么。
8. key 在 list rendering 和 AnimatePresence 中的意义。
9. ErrorBoundary 处理路由错误。
10. Suspense/lazy 为什么用于 LoginDialog 和 GoogleOneTap。
```

## 23.4 基础题的质量要求

基础题可以考概念，但必须落到真实代码：

```txt
差题：useEffect 是什么？

好题：在 app/routes/gallery.tsx 中，为什么 GSAP 初始化放在 useEffect 里，而不是 loader 或组件顶层？

差题：CSS grid 是什么？

好题：BubbleMessageBoard 为什么桌面端用两列 grid，移动端在 900px 以下改成一列？

差题：TypeScript union 是什么？

好题：为什么 ChatAttachment 用 sticker/audio/video discriminated union，而不是一个全可选字段对象？
```

---

# 24. 多样化抽题规则

为了避免生成题库时重复扎堆，后续 AI 必须执行这个抽题规则：

```txt
1. 先选维度，再选文件。
2. 同一文件连续最多出 8 题。
3. 同一知识点连续最多出 5 题。
4. 每 20 题至少包含：
   - 3 道 TypeScript
   - 3 道 CSS / responsive / accessibility
   - 3 道 Remix / loader / action / navigation
   - 3 道 React hooks / state
   - 2 道 AI 审查
   - 2 道状态推演
   - 1 道生产调试或缓存
   - 1 道自由复述 / review comment
5. 每 50 题至少覆盖：
   - 一个服务端 route
   - 一个 client component
   - 一个 CSS 文件
   - 一个数据文件
   - 一个脚本或生成管线
   - 一个动画实现
```

如果用户要求“生成全项目题库”，不能只读 `root.tsx` 和 `api.nemesis.ts`。至少要读：

```txt
app/root.tsx
app/routes/messages.tsx
app/components/messages/BubbleMessageBoard.client.tsx
app/routes/gallery.tsx
app/routes/anime.tsx
app/routes/game.$platform.tsx
app/components/game/GamePageClient.client.tsx
app/hooks/useMusicAnimations.client.ts
app/components/transitions/RouteTransition.tsx
app/routes/api.nemesis.ts
app/services/nemesis.server.ts
app/services/nemesis-guard.server.ts
app/lib/nemesis-sse.client.ts
app/tailwind.css
app/styles/theme.css
app/styles/music.css
app/styles/music/_animations.css
scripts/process-images.mjs
scripts/build-lyrics.mjs
```

这份读取清单是最低要求，不是上限。
