import { userStats, platforms, allGamesData, followedGames, featuredGameId } from "~/data/game";
import type { PlatformId, UnifiedGame, UnifiedGamePageData } from "~/types/game";
import { getValidPlatformId, paginateGames, sortGamesByProgressAndRating } from "~/lib/utils/gameUtils";
import { resolveR2Image } from "~/lib/resolve-image";
import { gameHeroImages } from "~/data/game-hero-images";
import { GAME_LABELS, GAME_TAGS, GAME_TEXT } from "~/data/i18n/game";
import { DEFAULT_LOCALE, type Locale } from "~/lib/i18n";

export function isPlatformId(platformId: string): platformId is PlatformId {
  return getValidPlatformId(platformId) === platformId;
}

export async function buildUnifiedGameData(initialPlatform?: string, locale: Locale = DEFAULT_LOCALE): Promise<UnifiedGamePageData> {
  const allPlatformGames: UnifiedGame[] = [];
  const text = locale === DEFAULT_LOCALE ? {} : GAME_TEXT[locale];
  const tags = locale === DEFAULT_LOCALE ? {} : GAME_TAGS[locale];
  const labels: Record<string, string> = locale === DEFAULT_LOCALE ? {} : GAME_LABELS[locale];
  const label = (value: string) => labels[value] ?? value;

  (Object.keys(allGamesData) as PlatformId[]).forEach((pid) => {
    allGamesData[pid].forEach((g) => {
      allPlatformGames.push({
        ...g,
        name: text[g.id]?.name ?? g.name,
        review: text[g.id]?.review ?? g.review,
        tags: g.tags.map((tag) => tags[tag] ?? tag),
        platform: pid,
        cover: resolveR2Image(g.cover),
        // 大图按中文原名登记，翻译游戏名之前先解析好；路径对应图片管线里的 game/heroes/*，解析成带 hash 的 CDN 地址
        heroImage: resolveR2Image(gameHeroImages[g.name] ?? g.cover),
      });
    });
  });

  // Sort by rating & progress
  const sortedAllGames = [...allPlatformGames].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return (b.progress ?? 0) - (a.progress ?? 0);
  });

  return {
    userStats: userStats.map((stat) => ({ ...stat, label: label(stat.label) })),
    platforms: platforms.map((platform) => ({
      ...platform,
      motto: label(platform.motto),
      stats: platform.stats.map((stat) => ({ ...stat, label: label(stat.label) })),
    })),
    initialPlatform: initialPlatform && isPlatformId(initialPlatform) ? initialPlatform : "all",
    featuredGameId,
    allGames: sortedAllGames,
    followedGames: followedGames.map((game) => ({
      ...game,
      releaseDate: text[game.id]?.releaseDate ?? game.releaseDate,
      cover: resolveR2Image(game.cover),
    })),
    avatarImageUrl: resolveR2Image("game/jkl.jpg"),
  };
}

export async function buildGamePlatformData(platformId: PlatformId, currentPage: number) {
  const sortedGames = sortGamesByProgressAndRating(allGamesData[platformId]);
  const paginationResult = paginateGames(sortedGames, currentPage, 8);
  return {
    userStats,
    platforms,
    platformId,
    paginatedGames: paginationResult.paginatedGames.map((game) => ({
      ...game,
      cover: resolveR2Image(game.cover),
    })),
    totalGames: paginationResult.totalGames,
    totalPages: paginationResult.totalPages,
    currentPage: paginationResult.currentPage,
    followedGames: followedGames.map((game) => ({
      ...game,
      cover: resolveR2Image(game.cover),
    })),
    avatarImageUrl: resolveR2Image("game/jkl.jpg"),
  };
}
