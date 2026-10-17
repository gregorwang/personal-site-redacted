export type Game = {
  id: number;
  name: string;
  playTime: string;
  progress: number | null;
  trophies: {
    platinum: number;
    gold: number;
    silver: number;
    bronze: number;
  };
  achievementsCurrent: number | null;
  achievementsTotal: number | null;
  rating: number;
  review: string;
  tags: string[];
  cover: string;
};

export type UnifiedGame = Game & {
  platform: PlatformId;
  /** 封面大图；没有专门大图时等于 cover */
  heroImage?: string;
};

export type Platform = {
  id: string;
  name: string;
  gradient: string;
  score: string;
  motto: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
};

export type UserStat = {
  label: string;
  value: string;
};

export type FollowedGame = {
  id: number;
  name: string;
  releaseDate: string;
  rating: number;
  cover: string;
};

export type PlatformId = "playstation" | "switch" | "pc";

export type AllGamesData = {
  [K in PlatformId]: Game[];
};

export type GamePlatformFilter = PlatformId | "all";

export type UnifiedGamePageData = {
  userStats: UserStat[];
  platforms: Platform[];
  initialPlatform: GamePlatformFilter;
  featuredGameId: number;
  allGames: UnifiedGame[];
  followedGames: FollowedGame[];
  avatarImageUrl: string;
};
