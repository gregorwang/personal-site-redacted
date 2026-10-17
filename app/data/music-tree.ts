// 音乐页两张图版的数据：Plate I 谱系树、Plate II 地层柱。
// 换数据只改这个文件；画法在 app/lib/music-plates.ts。
// 设计说明与待确认事项见 docs/design/music-plates-handoff-2026-10-16.md。
import { resolveR2Image } from "~/lib/resolve-image";

export type MusicLang = "zh" | "ja" | "en" | "ko" | "inst";
export type MusicSource = "orig" | "anime" | "game" | "film" | "doujin";
export type MusicFamilyId = "pop" | "elec" | "gufeng" | "inst";
export type MusicRock = "schist" | "lime" | "sand" | "shale" | "loose";

export interface MusicSong {
  t: string;
  /** 卡片标题用的全名（t 太长时） */
  full?: string;
  /** 入谱年份 */
  y: number;
  /** 年份是推测的 */
  guess?: boolean;
  lang: MusicLang;
  src: MusicSource;
  srcGuess?: boolean;
  cover?: string;
  url?: string;
  with?: string;
  note?: string;
  lyrics?: readonly string[];
  plays?: number;
  /** You're the Shine (Night Butterflies)：标本上停一只蝴蝶 */
  butterfly?: boolean;
  /** 只有歌手、没有单曲数据 */
  artistOnly?: boolean;
}

export interface MusicArtist {
  id: string;
  name: string;
  /** 循环强度系数，影响占位枝的颜色 */
  heat: number;
  /** 「模拟完整歌单」模式下额外长出的占位枝数 */
  extra: number;
  songs: readonly MusicSong[];
}

export interface MusicFamily {
  id: MusicFamilyId;
  letter: string;
  zh: string;
  latin: string;
  /** 占位枝的语种 / 来源分布 */
  mix: Partial<Record<MusicLang, number>>;
  src: Partial<Record<MusicSource, number>>;
  fill: { artists: number; tips: readonly [number, number] };
  artists: readonly MusicArtist[];
}

export const MUSIC_LANGS: Record<MusicLang, { label: string; color: string }> = {
  zh: { label: "中文", color: "#b5523b" },
  ja: { label: "日文", color: "#4f6d8a" },
  en: { label: "英文", color: "#76844f" },
  ko: { label: "韩文", color: "#b8913f" },
  inst: { label: "纯音乐", color: "#8d7391" },
};

// 原创不画；其余用四档墨色，避免和语种的颜色打架
export const MUSIC_SOURCES: Record<MusicSource, { label: string; color: string | null }> = {
  orig: { label: "原创", color: null },
  anime: { label: "动画 · VN", color: "#262421" },
  game: { label: "游戏", color: "#5b554b" },
  film: { label: "影视", color: "#938a78" },
  doujin: { label: "同人 · 翻唱", color: "#c4b9a3" },
};

