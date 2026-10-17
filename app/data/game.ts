// 游戏数据文件
// Remix 最佳实践：将数据与路由逻辑分离
// TODO: 未来应该迁移到数据库

import type { Game, Platform, UserStat, FollowedGame, AllGamesData } from "~/types/game";

export const userStats: UserStat[] = [
  { label: '游戏总数', value: '77' },
  { label: '完成度', value: '78%' },
  { label: '游戏时长', value: '1546h' },
  { label: '成就解锁', value: '1,204' }
];

export const platforms: Platform[] = [
  {
    id: 'playstation',
    name: 'PlayStation',
    gradient: 'from-blue-600 to-blue-800',
    score: '230',
    motto: '努力取得更多奖杯吧',
    stats: [
      { label: '白金', value: '14' },
      { label: '黄金', value: '42' },
      { label: '白银', value: '196' },
      { label: '黄铜', value: '977' }
    ]
  },
  {
    id: 'switch',
    name: 'Switch',
    gradient: 'from-red-600 to-red-800',
    score: '156',
    motto: '享受便携游戏的乐趣',
    stats: [
      { label: '完成游戏', value: '2' },
      { label: '拥有游戏', value: '2' },
      { label: '游戏时长', value: '10h' },
      { label: '收藏', value: '12' }
    ]
  },
  {
    id: 'pc',
    name: 'PC',
    gradient: 'from-green-600 to-green-800',
    score: '342',
    motto: 'PC Master Race',
    stats: [
      { label: 'Steam游戏', value: '0' },
      { label: 'Epic游戏', value: '3' },
      { label: '总成就', value: '0' },
    ]
  }
];

