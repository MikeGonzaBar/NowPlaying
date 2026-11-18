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

type ProviderKey = "steam" | "epic" | "psn" | "xbox" | "retroachievements";

const PROVIDERS: ReadonlyArray<{
  key: ProviderKey;
  label: string;
  path: string;
}> = [
  { key: "steam", label: "Steam", path: "/steam/get-game-list-stored/" },
  { key: "epic", label: "Epic Games", path: "/epic/get-game-list-stored/" },
  { key: "psn", label: "PlayStation", path: "/psn/get-game-list-stored/" },
  {
    key: "retroachievements",
    label: "RetroAchievements",
    path: "/retroachievements/fetch-games/",
  },
  { key: "xbox", label: "Xbox", path: "/xbox/get-game-list-stored/" },
];

const emptyProviderResults = (): Record<ProviderKey, GameData[]> => ({
  steam: [],
  epic: [],
  psn: [],
  xbox: [],
  retroachievements: [],
});

const allProvidersLoading = (): Record<ProviderKey, boolean> => ({
  steam: true,
  epic: true,
  psn: true,
  xbox: true,
  retroachievements: true,
});

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

export const useGameData = (beBaseUrl: string) => {
  const [providerResults, setProviderResults] = useState<
    Record<ProviderKey, GameData[]>
  >(emptyProviderResults);
  const [providerErrors, setProviderErrors] = useState<
    Partial<Record<ProviderKey, string>>
  >({});
  const [providerLoading, setProviderLoading] = useState<
    Record<ProviderKey, boolean>
  >(allProvidersLoading);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingServices, setMissingServices] = useState<string[]>([]);
  const [configuredServices, setConfiguredServices] = useState<string[]>([]);
  const [updatingPlatforms, setUpdatingPlatforms] = useState<
    Record<string, boolean>
  >({});

  const api = useApi();

  const latestPlayedGames = useMemo(
    () =>
      mergeAndSortGames(
        providerResults.steam,
        providerResults.epic,
        providerResults.psn,
        providerResults.retroachievements,
        providerResults.xbox,
      ),
    [providerResults],
  );

  const allGamesList = useMemo(
    () => [
      ...providerResults.steam,
      ...providerResults.epic,
      ...providerResults.psn,
      ...providerResults.retroachievements,
      ...providerResults.xbox,
    ],
    [providerResults],
  );

  const platformGameIds = useMemo(
    () => ({
      steam: new Set(providerResults.steam.map((game) => String(game.appid))),
      epic: new Set(providerResults.epic.map((game) => String(game.appid))),
      psn: new Set(providerResults.psn.map((game) => String(game.appid))),
      xbox: new Set(providerResults.xbox.map((game) => String(game.appid))),
      retroachievements: new Set(
        providerResults.retroachievements.map((game) => String(game.appid)),
      ),
    }),
    [providerResults],
  );

  const fetchGameData = async (url: string): Promise<GameData[]> => {
    const data = await api.request<GameApiResponse>(url);
    const result = data.result;

    if (Array.isArray(result)) {
      return result;
    }

    if (result && typeof result === "object") {
      // Provider-level failures arrive as a 200 response with `{error}`.
      // Surface them as failed providers instead of treating them as an
      // empty library, which would look like zero activity.
      if ("error" in result && result.error) {
        throw new Error(String(result.error));
      }
      if ("games" in result && Array.isArray(result.games)) {
        return result.games;
      }
    }

    return [];
  };

  const fetchGames = async () => {
    setLoading(true);
    setProviderErrors({});
    setProviderLoading(allProvidersLoading());

    // Settle each provider independently: a failing or slow platform must not
    // hide libraries that already loaded successfully.
    await Promise.all(
      PROVIDERS.map(async ({ key, label, path }) => {
        try {
          const games = await fetchGameData(`${beBaseUrl}${path}`);
          setProviderResults((prev) => ({ ...prev, [key]: games }));
        } catch (err) {
          console.error(`Error loading ${label} games:`, err);
          // Keep any previously loaded library for this provider; a failed
          // refresh should surface the error, not erase real data.
          setProviderErrors((prev) => ({
            ...prev,
            [key]:
              err instanceof Error ? err.message : `Failed to load ${label}`,
          }));
        } finally {
          setProviderLoading((prev) => ({ ...prev, [key]: false }));
        }
      }),
    );

    setLoading(false);
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

  const clearError = () => {
    setError(null);
    setProviderErrors({});
  };

  return {
    latestPlayedGames,
    loading,
    error,
    providerErrors,
    providerLoading,
    clearError,
    refetchGames: fetchGames,
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
