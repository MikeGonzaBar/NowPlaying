import { describe, expect, it } from "vitest";
import { consolidateRawGames, getCompletedSource } from "../pages/games/utils/grouping";
import { GameData, PsnGame, SteamGame } from "../pages/games/utils/types";

const steamGame = (overrides: Partial<SteamGame> = {}): SteamGame =>
  ({
    appid: 1,
    name: "Shared Game",
    playtime_forever: 10,
    last_played: "2026-05-01T00:00:00Z",
    total_achievements: 10,
    unlocked_achievements: 10,
    unlocked_achievements_count: 10,
    locked_achievements_count: 0,
    achievements: [],
    ...overrides,
  }) as SteamGame;

const psnGame = (
  unlocked: number,
  total: number,
  overrides: Partial<PsnGame> = {},
): PsnGame =>
  ({
    appid: "1",
    name: "Shared Game",
    platform: "PS5",
    total_playtime: "00:00:00",
    last_played: "2026-04-01T00:00:00Z",
    total_achievements: { platinum: 0, gold: total, silver: 0, bronze: 0 },
    unlocked_achievements: { platinum: 0, gold: unlocked, silver: 0, bronze: 0 },
    achievements: [],
    ...overrides,
  }) as PsnGame;

describe("Recent 100% source selection", () => {
  it("selects the completed platform when a game is 100% on only one store", () => {
    const [game] = consolidateRawGames([
      steamGame(),
      psnGame(1, 10),
    ] as GameData[]);

    expect(game.isCrossPlatform).toBe(true);
    const completed = getCompletedSource(game);
    expect(completed?.platform).toBe("steam");
    expect((completed?.raw as SteamGame).appid).toBe(1);
  });

  it("selects the other platform when it is the completed one", () => {
    const [game] = consolidateRawGames([
      steamGame({ total_achievements: 20, unlocked_achievements_count: 2 }),
      psnGame(10, 10),
    ] as GameData[]);

    expect(getCompletedSource(game)?.platform).toBe("psn");
  });

  it("ignores games that are incomplete on every platform", () => {
    const [game] = consolidateRawGames([
      steamGame({ unlocked_achievements_count: 5 }),
      psnGame(1, 10),
    ] as GameData[]);

    expect(getCompletedSource(game)).toBeNull();
  });
});
