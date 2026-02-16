import { useState, useEffect } from "react";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";

interface UseMusicFetchOptions {
    endpoint: string;
    dataKey: string; // e.g., "artists", "albums", "tracks"
}

export function useMusicFetch<T>({ endpoint, dataKey }: UseMusicFetchOptions) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/${endpoint}`)
                );

                if (response.ok) {
                    const result = await response.json();
                    setData((result[dataKey] || []) as T[]);
                } else {
                    setError("Failed to fetch data");
                    console.error(`Failed to fetch ${dataKey}`);
                }
            } catch (err) {
                setError("Error fetching data");
                console.error(`Error fetching ${dataKey}:`, err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [endpoint, dataKey]);

    return { data, loading, error };
}
