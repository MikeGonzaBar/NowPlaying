export interface SteamAchievement {
  description: string;
  image: string;
  name: string;
  unlock_time?: string;
  unlocked: boolean;
}
export interface SteamGame {
  achievements: SteamAchievement[];
  appid: number;
  content_descriptorids: number[];
  has_community_visible_stats: boolean;
  img_icon_url: string;
  name: string;
  playtime_forever: number;
  playtime_formatted: string;
  last_played: string;
  total_achievements: number;
  unlocked_achievements: number;
  unlocked_achievements_count: number;
  locked_achievements_count: number;
}

export interface PsnAchievement {
  description: string;
  image: string;
  name: string;
  type: string;
  unlock_time?: string;
  unlocked: boolean;
}

interface AchievementDetails {
  platinum?: number;
  gold?: number;
  silver?: number;
  bronze?: number;
}

export interface PsnGame {
  achievements: PsnAchievement[];
  appid: string;
  first_played: string;
  img_icon_url: string;
  last_played: string;
  name: string;
  platform: string;
  total_playtime: string;
  unlocked_achievements: AchievementDetails;
  total_achievements: AchievementDetails;
}

export interface RetroAchievementsAchievement {
  achievement_id: number;
  name: string;
  description: string;
  image: string;
  points: number;
  true_ratio: number;
  unlock_time: string;
  display_order: number;
  type: string;
  unlocked: boolean;
}

export interface RetroAchievementsGame {
  appid: number;
  name: string;
  console_name: string;
  image_icon: string;
  image_title: string;
  image_ingame: string;
  img_icon_url: string;

  last_played: string;
  total_achievements: number;
  unlocked_achievements: number;
  locked_achievements: number;
  score_achieved: number;
  achievements: RetroAchievementsAchievement[];
}

export interface XboxAchievement {
  name: string;
  description: string;
  image: string;
  unlocked: boolean;
  unlock_time: string;
  achievement_value: string;
}
export interface XboxGame {
  appid: number;
  name: string;
  platform: string;
  total_playtime: string;
  first_played: string;
  last_played: string;
  img_icon_url: string;
  achievements: XboxAchievement[];
  total_achievements: number;
  unlocked_achievements: number;
  locked_achievements: number;
}


/**
 * Platform metadata for display purposes.
 */
export interface GamePlatform {
  /** Internal platform key: "steam" | "psn" | "xbox" | "retroachievements" */
  key: string;
  /** Human-readable display name: "Steam", "PlayStation", "Xbox", etc. */
  displayName: string;
  /** Platform icon URL */
  icon: string;
  /** Brand color for UI accents */
  color: string;
}

/**
 * Per-platform source data for a canonical game.
 * Each GameSource represents one platform's record of a game.
 */
export interface GameSource {
  /** Platform key */
  platform: string;
  /** Platform-specific app/game ID */
  appId: string;
  /** Playtime in minutes (0 if platform doesn't report it) */
  playtimeMinutes: number;
  /** Whether this platform reports playtime */
  hasPlaytime: boolean;
  /** Total achievements for this platform record */
  totalAchievements: number;
  /** Unlocked achievements for this platform record */
  unlockedAchievements: number;
  /** Last played date (null if unknown) */
  lastPlayed: Date | null;
  /** First played date (null if unknown) */
  firstPlayed: Date | null;
  /** Game image/cover URL */
  imageUrl: string;
  /** Original platform-specific game object */
  raw: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

/**
 * Canonical unified game model.
 * Represents a single game that may exist on one or more platforms.
 */
export interface Game {
  /** Unique canonical ID (e.g., "app_730" or a hash of the normalized title) */
  id: string;
  /** Normalized game title for matching/comparison */
  normalizedTitle: string;
  /** Display title (from the most recent source) */
  title: string;
  /** All platforms this game is available on */
  platforms: GamePlatform[];
  /** Per-platform source data */
  sources: GameSource[];
  /** Total playtime across all platforms (minutes) */
  totalPlaytimeMinutes: number;
  /** Total achievements across all platforms */
  totalAchievements: number;
  /** Unlocked achievements across all platforms */
  unlockedAchievements: number;
  /** Whether this game exists on multiple platforms */
  isCrossPlatform: boolean;
  /** Most recent last-played date across all sources */
  lastPlayed: Date | null;
  /** Earliest first-played date across all sources */
  firstPlayed: Date | null;
  /** Best available image URL */
  imageUrl: string;
}

/** Map of platform key → GamePlatform metadata */
export const PLATFORM_METADATA: Record<string, GamePlatform> = {
  steam: {
    key: "steam",
    displayName: "Steam",
    icon: "/Platforms/steam.webp",
    color: "#1b2838",
  },
  psn: {
    key: "psn",
    displayName: "PlayStation",
    icon: "/Platforms/playstation.webp",
    color: "#003087",
  },
  xbox: {
    key: "xbox",
    displayName: "Xbox",
    icon: "/Platforms/xbox.svg",
    color: "#107c10",
  },
  retroachievements: {
    key: "retroachievements",
    displayName: "RetroAchievements",
    icon: "/Platforms/retroachievements.png",
    color: "#cc9900",
  },
};
