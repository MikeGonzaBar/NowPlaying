import { useState, useEffect } from "react";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";

interface UseMusicFetchOptions {
  endpoint: string;
  dataKey: string;
}

export function useMusicFetch<T>({ endpoint, dataKey }: UseMusicFetchOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authenticatedFetch(
          getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/${endpoint}`),
          { signal: controller.signal },
        );

        // Ignore a response that belongs to a superseded filter or route.
        if (!active) return;

        if (response.ok) {
          const result = await response.json();
          if (!active) return;
          setData((result[dataKey] || []) as T[]);
        } else {
          setError("Failed to fetch data");
          console.error(`Failed to fetch ${dataKey}`);
        }
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        setError("Error fetching data");
        console.error(`Error fetching ${dataKey}:`, err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      // Cancel in-flight work so a slow request cannot overwrite newer data.
      active = false;
      controller.abort();
    };
  }, [endpoint, dataKey]);

  return { data, loading, error };
}
