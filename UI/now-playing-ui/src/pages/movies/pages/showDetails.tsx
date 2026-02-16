import { useLocation, useNavigate } from "react-router-dom";
import { Box, Container, Grid, Typography, Chip, LinearProgress, Card, IconButton, CircularProgress } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ScheduleIcon from "@mui/icons-material/Schedule";
import MovieFilterIcon from "@mui/icons-material/MovieFilter";
import StarIcon from "@mui/icons-material/Star";
import { useEffect, useState } from "react";
import SideBar from "../../../components/sideBar";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import SeasonProgress from "../components/SeasonProgress";
import MilestonesSidebar from "../components/MilestonesSidebar";

interface ShowData {
    id: number;
    title: string;
    year: number;
    image_url: string | null;
    ids: {
        trakt: string;
        tmdb: string;
    };
}

interface Season {
    id: number;
    season_number: number;
    show__id: number;
    show__title: string;
    show__trakt_id: string;
}

interface Episode {
    id: number;
    episode_number: number;
    title: string | null;
    image_url: string | null;
    rating: number | null;
    overview: string | null;
    season__id: number;
    season__season_number: number;
    show__id: number;
    show__title: string;
    show__trakt_id: string;
    last_watched_at: string | null;
    progress: number | null;
}

interface ShowMetadata {
    genres?: string[];
    status?: string;
    network?: string;
    certification?: string;
    country?: string;
    overview?: string;
    rating?: number;
    runtime?: number;
    first_aired?: string;
    air_day?: string;
    air_time?: string;
    air_timezone?: string;
}

interface SeasonsEpisodesData {
    seasons: Season[];
    episodes: Episode[];
    show_metadata?: ShowMetadata;
}

