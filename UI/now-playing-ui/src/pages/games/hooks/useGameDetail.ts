import { useState, useEffect } from "react";
import { useApi } from "../../../hooks/useApi";

export interface PlatformGameData {
  platform: string;
  data: Record<string, unknown>;
}

export interface GameDetailResponse {
  title: string;
  platforms: PlatformGameData[];
  platform_count: number;
}

interface UseGameDetailResult {
  game: GameDetailResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch a game's detail data across all platforms by title.
 * Used when navigating directly via URL (no navigation state).
 */
export const useGameDetail = (beBaseUrl: string, title: string | undefined): UseGameDetailResult => {
  const [game, setGame] = useState<GameDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Destructure `request` (a stable useCallback) — depending on the whole
  // useApi() object would re-arm effects on every render because useApi
  // returns a fresh object each time.
  const { request } = useApi();

  const fetchGame = async () => {
    if (!title) {
      setGame(null);
      setError("No game title provided.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setGame(null);

      const response = await request<GameDetailResponse>(
        `${beBaseUrl}/games/detail-by-title/?title=${encodeURIComponent(title)}`
      );

      if (response && response.platforms && response.platforms.length > 0) {
        setGame(response);
      } else {
        setError("Game not found.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch game details.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGame();
  }, [title]);

  return { game, loading, error, refetch: fetchGame };
};

export const useGameDetailById = (
  beBaseUrl: string,
  appid: string | undefined,
  platform?: string,
): UseGameDetailResult => {
  const [game, setGame] = useState<GameDetailResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(appid));
  const [error, setError] = useState<string | null>(null);
  // Stable request fn only — `api` identity changes every render and used to
  // re-arm this effect forever, leaving legacy deep links stuck on
  // "Loading game details..." (audit finding #4).
  const { request } = useApi();

  useEffect(() => {
    if (!appid) {
      setGame(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setGame(null);

    // Bounded failure: unknown/obsolete provider ids must fail explicitly
    // within a few seconds instead of loading forever.
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      setLoading(false);
      setError(
        "This game could not be resolved from the link. It may be outdated — try searching for the game instead.",
      );
    }, 15000);

    request<GameDetailResponse>(
      `${beBaseUrl}/games/detail-by-id/?appid=${encodeURIComponent(appid)}${platform ? `&platform=${encodeURIComponent(platform)}` : ""}`,
    ).then((response) => {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(timeoutId);
      if (response?.platforms?.length) setGame(response);
      else setError("Game not found.");
      setLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(timeoutId);
      setError(err instanceof Error ? err.message : "Failed to fetch game details.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [request, appid, platform, beBaseUrl]);

  return { game, loading, error, refetch: () => undefined };
};

/**
 * Hook to fetch a single platform game's detail by platform and appid.
 */
export const usePlatformGameDetail = (
  beBaseUrl: string,
  platform: string | undefined,
  appid: string | undefined
): { game: Record<string, unknown> | null; loading: boolean; error: string | null } => {
  const [game, setGame] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { request } = useApi();

  useEffect(() => {
    if (!platform || !appid) return;

    const fetchGame = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await request<{ result: Record<string, unknown> }>(
          `${beBaseUrl}/games/detail/?platform=${platform}&appid=${appid}`
        );

        if (response && response.result) {
          setGame(response.result);
        } else {
          setError("Game not found.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch game details.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [platform, appid]);

  return { game, loading, error };
};
