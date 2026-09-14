import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GameComparison from "../pages/games/components/GameComparison";
import {
  getCombinedDetailMetrics,
  getDetailMetrics,
} from "../pages/games/utils/gameDetail";
import type { PlatformGameData } from "../pages/games/utils/gameDetail";
import { parsePlaytimeMinutes } from "../pages/games/utils/utils";

// Preserve the pre-refactor header calculation as an independent regression oracle.
const originalCombined = (platforms: PlatformGameData[]) => {
  let playtimeMinutes = 0;
  let unlocked = 0;
  let total = 0;
  platforms.forEach(({ data }) => {
    const minutes = parsePlaytimeMinutes(
      data.playtime_forever ?? data.total_playtime,
    );
    if (minutes.available && minutes.minutes !== null)
      playtimeMinutes += minutes.minutes;
    const achievements = Array.isArray(data.achievements)
      ? data.achievements
      : [];
    total += achievements.length;
    unlocked += achievements.filter((achievement) => {
      const item = achievement as Record<string, unknown>;
      return item.achieved === true || item.unlocked === true;
    }).length;
  });
  return { playtimeMinutes, unlocked, total };
};

describe("game detail metrics", () => {
  it.each([
    {},
    { playtime_forever: 0, total_playtime: 90 },
    { playtime_forever: null, total_playtime: "01:30:30" },
    { playtime_forever: "invalid", total_playtime: 90 },
    { total_playtime: "1d 2h 3m 4s" },
    { total_playtime: -1, achievements: { total: 50 }, total_achievements: 50 },
    {
      achievements: [
        { achieved: true },
        { unlocked: true },
        { achieved: true, unlocked: true },
        { achieved: 1 },
        { unlocked: "true" },
        {},
      ],
    },
  ])("preserves the original calculation for %j", (data) => {
    const platforms = ["steam", "psn", "xbox", "retroachievements"].map(
      (platform) => ({ platform, data }),
    );
    expect(getCombinedDetailMetrics(platforms)).toMatchObject(
      originalCombined(platforms),
    );
  });

  it("preserves strict flags, ignores summary counts, and does not mutate inputs", () => {
    const data = Object.freeze({
      playtime_forever: 0,
      total_playtime: 90,
      achievements: Object.freeze([
        { achieved: true, unlocked: true },
        { unlocked: 1 },
        {},
      ]),
      total_achievements: 99,
      unlocked_achievements: 80,
    });
    expect(getDetailMetrics(data)).toEqual({
      playtime: { minutes: 0, available: true },
      total: 3,
      unlocked: 1,
    });
  });

  it("retains platform order, duplicates, and unavailable versus zero playtime", () => {
    expect(
      getCombinedDetailMetrics([
        { platform: "steam", data: { playtime_forever: 0 } },
        { platform: "psn", data: {} },
        { platform: "steam", data: { total_playtime: "1h" } },
        {
          platform: "unknown",
          data: { playtime_forever: "invalid", total_playtime: 100 },
        },
      ]),
    ).toEqual({
      playtimeMinutes: 60,
      unlocked: 0,
      total: 0,
      knownPlaytimePlatforms: ["steam", "steam"],
      unavailablePlaytimePlatforms: ["psn", "unknown"],
    });
    expect(getCombinedDetailMetrics([])).toEqual({
      playtimeMinutes: 0,
      unlocked: 0,
      total: 0,
      knownPlaytimePlatforms: [],
      unavailablePlaytimePlatforms: [],
    });
  });

  it("retains comparison formatting and unavailable-platform text", () => {
    render(
      <GameComparison
        game={{
          title: "Fixture",
          platform_count: 2,
          platforms: [
            {
              platform: "steam",
              data: {
                playtime_forever: 0,
                achievements: [{ unlocked: true }, {}, {}],
              },
            },
            { platform: "psn", data: {} },
          ],
        }}
      />,
    );
    expect(screen.getByText("0m across Steam")).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();
    expect(screen.getByText("(33.3%)")).toBeInTheDocument();
    expect(
      screen.getByText("PlayStation playtime unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText("Playtime unavailable")).toBeInTheDocument();
  });

  it("does not render comparison for a single platform", () => {
    const { container } = render(
      <GameComparison
        game={{
          title: "Fixture",
          platform_count: 1,
          platforms: [{ platform: "steam", data: {} }],
        }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
