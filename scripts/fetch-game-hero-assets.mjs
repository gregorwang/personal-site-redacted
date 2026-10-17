import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// 输出到图片管线的 raw 目录（键名 game_hero_<slug>），之后跑 npm run images:process && npm run images:upload
// 生成多宽度 webp 并上传 CDN；新加游戏还要在 image-assets.config.mjs 的 gameHeroSlugs 里登记
const outputDirectory = path.resolve("assets/images/raw");

// Official PlayStation Store / PlayStation.com / Nintendo product-page artwork.
const heroSources = {
  "tales-of-arise": "https://image.api.playstation.com/vulcan/img/rnd/202107/2321/FtRuUY1UEJTHVir7auMtx37B.png",
  "stellar-blade": "https://image.api.playstation.com/vulcan/ap/rnd/202402/0806/94ddb4e1994ad9f28d6ede77f1ade438ffe34ef540a07b4a.jpg",
  "granblue-fantasy-relink": "https://image.api.playstation.com/vulcan/ap/rnd/202308/1508/00f1760f836112a3acf4f2de73e1de873b7981944029b2f8.png",
  "alan-wake-2": "https://image.api.playstation.com/vulcan/ap/rnd/202305/2420/0273d27b39938da5474bdb8c1c7daa285824f5c86e8fcacd.png",
  "final-fantasy-16": "https://image.api.playstation.com/vulcan/ap/rnd/202211/1009/r6tgTLr0VYsmGMRmaeVcsxkj.png",
  "ys-8": "https://image.api.playstation.com/vulcan/ap/rnd/202210/1223/YKJrKE2VoojphIpRobWRO6k8.png",
  "spider-man-2": "https://image.api.playstation.com/vulcan/ap/rnd/202306/1518/e8f4913ffca62086892053502ae2d7f4b7b05b9c9b2580b1.jpg",
  "the-last-of-us-2": "https://image.api.playstation.com/vulcan/ap/rnd/202312/0117/db27713920e0f4a0ea2df9ee0711c714e38e04de201f3182.png",
  "elden-ring": "https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/ZmqYfcMqlAbRB1s0XClGgwBc.png",
  "horizon-forbidden-west": "https://image.api.playstation.com/vulcan/ap/rnd/202109/0111/6jI8cuUqria3ezbmgwS3y3Fz.png",
  "god-of-war-ragnarok": "https://image.api.playstation.com/vulcan/ap/rnd/202503/2016/a82f57bddecb4a0baf03f42834dffd3991a682570a519718.png",
  "ghost-of-tsushima": "https://image.api.playstation.com/vulcan/ap/rnd/202106/2322/8zCsvrOiHRuFLt8HkTt63coO.png",
  "horizon-zero-dawn": "https://image.api.playstation.com/vulcan/img/rnd/202009/3000/f03gF2KAW1bTCYbOl0LiV1fB.png",
  "rise-of-the-ronin": "https://image.api.playstation.com/vulcan/ap/rnd/202212/2201/yrkCZRK9mwPdC0DMwzww9u5H.jpg",
  "wo-long": "https://image.api.playstation.com/vulcan/ap/rnd/202211/3023/CvvZxprz8h5LnQqdpyO3ieIe.png",
  "sekiro": "https://image.api.playstation.com/vulcan/img/rnd/202010/2818/HF5xsTf7v1o24pPcghYQiLVj.png",
  "assassins-creed-shadows": "https://image.api.playstation.com/vulcan/ap/rnd/202412/2018/3ecffaa1838e58e22ffa03a0ddf0f98a81c32286668373af.png",
  "astro-bot": "https://image.api.playstation.com/vulcan/ap/rnd/202406/0500/ae5bd5dc2ab0e6a4f8c1d2510cc50bb642f20980fd53f676.png",
  "uncharted-legacy": "https://gmedia.playstation.com/is/image/SIEPDC/uncharted-legacy-of-thieves-background-02-en-01dec21?$2400px$",
  "the-last-of-us-1": "https://image.api.playstation.com/vulcan/ap/rnd/202206/0722/uy8RtmawDXLROQQNi81PWB7Y.png",
  "ratchet-and-clank-rift-apart": "https://gmedia.playstation.com/is/image/SIEPDC/ratchet-and-clank-rift-apart-hero-banner-desktop-01-en-27jan21?$2400px$",
  "spider-man-miles-morales": "https://image.api.playstation.com/vulcan/ap/rnd/202008/1420/QmDbRbOdncasHjipz2S7FgJe.png",
  "expedition-33": "https://image.api.playstation.com/vulcan/ap/rnd/202406/0917/1f86d6d6b37345a4133440c124d5df50fe8b6193139172d3.jpg",
  "ghost-of-yotei": "https://image.api.playstation.com/vulcan/ap/rnd/202410/2119/c306b5457822624bae762cde44a866e0d10960f2287fcac6.png",
  "zelda-tears-of-the-kingdom": "https://assets.nintendo.com/image/upload/q_auto/f_auto/ncom/My%20Nintendo%20Store/EN-US/Nintendo%20Switch%20Software/the-legend-of-zelda-tears-of-the-kingdom-112383/112383-nintendo-the-legeld-of-zelda-tears-of-the-kingdom-1200x675",
  "super-mario-odyssey": "https://assets.nintendo.com/image/upload/q_auto/f_auto/ncom/en_US/products/games/switch/super-mario-odyssey/105879-switch-super-mario-odyssey-us-1200x675",
  "red-dead-redemption-2": "https://image.api.playstation.com/vulcan/img/rnd/202011/1215/WyHa1BM3ISDVqYSEUMB9VZJs.png",
  "god-of-war": "https://image.api.playstation.com/vulcan/img/rnd/202010/2217/5gDpzRQrhlcegaPf8wW1QIuf.png",
};

await mkdir(outputDirectory, { recursive: true });

for (const [slug, sourceUrl] of Object.entries(heroSources)) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${slug}: ${response.status} ${response.statusText}`);
  }

  const source = Buffer.from(await response.arrayBuffer());
  const outputPath = path.join(outputDirectory, `game_hero_${slug.replaceAll("-", "_")}.webp`);
  const info = await sharp(source)
    .resize({ width: 2560, withoutEnlargement: true })
    .webp({ quality: 88, effort: 5 })
    .toFile(outputPath);

  console.log(`${slug}: ${info.width}x${info.height} -> ${outputPath}`);
}
