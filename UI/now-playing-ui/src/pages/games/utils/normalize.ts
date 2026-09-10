import {
  SteamGame,
  PsnGame,
  RetroAchievementsGame,
  XboxGame,
  Game,
  GameSource,
  PLATFORM_METADATA,
} from "./types";
import { isPsnGame, isXboxGame, isRetroAchievementsGame } from "./typeGuards";

type GameData = SteamGame | PsnGame | RetroAchievementsGame | XboxGame;

/**
 * Normalizes a game title for cross-platform matching.
 * Lowercases, removes extra whitespace, punctuation, and common suffixes.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\b(the|a)\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/goty|game of the year|edition|definitive|remastered|remake/gi, "")
    .trim();
}

/**
 * Extracts playtime in minutes from a platform-specific game.
 */
function extractPlaytime(game: GameData): {
  minutes: number;
  hasPlaytime: boolean;
} {
  if ("playtime_forever" in game && typeof game.playtime_forever === "number") {
    return { minutes: game.playtime_forever, hasPlaytime: true };
  }

  const xboxPlatforms = ["XboxOne", "XboxSeries", "PC", "Xbox360"];
  if (
    "platform" in game &&
    typeof game.platform === "string" &&
    xboxPlatforms.some((p) => game.platform.includes(p)) &&
    "total_playtime" in game
  ) {
    const mins = parseInt(game.total_playtime as string, 10);
    return { minutes: isNaN(mins) ? 0 : mins, hasPlaytime: true };
  }

  if ("total_playtime" in game && typeof game.total_playtime === "string") {
    const parts = game.total_playtime.split(/[:, ]+/);
    const hasDays = parts.includes("days");
    const days = hasDays ? parseInt(parts[0], 10) : 0;
    const hours = parseInt(parts[hasDays ? 2 : 0], 10);
    const mins = parseInt(parts[hasDays ? 3 : 1], 10);
    return { minutes: days * 24 * 60 + hours * 60 + mins, hasPlaytime: true };
  }

  return { minutes: 0, hasPlaytime: false };
}

/**
 * Extracts achievement counts from a platform-specific game.
 */
function extractAchievements(game: GameData): {
  total: number;
  unlocked: number;
} {
  if (
    "unlocked_achievements_count" in game &&
    typeof game.unlocked_achievements_count === "number"
  ) {
    return {
      total: game.total_achievements || 0,
      unlocked: game.unlocked_achievements_count,
    };
  }

  if (isPsnGame(game)) {
    const total =
      (game.total_achievements?.platinum || 0) +
      (game.total_achievements?.gold || 0) +
      (game.total_achievements?.silver || 0) +
      (game.total_achievements?.bronze || 0);
    const unlocked =
      (game.unlocked_achievements?.platinum || 0) +
      (game.unlocked_achievements?.gold || 0) +
      (game.unlocked_achievements?.silver || 0) +
      (game.unlocked_achievements?.bronze || 0);
    return { total, unlocked };
  }

  if (
    "unlocked_achievements" in game &&
    typeof game.unlocked_achievements === "number"
  ) {
    return {
      total: game.total_achievements || 0,
      unlocked: game.unlocked_achievements,
    };
  }

  return { total: 0, unlocked: 0 };
}

/**
 * Extracts dates from a platform-specific game.
 */
function extractDates(game: GameData): {
  lastPlayed: Date | null;
  firstPlayed: Date | null;
} {
  const lastPlayed = game.last_played ? new Date(game.last_played) : null;
  const firstPlayed =
    "first_played" in game && game.first_played
      ? new Date(game.first_played)
      : null;
  return { lastPlayed, firstPlayed };
}

/**
 * Determines the platform key for a game.
 */
function getPlatformKey(game: GameData): string {
  if (isRetroAchievementsGame(game)) return "retroachievements";
  if (isXboxGame(game)) return "xbox";
  if (isPsnGame(game)) return "psn";
  return "steam";
}

/**
 * Converts a platform-specific game into a canonical GameSource.
 */
export function toGameSource(game: GameData): GameSource {
  const platform = getPlatformKey(game);
  const { minutes, hasPlaytime } = extractPlaytime(game);
  const { total, unlocked } = extractAchievements(game);
  const { lastPlayed, firstPlayed } = extractDates(game);

  return {
    platform,
    appId: String(game.appid),
    playtimeMinutes: minutes,
    hasPlaytime,
    totalAchievements: total,
    unlockedAchievements: unlocked,
    lastPlayed,
    firstPlayed,
    imageUrl: game.img_icon_url || "",
    raw: game,
  };
}

/**
 * Creates a canonical Game from a single source.
 */
export function createCanonicalGame(source: GameSource): Game {
  const platformMeta = PLATFORM_METADATA[source.platform];
  const platforms = platformMeta ? [platformMeta] : [];
  const title = (source.raw as { name: string }).name || "Unknown";

  return {
    id: `${source.platform}_${source.appId}`,
    normalizedTitle: normalizeTitle(title),
    title,
    platforms,
    sources: [source],
    totalPlaytimeMinutes: source.hasPlaytime ? source.playtimeMinutes : 0,
    totalAchievements: source.totalAchievements,
    unlockedAchievements: source.unlockedAchievements,
    isCrossPlatform: false,
    lastPlayed: source.lastPlayed,
    firstPlayed: source.firstPlayed,
    imageUrl: source.imageUrl,
  };
}

/**
 * Normalizes an array of platform-specific games into canonical Game objects.
 * Games are NOT grouped by title — each source becomes its own Game.
 * Use `groupGamesByTitle` after this to merge cross-platform duplicates.
 */
export function normalizeGames(games: GameData[]): Game[] {
  return games.map((game) => {
    const source = toGameSource(game);
    return createCanonicalGame(source);
  });
}