function ShowDetails() {
    const location = useLocation();
    const navigate = useNavigate();
    const { show } = location.state || {};

    const [showData, setShowData] = useState<ShowData | null>(show || null);
    const [seasonsData, setSeasonsData] = useState<SeasonsEpisodesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
    const [showDetails, setShowDetails] = useState<any>(null);
    const [showMetadata, setShowMetadata] = useState<ShowMetadata | null>(null);

    useEffect(() => {
        if (!show) {
            navigate("/movies");
            return;
        }

        setShowData(show);

        const fetchShowDetails = async () => {
            try {
                setLoading(true);

                const traktId = show.ids?.trakt || show.show?.ids?.trakt;
                if (!traktId) {
                    console.error("No trakt_id found for show");
                    setLoading(false);
                    return;
                }

                // Fetch seasons and episodes
                const seasonsRes = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/get-watched-seasons-episodes/?trakt_id=${traktId}`)
                );

                if (seasonsRes.ok) {
                    const data = await seasonsRes.json();
                    setSeasonsData(data);

                    // Extract and store show metadata
                    if (data.show_metadata) {
                        setShowMetadata(data.show_metadata);
                    }

                    // Calculate stats from episodes
                    const episodes = data.episodes || [];
                    const watchedEpisodes = episodes.filter((ep: Episode) => ep.last_watched_at);
                    const totalEpisodes = episodes.length;
                    const watchedCount = watchedEpisodes.length;
                    const masteryPercentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

                    // Group episodes by season
                    const episodesBySeason: Record<number, Episode[]> = {};
                    episodes.forEach((ep: Episode) => {
                        if (!episodesBySeason[ep.season__season_number]) {
                            episodesBySeason[ep.season__season_number] = [];
                        }
                        episodesBySeason[ep.season__season_number].push(ep);
                    });

                    // Calculate total runtime (assuming 45 min per episode average)
                    const totalRuntimeMinutes = watchedEpisodes.length * 45;
                    const days = Math.floor(totalRuntimeMinutes / (24 * 60));
                    const hours = Math.floor((totalRuntimeMinutes % (24 * 60)) / 60);
                    const minutes = totalRuntimeMinutes % 60;

                    // Calculate remaining episodes
                    const remainingEpisodes = totalEpisodes - watchedCount;

                    // Calculate average rating
                    const ratings = watchedEpisodes
                        .map((ep: Episode) => ep.rating)
                        .filter((r: number | null) => r !== null) as number[];
                    const avgRating = ratings.length > 0
                        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                        : "N/A";

                    setShowDetails({
                        masteryPercentage,
                        watchedCount,
                        totalEpisodes,
                        remainingEpisodes,
                        totalRuntime: { days, hours, minutes },
                        avgRating,
                        episodesBySeason,
                    });
                }

            } catch (error) {
                console.error("Error fetching show details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchShowDetails();
    }, [show, navigate]);

    const toggleSeason = (seasonNumber: number) => {
        const newExpanded = new Set(expandedSeasons);
        if (newExpanded.has(seasonNumber)) {
            newExpanded.delete(seasonNumber);
        } else {
            newExpanded.add(seasonNumber);
        }
        setExpandedSeasons(newExpanded);
    };

    const handleSync = async () => {
        try {
            const traktId = showData?.ids?.trakt || show?.ids?.trakt || show?.show?.ids?.trakt;
            if (!traktId) {
                alert("Unable to get show ID for sync");
                return;
            }

            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/update-show/?trakt_id=${traktId}`)
            );

            if (response.ok) {
                await response.json(); // Response consumed but data not needed
                alert("Show sync started in the background. The page will refresh shortly...");
                // Wait a bit for the sync to process, then reload
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                alert(`Failed to sync show: ${errorData.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error syncing show:", error);
            alert("Failed to sync show");
        }
    };

    if (!showData || loading) {
        return (
            <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115" }}>
                <SideBar activeItem="Movies" />
                <Box component="main" sx={{ flexGrow: 1, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {loading ? (
                        <CircularProgress sx={{ color: "#ed1c24" }} />
                    ) : (
                        <Typography sx={{ color: "#fff" }}>Show not found</Typography>
                    )}
                </Box>
            </Box>
        );
    }

    const masteryPercentage = showDetails?.masteryPercentage || 0;
    const watchedCount = showDetails?.watchedCount || 0;
    const totalEpisodes = showDetails?.totalEpisodes || 0;
    const remainingEpisodes = showDetails?.remainingEpisodes || 0;
    const totalRuntime = showDetails?.totalRuntime || { days: 0, hours: 0, minutes: 0 };
    const avgRating = showDetails?.avgRating || "N/A";
    const episodesBySeason = showDetails?.episodesBySeason || {};

    // Get seasons sorted by season number
    const seasons = seasonsData?.seasons || [];
    const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number);

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115" }}>
            <SideBar activeItem="Movies" />
            <Box component="main" sx={{ flexGrow: 1, backgroundColor: "#0f1115" }}>
                <Container maxWidth="xl" sx={{ padding: 3 }}>
                    {/* Back Button */}
                    <Box sx={{ mb: 3 }}>
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
                                height: 320,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                                backgroundImage: showData.image_url
                                    ? `linear-gradient(0deg, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.2) 60%), url(${showData.image_url})`
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
                                    <Box>
                                        <Chip
                                            label="Currently Watching"
                                            sx={{
                                                backgroundColor: "#ed1c24",
                                                color: "#fff",
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.1em",
                                                mb: 1,
                                                height: 20,
                                            }}
                                        />
                                        <Typography
                                            variant="h3"
                                            sx={{
                                                color: "#fff",
                                                fontSize: "3rem",
                                                fontWeight: 800,
                                                letterSpacing: "-0.02em",
                                            }}
                                        >
                                            {showData.title}
                                        </Typography>
                                        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mt: 0.5 }}>
                                            <Typography sx={{ color: "#b99d9d", fontWeight: 500 }}>
                                                {showData.year}
                                            </Typography>
                                            {showMetadata?.genres && showMetadata.genres.length > 0 && (
                                                <>
                                                    <Typography sx={{ color: "#6b7280" }}>•</Typography>
                                                    <Typography sx={{ color: "#b99d9d", fontWeight: 500 }}>
                                                        {showMetadata.genres.slice(0, 2).join(", ")}
                                                    </Typography>
                                                </>
                                            )}
                                            {showMetadata?.air_day && (
                                                <>
                                                    <Typography sx={{ color: "#6b7280" }}>•</Typography>
                                                    <Typography sx={{ color: "#b99d9d", fontWeight: 500 }}>
                                                        {showMetadata.air_time
                                                            ? `Airs ${showMetadata.air_day}s at ${showMetadata.air_time}`
                                                            : `Airs ${showMetadata.air_day}s`}
                                                    </Typography>
                                                </>
                                            )}
                                            {showMetadata?.status && (
                                                <>
                                                    <Typography sx={{ color: "#6b7280" }}>•</Typography>
                                                    <Chip
                                                        label={showMetadata.status === "ended" ? "Ended" : showMetadata.status === "returning series" ? "Ongoing" : showMetadata.status}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: "10px",
                                                            fontWeight: 600,
                                                            backgroundColor: showMetadata.status === "ended"
                                                                ? "rgba(107, 114, 128, 0.3)"
                                                                : "rgba(237, 28, 36, 0.2)",
                                                            color: showMetadata.status === "ended" ? "#9ca3af" : "#ed1c24",
                                                            border: `1px solid ${showMetadata.status === "ended" ? "rgba(107, 114, 128, 0.5)" : "rgba(237, 28, 36, 0.3)"}`,
                                                        }}
                                                    />
                                                </>
                                            )}
                                            <Typography sx={{ color: "#6b7280" }}>•</Typography>
                                            <Typography sx={{ color: "#b99d9d", fontWeight: 500 }}>
                                                {sortedSeasons.length} Season{sortedSeasons.length !== 1 ? "s" : ""}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ textAlign: "right" }}>
                                        <Typography
                                            sx={{
                                                color: "#ed1c24",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.1em",
                                            }}
                                        >
                                            Mastery Status
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: "3rem",
                                                fontWeight: 900,
                                                color: "#fff",
                                            }}
                                        >
                                            {masteryPercentage}%
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Progress Bar */}
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={masteryPercentage}
                                        sx={{
                                            height: 12,
                                            borderRadius: "9999px",
                                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                                            "& .MuiLinearProgress-bar": {
                                                backgroundColor: "#ed1c24",
                                                boxShadow: "0 0 15px rgba(237, 28, 36, 0.5)",
                                            },
                                        }}
                                    />
                                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: "#b99d9d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        <span>{watchedCount} of {totalEpisodes} Episodes Watched</span>
                                        <span>{remainingEpisodes} Episodes to Diamond Completion</span>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Left Column: Stats and Seasons */}
                        <Grid size={{ xs: 12, lg: 8 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {/* Stats Section */}
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <Card
                                            sx={{
                                                backgroundColor: "rgba(34, 16, 17, 0.6)",
                                                backdropFilter: "blur(12px)",
                                                border: "1px solid rgba(238, 32, 39, 0.1)",
                                                borderRadius: 3,
                                                p: 3,
                                            }}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                                <ScheduleIcon sx={{ color: "#ed1c24", fontSize: 20 }} />
                                                <Typography sx={{ color: "#b99d9d", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                                    Total Runtime
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                                                {totalRuntime.days > 0 && `${totalRuntime.days}d `}
                                                {totalRuntime.hours}h {totalRuntime.minutes}m
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <Card
                                            sx={{
                                                backgroundColor: "rgba(34, 16, 17, 0.6)",
                                                backdropFilter: "blur(12px)",
                                                border: "1px solid rgba(238, 32, 39, 0.1)",
                                                borderRadius: 3,
                                                p: 3,
                                            }}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                                <MovieFilterIcon sx={{ color: "#ed1c24", fontSize: 20 }} />
                                                <Typography sx={{ color: "#b99d9d", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                                    Remaining
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                                                {remainingEpisodes} Episodes
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <Card
                                            sx={{
                                                backgroundColor: "rgba(34, 16, 17, 0.6)",
                                                backdropFilter: "blur(12px)",
                                                border: "1px solid rgba(238, 32, 39, 0.1)",
                                                borderRadius: 3,
                                                p: 3,
                                            }}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                                <StarIcon sx={{ color: "#ed1c24", fontSize: 20 }} />
                                                <Typography sx={{ color: "#b99d9d", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                                    Your vs Global
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                                                {avgRating} <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "rgba(255, 255, 255, 0.5)" }}>/ 8.9</span>
                                            </Typography>
                                        </Card>
                                    </Grid>
                                </Grid>

                                {/* Seasons List */}
                                <SeasonProgress
                                    seasons={sortedSeasons}
                                    episodesBySeason={episodesBySeason}
                                    expandedSeasons={expandedSeasons}
                                    onToggleSeason={toggleSeason}
                                />
                            </Box>
                        </Grid>

                        {/* Right Column: Milestones */}
                        <Grid size={{ xs: 12, lg: 4 }}>
                            <MilestonesSidebar
                                masteryPercentage={masteryPercentage}
                                watchedCount={watchedCount}
                                totalEpisodes={totalEpisodes}
                                onSync={handleSync}
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </Box>
    );
}

export default ShowDetails;
