/** @typedef {"cdn" | "oss"} AssetBase */

/**
 * @typedef {object} ImageAsset
 * @property {string} key manifest 键名
 * @property {string} sourceKey R2/oss 上的原始对象键
 * @property {AssetBase} base 上传目标与 URL 前缀
 * @property {string} [basename] 输出文件名主体，默认取 sourceKey 最后一段去扩展名
 * @property {boolean} [animated] GIF 等动图跳过 webp 转换
 */

/** public/game/heroes 下的游戏主视觉文件名（不含扩展名） */
const gameHeroSlugs = [
  "alan-wake-2",
  "assassins-creed-shadows",
  "astro-bot",
  "elden-ring",
  "expedition-33",
  "final-fantasy-16",
  "ghost-of-tsushima",
  "ghost-of-yotei",
  "god-of-war",
  "god-of-war-ragnarok",
  "granblue-fantasy-relink",
  "horizon-forbidden-west",
  "horizon-zero-dawn",
  "mingchao",
  "ratchet-and-clank-rift-apart",
  "red-dead-redemption-2",
  "rise-of-the-ronin",
  "sekiro",
  "spider-man-2",
  "spider-man-miles-morales",
  "stellar-blade",
  "super-mario-odyssey",
  "tales-of-arise",
  "the-last-of-us-1",
  "the-last-of-us-2",
  "uncharted-legacy",
  "wo-long",
  "ys-8",
  "zelda-tears-of-the-kingdom",
];

