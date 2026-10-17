// 更新日志数据类型
export type UpdateType = 'feature' | 'fix' | 'improvement' | 'breaking';

export interface UpdateLog {
  id: string;
  version: string;
  date: string;
  type: UpdateType;
  title: string;
  description: string;
  items: string[];
}

/** 首页更新日志卡片用的精简条目。 */
export type ChangelogPreviewEntry = Pick<UpdateLog, 'id' | 'version' | 'date' | 'title'>;

export function getSortedUpdates(): UpdateLog[] {
  return [...updates].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** 列表里的紧凑日期（10.13），各语言通用；日期是纯日期字符串，按 UTC 取避免时区偏移。 */
export function formatUpdateShortDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getUTCMonth() + 1}.${String(date.getUTCDate()).padStart(2, '0')}`;
}

// 所有更新日志数据 - 按时间倒序（最新的在前）
export const updates: UpdateLog[] = [
  {
    id: '57',
    version: 'v1.53.0',
    date: '2026-10-17',
    type: 'feature',
    title: '🔵 跨页圆形转场与跳转提速',
    description: '不同页面之间用圆形展开过渡，站内跳转明显更快，每个子页面左上角都有回首页的出口',
    items: [
      '不同页面之间跳转时从屏幕中心圆形展开；同一模块内跳转和后退仍然直接切换',
      '站内链接进入视口就预取，首页空闲时预取各模块；省流量模式和 2G 网络下不预取',
      '音乐、简历、小麦岛、相册、动漫页不再需要服务端数据，点进去不用再等一次请求',
      '普通跳转不再重新请求全站数据，每次省一次约 330ms 的往返',
      '静态资源改为一年永久缓存，预取过的样式点击时不再回源',
      '修复慢跳转进度条被拍进转场画面、转场被提前掐断的问题',
      '动漫页去掉音频弹窗和加载遮罩，站内进入直接有声播放（被浏览器拦截时退回静音并给出开声音按钮）；相册、小麦岛去掉进场动画',
      '新增统一的「返回首页」入口，放在子页面左上角，原本没有出口的音乐、相册、小麦岛页也补上了',
    ]
  },
  {
    id: '56',
    version: 'v1.52.0',
    date: '2026-10-16',
    type: 'feature',
    title: '🧪 音乐页换成米色科学图版',
    description: '音乐页换成标本图版风格：谱系树按风格、歌手、歌分科属种，地层柱按年份堆叠；首页也一起提速',
    items: [
      'Plate I 谱系树：科是风格、属是歌手、种是歌，外圈标出语种和来源；悬停高亮，点开看标本卡',
      'Plate II 地层柱：每年的歌手是这一层的标准化石，点击某层查看化石卡',
      '首屏只留谱系树，桌面端一屏就能看到整棵树，生长动画只在进场时播一次',
      '图版由服务端直接输出 SVG，删除旧的星空、粒子和 GSAP 动画页面',
      '首页：打开时不再查数据库，留言收音机滚到附近才加载留言',
      '首页：去掉 hero 逐字动画和照片网络的常驻动画循环，音乐区改为服务端直出，背景纹理图不再懒加载',
    ]
  },
  {
    id: '55',
    version: 'v1.51.0',
    date: '2026-10-15',
    type: 'feature',
    title: '🛠️ 首页终端换成「构建记录」',
    description: '首页原来的假 AI 工作台换成这个网站的真实构建记录：真实的对话、提交和改动',
    items: [
      '每个任务里的用户消息是当时和 Claude Code 对话的原话，AI 回复是实际回复的节选',
      '提交列表、提交热力图、按小时分布和 Token 账本都从 git 与会话记录生成',
      '右侧面板按任务展示代码 diff、仓库里的真实文档、规划视图或页面截图；标签可关闭，点文件卡片重新打开',
      '窗口不再使用毛玻璃，只在需要时更新，不再高频整窗重渲染',
      '删除补给 Token、Echo Token 和微信复制等旧功能',
    ]
  },
  {
    id: '54',
    version: 'v1.50.0',
    date: '2026-10-15',
    type: 'improvement',
    title: '⚡ 框架升级与资源瘦身',
    description: '从 Remix v2 升级到 React Router v7，字体和图片按需加载，首页体积大幅下降',
    items: [
      '框架从 Remix v2 升级到 React Router v7',
      '字体按字频和站内实际用字重新切片，首页字体从 11.6MB 降到约 0.4MB',
      '图片管线生成多种宽度的 webp，首页、相册、游戏、音乐、小麦岛和简历页改用 srcset，按屏幕大小加载',
      '清理 public 下未使用的游戏大图',
    ]
  },
  {
    id: '53',
    version: 'v1.49.0',
    date: '2026-10-15',
    type: 'feature',
    title: '🌐 全站中日英三语',
    description: '全站支持中文、日文、英文，按浏览器语言自动进入对应版本',
    items: [
      '新增 /ja 与 /en 版本，页头可切换语言，切换后会记住选择',
      '登录、错误页、留言板、Nemesis 聊天界面和各页面内容全部翻译，简历、游戏、更新日志等长内容也有日英版本',
      '访问不带语言前缀的地址时，按浏览器语言自动跳转：中文留在原页，日文进 /ja，其它语言进 /en',
      '已翻译页面输出 hreflang，方便搜索引擎识别不同语言版本',
      '收音机开场句随语言切换，补翻番剧卡片说明',
    ]
  },
  {
    id: '52',
    version: 'v1.48.1',
    date: '2026-10-14',
    type: 'feature',
    title: '📜 首页加入更新日志卡片',
    description: '首页新增更新日志卡片，最近几次更新一眼可见',
    items: [
      '参照 Cursor 的更新日志样式，在首页列出最近的版本和标题',
      '点击条目直达更新日志页对应的版本',
    ]
  },
  {
    id: '51',
    version: 'v1.48.0',
    date: '2026-10-14',
    type: 'improvement',
    title: '🧠 Nemesis 第二轮调优',
    description: '模型改为直连，分类器判断更可靠，挑衅和危机场景的回复更像人',
    items: [
      '改为直连各家模型 API；暂停 Grok，复杂问题改走 DeepSeek，DeepSeek 失败时退回 Gemini',
      '分类器不再自报置信度，拿不准时给出备选策略，减少误拦和漏拦',
      '新增仇恨歧视、色情内容、虚假信息、赌博四个风险类目：只有要求生成时才拦，讨论和求助照常回答',
      '面对挑衅改用阴阳回刺的手法，不再照搬示范句',
      '危机回复分三档：发泄时陪着聊、反复提起时直接问、有具体计划时给出 120 和 12356 心理援助热线',
      '补上朋友隐私和行踪的回答边界；回复不再出现后台术语',
      'DeepSeek 关闭思考模式，避免返回空回复；表情包标签写错时也能识别',
      '聊天页隐私说明按实际留存范围重写，修复聊天页服务端渲染时报 500',
    ]
  },
  {
    id: '50',
    version: 'v1.47.0',
    date: '2026-10-13',
    type: 'feature',
    title: '📻 首页留言板改成收音机',
    description: '每条留言都是一个电台：拖动刻度或自动巡台来收听，台与台之间是噪声',
    items: [
      '每条留言创建时分配一个 FM 频率，拖动刻度或巡台就能调到不同留言',
      '调台时有钢琴音和沙沙声，钢琴采样进入视口才加载',
      '留言上限改为 140 字，同时最多 9 条在播',
      '收音机不在视口时停掉动画和声音，开启减少动态效果时不播放动画',
      '留言时间统一按北京时间显示',
    ]
  },
  {
    id: '49',
    version: 'v1.46.0',
    date: '2026-10-13',
    type: 'feature',
    title: '🎬 首页视频换上自定义播放器',
    description: '羊蹄山之魂视频不再用浏览器原生控件，改成干净的自定义播放器：画面撑满、没有黑边，鼠标离开就只剩画面',
    items: [
      '鼠标在画面里移动时才显示中间大图标和底栏，静止 3 秒或移出画面全部淡出，暂停时也一样',
      '底栏为播放 / 暂停、时间、白色进度条（可拖动）、静音、全屏和设置菜单（播放速度、复制链接）',
      '滚到视频处静音自动播放并循环，滚出视口自动暂停；手动暂停后不会被自动恢复；开启减少动态效果时不自动播放',
      '裁掉片源自带的上下电影黑边，内联播放画面撑满，全屏时恢复完整画面',
      '封面换成视频里的蓝花田一帧，不再拿背景油画当封面',
      '去掉视频区块后面的油画背景和拖拽窗口，视频直接放在页面底色上，顺带修掉了这块造成的横向滚动条',
      '支持键盘：空格 / K 播放暂停，M 静音，F 全屏，← → 快退快进 5 秒',
    ]
  },
  {
    id: '48',
    version: 'v1.45.0',
    date: '2026-10-02',
    type: 'feature',
    title: '🌒 Nemesis 聊天界面重构',
    description: '聊天页换成「影子对谈」设计：墨色圆加陶土影子的标识，三段思考轨迹，能停、能跳过、能重试',
    items: [
      '回复改为左侧标识 + 衬线正文的阅读式排版，用户消息为右侧纸条；模型名以等宽小字签在回复末尾',
      '思考过程改为「理解 → 选路 → 生成」三段轨迹，显示用时；主模型失败切换备用时节点和文案转为赭色',
      '发送按钮按状态切换：生成中可停止（问题退回输入框），逐字打出时可直接显示全部，上游报错可一键重试',
      '侧栏会话按「今天 / 更早」分组，显示时间与条数；删除改为行内二次确认',
      '反馈改为分类胶囊 + 补充说明，提交后标记已反馈；复制成功有对勾提示',
      '隐私说明挪到输入框下方的说明行，首次访问的提示条可展开详情',
      '空状态新增四个推荐问题；音乐卡、表情包、视频附件统一新样式',
      '手机端侧栏改为抽屉，点遮罩关闭；所有动效只动 transform / opacity，并尊重减少动态效果设置',
    ]
  },
  {
    id: '47',
    version: 'v1.44.0',
    date: '2026-10-02',
    type: 'improvement',
    title: '🧭 Nemesis 安全降级改造',
    description: '分类器只决定「怎么答」，不再冷拒绝；只有硬红线才回固定文案',
    items: [
      'Guard 与路由合并为一次 Gemini 调用，输出回答策略与模型路由',
      '分类器故障降级为正常回答，低置信度拦截降级为谨慎回答',
      '求助类给出有用信息与求助信号，危机类优先关怀并提供 120 / 110',
      '新增输出侧原文泄露检查，整段搬运人设资料或系统提示时整条替换',
      '主模型与分类器升级到 gemini-3.5-flash-lite，并新增 117 条用例的离线评测',
    ]
  },
  {
    id: '46',
    version: 'v1.43.1',
    date: '2026-10-02',
    type: 'fix',
    title: '🔒 限流、登录链接与 Nemesis 链路加固',
    description: '限流故障时不再放行，Nemesis 请求可随页面离开中止，历史回复改为服务端签名',
    items: [
      '限流服务故障时 Nemesis 返回 503，而不是静默放行',
      'Magic Link 发信前原子扣减额度，消除并发竞态，不再透出邮件服务原始错误',
      'Nemesis 流式响应增加心跳与总时限，离开聊天页时中止请求并取消上游模型调用',
      '历史回复由服务端签名，只信任签名有效的消息，阻断伪造上下文',
      '新增全站 404 兜底路由，root 数据出错时页面框架仍能正常渲染错误页',
    ]
  },
  {
    id: '45',
    version: 'v1.43.0',
    date: '2026-10-02',
    type: 'improvement',
    title: '🗂️ 更新日志改为年份索引',
    description: '更新日志页按年分组，一版一行，点开再看细节',
    items: [
      '每个版本一行：日期、版本号、标题与类型，点击展开说明和改动条目',
      '新增按类型筛选，支持通过链接直达某个版本',
      '移除入场淡入、光斑、胶囊标签等多余装饰',
    ]
  },
  {
    id: '44',
    version: 'v1.42.0',
    date: '2026-10-01',
    type: 'improvement',
    title: '🎮 游戏典藏页与简历页改版',
    description: '游戏页改为「玩家典藏」编辑式布局，简历页改为侧栏档案布局',
    items: [
      '游戏页：米白纸色与衬线排版，页首统计加可切换的「本期封面」，点击任意游戏即替换',
      '游戏页：PlayStation 奖杯柜、平台分布、满分殿堂，以及支持筛选 / 排序 / 搜索的全部收藏',
      '简历页：深色侧栏放基本信息、技能与个人探索，主栏用时间线展示履历',
      '简历页：背景为缓慢漂移的色块加细噪点，去掉 emoji 图标与虚构的技能百分比',
    ]
  },
  {
    id: '43',
    version: 'v1.41.0',
    date: '2026-08-29',
    type: 'feature',
    title: '🎶 夺心之声 YRC 逐词流光与曲库扩充',
    description: '首页音乐播放器全面升级网易云 YRC 逐词流光歌词，支持毫秒级逐词对齐与曲目扩充',
    items: [
      '重构歌词数据模型（LyricLine / LyricWord），支持字符与单词级时间轴及中英双语独立字幕',
      '在首页「夺心之声」播放器中引入 60FPS 逐词流光渐变染色（Karaoke Wipe）与平滑居中滚动',
      '支持点击任意歌词单句或单个单词毫秒级定位跳转（Click-to-Seek）',
      '全量转换并收录 Nine Point Eight、まっしろな雪、コネクト、Moments 等 6 首经典曲目的微秒级 YRC 逐字数据',
      '新增扩充 4 首高品质曲目（《エタニクル》、《Daisy Crown》、《远航星的告别》、《アルカテイル》），播放列表升级至 10 首',
    ]
  },
  {
    id: '42',
    version: 'v1.40.0',
    date: '2026-06-23',
    type: 'improvement',
    title: '🖼️ 首页影像网络重构',
    description: '将首页照片区改为曲线网络构图，诗句沿线排布并更新影像资源',
    items: [
      '复用 demo 中的 Careers Network 视觉结构，改造成个人站首页影像网络组件',
      '把原照片区诗句拆分为多条短句，并通过 SVG textPath 贴合曲线路径展示',
      '统一组件背景到站点主背景色，补齐九宫位图片布局与移动端位置规则',
      '替换部分首页影像为 OSS 新资源 n10、n11、n12、n13',
      '排除 public/demo 与 build 产物参与主项目 TypeScript 检查，避免示例代码污染基线',
    ]
  },
  {
    id: '41',
    version: 'v1.39.0',
    date: '2026-06-14',
    type: 'improvement',
    title: '🛡️ Nemesis 安全分类器纯 AI',
    description: '移除本地关键词规则与 SAFE_BOUNDARY，安全层只判断合规放行',
    items: [
      '安全分类器不再注入任何本地关键词/正则规则提示，仅保留空输入与长度限制',
      '下线 SAFE_BOUNDARY 与 safe_boundary 回复模式；放行后一律进入意图分类与主模型',
      '分类器只输出 PASS / CLARIFY / REFUSE，站点内容与人设讨论默认放行',
    ]
  },
  {
    id: '40',
    version: 'v1.38.0',
    date: '2026-06-14',
    type: 'improvement',
    title: '🧭 Nemesis 双 Gemini 分类器',
    description: '每条消息固定走安全分类 + 意图分类，再用主模型生成回复',
    items: [
      '安全分类器：所有有效消息均调用 gemini-3.1-flash-lite JSON 分类，强规则仅作兜底',
      '意图分类器：恢复 Gemini 查询路由，输出 queryType / quote 提示',
      '主生成改回 Gateway 原生 generateContent，确保 NEMESIS_GEMINI_THINKING_LEVEL=high 生效',
      '分类器仍走 compat 端点（minimal 思考），主回复与分类器分开计费观测',
    ]
  },
  {
    id: '39',
    version: 'v1.37.0',
    date: '2026-06-14',
    type: 'improvement',
    title: '🌐 Nemesis 统一 AI Gateway',
    description: '对外模型调用全部经 Cloudflare AI Gateway 转发，并精简 Guard 与路由链路',
    items: [
      'Gemini、Grok、DeepSeek 请求统一走 Gateway，便于集中观测、配额与厂商密钥管理',
      'Guard 灰区分类改为 Gemini 结构化 JSON，移除 Workers AI 小型分类模型',
      '下线 Qwen 意图路由器与 Workers AI roast 回退；辱骂模式仅规则触发，Grok 失败时回退 DeepSeek',
      '语录候选收紧为规则标签匹配，不再依赖路由器输出的 quote 提示',
    ]
  },
  {
    id: '38',
    version: 'v1.36.0',
    date: '2026-06-13',
    type: 'improvement',
    title: '🎵 Nemesis 聊天推歌体验',
    description: '聊天气泡里推 Apple Music 试听时，先交代原因再挂播放器',
    items: [
      '模型推歌时正文须先用一句话说明「为什么放这首」，再输出 [media:id] 标记',
      '识别到「来看看网站」等来访语境时，优先匹配曲库里偏沉静、克制的曲目',
      '曲库标签与 system prompt 附录对齐，减少误推节奏过快或风格突兀的试听',
    ]
  },
  {
    id: '37',
    version: 'v1.35.0',
    date: '2026-06-13',
    type: 'fix',
    title: '🔀 Nemesis 模型路由纠偏',
    description: '减少意图路由器把正常寒暄误判成特殊回复模式',
    items: [
      '特殊回复模式仅在消息本身命中预设关键词时启用，不再仅凭上文语境误判',
      '好友来访、短句寒暄等跟进消息默认继续走 gemini_lite 正常对话',
      '特殊模式优先 Grok，不可用时由服务端回退 DeepSeek，不再由路由器直选备用小模型',
    ]
  },
  {
    id: '36',
    version: 'v1.34.0',
    date: '2026-06-13',
    type: 'improvement',
    title: '🧠 Nemesis 记忆与资源路由优化',
    description: '扩充 Nemesis 隐藏记忆，并改进页面缓存透传与 Worker 静态资源直出',
    items: [
      'Memory Canon 增补宿主生活语境记忆，便于 Nemesis 更准确理解对话背景',
      '内容页 loader 的 Cache-Control 经 route headers 正确转发，改善缓存行为',
      'Worker 统一处理 R2 字体与贴纸直出，并优先走 Worker 路由再回落静态资源',
    ]
  },
  {
    id: '35',
    version: 'v1.33.0',
    date: '2026-06-11',
    type: 'fix',
    title: '🔐 Magic Link 登录修复',
    description: '修复线上 Magic Link 因重复限流与提前扣额度导致的发信失败体验',
    items: [
      '限流改为先检查后扣额，仅在 Resend 发信成功后才写入 IP/邮箱/冷却计数，避免失败请求误消耗额度',
      '移除 api.auth 路由层重复的 IP 限流拦截，统一由 sendMagicLink 返回 Better Auth 标准错误格式',
      '冷却中返回带秒数与剩余次数的提示，登录面板倒计时可正确显示',
      'IP 每小时上限从 5 次调整为 10 次，Better Auth 插件内建限流放宽至 10 次/分钟',
    ]
  },
  {
    id: '34',
    version: 'v1.32.0',
    date: '2026-06-10',
    type: 'feature',
    title: '🎵 Nemesis Apple Music 试听',
    description: 'Nemesis 可在合适语境下推送 Apple Music 30 秒官方试听，聊天气泡内展示歌曲卡片与 Listen on Apple Music 徽章',
    items: [
      '新增 key_eternicus 曲目白名单（trackId 1844276892），模型输出 [media:id] 由服务端解析 previewUrl 与封面元数据',
      '扩展 attachments 支持 audio 类型；同一条回复可同时含 1 张贴纸 + 1 首试听',
      '聊天页新增 ChatAudioPlayer：封面、播放/暂停、30 秒进度条，紧邻英文官方 Apple Music 徽章外链完整版',
      'normal 模式 system prompt 注入音乐语义附录；新增 music:sync 脚本刷新 iTunes lookup 元数据',
      '补齐 recentMessages 占位、复制、localStorage 校验对音乐附件的兼容'
    ]
  },
  {
    id: '33',
    version: 'v1.31.0',
    date: '2026-06-08',
    type: 'feature',
    title: '😺 Nemesis 聊天表情包',
    description: 'Nemesis 可根据对话语义在回复中附带预设表情包，贴纸资源托管在 R2 公链，聊天页直接渲染',
    items: [
      '新增 33 张 Nemesis 贴纸语义目录，模型在合适语境下输出 [sticker:id]，服务端白名单解析后再映射公链 URL',
      '扩展 /api/nemesis 返回 attachments，聊天页支持文字 + 贴纸气泡展示，打字机结束后显示图片',
      'Worker 新增 /stickers/* 公开路由，从 R2 gregorwang 桶直出 WebP/GIF，长缓存 immutable',
      'normal 模式 system prompt 注入贴纸语义附录；safe_boundary 与 Guard 短路回复不发图',
      '补齐 recentMessages 占位、复制、反馈审计与 localStorage 会话对 attachments 的兼容',
      '新增 stickers:prepare / stickers:upload 脚本，便于后续维护 R2 贴纸资源（素材本身不进仓库）'
    ]
  },
  {
    id: '32',
    version: 'v1.30.0',
    date: '2026-06-04',
    type: 'improvement',
    title: '🎛️ 主站动效、字体与页脚揭示统一',
    description: '整理最近几轮主站视觉提交，把按钮、卡片、音乐页、字体系统、日志页和页脚交互收敛到同一套体验',
    items: [
      '基于近期样式统一提交，补齐主按钮、返回首页按钮、导航 hover、留言入口和部分卡片的统一交互动效',
      '继续收敛 GSAP 与 Framer Motion 使用边界，保留 music 页面重点动效，同时降低滚动监听、hover 触发和动画重建带来的性能压力',
      '新增并落地字体系统审计：把运行时字体变量、display 标题、正文、说明、引用和标签文字接入统一语义类',
      '重做更新日志页面结构，移除主站通用导航与页脚，加入返回首页按钮和悬停展开的版本目录',
      '为游戏、日志、CV、图库、条款和 Xiao 等页面补齐返回入口、字体层级和页面内说明文字的统一规则',
      '首页页脚加入幕布式 Footer Reveal 效果，在保持原始页脚配色的前提下让内容层滚动揭示底部 Canvas footer',
      '清理主站登录页和赛博终端里不再适合当前站点架构的后台/权限识别说明文案'
    ]
  },
  {
    id: '31',
    version: 'v1.29.0',
    date: '2026-06-03',
    type: 'improvement',
    title: '🧩 Nemesis 审计链路与站点说明更新',
    description: '根据近期提交整理 Nemesis 多模型路由、反馈审计、留言板管理与首页 QA 文案更新',
    items: [
      'Nemesis 新增查询路由与多模型调度链路，可在不同模型提供方之间按任务选择，并在模型不可用时回退到可用路径',
      '补齐生成边界与模型调用审计字段，记录路由、模型、分类与安全边界相关信息，便于后续排查异常回答',
      '新增 Nemesis 反馈审计流程，前端反馈、API 入口和后台事件记录形成闭环，方便持续调整拦截与回复质量',
      '修复重新生成回复时安全路径可能漂移的问题，让 regenerate 继续沿用正确的安全判断和上下文链路',
      '整理留言板管理界面，优化审核状态、管理操作和首页展示入口，让日常维护更清楚',
      '更新首页 QA 文案，说明网站定位、长期维护方式、更新节奏和问题反馈渠道'
    ]
  },
  {
    id: '30',
    version: 'v1.28.0',
    date: '2026-05-30',
    type: 'fix',
    title: '🔐 移动端 OAuth 回调来源修复',
    description: '修复移动端与 iPad 社交登录中 redirect_uri 和 state 校验可能因入口域名不一致而失败的问题',
    items: [
      'Better Auth 客户端现在优先使用站点 canonical APP_URL 作为 baseURL，避免移动端从当前 window.location.origin 生成不同授权入口',
      '服务端 OAuth baseURL 在生产环境固定到 BETTER_AUTH_URL / APP_URL，不再让 request origin 直接决定 Google 与 Microsoft 回调地址',
      '保留当前请求 origin 到 trustedOrigins，兼容 Cloudflare、workers.dev、Punycode 和非 canonical 入口的回调校验',
      '新增脱敏 AuthDebug 日志，记录授权发起与回调时的 origin、host、referer、redirect_uri 和 state cookie 状态，便于对比桌面端与移动端链路',
      '继续隐藏 code、state、token 和 secret 等敏感值，只输出排查 OAuth 来源和 cookie 问题所需的安全字段'
    ]
  },
  {
    id: '29',
    version: 'v1.27.0',
    date: '2026-05-30',
    type: 'improvement',
    title: '🧠 Nemesis 上下文拦截与聊天隐私提示',
    description: '优化 Nemesis Guard 的上下文判断，并补齐聊天页等待状态与本地隐私说明',
    items: [
      'Workers AI 前置分类器现在会参考最近对话窗口，避免把同一话题中的代词追问和用户纠错误判为离题',
      '保留硬规则拦截顺序不变，仅对可覆盖的离题/未知分类使用上下文判断，避免改动 Nemesis 主回复逻辑',
      '聊天页等待状态拆分为权限校验、次数查询、范围判断和等待回应，让长请求过程更清晰',
      '新增右上角“隐私说明”入口，说明聊天记录不会写入网站数据库，也不会被站长后台查看',
      '首次进入聊天页时显示轻量隐私提示卡片，确认后使用 localStorage 记住状态，不影响输入和发送'
    ]
  },
  {
    id: '28',
    version: 'v1.26.0',
    date: '2026-05-29',
    type: 'improvement',
    title: '🧭 Nemesis 拦截提示与聊天界面整理',
    description: '调整 Nemesis 拦截响应为前端本地分级提示，并修复聊天输入与会话侧栏体验',
    items: [
      '后端 Nemesis Guard 拦截时只返回 blocked 状态，不再按分类标签下发不同拒绝文案，也不会继续调用 Gemini',
      '前端使用 localStorage 记录本地 blocked 次数，按第 1 次、第 2 次、第 3 次及以后展示固定升级提示',
      '修复聊天输入框键盘事件：只有 Enter 发送，Shift + Enter 换行，避免普通按键误触发发送',
      '重做 /chat 为稳定的左右布局，恢复本地会话侧栏，支持新建、切换和删除本地对话',
      '收紧消息区、顶部状态栏和输入框样式，让 Nemesis 聊天界面更接近日常使用的工作台'
    ]
  },
  {
    id: '27',
    version: 'v1.25.0',
    date: '2026-05-29',
    type: 'improvement',
    title: '🛡️ Nemesis Demo 前置安全分类器',
    description: '为 Nemesis 增加 Workers AI 前置 Guard，在调用 Gemini 前拦截高风险、离题和提示词套取请求',
    items: [
      '新增 Nemesis Guard 服务端链路：登录、限流、长度限制、硬规则拦截、Workers AI 分类后才进入 Gemini',
      '接入 Cloudflare Workers AI 小模型分类器，仅输出安全标签，不回答用户问题，也不向前端暴露内部 reason',
      '加入 prompt / memory 套取、政治议题、身份覆盖、违法指导、隐私滥用、成人内容等固定拒绝回复',
      '为明显离题和高风险输入增加模块顶层正则硬拦截，优先节省 Workers AI 与 Gemini 调用额度',
      '补齐 Wrangler AI binding 与 Cloudflare Env 类型，保持现有限流、登录和数据库结构不变'
    ]
  },
  {
    id: '26',
    version: 'v1.24.0',
    date: '2026-05-29',
    type: 'feature',
    title: '🤖 Nemesis Demo 接入真实 Gemini',
    description: '完成 Nemesis 个人 AI 聊天 Demo 的服务端调用链路，并清理旧的硬编码假对话实现',
    items: [
      '新增 /api/nemesis Remix action，所有 Gemini 调用统一在服务端完成，前端只提交 message 与最近对话',
      '接入后端保护的 System Prompt 与 Memory Canon，避免 API Key、隐藏提示词和记忆文档暴露到浏览器',
      '加入登录访问控制、基础输入长度限制、prompt extraction 拦截、Gemini 429 额度耗尽友好提示',
      '复用现有 Durable Object 限流基础设施，为 Nemesis 增加每分钟与每日次数限制配置',
      '将 Gemini API Key 改为 Cloudflare secret / 本地 .env 管理，并补齐 wrangler 与环境变量配置说明',
      '重写 /chat 为真实 AI 对话页面，删除预设问题、欢迎假消息、本地 conversation storage 和 ASCII 随机回复',
      '移除旧 /api/chat、chatUtils、ChatStorage、ChatAnimations 与 Conversation 类型等不再使用的硬编码聊天代码'
    ]
  },
  {
    id: '25',
    version: 'v1.23.0',
    date: '2026-05-28',
    type: 'improvement',
    title: '🔐 Google 与 Microsoft 登录配置加固',
    description: '重构 Better Auth 社交登录配置，补齐多域名回调、Cloudflare D1 验证与 Wrangler 密钥同步',
    items: [
      '新增 Microsoft 第三方登录入口，与 Google 登录并列展示，保留 Magic Link 登录流程',
      '重构 Better Auth 服务端配置：按请求来源支持 localhost 与 Punycode 正式域名，并补齐 trustedOrigins',
      '显式配置 Microsoft OAuth redirectURI，兼容微软后台使用 workers.dev 回调的限制',
      '加入 Better Auth 稳定密钥、调试日志与 API 错误捕获，便于定位 OAuth token exchange 与回调问题',
      '通过 Wrangler 校验本地与远端 Cloudflare D1 auth 表结构，并同步 Google、Microsoft 与 Better Auth secrets',
      '重做首页影像展示区为竖排诗句与纸张拼贴风格，加入自动轮播与 GSAP 切换动画'
    ]
  },
  {
    id: '24',
    version: 'v1.22.0',
    date: '2026-05-28',
    type: 'improvement',
    title: '🧹 错误边界与Cloudflare规范清理',
    description: '收敛错误边界系统，清理历史重复实现，并优化 Remix + Cloudflare Workers 运行规范',
    items: [
      '统一错误处理为像素龙、游动鱼、黑猫三套边界，删除页面级重复错误 UI 与测试预览路由',
      '清理旧留言板历史实现和未引用模板工具，保留当前动态贝壳留言板体验',
      '抽取缓存头、媒体 token、游戏平台 loader 公共逻辑，减少路由中的重复服务端代码',
      '将媒体 token 签名迁移到 Web Crypto，移除 Node crypto、Buffer、fs/path 等 Workers 不友好依赖',
      '修复更新日志排序会修改源数组的问题，统一首页与归档页日期格式化逻辑',
      '优化本地与生产环境判断：localhost 保持非 secure cookie，生产 HTTPS 自动使用安全 cookie'
    ]
  },
  {
    id: '23',
    version: 'v1.21.0',
    date: '2026-05-27',
    type: 'feature',
    title: '🤖 Chat页面完整重构 - 现代化AI对话体验',
    description: '全面重构聊天页面，实现流式打字机效果、对话管理、Markdown渲染等核心功能，采用Claude/ChatGPT风格布局',
    items: [
      '实现AI回复流式打字机效果，逐字显示更自然',
      '添加对话历史管理，支持多会话切换、新建、删除（localStorage持久化）',
      '集成Markdown渲染和代码语法高亮（react-markdown + react-syntax-highlighter）',
      '支持消息编辑和AI回复重新生成功能',
      '采用左侧边栏布局（可折叠），类似Claude/ChatGPT设计',
      '全面优化UI：渐变背景、现代化消息气泡、流畅动画效果',
      '使用GSAP增强交互动画：欢迎区、消息出现、侧边栏滑动',
      '移除AB测试按钮，精简操作选项'
    ]
  },
  {
    id: '22',
    version: 'v1.20.0',
    date: '2026-05-27',
    type: 'feature',
    title: '🎨 艺术化错误页面与更新日志ribbon设计',
    description: '重构错误边界系统与主页更新日志展示，提升视觉体验与交互流畅度',
    items: [
      '创建三层错误边界系统：全局404（像素龙）、路由级（游动鱼）、组件级（黑猫）',
      '重构主页更新日志为单行ribbon设计，避免不对称布局',
      '优化更新日志卡片为紧凑横向布局，支持移动端横向滚动',
      '添加错误页面预览测试路由 /test/error-preview，便于开发调试',
      '优化鱼的Canvas动画从圆周运动改为水平来回游动',
      '调整错误页面动物配色：龙（金棕）、鱼（蓝）、猫（纯黑）'
    ]
  },
  {
    id: '21',
    version: 'v1.19.0',
    date: '2026-05-27',
    type: 'improvement',
    title: '♻️ 更新日志数据架构重构',
    description: '统一更新日志数据源，实现首页自动显示最新4条，简化维护流程',
    items: [
      '创建统一数据源文件 app/data/updates.ts，集中管理所有版本历史',
      '重构 /updates 页面从统一数据源读取，移除硬编码数据',
      '重构首页更新日志组件自动取最新4条，无需手动维护',
      '修复首页显示5条更新日志的问题，确保始终显示4条',
      '更新 CLAUDE.md 添加更新日志管理指南，规范未来开发流程'
    ]
  },
  {
    id: '20',
    version: 'v1.18.0',
    date: '2026-05-27',
    type: 'feature',
    title: '🌀 更新日志体验与页面切换重构',
    description: '重构首页更新日志摘要、完整更新档案阅读结构，并加入纯白径向扩张的受控页面切换动效',
    items: [
      '重做首页更新日志组件：保留四条最新记录，去除多余说明、外框和横向滚动，让模块自然融入首页背景',
      '优化更新日志卡片 hover：取消上浮悬浮效果，改为更克制的材质与边缘光变化',
      '重构 /updates 页面阅读体验：加入版本目录、快速跳转、当前段落高亮和更清晰的版本信息层级',
      '修复版本目录跳转：目录项改为整块可点击，并使用 scrollIntoView 精确滚动到对应版本',
      '新增受控页面切换：点击查看完整更新日志后先瞬移回页面顶部，再播放纯白圆形 clip-path 扩张，遮罩铺满后再导航',
      '压缩白屏停顿：按真实动画进度计算淡出时机，让更新页面在遮罩后自然露出'
    ]
  },
  {
    id: '19',
    version: 'v1.17.0',
    date: '2026-05-26',
    type: 'feature',
    title: '🔐 登录体验与进入动效重构',
    description: '将登录流程升级为站内艺术化弹窗，统一管理员权限识别，并加入像素小人进入动效与 Google One Tap 快捷入口',
    items: [
      '重构登录入口：Header、留言区与移动菜单统一打开站内登录弹窗，保留 /auth 作为直接访问 fallback 页面',
      '升级登录视觉：使用纸感卡片、墨色洗层、陶土色光晕和长缓动，让登录面板更贴合个人艺术网站气质',
      '统一登录回跳：Google 登录与 Magic Link 都支持安全 returnTo，并在登录成功后回到原位置播放进入动效',
      '重设管理员逻辑：不再区分单独管理员登录页，登录后由服务端根据 ADMIN_EMAILS 自动识别管理员权限',
      '接入 Google One Tap：仅在未登录且当前来源匹配时尝试唤起快捷登录，避免影响 Magic Link 与管理员入口',
      '新增登录成功动效：像素小人从中央出现，伴随扫描线、像素粒子与状态提示，随后飞入右上角身份区域'
    ]
  },
  {
    id: '18',
    version: 'v1.16.0',
    date: '2026-05-25',
    type: 'feature',
    title: '🪶 首页叙事与交互重写',
    description: '重写首页 Hero 叙事层，引入 GSAP 多语言切换，并收束音乐展示区与留言板体验',
    items: [
      '新增 GSAP 驱动的首页 Hero：支持中文、日本語、English 三种阅读层，并使用字符错位入场与退场动画',
      '重写首页提示文案：从普通开发中公告改为更贴近个人艺术网站语境的开放中叙事',
      '优化 Hero 布局稳定性：固定文本舞台高度，避免语言切换时牵动下方内容跳动',
      '收束首页音乐展示区高度：移除强制整屏布局，让音乐组件按内容自然呈现',
      '接入动态贝壳留言板，并为客户端 3D 组件增加 ClientOnly 包裹以避免 SSR 渲染异常'
    ]
  },
  {
    id: '16',
    version: 'v1.14.0',
    date: '2026-05-21',
    type: 'feature',
    title: '🎨 动态 Canvas 页脚与交互式文字解构',
    description: '引入全新的动态 Canvas 页脚系统，实现文字粒子化解构动画效果',
    items: [
      '新增动态 Canvas 页脚组件：实现基于 Canvas 的实时文字渲染与粒子动画系统',
      '交互式文字解构效果：文字可以动态分解为粒子并重新组合，提供沉浸式视觉体验',
      '优化视频展示布局：调整视频组件的排版和响应式设计',
      '修复 Vite 开发环境下的 D1 数据库绑定问题，提升本地开发体验',
      '内置主页音乐数据到代码仓库，减少外部依赖'
    ]
  },
  {
    id: '15',
    version: 'v1.13.0',
    date: '2026-05-20',
    type: 'feature',
    title: '🎮 娱乐体验与终端视觉重大进化',
    description: '全新升级赛博终端视觉系统，加入全新趣味 Token 互动小游戏',
    items: [
      '赛博终端（Cyber-Terminal）界面重构：全新引入高质感的"奶油磨砂玻璃"视觉设计，大幅增强沉浸感',
      '新增作曲家系统警告横幅（Composer System Warning Banner），提升科技交互氛围',
      '加入"乌龙乌龙 Token 游戏"：移除传统的微信二维码弹窗，通过终端命令或彩蛋进行代币互动',
      '提供配套的 Token 领取 API 接口及 D1 数据库迁移支持，实现代币数据持久化',
      '优化并修复了 Vite 环境下的 Cloudflare D1 数据库绑定，引入 cloudflare-env 工具更安全地读取环境变量'
    ]
  },
  {
    id: '14',
    version: 'v1.12.0',
    date: '2026-02-22',
    type: 'improvement',
    title: '⚡ 性能调优与 Cloudflare 部署架构加固',
    description: '全面优化在 Cloudflare Workers 中的代码打包体积与运行环境兼容性，内置歌词数据',
    items: [
      '音乐播放器歌词内置：整理并直接内置多首主页经典歌曲的 LRC 歌词数据（如 Goodbye、Moments 等），摆脱外部接口依赖',
      '边缘运行环境兼容性修复：从共享 Bundle 路径中移除了 Node.js 原生的 crypto 模块，确保在 Cloudflare Workers 等 Edge 运行环境中零报错运行',
      '打包体积深度优化：应用 Cloudflare P1 捆绑包清理机制，移除了 Rollup Visualizer 插件，精炼最终编译文件并编写 Worker 体积审计文档',
      '基础架构配置加固：加固了 Cloudflare Build 的 CSS 资源编译，优化了 .gitignore 文件，提供了标准的 .env.example 开发配置'
    ]
  },
  {
    id: '1',
    version: 'v1.11.0',
    date: '2025-11-10',
    type: 'improvement',
    title: '🎨 视觉与性能重大升级',
    description: '重新设计 Gallery 页面，大幅优化图片加载性能，提升用户体验',
    items: [
      '重新设计 Gallery 页面，参考优秀摄影网站最佳实践，替代原 Photo 页面',
      '将 36 张原图（180MB）压缩转换为 WebP 格式（14MB），大幅提升加载速度',
      '新增首页动画组件 donghua.tsx，增强视觉体验'
    ]
  },
  {
    id: '2',
    version: 'v1.10.9',
    date: '2025-11-09',
    type: 'improvement',
    title: '🔒 安全性增强',
    description: '为 Magic Link 登录添加限流策略，防止滥用',
    items: [
      '实现 Magic Link 登录限流机制',
      '优化安全策略配置'
    ]
  },
  {
    id: '3',
    version: 'v1.10.8',
    date: '2025-11-08',
    type: 'improvement',
    title: '🔒 安全性增强',
    description: '集成 Redis 缓存系统，为留言板添加访问限流机制',
    items: [
      '集成 Redis 缓存系统',
      '为留言板添加访问限流机制',
      '提升系统安全性和稳定性'
    ]
  },
  {
    id: '4',
    version: 'v1.10.7',
    date: '2025-11-07',
    type: 'feature',
    title: '🎵 新功能上线',
    description: '推出音乐播放器页面，集成多种登录方式',
    items: [
      '推出音乐播放器页面（musicindex.tsx）',
      '实现网易云音乐歌词滚动显示功能',
      '新增 Google 第三方登录',
      '集成 Resend API 实现 Magic Link 邮箱登录',
      '优化 Better Auth 登录体验'
    ]
  },
  {
    id: '5',
    version: 'v1.10.6',
    date: '2025-11-06',
    type: 'improvement',
    title: '⚡ 架构优化',
    description: '完全移除 Supabase 依赖，迁移至本地数据库方案',
    items: [
      '完全移除 Supabase 依赖，解决数据库连接延迟问题',
      '迁移至 Better Auth + 本地 SQLite',
      '首屏加载速度显著提升',
      '新增网站更新日志组件'
    ]
  },
  {
    id: '6',
    version: 'v1.10.5',
    date: '2025-11-05',
    type: 'improvement',
    title: '🔍 性能深度优化',
    description: '通过 Claude Code 进行全面性能审查，简化代码结构',
    items: [
      '通过 Claude Code 进行全面性能审查',
      '简化图片加载逻辑，部分资源迁移至 CDN',
      '移除不必要的 Token 加密，降低代码复杂度',
      '优化整体性能表现'
    ]
  },
  {
    id: '7',
    version: 'v1.10.4',
    date: '2025-11-04',
    type: 'improvement',
    title: '🎨 设计系统重构',
    description: '建立全新品牌色彩体系，提升视觉一致性',
    items: [
      '建立全新品牌色彩体系',
      '优化字距、行距和网格系统',
      '改造 Game 和 CV 页面，提升视觉一致性',
      '统一设计语言和组件规范'
    ]
  },
  {
    id: '8',
    version: 'v1.10.2',
    date: '2025-11-02',
    type: 'improvement',
    title: '⚡ 交互优化',
    description: '改进留言板加载策略，提升首屏性能',
    items: [
      '改进留言板加载策略：从首屏加载改为按需展开加载',
      '进一步提升首屏性能',
      '优化用户交互体验'
    ]
  },
  {
    id: '9',
    version: 'v1.9.29',
    date: '2024-10-29',
    type: 'fix',
    title: '🐛 问题修复',
    description: '修复 Term 页面部分深色模式切换按钮无响应问题',
    items: [
      '修复 Term 页面深色模式切换按钮无响应',
      '改进主题切换逻辑'
    ]
  },
  {
    id: '10',
    version: 'v1.9.28',
    date: '2024-10-28',
    type: 'improvement',
    title: '🎨 视觉优化',
    description: '引入思源字体，提升中文显示效果',
    items: [
      '引入思源字体，提升中文显示效果',
      '移除复杂 UI 组件，优化首屏加载',
      '精简字体效果，提升性能'
    ]
  },
  {
    id: '11',
    version: 'v1.9.27',
    date: '2024-10-27',
    type: 'improvement',
    title: '⚡ 性能提升',
    description: '优化 Game 页面性能，采用 Remix 推荐的架构模式',
    items: [
      '优化 Game 页面性能',
      '采用 Remix 推荐的 Outlet 模式',
      '避免重复数据请求，提升加载速度'
    ]
  },
  {
    id: '12',
    version: 'v1.9.26',
    date: '2024-10-26',
    type: 'improvement',
    title: '🔧 技术调研',
    description: '排查 Photo 页面卡顿问题，评估优化方案',
    items: [
      '排查 Photo 页面卡顿问题',
      '评估图片压缩方案',
      '制定性能优化计划'
    ]
  },
  {
    id: '13',
    version: 'v1.9.25',
    date: '2024-10-25',
    type: 'improvement',
    title: '♻️ 代码重构',
    description: '重构图片加载逻辑，遵循 Remix 最佳实践',
    items: [
      '重构图片加载逻辑：从 Hook 方式改为 Loader 函数直接获取',
      '整合 useImageToken 和 useVideo 代码，移除冗余',
      '遵循 Remix 推荐规范，优化代码结构',
      '修复 Photo 页面 DOM 重复渲染导致的图片加载失败问题'
    ]
  }
];
