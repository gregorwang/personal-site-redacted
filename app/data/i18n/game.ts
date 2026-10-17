// 游戏页数据的日文 / 英文覆盖层（中文原文在 app/data/game.ts）。
// 游戏名用各地区官方名称；评价按原话语气翻；标签走统一词表。没写到的条目回落中文。
import type { TranslatedLocale } from "~/lib/i18n";



export const GAME_TEXT: Record<TranslatedLocale, Record<number, { name?: string; review?: string; releaseDate?: string }>> = {
  ja: {
    1: { name: "テイルズ オブ アライズ", review: "なんで五十時間も遊んだのか自分でも分からない" },
    2: { name: "Stellar Blade", review: "やっぱり代用食" },
    3: { name: "グランブルーファンタジー リリンク", review: "二次元アクションの最高峰" },
    4: { name: "Alan Wake 2", review: "音楽と独創的なストーリーが最高、グラフィックもリアル" },
    5: { name: "ファイナルファンタジーXVI", review: "ボス戦は大編成オーケストラのライブ" },
    6: { name: "イースVIII -Lacrimosa of DANA-", review: "JRPG はイースシリーズしか遊ばない。今作はストーリーが素晴らしい" },
    7: { name: "Marvel's Spider-Man 2", review: "ストーリーも戦闘も爽快そのもの" },
    8: { name: "The Last of Us Part II", review: "つまらないと言う人はエアプ" },
    9: { name: "ELDEN RING", review: "本物の叙事詩" },
    10: { name: "Horizon Forbidden West", review: "現行 3A タイトルでグラフィック一位" },
    11: { name: "ゴッド・オブ・ウォー ラグナロク", review: "PS5 を買って最初に遊んだゲーム" },
    12: { name: "Ghost of Tsushima Director's Cut", review: "美術と情緒は頂点を極めている" },
    13: { name: "Horizon Zero Dawn", review: "原神よりグラフィックが上" },
    14: { name: "Rise of the Ronin", review: "戦闘が爽快、とにかく爽快" },
    15: { name: "ウォーロン フォールン ダイナスティ", review: "中国語ボイスがある" },
    16: { review: "心の中の義父はもうノーダメージで倒せる" },
    17: { name: "アサシン クリード シャドウズ", review: "騙された、二十時間を無駄にした" },
    18: { name: "アストロボット", review: "神の中の神。2024 TGA 受賞も納得、マリオ オデッセイより面白いと思う" },
    19: { name: "アンチャーテッド トレジャーハンターコレクション", review: "最強。ゲームってここまで作れるのか" },
    20: { name: "The Last of Us Part I", review: "神。言うことなし" },
    21: { name: "ラチェット＆クランク パラレル・トラブル", review: "PS5 の性能を完璧に体現" },
    22: { name: "Marvel's Spider-Man: Miles Morales", review: "代用食。主食にはならない" },
    23: { name: "鳴潮", review: "うん、動かせる二次元ギャルゲー？二次元ゲームへの固定観念を壊してくれた" },
    24: { name: "Clair Obscur: Expedition 33", review: "たぶん今年の GOTY。ターン制がこんなに面白いと思ったのは初めて。" },
    25: { name: "Ghost of Yōtei", review: "もう何も言わない。泣いた。生きているのはゲームをするためだ" },
    51: { name: "ゼルダの伝説 ティアーズ オブ ザ キングダム", review: "サイト制作のために最近 Switch 2 を買ったばかり、続報待ち" },
    52: { name: "スーパーマリオ オデッセイ", review: "クラシックなマリオの完璧な進化" },
    31: { name: "レッド・デッド・リデンプション2", review: "西部劇の頂点" },
    32: { name: "ゴッド・オブ・ウォー", review: "父と子の絆を描く神話の叙事詩" },
    102: { releaseDate: "2026 年夏" },
  },
  en: {
    1: { name: "Tales of Arise", review: "No idea why I put fifty hours into this" },
    2: { name: "Stellar Blade", review: "Still a stand-in meal" },
    3: { name: "Granblue Fantasy: Relink", review: "The ceiling for anime-style action games" },
    4: { name: "Alan Wake 2", review: "Maxed-out music and inventive story, with photoreal visuals" },
    5: { name: "Final Fantasy XVI", review: "Boss fights are a live symphony concert" },
    6: { name: "Ys VIII: Lacrimosa of Dana", review: "Ys is the only JRPG series I play, and this story is great" },
    7: { name: "Marvel's Spider-Man 2", review: "Story and combat, pure thrill on thrill" },
    8: { name: "The Last of Us Part II", review: "Anyone who calls it boring never actually played it" },
    9: { name: "Elden Ring", review: "A true epic" },
    10: { name: "Horizon Forbidden West", review: "Best graphics of any AAA game today" },
    11: { name: "God of War Ragnarök", review: "The first game I played after buying a PS5" },
    12: { name: "Ghost of Tsushima Director's Cut", review: "Art direction and mood at their absolute peak" },
    13: { name: "Horizon Zero Dawn", review: "Better graphics than Genshin" },
    14: { name: "Rise of the Ronin", review: "Combat is a blast, a total blast" },
    15: { name: "Wo Long: Fallen Dynasty", review: "Has Chinese voice acting" },
    16: { name: "Sekiro: Shadows Die Twice", review: "I can beat the Owl in my heart without taking a hit now" },
    17: { name: "Assassin's Creed Shadows", review: "Got fooled, wasted twenty hours" },
    18: { name: "Astro Bot", review: "God-tier. Fully earned its 2024 TGA win; I think it beats Mario Odyssey" },
    19: { name: "Uncharted: Legacy of Thieves Collection", review: "Unbeatable. Games can really be made like this?" },
    20: { name: "The Last of Us Part I", review: "A masterpiece. Nothing more to say" },
    21: { name: "Ratchet & Clank: Rift Apart", review: "The perfect showcase of PS5 power" },
    22: { name: "Marvel's Spider-Man: Miles Morales", review: "A side dish, not a main course" },
    23: { name: "Wuthering Waves", review: "Hmm, an anime visual novel you can move around in? It broke my stereotypes about gacha games" },
    24: { name: "Clair Obscur: Expedition 33", review: "Probably Game of the Year. I never knew turn-based games could be this fun." },
    25: { name: "Ghost of Yōtei", review: "Say no more. It made me cry. Staying alive is for playing games" },
    51: { name: "The Legend of Zelda: Tears of the Kingdom", review: "Only just bought a Switch 2 for building this site, more to come" },
    52: { name: "Super Mario Odyssey", review: "The perfect evolution of classic Mario" },
    31: { name: "Red Dead Redemption 2", review: "The pinnacle of the Western" },
    32: { name: "God of War", review: "A mythic epic about a father and son" },
    102: { releaseDate: "Summer 2026" },
  },
};

