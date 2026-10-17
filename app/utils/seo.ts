import type { MetaDescriptor } from "react-router";
import { createIntl, defineMessages, type IntlShape } from "react-intl";
import { cdnUrl } from "~/lib/media-cdn";
import { DEFAULT_LOCALE, LOCALE_HTML_LANG, LOCALE_OG, isLocale, localizePath, type Locale } from "~/lib/i18n";

export interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: "website" | "article" | "profile";
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  locale?: Locale;
  siteName?: string;
}

type MetaMatch = { id: string; data: unknown };

/** meta 函数里不能用 hooks：从 root loader 数据里取当前语言和词典，造一个 intl 实例。 */
export function getMetaIntl(matches: readonly MetaMatch[]): { intl: IntlShape; locale: Locale } {
  const data = matches.find((match) => match.id === "root")?.data as
    | { locale?: string; messages?: Record<string, string> }
    | undefined;
  const locale = isLocale(data?.locale) ? data.locale : DEFAULT_LOCALE;
  const intl = createIntl({
    locale: LOCALE_HTML_LANG[locale],
    defaultLocale: LOCALE_HTML_LANG[DEFAULT_LOCALE],
    messages: data?.messages ?? {},
    onError: (error) => {
      if (error.code !== "MISSING_TRANSLATION") console.error(error);
    },
  });
  return { intl, locale };
}

const homeMetaMessages = defineMessages({
  siteName: {
    defaultMessage: "汪家俊的个人网站",
    description: "站点名，用在 <title> 后缀和 og:site_name；首页标题应以它开头",
  },
  title: {
    defaultMessage: "汪家俊的个人网站 - 将我的爱弃置于此",
    description: "首页 <title>",
  },
  description: {
    defaultMessage:
      "欢迎来到汪家俊(Wang Jiajun)的数字伊甸园。AI协同开发者，游戏探索者（1546h+），光影记录者（214张作品），旋律收藏家（2500+首）。将我的爱弃置于此。",
    description: "首页 meta description",
  },
});

export const SITE_URL = "https://xn--cckl9nsb.com";

const DEFAULT_OG_IMAGE = cdnUrl("og/default.jpg");
const SITE_NAME = "汪家俊的个人网站";
const TWITTER_HANDLE = "@wangjiajun"; // 如果有Twitter账号

export function generateMeta(config: SEOConfig): MetaDescriptor[] {
  const {
    title,
    description,
    image = DEFAULT_OG_IMAGE,
    url,
    type = "website",
    keywords = [],
    author = "汪家俊 (Wang Jiajun)",
    publishedTime,
    modifiedTime,
    locale = DEFAULT_LOCALE,
    siteName = SITE_NAME,
  } = config;

  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;

  const meta: MetaDescriptor[] = [
    // 基础meta标签
    { title: fullTitle },
    { name: "description", content: description },
    { name: "author", content: author },

    // 关键词 (虽然SEO价值有限，但不会有害)
    ...(keywords.length > 0 ? [{ name: "keywords", content: keywords.join(", ") }] : []),

    // Open Graph标签 (Facebook, 微信, LinkedIn等)
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:url", content: url },
    { property: "og:type", content: type },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: LOCALE_OG[locale] },

    // Twitter Card标签
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:creator", content: TWITTER_HANDLE },

    // 规范化URL
    { tagName: "link", rel: "canonical", href: url },
  ];

  // 文章类型的额外标签
  if (type === "article") {
    if (publishedTime) {
      meta.push({ property: "article:published_time", content: publishedTime });
    }
    if (modifiedTime) {
      meta.push({ property: "article:modified_time", content: modifiedTime });
    }
    meta.push({ property: "article:author", content: author });
  }

  return meta;
}

type MetaContext = { intl: IntlShape; locale: Locale };

const pageMetaMessages = defineMessages({
  galleryTitle: { defaultMessage: "摄影作品集", description: "摄影页 <title>" },
  galleryDescription: { defaultMessage: "精选摄影作品集，记录生活中的美好瞬间与光影故事，涵盖风景、人像、街拍等多种风格" },
  chatTitle: { defaultMessage: "AI聊天室 - 与Nemesis对话" },
  chatDescription: { defaultMessage: "与AI助手Nemesis进行智能对话，探讨技术、创意和生活。基于先进的AI技术，提供自然流畅的交互体验。" },
  cvTitle: { defaultMessage: "褪色者宣言 - 汪家俊的冒险履历" },
  cvDescription: {
    defaultMessage:
      "汪家俊的冒险履历，云雀守望者公会高级质检专员，交界地王立学院生命医学学士。AI协同开发者（ChatGPT & Claude），游戏探索者（艾尔登法环100h白金），光影记录者（214张作品）。将我的爱弃置于此。",
  },
  gameTitle: { defaultMessage: "游戏中心 - 我的游戏收藏" },
  gameDescription: { defaultMessage: "个人游戏收藏库，包含PlayStation、Nintendo Switch和PC平台的精选游戏，分享游戏体验与评价。" },
  animeTitle: { defaultMessage: "最喜欢的动漫", description: "动漫页 <title>" },
  animeDescription: { defaultMessage: "精选动漫推荐，分享我喜爱的动漫作品、角色和故事，涵盖热血、治愈、悬疑等多种类型。" },
  musicTitle: { defaultMessage: "音乐播放器 - 我的音乐收藏" },
  musicDescription: { defaultMessage: "探索我的音乐世界，包含2500+首精选歌曲，涵盖流行、电子、古典等多种风格，支持在线播放和歌词显示。" },
  updatesTitle: { defaultMessage: "更新日志", description: "更新日志页 <title>" },
  updatesDescription: { defaultMessage: "网站更新日志，记录功能更新、Bug修复和性能优化等开发历程。" },
  messagesTitle: { defaultMessage: "留言板", description: "留言板页 <title>" },
  messagesDescription: { defaultMessage: "在这里留下你的想法、建议或问候，与我分享你的故事。" },
});

