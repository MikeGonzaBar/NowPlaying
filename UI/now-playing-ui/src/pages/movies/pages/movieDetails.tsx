import { useLocation, useNavigate } from "react-router-dom";
import { Box, Container, Grid, Typography, Chip, Card, IconButton, Button, CircularProgress } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import { useEffect, useState } from "react";
import SideBar from "../../../components/sideBar";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import { format } from "date-fns";

interface MovieData {
    id?: number;
    title: string;
    year: number;
    image_url: string | null;
    ids: {
        trakt: string;
        tmdb: string;
        imdb?: string;
        slug?: string;
    };
}

interface TMDBMovieDetails {
    backdrop_path?: string;
    poster_path?: string;
    overview?: string;
    release_date?: string;
    runtime?: number;
    vote_average?: number;
    genres?: Array<{ id: number; name: string }>;
    production_companies?: Array<{ id: number; name: string; logo_path?: string }>;
    spoken_languages?: Array<{ iso_639_1: string; name: string }>;
    production_countries?: Array<{ iso_3166_1: string; name: string }>;
    credits?: {
        cast?: Array<{
            id: number;
            name: string;
            character: string;
            profile_path?: string;
            order: number;
        }>;
        crew?: Array<{
            id: number;
            name: string;
            job: string;
            profile_path?: string;
        }>;
    };
    similar?: {
        results?: Array<{
            id: number;
            title: string;
            release_date?: string;
            poster_path?: string;
            genre_ids?: number[];
        }>;
    };
}

interface WatchProvider {
    display_priority: number;
    logo_path: string;
    provider_name: string;
    provider_id: number;
}

interface WatchProviders {
    flatrate?: WatchProvider[];
    rent?: WatchProvider[];
    buy?: WatchProvider[];
}

interface MovieDetailsData {
    plays: number;
    last_watched_at: string | null;
    last_updated_at: string | null;
}

interface TraktStats {
    watchers: number;
    plays: number;
    collectors: number;
    comments?: number;
    lists?: number;
    votes?: number;
}