const playstationGames: Game[] = [
  { id: 1, name: '破晓传奇', playTime: '57h', progress: Math.round(22 / 59 * 100), trophies: { platinum: 1, gold: 2, silver: 19, bronze: 0 }, achievementsCurrent: 22, achievementsTotal: 59, rating: 9, review: '我也不知道我为啥玩儿了五十个小时', tags: ['JRPG', '剧情', '动画'], cover: 'game/pox.jpg' },
  { id: 2, name: '剑星', playTime: '51h', progress: Math.round(28 / 45 * 100), trophies: { platinum: 1, gold: 6, silver: 21, bronze: 0 }, achievementsCurrent: 28, achievementsTotal: 45, rating: 9, review: '还是代餐', tags: ['动作', 'RPG', '科幻'], cover: 'game/header_tchinese.jpg' },
  { id: 3, name: '碧蓝幻想 Relink', playTime: '48h', progress: Math.round(37 / 54 * 100), trophies: { platinum: 0, gold: 2, silver: 35, bronze: 0 }, achievementsCurrent: 37, achievementsTotal: 54, rating: 8, review: '二次元战斗游戏天花板', tags: ['联机', 'ARPG', '奇幻'], cover: 'game/bl.jpg' },
  { id: 4, name: '心灵杀手2', playTime: '45h', progress: Math.round(81 / 89 * 100), trophies: { platinum: 0, gold: 3, silver: 77, bronze: 1 }, achievementsCurrent: 81, achievementsTotal: 89, rating: 9, review: '音乐和创意剧情拉满画质也写实', tags: ['恐怖', '悬疑', '剧情'], cover: 'game/hertkinll.jpg' },
  { id: 5, name: '最终幻想16', playTime: '45h', progress: Math.round(29 / 69 * 100), trophies: { platinum: 1, gold: 2, silver: 26, bronze: 0 }, achievementsCurrent: 29, achievementsTotal: 69, rating: 9, review: 'boss战大型交响乐现场', tags: ['JRPG', '奇幻', '史诗'], cover: 'game/zz.jpg' },
  { id: 6, name: '伊苏8：达娜的安魂曲', playTime: '43h', progress: Math.round(28 / 55 * 100), trophies: { platinum: 0, gold: 3, silver: 25, bronze: 0 }, achievementsCurrent: 28, achievementsTotal: 55, rating: 9, review: 'jrpg我只玩伊苏系列本作剧情很棒', tags: ['ARPG', '冒险', '音乐'], cover: 'game/ys.jpg' },
  { id: 7, name: '漫威蜘蛛侠2', playTime: '35h', progress: Math.round(42 / 43 * 100), trophies: { platinum: 2, gold: 17, silver: 22, bronze: 1 }, achievementsCurrent: 42, achievementsTotal: 43, rating: 9, review: '剧情战斗爽中爽', tags: ['动作', '开放世界', '超级英雄'], cover: 'game/sp.jpg' },
  { id: 8, name: '最后生还者2', playTime: '34h', progress: Math.round(19 / 44 * 100), trophies: { platinum: 1, gold: 7, silver: 11, bronze: 0 }, achievementsCurrent: 19, achievementsTotal: 44, rating: 10, review: '说不好玩的都是云狗', tags: ['生存', '剧情', '末世'], cover: 'game/lost.jpg' },
  { id: 9, name: '艾尔登法环', playTime: '100h', progress: Math.round(42 / 42 * 100), trophies: { platinum: 3, gold: 14, silver: 24, bronze: 0 }, achievementsCurrent: 42, achievementsTotal: 42, rating: 10, review: '真正的史诗', tags: ['魂系', '开放世界', '动作'], cover: 'game/ring.jpg' },
  { id: 10, name: '地平线 西之绝境', playTime: '91h', progress: Math.round(72 / 80 * 100), trophies: { platinum: 2, gold: 9, silver: 60, bronze: 0 }, achievementsCurrent: 72, achievementsTotal: 80, rating: 9, review: '当今3a游戏画质第一', tags: ['开放世界', '动作', '冒险'], cover: 'game/forb.jpg' },
  { id: 11, name: '战神：诸神黄昏', playTime: '69h', progress: Math.round(36 / 48 * 100), trophies: { platinum: 4, gold: 15, silver: 16, bronze: 0 }, achievementsCurrent: 36, achievementsTotal: 48, rating: 10, review: '买ps5的玩的第一个游戏', tags: ['动作', '剧情', '冒险'], cover: 'game/hear.jpg' },
  { id: 12, name: '对马岛之魂：导演剪辑版', playTime: '65h', progress: Math.round(60 / 77 * 100), trophies: { platinum: 2, gold: 10, silver: 47, bronze: 0 }, achievementsCurrent: 60, achievementsTotal: 77, rating: 10, review: '美术意境堪称巅峰造极', tags: ['武士', '开放世界', '动作'], cover: 'game/ghost.jpg' },
  { id: 13, name: '地平线 零之曙光', playTime: '61h', progress: Math.round(71 / 79 * 100), trophies: { platinum: 2, gold: 10, silver: 58, bronze: 0 }, achievementsCurrent: 71, achievementsTotal: 79, rating: 9, review: '比原神画质强', tags: ['开放世界', '动作', '冒险'], cover: 'game/header.jpg' },
  { id: 14, name: '浪人崛起', playTime: '59h', progress: Math.round(51 / 51 * 100), trophies: { platinum: 2, gold: 9, silver: 39, bronze: 0 }, achievementsCurrent: 51, achievementsTotal: 51, rating: 9, review: '战斗爽战斗爽', tags: ['动作', '冒险', '历史'], cover: 'game/header_schinese.jpg' },
  { id: 15, name: '卧龙：苍天陨落', playTime: '29.9h', progress: 64, trophies: { platinum: 0, gold: 2, silver: 10, bronze: 38 }, achievementsCurrent: 32, achievementsTotal: 50, rating: 8, review: '有中文配音', tags: ['魂系', '动作', '三国'], cover: 'game/drong.jpg' },
  { id: 16, name: 'SEKIRO: SHADOWS DIE TWICE', playTime: '28.5h', progress: 100, trophies: { platinum: 1, gold: 4, silver: 11, bronze: 18 }, achievementsCurrent: 34, achievementsTotal: 34, rating: 10, review: '心中的义父已经无伤了', tags: ['魂系', '忍者', '动作'], cover: 'game/sekiro.jpg' },
  { id: 17, name: '刺客信条：影', playTime: '25.6h', progress: 30, trophies: { platinum: 0, gold: 2, silver: 17, bronze: 0 }, achievementsCurrent: 15, achievementsTotal: 50, rating: 8, review: '上当了浪费二十个小时', tags: ['潜行', '历史', '忍者'], cover: 'game/cike.jpg' },
  { id: 18, name: '宇宙机器人', playTime: '25.3h', progress: 100, trophies: { platinum: 1, gold: 2, silver: 17, bronze: 24 }, achievementsCurrent: 44, achievementsTotal: 44, rating: 9, review: '神中神2024tga冠军实至名归感觉比马里奥奥德赛好玩', tags: ['平台', '冒险', '可爱'], cover: 'game/robot.jpg' },
  { id: 19, name: '神秘海域：盗贼传奇合辑', playTime: '24.5h', progress: 19, trophies: { platinum: 0, gold: 2, silver: 23, bronze: 0 }, achievementsCurrent: 12, achievementsTotal: 63, rating: 9, review: '无敌了游戏还能这么做吗', tags: ['冒险', '动作', '剧情'], cover: 'game/thief.jpg' },
  { id: 20, name: '最后生还者1', playTime: '22.2h', progress: 28, trophies: { platinum: 0, gold: 2, silver: 8, bronze: 0 }, achievementsCurrent: 8, achievementsTotal: 29, rating: 10, review: '神，不用多说', tags: ['生存', '剧情', '末世'], cover: 'game/amz.jpg' },
  { id: 21, name: '瑞奇与叮当：时空跳转', playTime: '20.9h', progress: 100, trophies: { platinum: 1, gold: 3, silver: 7, bronze: 36 }, achievementsCurrent: 47, achievementsTotal: 47, rating: 9, review: 'PS5性能的完美体现', tags: ['平台', '冒险', '科幻'], cover: 'game/ruiqi.jpg' },
  { id: 22, name: '漫威蜘蛛侠：迈尔斯·莫拉莱斯', playTime: '17.2h', progress: 73, trophies: { platinum: 0, gold: 1, silver: 7, bronze: 31 }, achievementsCurrent: 28, achievementsTotal: 39, rating: 9, review: '代餐，不能当正餐吃', tags: ['动作', '开放世界', '超级英雄'], cover: 'game/sppppdr.jpg' }
  ,
  { id: 23, name: '鸣潮', playTime: '214h', progress: 93, trophies: { platinum: 2, gold: 11, silver: 54, bronze: 0 }, achievementsCurrent: 93, achievementsTotal: 100, rating: 9, review: '嗯，可以动的二次元类galgame？打破了我对二游的刻板印象', tags: ['动作', 'ARPG', '二次元'], cover: 'game/mingchao.jpg' },
  { id: 24, name: '光与影：33号远征队', playTime: '75.9h', progress: 100, trophies: { platinum: 2, gold: 5, silver: 48, bronze: 0 }, achievementsCurrent: 100, achievementsTotal: 100, rating: 10, review: '估计得年度游戏了，以前从没觉得回合制游戏有这么好玩。', tags: ['回合制', 'RPG', '剧情'], cover: 'game/33.jpg' },
  { id: 25, name: '羊蹄山之魂', playTime: '61.3h', progress: 100, trophies: { platinum: 2, gold: 7, silver: 44, bronze: 0 }, achievementsCurrent: 100, achievementsTotal: 100, rating: 10, review: '不多说了，玩哭了，活下去就是为了玩游戏啊', tags: ['剧情', '冒险', '叙事'], cover: 'game/yts.jpg' }
];

