import { useState, useEffect } from "react";
import { useApi } from "../../../hooks/useApi";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import { Movie, Show } from "../utils/types";

const mediaCache = new Map<string, any>();

const getMediaDetails = async (
  tmdbId: number,
  mediaType: "movie" | "show",
  request: (url: string) => Promise<any>,
): Promise<any | null> => {
  const cacheKey = `${mediaType}-${tmdbId}`;
  if (mediaCache.has(cacheKey)) {
    return mediaCache.get(cacheKey);
  }

  const type = mediaType === "show" ? "tv" : "movie";
  const url = getApiUrl(
    `${API_CONFIG.TRAKT_ENDPOINT}/tmdb-detail/?tmdb_id=${tmdbId}&type=${type}&append_to_response=credits,similar`,
  );

  try {
    const data = await request(url);
    mediaCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching media details from API:", error);
    return null;
  }
};

export const useMediaDetails = (
  media: Movie | Show,
  mediaType: "movie" | "show",
) => {
  const [mediaDetails, setMediaDetails] = useState<any | null>(null);
  // Only `request` is consumed so the effect never depends on the unstable
  // hook state object (which would retrigger fetching every render).
  const { request } = useApi();

  // Key the effect on the canonical TMDB id (a primitive) instead of the
  // media object, so a stable id can never re-trigger a fetch loop.
  const tmdbId =
    mediaType === "movie"
      ? Number((media as Movie)?.movie?.ids?.tmdb)
      : Number((media as Show)?.show?.ids?.tmdb);

  useEffect(() => {
    if (!tmdbId || !Number.isFinite(tmdbId)) {
      setMediaDetails(null);
      return;
    }

    let cancelled = false;
    getMediaDetails(tmdbId, mediaType, request).then((details) => {
      if (!cancelled) {
        setMediaDetails(details);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType, request]);

  return mediaDetails;
};
