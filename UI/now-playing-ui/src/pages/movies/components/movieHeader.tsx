import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EventIcon from '@mui/icons-material/Event';
import { Movie, Show } from '../utils/types';
import { Box, Card, CardMedia, IconButton, Typography, Chip, Accordion, AccordionDetails, AccordionSummary, CardContent, Avatar } from '@mui/material';
import { Link } from 'react-router-dom';
import GradeIcon from '@mui/icons-material/Grade';
import ReplayIcon from '@mui/icons-material/Replay';
import { useEffect, useState } from 'react';

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
    const mediaTitle = mediaType === "movie" ? (media as Movie).movie.title : (media as Show).show.title;
    const mediaImage = mediaDetails?.poster_path
        ? `https://image.tmdb.org/t/p/w1280${mediaDetails.backdrop_path}`
        : '';
    const traktId = mediaType === "movie" ? (media as Movie).movie.ids.trakt : (media as Show).show.ids.trakt;
    const [trailerKey, setTrailerKey] = useState<string | null>(null);
    const [data, setData] = useState<WatchedSeasonsEpisodesResponse | null>(null);


    const fetchWatchedSeasonsEpisodes = async () => {
        try {
            const response = await fetch(`http://localhost:8000/trakt/get-watched-seasons-episodes/?trakt_id=${traktId}`);
            const result = await response.json();
            console.log("Fetched watched seasons and episodes:", result);
            setData(result);
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

        console.log("Fetching trailer for media:", mediaTitle);
        console.log("Media Type:", mediaType);
        console.log("Media Details:", mediaDetails);
        fetchTrailer();
        if (mediaType === "show") {
            console.log("Fetching watched seasons and episodes for show:", mediaTitle);
            fetchWatchedSeasonsEpisodes();
            console.log("Fetched watched seasons and episodes:", data);
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
                        <b>Release date: </b> {mediaDetails.release_date}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Overview</b>
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        {mediaDetails.overview}
                    </Typography>
                    <Box sx={{ display: 'flex', marginTop: 0.5, marginBottom: 0.5 }}>
                        <GradeIcon sx={{ fontSize: 21, marginTop: 0.4, marginRight: 0.5 }}></GradeIcon>
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 400,
                                fontSize: 20,

                            }}
                        >
                            {mediaDetails?.vote_average || 'N/A'}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', marginTop: 0.5, marginBottom: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 21, marginTop: 0.8, marginRight: 0.5 }} />
                        <Typography variant="subtitle1" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                            {mediaDetails.runtime} minutes
                        </Typography>
                    </Box>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 6, marginTop: 2, width: '100%' }}>
                <Box>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Genres</b>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, }}>
                        {mediaDetails?.genres?.map((genre: { id: number; name: string }) => (
                            <Chip
                                key={genre.id}
                                label={genre.name}
                                sx={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 400,

                                    backgroundColor: '#f5f5f5',
                                    color: '#333',
                                }}
                            />
                        ))}
                    </Box>
                </Box>
                <Box>

                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif', }}>
                        <b>Companies</b>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, }}>
                        {mediaDetails?.production_companies?.map((company: { id: number; name: string }) => (
                            <Chip
                                key={company.id}
                                label={company.name}
                                sx={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 400,
                                    backgroundColor: '#f5f5f5',
                                    color: '#333',
                                }}
                            />
                        ))}
                    </Box>
                </Box>
                <Box sx={{}}>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Languages</b>
                    </Typography>
                    {mediaDetails?.spoken_languages?.map((language: { id: number; name: string }) => (
                        <Chip
                            key={language.id}
                            label={language.name}
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 400,
                                backgroundColor: '#f5f5f5',
                                color: '#333',
                            }}
                        />
                    ))}
                </Box>
                <Box sx={{}}>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Countries</b>
                    </Typography>
                    {mediaDetails?.production_countries?.map((country: { id: number; name: string }) => (
                        <Chip
                            key={country.id}
                            label={country.name}
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 400,
                                backgroundColor: '#f5f5f5',
                                color: '#333',
                            }}
                        />
                    ))}
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Last time watched</b>
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        {new Date((media as Movie).last_watched_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </Typography>
                </Box>
            </Box>
            {mediaType === "movie" && (
                <>

                    <Box sx={{ display: 'flex', gap: 10, marginTop: 2 }}>
                        <Box>
                            <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                                <b>Replays</b>
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                                <ReplayIcon sx={{ fontSize: 19, mb: -0.25 }} /> {(media as Movie).plays}
                            </Typography>
                        </Box>
                    </Box>
                    {/* Embed YouTube Trailer */}
                    {trailerKey && (
                        <Box sx={{ marginTop: 2 }}>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, marginBottom: 1 }}>
                                Watch Trailer
                            </Typography>
                            <Box
                                component="iframe"
                                src={`https://www.youtube.com/embed/${trailerKey}`}
                                title="YouTube Trailer"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                sx={{
                                    width: '100%',
                                    aspectRatio: '16 / 9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    maxWidth: '800px',
                                }}
                            />
                        </Box>
                    )}
                </>
            )}
            {mediaType === "show" && (
                <>
                    <Box sx={{ display: 'flex', gap: 10, marginTop: 2, backgroundColor: '#f5f5f5', }}>
                        <Box sx={{ width: '60%' }}>
                            <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                                <b>Episodes watched</b>
                            </Typography>

                            {data?.seasons.map((season) => (
                                <Accordion key={season.id}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography sx={{ fontWeight: 600 }} >
                                            Season {season.season_number}
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        {data.episodes
                                            .filter((episode) => episode.season__id === season.id)
                                            .map((episode) => (
                                                <Card key={episode.id} sx={{ display: "flex", marginBottom: 2 }}>
                                                    {/* Left: Episode Image */}
                                                    <Avatar
                                                        variant="square"
                                                        src={episode.image_url}
                                                        alt={episode.title}
                                                        sx={{ width: 150, height: 150 }}
                                                    />
                                                    {/* Right: Episode Details */}
                                                    <CardContent sx={{ flex: 1 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 600 }} >
                                                            Episode {episode.episode_number}: {episode.title}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: "gray", marginBottom: 1 }} >
                                                            {episode.overview}
                                                        </Typography>
                                                        <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }} >
                                                                <GradeIcon sx={{ mb: -1 }}></GradeIcon> {episode.rating}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }} >
                                                                Progress: {episode.progress}%
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }} >
                                                                <EventIcon sx={{ mb: -1 }} />
                                                                {new Date(episode.last_watched_at).toLocaleDateString("en-US", {
                                                                    year: "numeric",
                                                                    month: "long",
                                                                    day: "numeric",
                                                                })}
                                                            </Typography>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>

                        {/* Embed YouTube Trailer */}
                        {trailerKey && (
                            <Box sx={{ marginTop: 2, width: '50%' }}>
                                <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, marginBottom: 1 }}>
                                    Watch Trailer
                                </Typography>
                                <Box
                                    component="iframe"
                                    src={`https://www.youtube.com/embed/${trailerKey}`}
                                    title="YouTube Trailer"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    sx={{
                                        width: '100%',
                                        height: '550px',
                                        border: 'none',
                                        borderRadius: '8px',
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                </>
            )}
        </Box>
    );
};




export default MovieHeader;