/** @type {ImageAsset[]} */
export const imageAssets = [
  // —— 首页 P0（原 oss 源，处理后上传 gregorwang → cdn 域）——
  { key: "emt1", sourceKey: "emt1.webp", base: "cdn", basename: "emt1" },
  { key: "n4", sourceKey: "n4.webp", base: "cdn", basename: "n4" },
  { key: "n1", sourceKey: "n1.webp", base: "cdn", basename: "n1" },
  { key: "n6", sourceKey: "n6.webp", base: "cdn", basename: "n6" },
  // 首页照片墙：原来直接引用 oss 直链，2026-10-15 并入管线以生成 srcset 缩小版（raw 从 oss 域下载）
  { key: "n10", sourceKey: "n10.webp", base: "cdn", basename: "n10" },
  { key: "n11", sourceKey: "n11.webp", base: "cdn", basename: "n11" },
  { key: "n12", sourceKey: "n12.webp", base: "cdn", basename: "n12" },
  { key: "n13", sourceKey: "n13.webp", base: "cdn", basename: "n13" },
  { key: "baiquan", sourceKey: "baiquan.jpg", base: "cdn", basename: "baiquan" },
  {
    key: "internal_brand_023",
    sourceKey: "internal-brand-023-3291bb4c.webp",
    base: "cdn",
    basename: "internal-brand-023",
  },
  {
    key: "asset_85923e7",
    sourceKey: "asset-85923e7fafe00c9c0d1f.webp",
    base: "cdn",
    basename: "asset-85923e7",
  },
  // 首页「构建记录」右侧的页面预览截图（Playwright 截的，原图只在本地 raw 目录）
  { key: "build_log_photo_wall", sourceKey: "build-log-photo-wall.png", base: "cdn", basename: "build-log-photo-wall" },
  { key: "build_log_preview", sourceKey: "build-log-preview.png", base: "cdn", basename: "build-log-preview" },
  // 风景油画（湖与雪山，1200×855）。原首页羊蹄山视频区块的背景，2026-10 改版后暂未使用，保留在管线里随时可取：
  // resolveImage("asset_cc24ca") → https://cdn.xn--cckl9nsb.com/asset-cc24ca.54781b26.webp
  {
    key: "asset_cc24ca",
    sourceKey: "asset-cc24ca462279ca23250c.webp",
    base: "cdn",
    basename: "asset-cc24ca",
  },
  // 首页羊蹄山视频封面：yotei.mp4 第 14s 帧，已裁掉片源上下黑边（1280×548）
  { key: "yotei_poster", sourceKey: "yotei-poster.webp", base: "cdn", basename: "yotei-poster" },
  // —— gallery ——
  ...Array.from({ length: 26 }, (_, i) => ({
    key: `gallery_photo_${i + 1}`,
    sourceKey: `photos/photo-${i + 1}.webp`,
    base: "cdn",
    basename: `photo-${i + 1}`,
  })),
  { key: "gallery_hero", sourceKey: "photos/ss.webp", base: "cdn", basename: "ss" },
  // —— cv / xiao ——
  { key: "cv_avatar", sourceKey: "Feedback/person.webp", base: "cdn", basename: "person" },
  // /anime 背景视频 you.mp4 第 0.6 秒的画面（开头 0.5 秒是黑场），做 <video poster>；raw 由 ffmpeg 本地导出，R2 上没有源文件
  { key: "anime_poster", sourceKey: "anime-poster.webp", base: "cdn", basename: "anime-poster" },
  { key: "xiao_a", sourceKey: "Feedback/a.webp", base: "cdn", basename: "a" },
  { key: "xiao_b", sourceKey: "Feedback/b.webp", base: "cdn", basename: "b" },
  { key: "xiao_c", sourceKey: "Feedback/c.webp", base: "cdn", basename: "c" },
  { key: "xiao_d", sourceKey: "Feedback/d.webp", base: "cdn", basename: "d" },
  { key: "xiao_e", sourceKey: "Feedback/e.webp", base: "cdn", basename: "e" },
  { key: "xiao_f", sourceKey: "Feedback/f.webp", base: "cdn", basename: "f" },
  // —— game ——
  { key: "game_avatar", sourceKey: "game/jkl.jpg", base: "cdn", basename: "jkl" },
  { key: "game_pox", sourceKey: "game/pox.jpg", base: "cdn", basename: "pox" },
  { key: "game_header_tchinese", sourceKey: "game/header_tchinese.jpg", base: "cdn", basename: "header_tchinese" },
  { key: "game_bl", sourceKey: "game/bl.jpg", base: "cdn", basename: "bl" },
  { key: "game_hertkinll", sourceKey: "game/hertkinll.jpg", base: "cdn", basename: "hertkinll" },
  { key: "game_zz", sourceKey: "game/zz.jpg", base: "cdn", basename: "zz" },
  { key: "game_ys", sourceKey: "game/ys.jpg", base: "cdn", basename: "ys" },
  { key: "game_sp", sourceKey: "game/sp.jpg", base: "cdn", basename: "sp" },
  { key: "game_lost", sourceKey: "game/lost.jpg", base: "cdn", basename: "lost" },
  { key: "game_ring", sourceKey: "game/ring.jpg", base: "cdn", basename: "ring" },
  { key: "game_forb", sourceKey: "game/forb.jpg", base: "cdn", basename: "forb" },
  { key: "game_hear", sourceKey: "game/hear.jpg", base: "cdn", basename: "hear" },
  { key: "game_ghost", sourceKey: "game/ghost.jpg", base: "cdn", basename: "ghost" },
  { key: "game_header", sourceKey: "game/header.jpg", base: "cdn", basename: "header" },
  { key: "game_header_schinese", sourceKey: "game/header_schinese.jpg", base: "cdn", basename: "header_schinese" },
  { key: "game_drong", sourceKey: "game/drong.jpg", base: "cdn", basename: "drong" },
  { key: "game_sekiro", sourceKey: "game/sekiro.jpg", base: "cdn", basename: "sekiro" },
  { key: "game_cike", sourceKey: "game/cike.jpg", base: "cdn", basename: "cike" },
  { key: "game_robot", sourceKey: "game/robot.jpg", base: "cdn", basename: "robot" },
  { key: "game_thief", sourceKey: "game/thief.jpg", base: "cdn", basename: "thief" },
  { key: "game_amz", sourceKey: "game/amz.jpg", base: "cdn", basename: "amz" },
  { key: "game_ruiqi", sourceKey: "game/ruiqi.jpg", base: "cdn", basename: "ruiqi" },
  { key: "game_sppppdr", sourceKey: "game/sppppdr.jpg", base: "cdn", basename: "sppppdr" },
  { key: "game_mingchao", sourceKey: "game/mingchao.jpg", base: "cdn", basename: "mingchao" },
  { key: "game_33", sourceKey: "game/33.jpg", base: "cdn", basename: "33" },
  { key: "game_yts", sourceKey: "game/yts.jpg", base: "cdn", basename: "yts" },
  { key: "game_sed", sourceKey: "game/sed.jpg", base: "cdn", basename: "sed" },
  { key: "game_maliao", sourceKey: "game/maliao.jpg", base: "cdn", basename: "maliao" },
  { key: "game_red", sourceKey: "game/red.jpg", base: "cdn", basename: "red" },
  { key: "game_zhanshen", sourceKey: "game/zhanshen.jpg", base: "cdn", basename: "zhanshen" },
  { key: "game_gta6", sourceKey: "game/gta6.jpg", base: "cdn", basename: "gta6" },
  // —— game 封面主视觉（原 public/game/heroes，2026-10-15 并入管线以生成 srcset 缩小版）——
  ...gameHeroSlugs.map((slug) => ({
    key: `game_hero_${slug.replaceAll("-", "_")}`,
    sourceKey: `game/heroes/${slug}.webp`,
    base: "cdn",
    basename: slug,
  })),
  // —— music SVG covers ——
  { key: "svg_dd", sourceKey: "SVG/dd.jpg", base: "cdn", basename: "dd" },
  { key: "svg_i", sourceKey: "SVG/i.jpg", base: "cdn", basename: "i" },
  { key: "svg_d", sourceKey: "SVG/d.jpg", base: "cdn", basename: "d" },
  { key: "svg_a", sourceKey: "SVG/a.jpg", base: "cdn", basename: "a" },
  { key: "svg_r", sourceKey: "SVG/r.jpg", base: "cdn", basename: "r" },
  { key: "svg_u", sourceKey: "SVG/u.jpg", base: "cdn", basename: "u" },
  { key: "svg_v", sourceKey: "SVG/v.jpg", base: "cdn", basename: "v" },
  { key: "svg_bb", sourceKey: "SVG/bb.jpg", base: "cdn", basename: "bb" },
  { key: "svg_h", sourceKey: "SVG/h.jpg", base: "cdn", basename: "h" },
  { key: "svg_m", sourceKey: "SVG/m.jpg", base: "cdn", basename: "m" },
  { key: "svg_y", sourceKey: "SVG/y.jpg", base: "cdn", basename: "y" },
  { key: "svg_q", sourceKey: "SVG/q.jpg", base: "cdn", basename: "q" },
  { key: "svg_f", sourceKey: "SVG/f.jpg", base: "cdn", basename: "f" },
  { key: "svg_ee", sourceKey: "SVG/ee.jpg", base: "cdn", basename: "ee" },
  { key: "svg_o", sourceKey: "SVG/o.jpg", base: "cdn", basename: "o" },
  { key: "svg_n", sourceKey: "SVG/n.jpg", base: "cdn", basename: "n" },
  { key: "svg_t", sourceKey: "SVG/t.jpg", base: "cdn", basename: "t" },
  { key: "svg_w", sourceKey: "SVG/w.jpg", base: "cdn", basename: "w" },
  { key: "svg_g", sourceKey: "SVG/g.jpg", base: "cdn", basename: "g" },
];

