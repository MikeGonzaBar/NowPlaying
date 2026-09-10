import { useState, useEffect } from "react";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";

interface UseMusicDetailOptions {
  type: "artist" | "album" | "track";
  name: string;
  artist?: string;
  recordingId?: string;
}

export function useMusicDetail<T>({
  type,
  name,
  artist,
  recordingId,
}: UseMusicDetailOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("name", name);
        if (artist) params.set("artist", artist);
        if (recordingId) params.set("recording_id", recordingId);

        const response = await authenticatedFetch(
          getApiUrl(
            `${API_CONFIG.MUSIC_ENDPOINT}/${type}-detail/?${params.toString()}`,
          ),
        );

        if (response.ok) {
          const result = await response.json();
          setData(result as T);
        } else if (response.status === 404) {
          setError(`${type} not found`);
        } else {
          setError("Failed to fetch data");
        }
      } catch (err) {
        setError("Error fetching data");
        console.error(`Error fetching ${type} detail:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, name, artist, recordingId]);

  return { data, loading, error };
}

/**
 * Hook for fetching play history of a specific artist/album/track.
 */
export function useMusicPlayHistory({
  type,
  name,
  artist,
  recordingId,
  pageSize = 50,
}: {
  type: "artist" | "album" | "track";
  name: string;
  artist?: string;
  recordingId?: string;
  pageSize?: number;
}) {
  const [plays, setPlays] = useState<
    Array<{
      id: number;
      title: string;
      artist: string;
      album: string;
      played_at: string;
      source: string;
      thumbnail: string | null;
      track_url: string | null;
      artist_lastfm_url: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setPage(1);
    setPlays([]);
    setHasMore(false);
    setTotalItems(0);
  }, [type, name, artist, recordingId, pageSize]);

  useEffect(() => {
    if (!name) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchPlays = async (pageNum: number, isInitial: boolean) => {
      try {
        if (isInitial) setLoading(true);

        const params = new URLSearchParams();
        params.set("name", name);
        if (artist) params.set("artist", artist);
        if (recordingId) params.set("recording_id", recordingId);
        params.set("page", String(pageNum));
        params.set("page_size", String(pageSize));

        const response = await authenticatedFetch(
          getApiUrl(
            `${API_CONFIG.MUSIC_ENDPOINT}/${type}-plays/?${params.toString()}`,
          ),
        );

        if (response.ok) {
          const result = await response.json();
          if (cancelled) return;
          if (isInitial) {
            setPlays(result.results || []);
          } else {
            setPlays((prev) => [...prev, ...(result.results || [])]);
          }
          setHasMore(result.has_next || false);
          setTotalItems(result.total_items || 0);
        }
      } catch (err) {
        console.error(`Error fetching ${type} plays:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlays(page, page === 1);
    return () => {
      cancelled = true;
    };
  }, [type, name, artist, recordingId, pageSize, page]);

  const loadMore = () => {
    if (!hasMore || loading) return;
    setPage((currentPage) => currentPage + 1);
  };

  return { plays, loading, hasMore, totalItems, loadMore };
}
