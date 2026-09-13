import { describe, expect, it } from "vitest";
import {
  getLatestAchievementDate,
  sortByLatestAchievement,
} from "../pages/games/utils/achievementDates";
import type { Game } from "../pages/games/utils/types";

type Dates = {
  unlock_time?: string;
  unlockDate?: string;
  unlocked_at?: string;
  unlocked?: boolean;
};
const game = (...sources: Dates[][]): Game =>
  ({
    sources: sources.map((achievements) => ({ raw: { achievements } })),
  }) as unknown as Game;

describe("latest achievement sorting", () => {
  it("preserves fallback precedence, invalid dates and the lack of an unlocked filter", () => {
    const value = game(
      [
        { unlock_time: "invalid", unlockDate: "2030-01-01" },
        { unlockDate: "2024-01-01" },
      ],
      [
        { unlocked_at: "2025-01-01", unlocked: false },
        { unlock_time: "2023-01-01", unlockDate: "2031-01-01" },
      ],
    );
    expect(getLatestAchievementDate(value).getTime()).toBe(
      new Date("2025-01-01").getTime(),
    );
    expect(getLatestAchievementDate(game([], [{}])).getTime()).toBe(
      new Date(1970, 0, 1).getTime(),
    );
  });

  it("matches the original comparator without mutating input or breaking ties", () => {
    const items = [
      { game: game([{ unlock_time: "2024-01-01" }]), id: "first tie" },
      { game: game([]), id: "empty" },
      { game: game([{ unlocked_at: "2025-01-01" }]), id: "newest" },
      { game: game([{ unlockDate: "2024-01-01" }]), id: "second tie" },
      { game: game([{ unlock_time: "1960-01-01" }]), id: "before epoch" },
    ];
    const original = [...items];
    const expected = [...items].sort(
      (a, b) =>
        getLatestAchievementDate(b.game).getTime() -
        getLatestAchievementDate(a.game).getTime(),
    );
    const actual = sortByLatestAchievement(items);
    expect(actual).toEqual(expected);
    expect(actual.map((item) => item.id)).toEqual([
      "newest",
      "first tie",
      "second tie",
      "empty",
      "before epoch",
    ]);
    expect(items).toEqual(original);
    expect(actual[0]).toBe(items[2]);
    expect(sortByLatestAchievement([])).toEqual([]);
  });

  it("does not inspect achievements when no comparison is needed", () => {
    const items = [
      {
        game: {
          get sources() {
            throw new Error("A single game does not need a sorting key");
          },
        } as unknown as Game,
      },
    ];
    const actual = sortByLatestAchievement(items);
    expect(actual).not.toBe(items);
    expect(actual[0]).toBe(items[0]);
  });

  it("reads each game's achievements only once", () => {
    let reads = 0;
    const items = Array.from({ length: 40 }, (_, index) => ({
      game: {
        sources: [
          {
            raw: {
              get achievements() {
                reads += 1;
                return [
                  {
                    unlock_time: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
                  },
                ];
              },
            },
          },
        ],
      } as unknown as Game,
    }));
    sortByLatestAchievement(items);
    expect(reads).toBe(items.length);
  });
});