export const GAME_TAGS: Record<TranslatedLocale, Record<string, string>> = {
  ja: {
    剧情: "ストーリー", 动画: "アニメ", 动作: "アクション", 科幻: "SF", 联机: "マルチプレイ", 奇幻: "ファンタジー",
    恐怖: "ホラー", 悬疑: "ミステリー", 史诗: "叙事詩", 冒险: "アドベンチャー", 音乐: "音楽", 开放世界: "オープンワールド",
    超级英雄: "スーパーヒーロー", 生存: "サバイバル", 末世: "終末", 魂系: "ソウルライク", 武士: "侍", 历史: "歴史",
    三国: "三国志", 忍者: "忍者", 潜行: "ステルス", 平台: "プラットフォーマー", 可爱: "かわいい", 二次元: "二次元",
    回合制: "ターン制", 叙事: "物語", 创造: "クラフト", 收集: "収集", 家庭: "ファミリー", 西部: "西部劇", 北欧神话: "北欧神話",
  },
  en: {
    剧情: "Story", 动画: "Anime", 动作: "Action", 科幻: "Sci-fi", 联机: "Co-op", 奇幻: "Fantasy",
    恐怖: "Horror", 悬疑: "Mystery", 史诗: "Epic", 冒险: "Adventure", 音乐: "Music", 开放世界: "Open world",
    超级英雄: "Superhero", 生存: "Survival", 末世: "Post-apocalyptic", 魂系: "Soulslike", 武士: "Samurai", 历史: "Historical",
    三国: "Three Kingdoms", 忍者: "Ninja", 潜行: "Stealth", 平台: "Platformer", 可爱: "Cute", 二次元: "Anime-style",
    回合制: "Turn-based", 叙事: "Narrative", 创造: "Crafting", 收集: "Collecting", 家庭: "Family", 西部: "Western", 北欧神话: "Norse myth",
  },
};

/** userStats / platforms 里的中文标签与口号。 */
export const GAME_LABELS: Record<TranslatedLocale, Record<string, string>> = {
  ja: {
    游戏总数: "ゲーム総数", 完成度: "達成率", 游戏时长: "プレイ時間", 成就解锁: "実績解除",
    白金: "プラチナ", 黄金: "ゴールド", 白银: "シルバー", 黄铜: "ブロンズ",
    完成游戏: "クリア済み", 拥有游戏: "所持タイトル", 收藏: "お気に入り",
    Steam游戏: "Steam タイトル", Epic游戏: "Epic タイトル", 总成就: "実績合計",
    努力取得更多奖杯吧: "もっとトロフィーを集めよう", 享受便携游戏的乐趣: "携帯ゲームの楽しさを味わおう",
  },
  en: {
    游戏总数: "Games", 完成度: "Completion", 游戏时长: "Play time", 成就解锁: "Achievements",
    白金: "Platinum", 黄金: "Gold", 白银: "Silver", 黄铜: "Bronze",
    完成游戏: "Completed", 拥有游戏: "Owned", 收藏: "Wishlisted",
    Steam游戏: "Steam games", Epic游戏: "Epic games", 总成就: "Total achievements",
    努力取得更多奖杯吧: "Go earn more trophies", 享受便携游戏的乐趣: "Enjoy gaming on the go",
  },
};
