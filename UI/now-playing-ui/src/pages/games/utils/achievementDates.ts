import type { Game } from "./types";

export const getLatestAchievementDate = (game: Game): Date => {
  let latest: Date | null = null;
  game.sources.forEach((source) => {
    const raw = source.raw as unknown as {
      achievements?: Array<{
        unlock_time?: string;
        unlockDate?: string;
        unlocked_at?: string;
      }>;
    };
    (raw.achievements || []).forEach((achievement) => {
      const value =
        achievement.unlock_time ||
        achievement.unlockDate ||
        achievement.unlocked_at;
      if (!value) return;
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime()) && (!latest || parsed > latest))
        latest = parsed;
    });
  });
  return latest || new Date(1970, 0, 1);
};

/** Calculate each key once; preserve stable ties and the original item references. */
export const sortByLatestAchievement = <T extends { game: Game }>(
  items: readonly T[],
): T[] => {
  if (items.length < 2) return [...items];
  return items
    .map((item) => ({
      item,
      timestamp: getLatestAchievementDate(item.game).getTime(),
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(({ item }) => item);
};
