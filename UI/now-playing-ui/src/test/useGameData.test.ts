import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGameData } from "../pages/games/hooks/useGameData";
import { mockAuthenticatedFetch } from "./setup";

describe("stored game library baseline", () => {
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

    const { result } = renderHook(() => useGameData("https://example.test"));

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