/** R2 游戏封面 sourceKey → manifest key */
export const gameCoverManifestKey = {
  "game/pox.jpg": "game_pox",
  "game/header_tchinese.jpg": "game_header_tchinese",
  "game/bl.jpg": "game_bl",
  "game/hertkinll.jpg": "game_hertkinll",
  "game/zz.jpg": "game_zz",
  "game/ys.jpg": "game_ys",
  "game/sp.jpg": "game_sp",
  "game/lost.jpg": "game_lost",
  "game/ring.jpg": "game_ring",
  "game/forb.jpg": "game_forb",
  "game/hear.jpg": "game_hear",
  "game/ghost.jpg": "game_ghost",
  "game/header.jpg": "game_header",
  "game/header_schinese.jpg": "game_header_schinese",
  "game/drong.jpg": "game_drong",
  "game/sekiro.jpg": "game_sekiro",
  "game/cike.jpg": "game_cike",
  "game/robot.jpg": "game_robot",
  "game/thief.jpg": "game_thief",
  "game/amz.jpg": "game_amz",
  "game/ruiqi.jpg": "game_ruiqi",
  "game/sppppdr.jpg": "game_sppppdr",
  "game/mingchao.jpg": "game_mingchao",
  "game/33.jpg": "game_33",
  "game/yts.jpg": "game_yts",
  "game/sed.jpg": "game_sed",
  "game/maliao.jpg": "game_maliao",
  "game/red.jpg": "game_red",
  "game/zhanshen.jpg": "game_zhanshen",
  "game/gta6.jpg": "game_gta6",
};

/** music 页 /SVG/*.jpg → manifest key */
export const svgCoverManifestKey = {
  "/SVG/dd.jpg": "svg_dd",
  "/SVG/i.jpg": "svg_i",
  "/SVG/d.jpg": "svg_d",
  "/SVG/a.jpg": "svg_a",
  "/SVG/r.jpg": "svg_r",
  "/SVG/u.jpg": "svg_u",
  "/SVG/v.jpg": "svg_v",
  "/SVG/bb.jpg": "svg_bb",
  "/SVG/h.jpg": "svg_h",
  "/SVG/m.jpg": "svg_m",
  "/SVG/y.jpg": "svg_y",
  "/SVG/q.jpg": "svg_q",
  "/SVG/f.jpg": "svg_f",
  "/SVG/ee.jpg": "svg_ee",
  "/SVG/o.jpg": "svg_o",
  "/SVG/n.jpg": "svg_n",
  "/SVG/t.jpg": "svg_t",
  "/SVG/w.jpg": "svg_w",
  "/SVG/g.jpg": "svg_g",
};
