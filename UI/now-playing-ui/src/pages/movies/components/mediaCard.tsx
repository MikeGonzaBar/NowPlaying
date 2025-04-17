import { Box, Chip, Grid, Tooltip, Typography } from "@mui/material";
import { Movie, Show } from "../utils/types";
import { useEffect, useState } from "react";
import EventIcon from '@mui/icons-material/Event';
import GradeIcon from '@mui/icons-material/Grade';
import { useNavigate } from "react-router-dom";

const movieCache = new Map<number, any>();
const showCache = new Map<number, any>();
async function getMovieDetails(tmdb: number): Promise<any | null> {
    if (movieCache.has(tmdb)) {
        return movieCache.get(tmdb);
    }

    const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
    const url = `https://api.themoviedb.org/3/movie/${tmdb}?api_key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch movie data: ${response.status}`);
        }

        const data = await response.json();
        movieCache.set(tmdb, data); // Cache it!
        return data;
    } catch (error) {
        console.error('Error fetching movie details from API:', error);
        return null;
    }
}

async function getShowDetails(tmdbId: number): Promise<any | null> {
    if (showCache.has(tmdbId)) {
        return showCache.get(tmdbId);
    }

    const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch show data: ${response.status}`);
        }

        const data = await response.json();
        showCache.set(tmdbId, data); // Cache it!
        return data;
    } catch (error) {
        console.error('Error fetching show details from API:', error);
        return null;
    }
}

interface MediaCardProps {
    media: Movie | Show;
    mediaType: "movie" | "show";
}

const MediaCard: React.FC<MediaCardProps> = ({ media, mediaType }) => {
    const [mediaDetails, setMediaDetails] = useState<any | null>(null);
    const navigate = useNavigate();
    const mediaTitle = mediaType === "movie" ? (media as Movie).movie.title : (media as Show).show.title;
    const mediaYear = mediaType === "movie" ? (media as Movie).movie.year : (media as Show).show.year;
    const mediaImage = mediaDetails?.poster_path
        ? `https://image.tmdb.org/t/p/w780${mediaDetails.poster_path}`
        : ''

    useEffect(() => {
        const fetchDetails = async () => {
            if (mediaType === "movie") {
                const movie = media as Movie;
                const details = await getMovieDetails(movie.movie.ids.tmdb);
                setMediaDetails(details);

            } else if (mediaType === "show") {
                const show = media as Show;
                const tmdbId = parseInt(show.show.ids.tmdb); // Assuming trakt ID can be used as TMDb ID
                const details = await getShowDetails(tmdbId);
                setMediaDetails(details);
            }
        };
        fetchDetails();
    }, [media, mediaType]);
    const handleCardClick = () => {
        navigate("/movieDetails", {
            state: {
                media,
                mediaType,
                mediaDetails,
            },
        });
    };
    return (
        <Box
            onClick={handleCardClick}
            sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 6,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': { transform: 'scale(1.03)' },
                minWidth: '250px',
                maxWidth: '250px',
                minHeight: '400px',
                maxHeight: '400px',
            }}
        >
            {/* Top Section: Movie Image */}
            {mediaImage ? (
                <Box
                    component="img"
                    src={mediaImage}
                    alt={mediaTitle}
                    sx={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
            ) : null}

            {/* Middle Section: Title and Year */}
            <Box sx={{ paddingLeft: 2, paddingRight: 2, paddingBottom: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tooltip title={mediaTitle} arrow>
                    <Typography
                        variant="h6"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '70%',
                        }}
                    >
                        {mediaTitle}
                    </Typography>
                </Tooltip>
                <Typography
                    variant="body2"
                    sx={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        color: 'gray',
                    }}
                >
                    {mediaYear || 'N/A'}
                </Typography>
            </Box>

            {/* Bottom Section: Last Watched, Vote Average, and Classification */}
            <Box sx={{ paddingLeft: 2, paddingRight: 2, borderTop: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
                    <EventIcon sx={{ fontSize: 16, color: 'gray', marginRight: 0.5 }} />
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 400,
                            color: 'gray',
                            marginBottom: 0,
                        }}
                    >
                        {new Date(media.last_watched_at).toLocaleDateString() || 'N/A'}
                    </Typography>
                    <GradeIcon sx={{ ml: 11, fontSize: 16, color: 'gray', marginRight: 0.5 }}></GradeIcon>
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 400,
                            color: 'gray',
                        }}
                    >
                        {mediaDetails?.vote_average.toFixed(2) || 'N/A'}
                    </Typography>
                </Box>
                {/* Genres */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginTop: 1 }}>
                    {mediaDetails?.genres?.map((genre: { id: number; name: string }) => (
                        <Chip
                            key={genre.id}
                            label={genre.name}
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 400,
                                fontSize: '0.600rem',
                                backgroundColor: '#f5f5f5',
                                color: '#333',
                            }}
                        />
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default MediaCard;