import type { PlatformId } from "~/types/game";

const PLATFORM_IDS: PlatformId[] = ["playstation", "switch", "pc"];

export function isValidPlatformId(platformId: string): platformId is PlatformId {
  return PLATFORM_IDS.includes(platformId as PlatformId);
}

export function getValidPlatformId(
  platformId: string,
  defaultPlatform: PlatformId = "playstation",
): PlatformId {
  return isValidPlatformId(platformId) ? platformId : defaultPlatform;
}

export function paginateGames<T>(
  games: T[],
  currentPage: number,
  gamesPerPage: number = 8,
): {
  paginatedGames: T[];
  totalGames: number;
  totalPages: number;
  currentPage: number;
} {
  const totalGames = games.length;
  const totalPages = Math.ceil(totalGames / gamesPerPage);
  const startIndex = (currentPage - 1) * gamesPerPage;
  const endIndex = startIndex + gamesPerPage;

  return {
    paginatedGames: games.slice(startIndex, endIndex),
    totalGames,
    totalPages,
    currentPage,
  };
}

export function sortGamesByProgressAndRating<T extends { progress: number | null; rating: number }>(
  games: T[],
): T[] {
  return [...games].sort((a, b) => {
    const ap = a.progress ?? -1;
    const bp = b.progress ?? -1;
    if (bp !== ap) return bp - ap;
    return b.rating - a.rating;
  });
}
