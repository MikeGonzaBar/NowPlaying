import { describe, expect, it } from "vitest";
import {
  calculateAchievementPercentage,
  shouldCountTowardAverageAchievement,
} from "../pages/games/utils/utils";
import { EpicGame, GameData } from "../pages/games/utils/types";

const epicGame = (overrides: Partial<EpicGame>): EpicGame => ({
  appid: "appid",
  namespace: "namespace",
  app_name: "App",
  name: "Epic Game",
  description: "",
  developer: "",
  publisher: "",
  cover_image: "",
  img_icon_url: "",
  acquired_at: "2025-01-01T00:00:00Z",
  last_played: null,
  playtime_minutes: 0,
  playtime_formatted: "",
  playtime_known: false,
  playtime_source: "none",
  achievements: [],
  total_achievements: 0,
  unlocked_achievements_count: 0,
  locked_achievements_count: 0,
  ...overrides,
});

const epicAverage = (games: GameData[]): number => {
  const counted = games.filter((game) =>
    shouldCountTowardAverageAchievement(game, "epic"),
  );
  if (counted.length === 0) return 0;
  const total = counted.reduce(
    (sum, game) => sum + calculateAchievementPercentage(game),
    0,
  );
  return Math.round(total / counted.length);
};

describe("Epic average achievement completion", () => {
  it("averages only played games that expose achievements", () => {
    const playedWithAchievements = epicGame({
      playtime_known: true,
      playtime_source: "epic",
      playtime_minutes: 120,
      total_achievements: 4,
      unlocked_achievements_count: 2,
    });
    const unplayedWithAchievements = epicGame({
      total_achievements: 40,
      unlocked_achievements_count: 0,
    });
    const playedWithoutAchievements = epicGame({
      playtime_known: true,
      playtime_source: "epic",
      playtime_minutes: 30,
    });

    expect(
      shouldCountTowardAverageAchievement(playedWithAchievements, "epic"),
    ).toBe(true);
    expect(
      shouldCountTowardAverageAchievement(unplayedWithAchievements, "epic"),
    ).toBe(false);
    expect(
      shouldCountTowardAverageAchievement(playedWithoutAchievements, "epic"),
    ).toBe(false);

    expect(
      epicAverage([
        playedWithAchievements,
        unplayedWithAchievements,
        playedWithoutAchievements,
      ]),
    ).toBe(50);
  });

  it("ignores achievements when Epic has no playtime measurement", () => {
    const unlockedButUnknownPlaytime = epicGame({
      total_achievements: 10,
      unlocked_achievements_count: 5,
    });

    expect(
      shouldCountTowardAverageAchievement(unlockedButUnknownPlaytime, "epic"),
    ).toBe(false);
    expect(epicAverage([unlockedButUnknownPlaytime])).toBe(0);
  });

  it("keeps the existing denominator for other platforms", () => {
    const unplayedSteamGame = {
      appid: 1,
      name: "Unplayed",
      playtime_forever: 0,
      total_achievements: 10,
      unlocked_achievements: 0,
      unlocked_achievements_count: 0,
    } as GameData;

    expect(shouldCountTowardAverageAchievement(unplayedSteamGame, "steam")).toBe(
      true,
    );
  });
});
