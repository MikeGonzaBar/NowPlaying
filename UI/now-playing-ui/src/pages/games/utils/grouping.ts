import {
  Game,
  GameSource,
  SteamGame,
  PsnGame,
  RetroAchievementsGame,
  XboxGame,
  PLATFORM_METADATA,
} from "./types";
import { normalizeGames } from "./normalize";

type GameData = SteamGame | PsnGame | RetroAchievementsGame | XboxGame;

/**
 * Groups canonical games by their normalized title.
 * Games with the same normalized title are considered the same game
 * across different platforms.
 *
 * Returns a Map where:
 * - key = normalized title
 * - value = array of Game objects that share that title
 */
export function groupGamesByTitle(games: Game[]): Map<string, Game[]> {
  const groups = new Map<string, Game[]>();

  for (const game of games) {
    const key = game.normalizedTitle
      .replace(/\b(the|a)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const existing = groups.get(key);
    if (existing) {
      existing.push(game);
    } else {
      groups.set(key, [game]);
    }
  }

  return groups;
}

/**
 * Merges multiple canonical Game objects (same title, different platforms)
 * into a single Game with combined sources and aggregated stats.
 */
export function mergeGameGroup(games: Game[]): Game {
  if (games.length === 0) {
    throw new Error("Cannot merge empty game group");
  }

  if (games.length === 1) {
    return { ...games[0], isCrossPlatform: false };
  }

  const allSources: GameSource[] = games.flatMap((g) => g.sources);

  const sourceByPlatform = new Map<string, GameSource>();
  for (const source of allSources) {
    const existing = sourceByPlatform.get(source.platform);
    if (!existing || source.totalAchievements > existing.totalAchievements) {
      sourceByPlatform.set(source.platform, source);
    }
  }
  const dedupedSources = Array.from(sourceByPlatform.values());

  const totalPlaytimeMinutes = dedupedSources.reduce(
    (sum, s) => sum + (s.hasPlaytime ? s.playtimeMinutes : 0),
    0,
  );
  const totalAchievements = dedupedSources.reduce(
    (sum, s) => sum + s.totalAchievements,
    0,
  );
  const unlockedAchievements = dedupedSources.reduce(
    (sum, s) => sum + s.unlockedAchievements,
    0,
  );

  const platformKeys = [...new Set(dedupedSources.map((s) => s.platform))];
  const platforms = platformKeys
    .map((key) => PLATFORM_METADATA[key])
    .filter(Boolean);

  const lastPlayed = dedupedSources.reduce<Date | null>((latest, s) => {
    if (!s.lastPlayed) return latest;
    if (!latest) return s.lastPlayed;
    return s.lastPlayed > latest ? s.lastPlayed : latest;
  }, null);

  const firstPlayed = dedupedSources.reduce<Date | null>((earliest, s) => {
    if (!s.firstPlayed) return earliest;
    if (!earliest) return s.firstPlayed;
    return s.firstPlayed < earliest ? s.firstPlayed : earliest;
  }, null);

  const imageUrl =
    dedupedSources.find((s) => s.imageUrl)?.imageUrl || games[0].imageUrl || "";

  const title = dedupedSources.reduce((best, s) => {
    const sTitle = (s.raw as { name: string }).name || "";
    return sTitle.length > best.length ? sTitle : best;
  }, games[0].title);

  const normalizedTitle = games[0].normalizedTitle;

  return {
    id: `group_${normalizedTitle.replace(/\s+/g, "_")}`,
    normalizedTitle,
    title,
    platforms,
    sources: dedupedSources,
    totalPlaytimeMinutes,
    totalAchievements,
    unlockedAchievements,
    isCrossPlatform: platforms.length > 1,
    lastPlayed,
    firstPlayed,
    imageUrl,
  };
}

/**
 * Takes an array of canonical Games and returns a new array where
 * cross-platform duplicates are merged into single Game objects.
 * Single-platform games are passed through unchanged.
 */
export function consolidateGames(games: Game[]): Game[] {
  const groups = groupGamesByTitle(games);
  const result: Game[] = [];

  for (const [, group] of groups) {
    result.push(mergeGameGroup(group));
  }

  return result;
}

/**
 * Filters a list of games to only those that exist on multiple platforms.
 */
export function getCrossPlatformGames(games: Game[]): Game[] {
  return games.filter((g) => g.isCrossPlatform);
}

/**
 * Takes an array of platform-specific games and returns a new array where
 * cross-platform duplicates are merged into single Game objects.
 * This is a convenience function that combines normalizeGames and consolidateGames.
 */
export function consolidateRawGames(games: GameData[]): Game[] {
  return consolidateGames(normalizeGames(games));
}
