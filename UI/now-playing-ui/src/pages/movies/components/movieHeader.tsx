import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Movie, Show } from '../utils/types';
import { Box, Card, CardMedia, IconButton, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { InfoChipSection, MediaStats, TrailerSection } from './MediaInfoSections';
import { ShowEpisodes } from './ShowEpisodes';
import { authenticatedFetch } from '../../../utils/auth';
import { getApiUrl, API_CONFIG } from '../../../config/api';

interface MovieHeaderProps {
    media: Movie | Show;
    mediaType: "movie" | "show";
    mediaDetails: any | null;
}

interface WatchedSeasonsEpisodesResponse {
    seasons: {
        id: number;
        season_number: number;
        show__id: number;
        show__title: string;
        show__trakt_id: string;
    }[];
    episodes: {
        id: number;
        episode_number: number;
        title: string;
        season__id: number;
        season__season_number: number;
        show__id: number;
        show__title: string;
        show__trakt_id: string;
        overview: string;
        rating: number;
        runtime: number;
        episode_type: string;
        ids: Record<string, any>;
        available_translations: string[];
        image_url: string;
        last_watched_at: string;
        progress: number;
    }[];
}

const MovieHeader: React.FC<MovieHeaderProps> = ({ media, mediaType, mediaDetails }) => {
    if (!media) {
        return (
            <Box sx={{ padding: 2 }}>
                <Typography>No media information available.</Typography>
            </Box>
        );
    }

    const mediaTitle = mediaType === "movie" ? (media as Movie).movie.title : (media as Show).show.title;
    const mediaImage = mediaDetails?.poster_path
        ? `https://image.tmdb.org/t/p/w1280${mediaDetails.backdrop_path}`
        : '';
    const traktId = mediaType === "movie" ? (media as Movie).movie.ids.trakt : (media as Show).show.ids.trakt;
    const [trailerKey, setTrailerKey] = useState<string | null>(null);
    const [watchedData, setWatchedData] = useState<WatchedSeasonsEpisodesResponse | null>(null);

    const fetchWatchedSeasonsEpisodes = async () => {
        try {
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/get-watched-seasons-episodes/?trakt_id=${traktId}`)
            );

            if (response.ok) {
                const result = await response.json();
                setWatchedData(result);
            } else {
                console.error("Failed to fetch watched seasons and episodes:", response.status);
            }
        } catch (error) {
            console.error("Error fetching watched seasons and episodes:", error);
        }
    };
    const fetchTrailer = async () => {
        try {
            const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
            const tmdbId = mediaType === "movie" ? (media as Movie).movie.ids.tmdb : (media as Show).show.ids.tmdb;
            const url = mediaType === "movie"
                ? `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${apiKey}`
                : `https://api.themoviedb.org/3/tv/${tmdbId}/videos?api_key=${apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            // Find the YouTube trailer
            const trailer = data.results.find(
                (video: { type: string; site: string }) => video.type === "Trailer" && video.site === "YouTube"
            );

            if (trailer) {
                setTrailerKey(trailer.key); // Save the YouTube video ID
            }
        } catch (error) {
            console.error("Error fetching trailer:", error);
        }
    };
    useEffect(() => {

        fetchTrailer();
        if (mediaType === "show") {
            fetchWatchedSeasonsEpisodes();
        }
    }, [media, mediaType]);
    return (
        <Box sx={{ paddingLeft: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, ml: -1 }}>
                <IconButton
                    component={Link}
                    to="/movies"
                    color="primary"
                    sx={{ marginRight: 2 }}
                >
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" sx={{
                    ml: 1, flexGrow: 1, fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                }}>
                    {mediaTitle}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 8, width: '85vw', marginBottom: 2 }}>
                <Card sx={{}}>
                    <CardMedia
                        component="img"
                        image={
                            mediaImage
                        }
                        alt={mediaTitle}
                        sx={{
                            width: '460px',
                        }}
                    />
                </Card>
                <Box sx={{ width: '60%', }}>
                    <Typography variant="body2" gutterBottom sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Release date: </b> {mediaDetails?.release_date || mediaDetails?.first_air_date || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Overview</b>
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        {mediaDetails?.overview || 'No overview available.'}
                    </Typography>
                    {mediaDetails && (
                        <MediaStats
                            voteAverage={mediaDetails?.vote_average}
                            runtime={mediaDetails?.runtime}
                            lastWatchedAt={(media as Movie).last_watched_at}
                            plays={mediaType === "movie" ? (media as Movie).plays : undefined}
                        />
                    )}
                </Box>
            </Box>
            {mediaDetails && (
                <Box sx={{ display: 'flex', gap: 6, marginTop: 2, width: '100%' }}>
                    <InfoChipSection items={mediaDetails?.genres || []} title="Genres" />
                    <InfoChipSection items={mediaDetails?.production_companies || []} title="Companies" />
                    <InfoChipSection items={mediaDetails?.spoken_languages || []} title="Languages" />
                    <InfoChipSection items={mediaDetails?.production_countries || []} title="Countries" />
                </Box>
            )}
            {mediaType === "movie" && (
                <TrailerSection trailerKey={trailerKey} />
            )}
            {mediaType === "show" && watchedData && (
                <Box sx={{ display: 'flex', gap: 10, marginTop: 2, backgroundColor: '#f5f5f5' }}>
                    <ShowEpisodes seasons={watchedData.seasons} episodes={watchedData.episodes} />
                    <TrailerSection trailerKey={trailerKey} />
                </Box>
            )}
        </Box>
    );
};

export default MovieHeader;