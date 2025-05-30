import { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { Movie, Show } from '../utils/types';

const beBaseUrl = `http://${window.location.hostname}:8080`;

export const useMediaData = <T extends Movie | Show>(endpoint: string) => {
    const [data, setData] = useState<T[]>([]);
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const api = useApi<{ movies?: Movie[], shows?: Show[] }>();

    const fetchData = async (pageNum = 1, pageSize = 5): Promise<T[]> => {
        try {
            const response = await api.request(
                `${beBaseUrl}${endpoint}?page=${pageNum}&page_size=${pageSize}`
            );
            return (response.movies || response.shows) as T[];
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    };

    const loadMore = async () => {
        const nextPage = page + 1;
        try {
            const more = await fetchData(nextPage);
            setData(prev => [...prev, ...more]);
            setPage(nextPage);
        } catch (err) {
            console.error(err);
            setError(`Failed to load more ${endpoint.includes('movies') ? 'movies' : 'shows'}.`);
        }
    };

    const refresh = async () => {
        try {
            const fetchLatestEndpoint = endpoint.includes('movies')
                ? '/trakt/fetch-latest-movies/'
                : '/trakt/fetch-latest-shows/';

            await api.request(`${beBaseUrl}${fetchLatestEndpoint}`);
            const refreshed = await fetchData(1);
            setData(refreshed);
            setPage(1);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(`Failed to refresh ${endpoint.includes('movies') ? 'movies' : 'shows'}.`);
        }
    };

    useEffect(() => {
        const initialFetch = async () => {
            try {
                const initial = await fetchData(1);
                setData(initial);
            } catch (err) {
                setError(`Failed to load ${endpoint.includes('movies') ? 'movies' : 'shows'}.`);
            } finally {
                setLoading(false);
            }
        };

        initialFetch();
    }, []);

    return {
        data,
        loading,
        error,
        loadMore,
        refresh,
        setError
    };
}; 