function MovieDetails() {
    const location = useLocation();
    const navigate = useNavigate();
    const { media, mediaDetails } = location.state || {};

    const [movieData, setMovieData] = useState<MovieData | null>(media?.movie || media || null);
    const [tmdbDetails, setTmdbDetails] = useState<TMDBMovieDetails | null>(mediaDetails || null);
    const [movieDetails, setMovieDetails] = useState<MovieDetailsData | null>(null);
    const [traktStats, setTraktStats] = useState<TraktStats | null>(null);
    const [watchProviders, setWatchProviders] = useState<WatchProviders | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (!media && !movieData) {
            navigate("/movies");
            return;
        }

        const fetchMovieDetails = async () => {
            try {
                setLoading(true);

                const traktId = movieData?.ids?.trakt || media?.movie?.ids?.trakt || media?.ids?.trakt;
                if (!traktId) {
                    console.error("No trakt_id found for movie");
                    setLoading(false);
                    return;
                }

                // Fetch movie data from our API
                const moviesRes = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/get-stored-movies/?page_size=1000`)
                );

                if (moviesRes.ok) {
                    const data = await moviesRes.json();
                    const movie = data.movies?.find((m: any) => m.movie.ids.trakt === traktId);
                    if (movie) {
                        setMovieDetails({
                            plays: movie.plays || 0,
                            last_watched_at: movie.last_watched_at,
                            last_updated_at: movie.last_updated_at,
                        });
                        if (!movieData) {
                            setMovieData(movie.movie);
                        }
                    }
                }

                // Fetch TMDB details if not provided
                if (!tmdbDetails && movieData?.ids?.tmdb) {
                    const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
                    const tmdbUrl = `https://api.themoviedb.org/3/movie/${movieData.ids.tmdb}?api_key=${apiKey}&append_to_response=credits,similar`;
                    const tmdbRes = await fetch(tmdbUrl);
                    if (tmdbRes.ok) {
                        const tmdbData = await tmdbRes.json();
                        setTmdbDetails(tmdbData);
                    }
                }

                // Fetch watch providers from TMDB
                if (movieData?.ids?.tmdb) {
                    const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
                    // Try to get providers for US (or fallback to any region)
                    const providersUrl = `https://api.themoviedb.org/3/movie/${movieData.ids.tmdb}/watch/providers?api_key=${apiKey}`;
                    const providersRes = await fetch(providersUrl);
                    if (providersRes.ok) {
                        const providersData = await providersRes.json();
                        // Use US providers if available, otherwise use the first available region
                        const usProviders = providersData.results?.US;
                        if (usProviders) {
                            setWatchProviders(usProviders);
                        } else {
                            // Fallback to first available region
                            const firstRegion = Object.values(providersData.results || {})[0] as WatchProviders;
                            if (firstRegion) {
                                setWatchProviders(firstRegion);
                            }
                        }
                    }
                }

                // Fetch Trakt stats
                const statsRes = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/movie-stats/?trakt_id=${traktId}`)
                );
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setTraktStats(statsData);
                }

            } catch (error) {
                console.error("Error fetching movie details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMovieDetails();
    }, [media, movieData, tmdbDetails, navigate]);

    const handleSync = async () => {
        try {
            const traktId = movieData?.ids?.trakt || media?.movie?.ids?.trakt || media?.ids?.trakt;
            if (!traktId) {
                alert("Unable to get movie ID for sync");
                return;
            }

            setSyncing(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/update-movie/?trakt_id=${traktId}`)
            );

            if (response.ok) {
                alert("Movie sync started in the background. The page will refresh shortly...");
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                alert(`Failed to sync movie: ${errorData.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error syncing movie:", error);
            alert("Failed to sync movie");
        } finally {
            setSyncing(false);
        }
    };

    if (!movieData || loading) {
        return (
            <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115" }}>
                <SideBar activeItem="Movies" />
                <Box component="main" sx={{ flexGrow: 1, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {loading ? (
                        <CircularProgress sx={{ color: "#ed1c24" }} />
                    ) : (
                        <Typography sx={{ color: "#fff" }}>Movie not found</Typography>
                    )}
                </Box>
            </Box>
        );
    }

    const backdropUrl = tmdbDetails?.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${tmdbDetails.backdrop_path}`
        : movieData.image_url || "";

    const genres = tmdbDetails?.genres?.map(g => g.name).join(" / ") || "";
    const director = tmdbDetails?.credits?.crew?.find(c => c.job === "Director")?.name || "N/A";
    const runtime = tmdbDetails?.runtime ? `${Math.floor(tmdbDetails.runtime / 60)}h ${tmdbDetails.runtime % 60}m` : "N/A";
    const traktRating = tmdbDetails?.vote_average?.toFixed(1) || "N/A";
    const userRating = "N/A"; // We don't have user ratings stored yet

    const cast = tmdbDetails?.credits?.cast?.slice(0, 6) || [];
    const similarMovies = tmdbDetails?.similar?.results?.slice(0, 6) || [];

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "Never";
        try {
            return format(new Date(dateString), "MMMM d, yyyy");
        } catch {
            return dateString;
        }
    };

    const getProviderLink = (provider: WatchProvider, movieTitle: string, tmdbId?: string): string => {
        const providerName = provider.provider_name.toLowerCase();
        const encodedTitle = encodeURIComponent(movieTitle);

        // Map provider IDs/names to their search/watch URLs
        const providerLinks: Record<string, string> = {
            // Streaming services
            "netflix": `https://www.netflix.com/search?q=${encodedTitle}`,
            "disney plus": `https://www.disneyplus.com/search?q=${encodedTitle}`,
            "disney+": `https://www.disneyplus.com/search?q=${encodedTitle}`,
            "hulu": `https://www.hulu.com/search?q=${encodedTitle}`,
            "amazon prime video": `https://www.amazon.com/s?k=${encodedTitle}&i=prime-instant-video`,
            "prime video": `https://www.amazon.com/s?k=${encodedTitle}&i=prime-instant-video`,
            "hbo max": `https://www.hbomax.com/search?q=${encodedTitle}`,
            "hbo": `https://www.hbomax.com/search?q=${encodedTitle}`,
            "max": `https://www.max.com/search?q=${encodedTitle}`,
            "paramount plus": `https://www.paramountplus.com/search/?q=${encodedTitle}`,
            "paramount+": `https://www.paramountplus.com/search/?q=${encodedTitle}`,
            "peacock": `https://www.peacocktv.com/search?q=${encodedTitle}`,
            "apple tv plus": `https://tv.apple.com/search?term=${encodedTitle}`,
            "apple tv+": `https://tv.apple.com/search?term=${encodedTitle}`,
            "crunchyroll": `https://www.crunchyroll.com/search?q=${encodedTitle}`,
            "funimation": `https://www.funimation.com/search/?q=${encodedTitle}`,
            "starz": `https://www.starz.com/us/en/search?q=${encodedTitle}`,
            "showtime": `https://www.showtime.com/search?q=${encodedTitle}`,
            "amc+": `https://www.amcplus.com/search?q=${encodedTitle}`,

            // Rental/Purchase services
            "apple itunes": `https://tv.apple.com/search?term=${encodedTitle}`,
            "itunes": `https://tv.apple.com/search?term=${encodedTitle}`,
            "google play movies": `https://play.google.com/store/search?q=${encodedTitle}&c=movies`,
            "google play": `https://play.google.com/store/search?q=${encodedTitle}&c=movies`,
            "youtube": `https://www.youtube.com/results?search_query=${encodedTitle}`,
            "vudu": `https://www.vudu.com/content/search.html?q=${encodedTitle}`,
            "microsoft store": `https://www.microsoft.com/en-us/store/search?q=${encodedTitle}`,
            "amazon video": `https://www.amazon.com/s?k=${encodedTitle}&i=movies-tv`,
            "amazon": `https://www.amazon.com/s?k=${encodedTitle}&i=movies-tv`,
            "redbox": `https://www.redbox.com/search?q=${encodedTitle}`,
            "fandango now": `https://www.fandango.com/search?q=${encodedTitle}`,
            "fandangonow": `https://www.fandango.com/search?q=${encodedTitle}`,
        };

        // Try exact match first
        if (providerLinks[providerName]) {
            return providerLinks[providerName];
        }

        // Try partial matches
        for (const [key, url] of Object.entries(providerLinks)) {
            if (providerName.includes(key) || key.includes(providerName)) {
                return url;
            }
        }

        // Fallback: Use JustWatch search (they have good platform links)
        if (tmdbId) {
            return `https://www.justwatch.com/us/movie/${encodedTitle.toLowerCase().replace(/\s+/g, '-')}`;
        }

        // Last resort: Google search
        return `https://www.google.com/search?q=${encodedTitle}+watch+online`;
    };

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115" }}>
            <SideBar activeItem="Movies" />
            <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                {/* Back Button */}
                <Box sx={{ p: 3, pb: 0 }}>
                    <IconButton
                        onClick={() => navigate("/movies")}
                        sx={{
                            backgroundColor: "rgba(237, 28, 36, 0.1)",
                            color: "#ed1c24",
                            "&:hover": {
                                backgroundColor: "rgba(237, 28, 36, 0.2)",
                            },
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                </Box>

                {/* Hero Section */}
                <Box sx={{ mb: 4, position: "relative" }}>
                    <Box
                        sx={{
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: 3,
                            height: { xs: 400, md: 500 },
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            backgroundImage: backdropUrl
                                ? `linear-gradient(0deg, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.2) 60%), url(${backdropUrl})`
                                : "linear-gradient(0deg, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.2) 60%)",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            transition: "transform 0.7s",
                            "&:hover": {
                                transform: "scale(1.02)",
                            },
                        }}
                    >
                        <Box sx={{ position: "relative", p: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                <Box sx={{ flex: 1 }}>
                                    {/* Classification and Genres */}
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                                        <Chip
                                            label="MOVIE"
                                            size="small"
                                            sx={{
                                                backgroundColor: "#ed1c24",
                                                color: "#fff",
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.1em",
                                                height: 20,
                                            }}
                                        />
                                        {genres && (
                                            <>
                                                <Box sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#ed1c24" }} />
                                                <Typography sx={{ color: "#fff", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                                    {genres.toUpperCase()}
                                                </Typography>
                                            </>
                                        )}
                                    </Box>

                                    {/* Movie Title */}
                                    <Typography
                                        variant="h3"
                                        sx={{
                                            color: "#fff",
                                            fontSize: { xs: "2.5rem", md: "4rem", lg: "4.5rem" },
                                            fontWeight: 900,
                                            letterSpacing: "-0.02em",
                                            lineHeight: 1,
                                            mb: 2,
                                        }}
                                    >
                                        {movieData.title.toUpperCase()}
                                    </Typography>

                                    {/* Details Row */}
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                                            <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", mb: 0.5, letterSpacing: "0.05em" }}>
                                                Release Year
                                            </Typography>
                                            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                                                {movieData.year}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", flexDirection: "column", borderLeft: "1px solid rgba(255, 255, 255, 0.1)", pl: 4 }}>
                                            <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", mb: 0.5, letterSpacing: "0.05em" }}>
                                                Director
                                            </Typography>
                                            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                                                {director}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", flexDirection: "column", borderLeft: "1px solid rgba(255, 255, 255, 0.1)", pl: 4 }}>
                                            <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", mb: 0.5, letterSpacing: "0.05em" }}>
                                                Runtime
                                            </Typography>
                                            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                                                {runtime}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Rating Boxes */}
                                <Box sx={{ display: "flex", gap: 2, ml: 4 }}>
                                    <Card
                                        sx={{
                                            backgroundColor: "rgba(26, 29, 35, 0.7)",
                                            backdropFilter: "blur(12px)",
                                            border: "1px solid rgba(42, 46, 55, 0.5)",
                                            borderRadius: 2,
                                            p: 2,
                                            minWidth: 100,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", mb: 1, letterSpacing: "0.05em" }}>
                                            Trakt Rating
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#ed1c24" }}>
                                            <Typography sx={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
                                                {traktRating}
                                            </Typography>
                                            <StarIcon sx={{ fontSize: 16, fill: "#ed1c24" }} />
                                        </Box>
                                    </Card>
                                    <Card
                                        sx={{
                                            backgroundColor: "rgba(237, 28, 36, 0.1)",
                                            backdropFilter: "blur(12px)",
                                            border: "1px solid rgba(237, 28, 36, 0.5)",
                                            borderRadius: 2,
                                            p: 2,
                                            minWidth: 100,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", mb: 1, letterSpacing: "0.05em" }}>
                                            Your Rating
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#fff" }}>
                                            <Typography sx={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
                                                {userRating}
                                            </Typography>
                                            <StarIcon sx={{ fontSize: 16, fill: "#fff" }} />
                                        </Box>
                                    </Card>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Main Content */}
                <Container maxWidth="xl" sx={{ py: 6 }}>
                    <Grid container spacing={6}>
                        {/* Left Column */}
                        <Grid size={{ xs: 12, lg: 9 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {/* Synopsis */}
                                {tmdbDetails?.overview && (
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#ed1c24",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.2em",
                                                mb: 2,
                                            }}
                                        >
                                            Synopsis
                                        </Typography>
                                        <Typography sx={{ color: "#9ca3af", lineHeight: 1.75, fontSize: "1.125rem", maxWidth: "64rem" }}>
                                            {tmdbDetails.overview}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Cast & Crew */}
                                {cast.length > 0 && (
                                    <Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    color: "#ed1c24",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.2em",
                                                }}
                                            >
                                                Cast & Crew
                                            </Typography>
                                            <Button
                                                sx={{
                                                    fontSize: "10px",
                                                    fontWeight: 700,
                                                    color: "#6b7280",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.1em",
                                                    "&:hover": {
                                                        color: "#fff",
                                                    },
                                                }}
                                            >
                                                Full Cast
                                            </Button>
                                        </Box>
                                        <Grid container spacing={3}>
                                            {cast.map((actor) => (
                                                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={actor.id}>
                                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", cursor: "pointer" }}>
                                                        <Box
                                                            sx={{
                                                                width: 80,
                                                                height: 80,
                                                                borderRadius: "50%",
                                                                overflow: "hidden",
                                                                mb: 1.5,
                                                                border: "2px solid transparent",
                                                                transition: "border-color 0.2s",
                                                                "&:hover": {
                                                                    borderColor: "#ed1c24",
                                                                },
                                                            }}
                                                        >
                                                            {actor.profile_path ? (
                                                                <Box
                                                                    component="img"
                                                                    src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                                                    alt={actor.name}
                                                                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                                />
                                                            ) : (
                                                                <Box sx={{ width: "100%", height: "100%", backgroundColor: "#27272a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                    <Typography sx={{ color: "#6b7280", fontSize: "10px" }}>No Image</Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                        <Typography sx={{ fontSize: "14px", fontWeight: 700, mb: 0.5, "&:hover": { color: "#ed1c24" }, transition: "color 0.2s" }}>
                                                            {actor.name}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: 500 }}>
                                                            {actor.character}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                )}

                                {/* Personal Progress */}
                                <Card
                                    sx={{
                                        backgroundColor: "#15181e",
                                        border: "1px solid #2a2e37",
                                        borderRadius: 3,
                                        p: 4,
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    <Box sx={{ position: "absolute", top: 0, right: 0, p: 4, opacity: 0.2 }}>
                                        <CheckCircleIcon sx={{ fontSize: 96, color: "#ed1c24" }} />
                                    </Box>
                                    <Box sx={{ position: "relative", zIndex: 10 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#ed1c24",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.2em",
                                                mb: 3,
                                            }}
                                        >
                                            Personal Progress
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                <Box
                                                    sx={{
                                                        width: 64,
                                                        height: 64,
                                                        borderRadius: 2,
                                                        backgroundColor: "rgba(237, 28, 36, 0.1)",
                                                        border: "1px solid rgba(237, 28, 36, 0.3)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <CheckCircleIcon sx={{ fontSize: 32, color: "#ed1c24" }} />
                                                </Box>
                                                <Box>
                                                    <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280", mb: 0.5 }}>
                                                        Status
                                                    </Typography>
                                                    <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
                                                        {movieDetails?.last_watched_at ? "Watched" : "Not Watched"}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280", mb: 0.5 }}>
                                                    Total Plays
                                                </Typography>
                                                <Typography sx={{ fontSize: "1.875rem", fontWeight: 900, color: "#fff" }}>
                                                    {movieDetails?.plays || 0}{" "}
                                                    <Typography component="span" sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", ml: 0.5 }}>
                                                        times
                                                    </Typography>
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280", mb: 0.5 }}>
                                                    Last Scrobble
                                                </Typography>
                                                <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#fff" }}>
                                                    {formatDate(movieDetails?.last_watched_at ?? null)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Card>

                                {/* Where to Watch */}
                                {watchProviders && (watchProviders.flatrate || watchProviders.rent || watchProviders.buy) && (
                                    <Card
                                        sx={{
                                            backgroundColor: "#15181e",
                                            border: "1px solid #2a2e37",
                                            borderRadius: 3,
                                            p: 4,
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#ed1c24",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.2em",
                                                mb: 3,
                                            }}
                                        >
                                            Where to Watch
                                        </Typography>

                                        {watchProviders.flatrate && watchProviders.flatrate.length > 0 && (
                                            <Box sx={{ mb: 3 }}>
                                                <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", mb: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                    Stream
                                                </Typography>
                                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                                    {watchProviders.flatrate.map((provider) => (
                                                        <Box
                                                            key={provider.provider_id}
                                                            component="a"
                                                            href={getProviderLink(provider, movieData?.title || "", movieData?.ids?.tmdb)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 1,
                                                                p: 1.5,
                                                                borderRadius: 2,
                                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                                                textDecoration: "none",
                                                                transition: "all 0.2s",
                                                                cursor: "pointer",
                                                                "&:hover": {
                                                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                                    borderColor: "#ed1c24",
                                                                    transform: "translateY(-2px)",
                                                                },
                                                            }}
                                                        >
                                                            {provider.logo_path ? (
                                                                <Box
                                                                    component="img"
                                                                    src={`https://image.tmdb.org/t/p/w154${provider.logo_path}`}
                                                                    alt={provider.provider_name}
                                                                    sx={{
                                                                        width: 60,
                                                                        height: 60,
                                                                        objectFit: "contain",
                                                                        backgroundColor: "#fff",
                                                                        borderRadius: 1,
                                                                        p: 0.5,
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Box
                                                                    sx={{
                                                                        width: 60,
                                                                        height: 60,
                                                                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                                        borderRadius: 1,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                    }}
                                                                >
                                                                    <Typography sx={{ fontSize: "10px", color: "#9ca3af", textAlign: "center", px: 0.5 }}>
                                                                        {provider.provider_name}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}

                                        {watchProviders.rent && watchProviders.rent.length > 0 && (
                                            <Box sx={{ mb: 3 }}>
                                                <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", mb: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                    Rent
                                                </Typography>
                                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                                    {watchProviders.rent.map((provider) => (
                                                        <Box
                                                            key={provider.provider_id}
                                                            component="a"
                                                            href={getProviderLink(provider, movieData?.title || "", movieData?.ids?.tmdb)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 1,
                                                                p: 1.5,
                                                                borderRadius: 2,
                                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                                                textDecoration: "none",
                                                                transition: "all 0.2s",
                                                                cursor: "pointer",
                                                                "&:hover": {
                                                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                                    borderColor: "#ed1c24",
                                                                    transform: "translateY(-2px)",
                                                                },
                                                            }}
                                                        >
                                                            {provider.logo_path ? (
                                                                <Box
                                                                    component="img"
                                                                    src={`https://image.tmdb.org/t/p/w154${provider.logo_path}`}
                                                                    alt={provider.provider_name}
                                                                    sx={{
                                                                        width: 60,
                                                                        height: 60,
                                                                        objectFit: "contain",
                                                                        backgroundColor: "#fff",
                                                                        borderRadius: 1,
                                                                        p: 0.5,
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Box
                                                                    sx={{
                                                                        width: 60,
                                                                        height: 60,
                                                                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                                        borderRadius: 1,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                    }}
                                                                >
                                                                    <Typography sx={{ fontSize: "10px", color: "#9ca3af", textAlign: "center", px: 0.5 }}>
                                                                        {provider.provider_name}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}

                                        {watchProviders.buy && watchProviders.buy.length > 0 && (
                                            <Box>
                                                <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", mb: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                    Buy
                                                </Typography>
                                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                                    {watchProviders.buy.map((provider) => (
                                                        <Box
                                                            key={provider.provider_id}
                                                            component="a"
                                                            href={getProviderLink(provider, movieData?.title || "", movieData?.ids?.tmdb)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 1,
                                                                p: 1.5,
                                                                borderRadius: 2,
                                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                                                textDecoration: "none",
                                                                transition: "all 0.2s",
                                                                cursor: "pointer",
                                                                "&:hover": {
                                                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                                    borderColor: "#ed1c24",
                                                                    transform: "translateY(-2px)",
                                                                },
                                                            }}
                                                        >
                                                            {provider.logo_path ? (
                                                                <Box
                                                                    component="img"
                                                                    src={`https://image.tmdb.org/t/p/w154${provider.logo_path}`}
                                                                    alt={provider.provider_name}
                                                                    sx={{
                                                                        width: 60,
                                                                        height: 60,
                                                                        objectFit: "contain",
                                                                        backgroundColor: "#fff",
                                                                        borderRadius: 1,
                                                                        p: 0.5,
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Box
                                                                    sx={{
                                                                        width: 60,
                                                                        height: 60,
                                                                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                                        borderRadius: 1,
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                    }}
                                                                >
                                                                    <Typography sx={{ fontSize: "10px", color: "#9ca3af", textAlign: "center", px: 0.5 }}>
                                                                        {provider.provider_name}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                    </Card>
                                )}

                                {/* Related Movies */}
                                {similarMovies.length > 0 && (
                                    <Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    color: "#ed1c24",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.2em",
                                                }}
                                            >
                                                Related Movies
                                            </Typography>
                                        </Box>
                                        <Grid container spacing={3}>
                                            {similarMovies.map((movie) => (
                                                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={movie.id}>
                                                    <Box sx={{ cursor: "pointer" }}>
                                                        <Box
                                                            sx={{
                                                                position: "relative",
                                                                aspectRatio: "2/3",
                                                                borderRadius: 2,
                                                                overflow: "hidden",
                                                                mb: 1.5,
                                                                border: "1px solid #2a2e37",
                                                                transition: "transform 0.5s",
                                                                "&:hover": {
                                                                    transform: "scale(1.05)",
                                                                },
                                                            }}
                                                        >
                                                            {movie.poster_path ? (
                                                                <Box
                                                                    component="img"
                                                                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                                                    alt={movie.title}
                                                                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                                />
                                                            ) : (
                                                                <Box sx={{ width: "100%", height: "100%", backgroundColor: "#27272a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                    <Typography sx={{ color: "#6b7280", fontSize: "10px" }}>No Image</Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                        <Typography sx={{ fontSize: "14px", fontWeight: 700, mb: 0.5, "&:hover": { color: "#ed1c24" }, transition: "color 0.2s" }}>
                                                            {movie.title}
                                                        </Typography>
                                                        {movie.release_date && (
                                                            <Typography sx={{ fontSize: "10px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
                                                                {new Date(movie.release_date).getFullYear()}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                )}
                            </Box>
                        </Grid>

                        {/* Right Sidebar */}
                        <Grid size={{ xs: 12, lg: 3 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {/* Trakt Stats */}
                                <Card
                                    sx={{
                                        backgroundColor: "#15181e",
                                        border: "1px solid #2a2e37",
                                        borderRadius: 2,
                                        p: 3,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#ed1c24",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.2em",
                                            mb: 3,
                                        }}
                                    >
                                        Trakt Stats
                                    </Typography>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, backgroundColor: "rgba(0, 0, 0, 0.3)", borderRadius: 2 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                <ScheduleIcon sx={{ color: "#9ca3af", fontSize: 16 }} />
                                                <Typography sx={{ fontSize: "12px", fontWeight: 500, color: "#d1d5db" }}>
                                                    Total Plays
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: "14px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                                                {traktStats?.plays ? traktStats.plays.toLocaleString() : "N/A"}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, backgroundColor: "rgba(0, 0, 0, 0.3)", borderRadius: 2 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                <StarIcon sx={{ color: "#9ca3af", fontSize: 16 }} />
                                                <Typography sx={{ fontSize: "12px", fontWeight: 500, color: "#d1d5db" }}>
                                                    Watchers
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: "14px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                                                {traktStats?.watchers ? traktStats.watchers.toLocaleString() : "N/A"}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, backgroundColor: "rgba(0, 0, 0, 0.3)", borderRadius: 2 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                <CheckCircleIcon sx={{ color: "#9ca3af", fontSize: 16 }} />
                                                <Typography sx={{ fontSize: "12px", fontWeight: 500, color: "#d1d5db" }}>
                                                    Collectors
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: "14px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                                                {traktStats?.collectors ? traktStats.collectors.toLocaleString() : "N/A"}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Card>

                                {/* Sync Card */}
                                <Card
                                    sx={{
                                        borderRadius: 2,
                                        background: "linear-gradient(135deg, rgba(237, 28, 36, 0.3) 0%, transparent 100%)",
                                        border: "1px solid rgba(237, 28, 36, 0.2)",
                                        p: 2.5,
                                    }}
                                >
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}>
                                                Trakt Sync
                                            </Typography>
                                            <Typography sx={{ fontSize: "10px", color: "#b99d9d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                Connected Account
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: "50%",
                                                backgroundColor: "#22c55e",
                                                boxShadow: "0 0 8px #22c55e",
                                            }}
                                        />
                                    </Box>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={syncing ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SyncIcon />}
                                        onClick={handleSync}
                                        disabled={syncing}
                                        sx={{
                                            backgroundColor: "#ed1c24",
                                            color: "#fff",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                            py: 1,
                                            borderRadius: 2,
                                            "&:hover": {
                                                backgroundColor: "rgba(237, 28, 36, 0.8)",
                                            },
                                        }}
                                    >
                                        Force Update
                                    </Button>
                                </Card>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </Box>
    );
}

export default MovieDetails;
