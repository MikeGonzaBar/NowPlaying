import { afterEach, describe, expect, it, vi } from "vitest";
import { groupAchievementsByDate } from "../pages/games/utils/utils";

const localDay = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour);

describe("achievement activity window", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns one bucket per day ending today and ignores unlocks outside it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(localDay(2026, 3, 15));

    const result = groupAchievementsByDate(
      [
        localDay(2026, 1, 1), // far outside the 30-day window
        localDay(2026, 2, 14), // yesterday: first day in window
        localDay(2026, 3, 15, 9), // today
        localDay(2026, 3, 15, 22), // same local day, after "now"
        localDay(2026, 4, 1), // future, must not extend the chart
      ],
      30,
    );

    // Exactly 30 consecutive days, newest last, ending today.
    expect(result).toHaveLength(30);
    expect(result[0].date).toEqual(localDay(2026, 2, 14, 0));
    expect(result[29].date).toEqual(localDay(2026, 3, 15, 0));

    const countFor = (date: Date) =>
      result.find((entry) => entry.date.getTime() === date.getTime())?.count;

    expect(countFor(localDay(2026, 2, 14, 0))).toBe(1);
    expect(countFor(localDay(2026, 3, 15, 0))).toBe(2);
    expect(result.every((entry) => entry.date.getMonth() >= 1)).toBe(true);
    expect(result.reduce((sum, entry) => sum + entry.count, 0)).toBe(3);
  });
});
