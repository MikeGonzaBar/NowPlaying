import { describe, expect, it } from "vitest";
import { toGameSource } from "../pages/games/utils/normalize";
import { EpicGame } from "../pages/games/utils/types";

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
  playtime_updated_at: null,
  achievements: [],
  total_achievements: 0,
  unlocked_achievements_count: 0,
  locked_achievements_count: 0,
  ...overrides,
});

describe("Epic recent activity", () => {
  it("uses the latest playtime change as the source activity date", () => {
    const source = toGameSource(
      epicGame({
        playtime_known: true,
        playtime_source: "epic",
        playtime_minutes: 90,
        playtime_updated_at: "2026-03-01T12:00:00Z",
      }),
    );

    expect(source.lastPlayed).toEqual(new Date("2026-03-01T12:00:00Z"));
  });

  it("keeps unplayed Epic products out of recency sorting", () => {
    const source = toGameSource(
      epicGame({ playtime_updated_at: "2026-03-01T12:00:00Z" }),
    );

    expect(source.lastPlayed).toBeNull();
  });
});