/** 子页面统一走这里：标题、描述、站名、canonical、og:locale 都按当前语言输出。 */
function localizedPageMeta(
  { intl, locale }: MetaContext,
  path: string,
  config: Omit<SEOConfig, "url" | "locale" | "siteName">,
) {
  return generateMeta({
    ...config,
    url: `${SITE_URL}${localizePath(path, locale)}`,
    locale,
    siteName: intl.formatMessage(homeMetaMessages.siteName),
  });
}

// 快捷函数：为主要页面生成meta
export const pageMeta = {
  home: ({ intl, locale }: MetaContext) =>
    generateMeta({
      title: intl.formatMessage(homeMetaMessages.title),
      description: intl.formatMessage(homeMetaMessages.description),
      url: locale === DEFAULT_LOCALE ? SITE_URL : `${SITE_URL}${localizePath("/", locale)}`,
      locale,
      siteName: intl.formatMessage(homeMetaMessages.siteName),
      type: "profile",
      keywords: ["汪家俊", "Wang Jiajun", "wangjiajun", "AI开发", "游戏", "摄影", "音乐", "动漫"],
    }),

  gallery: (ctx: MetaContext) =>
    localizedPageMeta(ctx, "/gallery", {
      title: ctx.intl.formatMessage(pageMetaMessages.galleryTitle),
      description: ctx.intl.formatMessage(pageMetaMessages.galleryDescription),
      image: cdnUrl("og/gallery.jpg"),
      keywords: ["摄影", "作品集", "风景摄影", "街拍", "汪家俊摄影"],
    }),

  chat: (ctx: MetaContext) =>
    localizedPageMeta(ctx, "/chat", {
      title: ctx.intl.formatMessage(pageMetaMessages.chatTitle),
      description: ctx.intl.formatMessage(pageMetaMessages.chatDescription),
      image: cdnUrl("og/chat.jpg"),
      keywords: ["AI聊天", "人工智能", "对话机器人", "Nemesis"],
    }),

  cv: (ctx: MetaContext) =>
    localizedPageMeta(ctx, "/cv", {
      title: ctx.intl.formatMessage(pageMetaMessages.cvTitle),
      description: ctx.intl.formatMessage(pageMetaMessages.cvDescription),
      image: cdnUrl("og/cv.jpg"),
      type: "profile",
      keywords: ["简历", "汪家俊", "AI协同开发", "游戏", "摄影", "艾尔登法环"],
    }),

  game: (ctx: MetaContext) =>
    localizedPageMeta(ctx, "/game", {
      title: ctx.intl.formatMessage(pageMetaMessages.gameTitle),
      description: ctx.intl.formatMessage(pageMetaMessages.gameDescription),
      image: cdnUrl("og/game.jpg"),
      keywords: ["游戏", "PlayStation", "Switch", "PC游戏", "游戏收藏"],
    }),

  anime: (ctx: MetaContext) =>
    localizedPageMeta(ctx, "/anime", {
      title: ctx.intl.formatMessage(pageMetaMessages.animeTitle),
      description: ctx.intl.formatMessage(pageMetaMessages.animeDescription),
      image: cdnUrl("og/anime.jpg"),
      keywords: ["动漫", "动画", "日本动漫", "动漫推荐"],
    }),

  music: (ctx: MetaContext) =>
    localizedPageMeta(ctx, "/music", {
      title: ctx.intl.formatMessage(pageMetaMessages.musicTitle),
      description: ctx.intl.formatMessage(pageMetaMessages.musicDescription),
      image: cdnUrl("og/music.jpg"),
      keywords: ["音乐", "音乐播放器", "歌曲", "在线音乐"],
    }),

  updates: (ctx: MetaContext) =>
    localizedPageMeta(ctx, "/updates", {
      title: ctx.intl.formatMessage(pageMetaMessages.updatesTitle),
      description: ctx.intl.formatMessage(pageMetaMessages.updatesDescription),
      type: "article",
      keywords: ["更新日志", "网站更新", "开发日志"],
    }),

  messages: (ctx: MetaContext) =>
    localizedPageMeta(ctx, "/messages", {
      title: ctx.intl.formatMessage(pageMetaMessages.messagesTitle),
      description: ctx.intl.formatMessage(pageMetaMessages.messagesDescription),
      keywords: ["留言板", "留言", "反馈"],
    }),
};