const switchGames: Game[] = [
  { id: 51, name: '塞尔达传说：王国之泪', playTime: '5h', progress: Math.round(45 / 60 * 100), trophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, achievementsCurrent: 45, achievementsTotal: 60, rating: 10, review: '网站制作需要近期才购入switch2，等待后续更新', tags: ['开放世界', '冒险', '创造'], cover: 'game/sed.jpg' },
  { id: 52, name: '超级马力欧 奥德赛', playTime: '42h', progress: Math.round(520 / 590 * 100), trophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, achievementsCurrent: 520, achievementsTotal: 590, rating: 9, review: '经典马力欧的完美进化', tags: ['平台', '收集', '家庭'], cover: 'game/maliao.jpg' }
];

const pcGames: Game[] = [
  { id: 31, name: '荒野大镖客：救赎2', playTime: '89h', progress: null, trophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, achievementsCurrent: null, achievementsTotal: null, rating: 10, review: '西部世界的巅峰之作', tags: ['开放世界', '西部', '剧情'], cover: 'game/red.jpg' },
  { id: 32, name: '战神', playTime: '45h', progress: null, trophies: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, achievementsCurrent: null, achievementsTotal: null, rating: 10, review: '父子情深的神话史诗', tags: ['动作', '剧情', '北欧神话'], cover: 'game/zhanshen.jpg' }
];

// 游戏页「本期封面」默认展示的游戏 id
export const featuredGameId = 25;

export const followedGames: FollowedGame[] = [
  { id: 102, name: 'GTA6', releaseDate: '2026年夏季', rating: 9.8, cover: 'game/gta6.jpg' }
];

export const allGamesData: AllGamesData = {
  playstation: playstationGames,
  switch: switchGames,
  pc: pcGames
};

