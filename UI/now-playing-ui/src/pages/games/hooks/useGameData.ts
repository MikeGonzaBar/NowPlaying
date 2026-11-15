import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi } from "../../../hooks/useApi";
import { GameData } from "../utils/types";
import { getEpicPlaytimeUpdatedAt, parseDate } from "../utils/utils";
import { consolidateRawGames, getCrossPlatformGames } from "../utils/grouping";

interface GameApiResponse {
  result?:
    | GameData[]
    | {
        games?: GameData[];
        error?: string;
      };
}

interface RefreshResponse {
  result?: {
    error?: string;
  };
}

interface FailedRequest {
  __error: unknown;
}

const isFailedRequest = (
  value: RefreshResponse | FailedRequest,
): value is FailedRequest => "__error" in value;

export const useGameData = (beBaseUrl: string) => {
  const [latestPlayedGames, setLatestPlayedGames] = useState<GameData[]>([]);
  const [allGamesList, setAllGamesList] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingServices, setMissingServices] = useState<string[]>([]);
  const [configuredServices, setConfiguredServices] = useState<string[]>([]);
  const [updatingPlatforms, setUpdatingPlatforms] = useState<
    Record<string, boolean>
  >({});

  const [platformGameIds, setPlatformGameIds] = useState<
    Record<string, Set<string>>
  >({
    steam: new Set(),
    epic: new Set(),
    psn: new Set(),
    xbox: new Set(),
    retroachievements: new Set(),
  });

  const api = useApi();

  const fetchGameData = async (url: string): Promise<GameData[]> => {
    const data = await api.request<GameApiResponse>(url);
    const result = data.result;

    if (Array.isArray(result)) {
      return result;
    }

    if (
      result &&
      typeof result === "object" &&
      "games" in result &&
      Array.isArray(result.games)
    ) {
      return result.games;
    }

    return [];
  };

  const mergeAndSortGames = (
    steamArray: GameData[],
    epicArray: GameData[],
    psnArray: GameData[],
    retroArray: GameData[],
    xboxArray: GameData[],
  ): GameData[] => {
    const invalidTimestamp = new Date(1970, 0, 1).getTime();
    // Epic exposes no last-played timestamp. Prefer the last time its playtime
    // actually changed, then fall back to the acquisition date so a connected
    // library is still listed; `lastPlayed` is only used for ordering, never
    // displayed as a play date.
    const sortTimestamp = (game: GameData): Date => {
      const lastPlayed = parseDate(game.last_played);
      if (lastPlayed.getTime() !== invalidTimestamp) return lastPlayed;
      const playtimeUpdated = getEpicPlaytimeUpdatedAt(game);
      if (playtimeUpdated) return playtimeUpdated;
      const acquiredAt = (game as { acquired_at?: string | null }).acquired_at;
      return parseDate(acquiredAt);
    };

    return [...steamArray, ...epicArray, ...psnArray, ...retroArray, ...xboxArray]
      .map((game) => ({
        ...game,
        lastPlayed: sortTimestamp(game),
      }))
      .filter((game) => game.lastPlayed.getTime() !== invalidTimestamp)
      .sort((a, b) => b.lastPlayed.getTime() - a.lastPlayed.getTime());
  };

  const fetchGames = async () => {
    try {
      setLoading(true);

      const [steamArray, epicArray, psnArray, retroArray, xboxArray] =
        await Promise.all([
          fetchGameData(`${beBaseUrl}/steam/get-game-list-stored/`),
          fetchGameData(`${beBaseUrl}/epic/get-game-list-stored/`),
          fetchGameData(`${beBaseUrl}/psn/get-game-list-stored/`),
          fetchGameData(`${beBaseUrl}/retroachievements/fetch-games/`),
          fetchGameData(`${beBaseUrl}/xbox/get-game-list-stored/`),
        ]);

      const newPlatformGameIds: Record<string, Set<string>> = {
        steam: new Set(steamArray.map((game) => String(game.appid))),
        epic: new Set(epicArray.map((game) => String(game.appid))),
        psn: new Set(psnArray.map((game) => String(game.appid))),
        xbox: new Set(xboxArray.map((game) => String(game.appid))),
        retroachievements: new Set(
          retroArray.map((game) => String(game.appid)),
        ),
      };
      setPlatformGameIds(newPlatformGameIds);

      const allGames = [
        ...steamArray,
        ...epicArray,
        ...psnArray,
        ...retroArray,
        ...xboxArray,
      ];

      const merged = mergeAndSortGames(
        steamArray,
        epicArray,
        psnArray,
        retroArray,
        xboxArray,
      );
      setLatestPlayedGames(merged);

      setAllGamesList(allGames);
    } catch (err) {
      console.error(err);
      setError("Failed to load games data");
    } finally {
      setLoading(false);
    }
  };

  const refreshGames = async () => {
    try {
      const [_steamRes, epicRes, psnRes, _retroRes, _xboxRes] =
        await Promise.all([
          api
            .request<RefreshResponse>(`${beBaseUrl}/steam/get-game-list/`)
            .catch((e): FailedRequest => ({ __error: e })),
          api
            .request<RefreshResponse>(`${beBaseUrl}/epic/get-game-list/`)
            .catch((e): FailedRequest => ({ __error: e })),
          api
            .request<RefreshResponse>(`${beBaseUrl}/psn/get-game-list/`)
            .catch((e): FailedRequest => ({ __error: e })),
          api
            .request<RefreshResponse>(
              `${beBaseUrl}/retroachievements/fetch-recently-played-games/`,
            )
            .catch((e): FailedRequest => ({ __error: e })),
          api
            .request<RefreshResponse>(`${beBaseUrl}/xbox/get-game-list/`)
            .catch((e): FailedRequest => ({ __error: e })),
        ]);

      if (epicRes && !isFailedRequest(epicRes) && epicRes.result?.error) {
        setError(epicRes.result.error);
      } else if (psnRes && !isFailedRequest(psnRes) && psnRes.result?.error) {
        setError(psnRes.result.error);
      } else if (psnRes && isFailedRequest(psnRes)) {
        setError("An error occurred while refreshing PSN games");
      } else {
        setError(null);
      }

      await fetchGames();
    } catch (error) {
      console.error("Error refreshing games:", error);
      setError("An error occurred while refreshing games");
    }
  };

  const refreshSteam = async () => {
    try {
      setUpdatingPlatforms((prev) => ({ ...prev, steam: true }));
      await api.request(`${beBaseUrl}/steam/get-game-list/`);
      await fetchGames();
      setError(null);
    } catch (error) {
      console.error("Error refreshing Steam games:", error);
      setError("An error occurred while refreshing Steam games");
    } finally {
      setUpdatingPlatforms((prev) => ({ ...prev, steam: false }));
    }
  };

  const refreshEpic = async () => {
    try {
      setUpdatingPlatforms((prev) => ({ ...prev, epic: true }));
      const resp = await api.request<RefreshResponse>(
        `${beBaseUrl}/epic/get-game-list/`,
      );
      if (resp.result?.error) {
        setError(resp.result.error);
      } else {
        setError(null);
      }
      await fetchGames();
    } catch (error) {
      console.error("Error refreshing Epic games:", error);
      setError("An error occurred while refreshing Epic games");
    } finally {
      setUpdatingPlatforms((prev) => ({ ...prev, epic: false }));
    }
  };

  const refreshPSN = async () => {
    try {
      setUpdatingPlatforms((prev) => ({ ...prev, psn: true }));
      const resp = await api.request<RefreshResponse>(
        `${beBaseUrl}/psn/get-game-list/`,
      );
      if (resp.result?.error) {
        setError(resp.result.error);
      } else {
        setError(null);
      }
      await fetchGames();
    } catch (error) {
      console.error("Error refreshing PSN games:", error);
      setError("An error occurred while refreshing PSN games");
    } finally {
      setUpdatingPlatforms((prev) => ({ ...prev, psn: false }));
    }
  };

  const refreshXbox = async () => {
    try {
      setUpdatingPlatforms((prev) => ({ ...prev, xbox: true }));
      await api.request(`${beBaseUrl}/xbox/get-game-list/`);
      await fetchGames();
      setError(null);
    } catch (error) {
      console.error("Error refreshing Xbox games:", error);
      setError("An error occurred while refreshing Xbox games");
    } finally {
      setUpdatingPlatforms((prev) => ({ ...prev, xbox: false }));
    }
  };

  const refreshRetroAchievements = async () => {
    try {
      setUpdatingPlatforms((prev) => ({ ...prev, retroachievements: true }));
      await api.request(
        `${beBaseUrl}/retroachievements/fetch-recently-played-games/`,
      );
      await fetchGames();
      setError(null);
    } catch (error) {
      console.error("Error refreshing RetroAchievements games:", error);
      setError("An error occurred while refreshing RetroAchievements games");
    } finally {
      setUpdatingPlatforms((prev) => ({ ...prev, retroachievements: false }));
    }
  };

  const checkApiKeys = async () => {
    try {
      const response = await api.request<string[]>(
        `${beBaseUrl}/users/api-keys/services/`,
      );
      const services = response || [];
      setConfiguredServices(services);

      const requiredServices = [
        "steam",
        "epic",
        "xbox",
        "psn",
        "retroachievements",
      ];
      const missing = requiredServices.filter(
        (service) => !services.includes(service),
      );
      setMissingServices(missing);

      if (missing.length > 0) {
        console.warn(`Missing API keys for: ${missing.join(", ")}`);
      }
    } catch (error) {
      console.error("Error checking API keys:", error);
    }
  };

  const getGamePlatform = useCallback(
    (game: GameData): string => {
      const gameId = String(game.appid);

      if (platformGameIds.steam.has(gameId)) return "steam";
      if (platformGameIds.epic.has(gameId)) return "epic";
      if (platformGameIds.psn.has(gameId)) return "psn";
      if (platformGameIds.xbox.has(gameId)) return "xbox";
      if (platformGameIds.retroachievements.has(gameId))
        return "retroachievements";

      return "steam"; // fallback
    },
    [platformGameIds],
  );

  useEffect(() => {
    fetchGames();
    checkApiKeys();
  }, []);

  const consolidatedGames = useMemo(
    () => consolidateRawGames(latestPlayedGames),
    [latestPlayedGames],
  );

  const crossPlatformGames = useMemo(
    () => getCrossPlatformGames(consolidatedGames),
    [consolidatedGames],
  );

  const completeConsolidatedGames = useMemo(
    () => consolidateRawGames(allGamesList),
    [allGamesList],
  );

  return {
    latestPlayedGames,
    loading,
    error,
    clearError: () => setError(null),
    refreshGames,
    refreshSteam,
    refreshEpic,
    refreshPSN,
    refreshXbox,
    refreshRetroAchievements,
    missingServices,
    configuredServices,
    updatingPlatforms,
    getGamePlatform,
    consolidatedGames,
    crossPlatformGames,
    completeGames: allGamesList,
    completeConsolidatedGames,
  };
};
