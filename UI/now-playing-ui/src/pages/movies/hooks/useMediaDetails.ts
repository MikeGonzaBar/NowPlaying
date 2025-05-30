import { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { Movie, Show } from '../utils/types';

const movieCache = new Map<number, any>();
const showCache = new Map<number, any>();

const getMovieDetails = async (tmdb: number, api: any): Promise<any | null> => {
    if (movieCache.has(tmdb)) {
        return movieCache.get(tmdb);
    }

    const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
    const url = `https://api.themoviedb.org/3/movie/${tmdb}?api_key=${apiKey}`;

    try {
        const data = await api.request(url);
        movieCache.set(tmdb, data);
        return data;
    } catch (error) {
        console.error('Error fetching movie details from API:', error);
        return null;
    }
};

const getShowDetails = async (tmdbId: number, api: any): Promise<any | null> => {
    if (showCache.has(tmdbId)) {
        return showCache.get(tmdbId);
    }

    const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`;

    try {
        const data = await api.request(url);
        showCache.set(tmdbId, data);
        return data;
    } catch (error) {
        console.error('Error fetching show details from API:', error);
        return null;
    }
};

export const useMediaDetails = (media: Movie | Show, mediaType: "movie" | "show") => {
    const [mediaDetails, setMediaDetails] = useState<any | null>(null);
    const api = useApi();

    useEffect(() => {
        const fetchDetails = async () => {
            if (mediaType === "movie") {
                const movie = media as Movie;
                const details = await getMovieDetails(movie.movie.ids.tmdb, api);
                setMediaDetails(details);
            } else if (mediaType === "show") {
                const show = media as Show;
                const tmdbId = parseInt(show.show.ids.tmdb);
                const details = await getShowDetails(tmdbId, api);
                setMediaDetails(details);
            }
        };
        fetchDetails();
    }, [media, mediaType]);

    return mediaDetails;
}; 