const svg = (id: string) => resolveR2Image(`SVG/${id}.jpg`);
const ne = (url: string) => `${url}?param=200y200`;
const audio = (id: number) => `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
const MILI_COVER = ne("https://p2.music.126.net/xIa3fW-PIvzK78_GqYycvw==/8897248092051259.jpg");

// 规则：科 = 风格（每位歌手只归一科），属 = 歌手，种 = 歌；语种和来源按每首歌标在外环
export const MUSIC_FAMILIES: readonly MusicFamily[] = [
  {
    id: "pop", letter: "B", zh: "流行", latin: "POP",
    mix: { zh: 0.45, ja: 0.35, en: 0.12, ko: 0.08 }, src: { orig: 0.62, anime: 0.24, film: 0.07, game: 0.07 },
    fill: { artists: 36, tips: [1, 8] },
    artists: [
      { id: "liangjingru", name: "梁静茹", heat: 1.1, extra: 4, songs: [
        { t: "梦醒时分 (Live)", y: 2015, lang: "zh", src: "orig", cover: svg("dd"), note: "第一首入谱的歌" },
      ] },
      { id: "key", name: "Key / 麻枝准", heat: 2.4, extra: 16, songs: [
        { t: "Killer Song", y: 2017, lang: "ja", src: "orig", cover: svg("i"), with: "やなぎなぎ", note: "分享星云" },
        { t: "アルカテイル", y: 2018, guess: true, lang: "ja", src: "anime", cover: ne("https://p2.music.126.net/MVWKZCUCNQocuhMRBpL-Qw==/109951169976613728.jpg"), url: audio(1311319929), with: "鈴木このみ" },
        { t: "エタニクル", y: 2025, guess: true, lang: "ja", src: "anime", srcGuess: true, cover: ne("https://p1.music.126.net/Q6h2EQ9_OpFy7rrfOQSjzQ==/109951172114617807.jpg"), url: audio(2752941841), with: "ASCA" },
      ] },
      { id: "claris", name: "ClariS", heat: 1.5, extra: 4, songs: [
        { t: "コネクト", y: 2017, guess: true, lang: "ja", src: "anime", cover: ne("https://p1.music.126.net/w1-Rz3cBOA0_rSTAzne8xA==/109951168080908679.jpg"), url: "https://oss.xn--cckl9nsb.com/ClariS.mp3" },
      ] },
      { id: "mashiro", name: "水瀬ましろ", heat: 1.6, extra: 2, songs: [
        { t: "まっしろな雪", y: 2018, guess: true, lang: "ja", src: "anime", srcGuess: true, cover: ne("https://p1.music.126.net/7Htte2C_Hiv0f9REtBpC5w==/7758154045839218.jpg"), url: audio(30841657), lyrics: ["まっしろまっしろ まっしろな雪が降る"] },
      ] },
      { id: "monkeymajik", name: "MONKEY MAJIK", heat: 1.4, extra: 4, songs: [
        { t: "Headlight", y: 2018, lang: "ja", src: "orig", cover: svg("a"), note: "心动星系" },
      ] },
      { id: "maeshima", name: "前島麻由", heat: 1.3, extra: 2, songs: [
        { t: "longshot", y: 2019, guess: true, lang: "ja", src: "anime", srcGuess: true, cover: svg("g"), lyrics: ["I will never gonna leave you never wanna lose you，we'll make it in the end", "Not backing down for real"] },
      ] },
      { id: "sunnan", name: "孙楠 / 陈楚生", heat: 1.3, extra: 1, songs: [
        { t: "无名之辈", y: 2020, guess: true, lang: "zh", src: "orig", srcGuess: true, lyrics: ["我是离开，无名的人啊，我敬你一杯酒，敬你的沉默和每一声怒吼", "敬你弯着腰，上山往高处走，头顶苍穹，努力地生活"] },
      ] },
      { id: "straykids", name: "Stray Kids", heat: 1.3, extra: 3, songs: [
        { t: "SLUMP -Japanese ver.-", y: 2020, lang: "ja", src: "anime", cover: svg("v"), note: "那年春天 · 《神之塔》片头" },
      ] },
      { id: "caijianya", name: "蔡健雅", heat: 1.2, extra: 3, songs: [
        { t: "Letting Go", y: 2022, lang: "zh", src: "orig", cover: svg("h"), note: "雨天心动" },
      ] },
      { id: "wangheye", name: "王赫野 / 姚晓棠", heat: 1.2, extra: 1, songs: [
        { t: "虹之间 (Live)", y: 2023, guess: true, lang: "zh", src: "orig", lyrics: ["我看见希望闪耀在虹之间，光芒凝结于你我的那片天", "不再追问你为何不能停留，微笑看见爱的浮现"] },
      ] },
      { id: "wuthering", name: "鸣潮先约电台", heat: 1.8, extra: 9, songs: [
        { t: "Daisy Crown (英文版)", y: 2025, guess: true, lang: "en", src: "game", cover: ne("https://p1.music.126.net/8tEkrZSZgZAxtN3RTArlxg==/109951170566496350.jpg"), url: audio(2682067043), with: "Empty old City" },
        { t: "远航星的告别", y: 2025, guess: true, lang: "inst", src: "game", cover: ne("https://p1.music.126.net/Ao3z8Adsv-yzXfN6LjKPyw==/109951172692547015.jpg"), url: audio(3346496288), with: "jixwang / Tarokiki / Emi Evans" },
      ] },
    ],
  },
  {
    id: "elec", letter: "C", zh: "电子", latin: "ELECTRONIC",
    mix: { en: 0.7, ja: 0.15, inst: 0.15 }, src: { orig: 0.6, doujin: 0.25, game: 0.15 },
    fill: { artists: 18, tips: [1, 7] },
    artists: [
      { id: "mili", name: "Mili", heat: 2.6, extra: 14, songs: [
        { t: "Nine Point Eight", y: 2016, guess: true, lang: "en", src: "orig", cover: MILI_COVER, url: audio(28921695), lyrics: ["Petals dance for our valediction，And synchronize to your frozen pulsation", "Take me to where your soul may live in peace"] },
        { t: "world.execute(me);", y: 2015, guess: true, lang: "en", src: "orig" },
        { t: "Ga1ahad and Scientific Witchery", y: 2017, guess: true, lang: "en", src: "orig" },
      ] },
      { id: "vivienne", name: "Vivienne", heat: 3.0, extra: 18, songs: [
        { t: "The Ray of Light", y: 2017, lang: "en", src: "orig", cover: svg("d"), note: "光芒星团" },
        { t: "Goodbye", y: 2018, guess: true, lang: "en", src: "orig", cover: ne("https://p2.music.126.net/rerz4ODsZE-kkkBojzbyPQ==/3444769938584968.jpg"), url: audio(425280603), lyrics: ["That since then I've found my way back...but I'll miss you"] },
        { t: "Phantom", y: 2021, lang: "en", src: "orig", cover: svg("bb"), plays: 132, note: "多次循环", lyrics: ["And now that I understand, have I the courage to try"] },
        { t: "Can't look away", y: 2022, guess: true, lang: "en", src: "orig", plays: 176 },
        { t: "Falling in Love Again", y: 2023, guess: true, lang: "en", src: "orig", plays: 118 },
        { t: "World of You", y: 2024, guess: true, lang: "en", src: "orig", plays: 96 },
        { t: "Distant Memory", y: 2024, guess: true, lang: "en", src: "orig", plays: 80 },
      ] },
      { id: "felt", name: "FELT", heat: 2.6, extra: 16, songs: [
        { t: "Beautiful Trick", y: 2019, guess: true, lang: "en", src: "doujin", lyrics: ["The fate plays a amazing trick on you，You can't hold it steady"] },
        { t: "You're the Shine", full: "You're the Shine (Night Butterflies)", y: 2019, guess: true, lang: "en", src: "doujin", cover: ne("https://p2.music.126.net/uPGwUIt5BzR650v2T8bmqw==/7994549047861705.jpg"), url: audio(729877), butterfly: true },
        { t: "Moments", y: 2020, guess: true, lang: "en", src: "doujin", cover: ne("https://p2.music.126.net/HCBGEKOrbSdS6Yy9mMgsCw==/6664139977386194.jpg"), url: audio(29848676) },
      ] },
      { id: "stevejames", name: "Steve James", heat: 1.1, extra: 2, songs: [
        { t: "Renaissance", y: 2019, lang: "en", src: "orig", cover: svg("r"), with: "Clairity", note: "日出星座" },
      ] },
      { id: "tronicbox", name: "TRONICBOX", heat: 1.2, extra: 3, songs: [
        { t: "Somebody That I Used To…", y: 2023, lang: "en", src: "doujin", cover: svg("m"), note: "最爱的情歌 · 翻唱" },
      ] },
    ],
  },
  {
    id: "gufeng", letter: "D", zh: "古风", latin: "GUFENG",
    mix: { zh: 0.95, inst: 0.05 }, src: { orig: 0.8, game: 0.2 },
    fill: { artists: 5, tips: [1, 5] },
    artists: [
      { id: "yinque", name: "音阙诗听", heat: 1.0, extra: 3, songs: [
        { t: "小满", y: 2019, lang: "zh", src: "orig", cover: svg("u"), with: "王梓钰", note: "最爱的情歌" },
      ] },
    ],
  },
  {
    id: "inst", letter: "E", zh: "纯音乐", latin: "INSTRUMENTAL",
    mix: { inst: 1 }, src: { orig: 0.45, game: 0.2, film: 0.2, anime: 0.15 },
    fill: { artists: 10, tips: [1, 6] },
    artists: [
      { id: "shiki", name: "四季音色", heat: 2.0, extra: 9, songs: [
        { t: "（2023 年度歌手）", y: 2023, lang: "inst", src: "orig", cover: svg("ee"), artistOnly: true },
      ] },
      { id: "hayashi", name: "林ゆうき", heat: 1.9, extra: 5, songs: [
        { t: "rich-man", y: 2024, lang: "inst", src: "film", srcGuess: true, cover: svg("y"), note: "超新星" },
      ] },
    ],
  },
];

/** 历年年度歌手 */
export const MUSIC_YEARLY: Record<string, readonly (string | number)[]> = {
  mili: ["2015—2018"],
  felt: [2019, 2020],
  vivienne: [2021, 2022, 2024, 2025],
  shiki: [2023],
};

/** 品味转折点（橙色气泡），s = 强度 0–1 */
export const MUSIC_EVENTS = [
  { letter: "J", artist: "mili", year: 2015.6, s: 0.94, label: "Mili · 2015—2018 年度歌手" },
  { letter: "K", artist: "key", year: 2017.5, s: 0.75, label: "入坑 Key 社" },
  { letter: "L", artist: "vivienne", year: 2017.6, s: 0.5, label: "初遇 Vivienne" },
  { letter: "M", artist: "felt", year: 2019.6, s: 0.94, label: "FELT 连续两年年度歌手" },
  { letter: "N", artist: "straykids", year: 2020.5, s: 0.25, label: "SLUMP · 《神之塔》" },
  { letter: "O", artist: "vivienne", year: 2021.5, s: 0.94, label: "Phantom 多次循环" },
  { letter: "P", artist: "shiki", year: 2023.5, s: 0.5, label: "四季音色年度歌手" },
  { letter: "Q", artist: "hayashi", year: 2024.5, s: 0.75, label: "rich-man 超新星" },
  { letter: "R", artist: "wuthering", year: 2025.5, s: 0.5, label: "鸣潮原声" },
] as const;

/** 年代按年度歌手划分：[起, 止, 名] */
export const MUSIC_ERAS: readonly (readonly [number, number, string])[] = [
  [2015, 2019, "Mili"],
  [2019, 2021, "FELT"],
  [2021, 2023, "Vivienne"],
  [2023, 2024, "四季"],
  [2024, 2026.8, "Vivienne"],
];

/* ---------- Plate II 地层柱 ---------- */

export interface MusicFossil {
  name: string;
  photo: string;
  photoNote?: string;
  style: string;
  rock: MusicRock;
  desc?: string;
}

// 注意：旧 music-showcase 里 o.jpg / ee.jpg 对应错了，这里已按实际图片修正
export const MUSIC_FOSSILS: Record<string, MusicFossil> = {
  mili: { name: "Mili", photo: MILI_COVER, photoNote: "照片暂用《Nine Point Eight》封面", style: "古典 / 电音", rock: "schist" },
  felt: { name: "FELT", photo: svg("o"), style: "东方Project", rock: "lime" },
  vivienne: {
    name: "Vivienne", photo: svg("f"), style: "独立 · 原创", rock: "sand",
    desc: "她的音乐如同在浩瀚宇宙中的一次孤独旅行，旋律深邃而富有感染力，总能触及灵魂深处最柔软的地方。",
  },
  shiki: { name: "四季音色", photo: svg("ee"), style: "纯音乐", rock: "shale" },
};

export const MUSIC_ROCKS: Record<MusicRock, { label: string; who: string; note?: string }> = {
  schist: { label: "片岩", who: "Mili", note: "最老的一层，已经压成了片岩" },
  lime: { label: "石灰岩", who: "FELT" },
  sand: { label: "砂岩", who: "Vivienne" },
  shale: { label: "页岩", who: "四季音色" },
  loose: { label: "未固结沉积", who: "还在沉积" },
};

export interface MusicStratum {
  key: string;
  label?: string;
  year?: number;
  years?: readonly number[];
  artist?: string;
  active?: boolean;
  rock?: MusicRock;
  /** [组名, 段] */
  form: readonly [string, string];
}

/** 从上（新）到下（老） */
export const MUSIC_STRATA: readonly MusicStratum[] = [
  { key: "now", label: "2026—今", active: true, rock: "loose", form: ["现代沉积", ""] },
  { key: "2025", year: 2025, artist: "vivienne", form: ["Vivienne 组", "上段"] },
  { key: "2024", year: 2024, artist: "vivienne", form: ["Vivienne 组", "上段"] },
  { key: "2023", year: 2023, artist: "shiki", form: ["四季音色 组", ""] },
  { key: "2022", year: 2022, artist: "vivienne", form: ["Vivienne 组", "下段"] },
  { key: "2021", year: 2021, artist: "vivienne", form: ["Vivienne 组", "下段"] },
  { key: "2020", year: 2020, artist: "felt", form: ["FELT 组", ""] },
  { key: "2019", year: 2019, artist: "felt", form: ["FELT 组", ""] },
  { key: "mili", label: "2015—2018", years: [2015, 2016, 2017, 2018], artist: "mili", form: ["Mili 组", ""] },
];

/** 2024 年最常听（旧页面榜单），按原顺序 */
export const MUSIC_TOP_2024: readonly (readonly [string, number])[] = [
  ["World of You", 96],
  ["Falling in Love Again", 118],
  ["Can't look away", 176],
  ["Distant Memory", 80],
  ["Phantom", 132],
];

/** 页头统计 */
export const MUSIC_HEADLINE_STATS = [
  { value: "6869", unit: "首" },
  { value: "750+", unit: "位艺人" },
  { value: "99999+", unit: "分钟" },
] as const;
