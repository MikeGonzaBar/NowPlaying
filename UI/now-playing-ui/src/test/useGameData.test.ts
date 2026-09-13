import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGameData } from "../pages/games/hooks/useGameData";
import { mockAuthenticatedFetch } from "./setup";

describe("stored game library baseline", () => {
  it("updates the platform callback after refresh while preserving provider priority", async () => {
    const steam = {
      appid: 7,
      name: "Shared",
      playtime_forever: 10,
      last_played: null,
    };
    const trophies = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    const psn = {
      appid: "7",
      name: "Shared",
      platform: "PS5",
      total_playtime: "00:00:00",
      last_played: null,
      total_achievements: trophies,
      unlocked_achievements: trophies,
    };
    let includeSteam = true;
    mockAuthenticatedFetch({
      "/steam/get-game-list-stored/": () => ({
        result: includeSteam ? [steam] : [],
      }),
      "/psn/get-game-list-stored/": { result: [psn] },
      "/retroachievements/fetch-games/": { result: [] },
      "/xbox/get-game-list-stored/": { result: [] },
      "/users/api-keys/services/": [
        "steam",
        "psn",
        "xbox",
        "retroachievements",
      ],
      "/steam/get-game-list/": { result: {} },
    });
    const { result } = renderHook(() => useGameData("https://example.test"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const previous = result.current.getGamePlatform;
    expect(previous(result.current.completeGames[1])).toBe("steam");
    includeSteam = false;
    await act(async () => {
      await result.current.refreshSteam();
    });
    expect(result.current.getGamePlatform).not.toBe(previous);
    expect(
      result.current.getGamePlatform(result.current.completeGames[0]),
    ).toBe("psn");
    expect(result.current.error).toBeNull();
  });

  it("loads configured services and retains unplayed games without extra requests", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const services = ["steam", "psn", "xbox", "retroachievements"];
    const played = {
      appid: 1,
      name: "Hades",
      playtime_forever: 300,
      img_icon_url: "",
      last_played: "2026-07-09T12:00:00Z",
    };
    const unplayed = {
      appid: 2,
      name: "Unplayed game",
      playtime_forever: 0,
      img_icon_url: "",
      last_played: null,
    };
    const api = mockAuthenticatedFetch({
      "/steam/get-game-list-stored/": { result: [played, unplayed] },
      "/psn/get-game-list-stored/": { result: [] },
      "/retroachievements/fetch-games/": { result: [] },
      "/xbox/get-game-list-stored/": { result: [] },
      "/users/api-keys/services/": services,
    });

    const { result, rerender } = renderHook(() =>
      useGameData("https://example.test"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.configuredServices).toEqual(services);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.missingServices).toEqual([]);
    expect(result.current.completeGames).toEqual([played, unplayed]);
    expect(result.current.latestPlayedGames).toEqual([
      { ...played, lastPlayed: new Date(played.last_played) },
    ]);
    expect(
      result.current.completeConsolidatedGames.map((game) => ({
        title: game.title,
        minutes: game.totalPlaytimeMinutes,
      })),
    ).toEqual([
      { title: "Hades", minutes: 300 },
      { title: "Unplayed game", minutes: 0 },
    ]);
    const library = result.current.completeConsolidatedGames;
    const getPlatform = result.current.getGamePlatform;
    expect(getPlatform(result.current.completeGames[0])).toBe("steam");
    rerender();
    expect(result.current.completeConsolidatedGames).toBe(library);
    expect(result.current.getGamePlatform).toBe(getPlatform);
    expect(api.calls).toEqual([
      "/steam/get-game-list-stored/",
      "/psn/get-game-list-stored/",
      "/retroachievements/fetch-games/",
      "/xbox/get-game-list-stored/",
      "/users/api-keys/services/",
    ]);
    expect(api.notFound()).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
