import { Box, Container, Grid, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import SideBar from "../../../components/sideBar";
import LastScrobbled from "../components/LastScrobbled";
import ActivityFeed from "../components/ActivityFeed";
import CompletedSection from "../components/CompletedSection";
import ProfileSidebar from "../components/ProfileSidebar";
import RatingComparison from "../components/RatingComparison";
import TrendingSection from "../components/TrendingSection";
import MediaSearch from "../components/MediaSearch";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";

interface DashboardData {
    recentMovies: any[];
    recentShows: any[];
    activities: any[];
    completedShows: any[];
    completedMovies: any[];
    profileStats: any;
    ratingComparison: any;
    trending: any;
}

function MoviesDashboard() {
    const [data, setData] = useState<DashboardData>({
        recentMovies: [],
        recentShows: [],
        activities: [],
        completedShows: [],
        completedMovies: [],
        profileStats: null,
        ratingComparison: null,
        trending: null,
    });
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Use only existing, stable endpoints from the API
            const [moviesRes, showsRes, completedRes] = await Promise.all([
                authenticatedFetch(
                    getApiUrl(
                        `${API_CONFIG.TRAKT_ENDPOINT}/get-stored-movies/?page=1&page_size=10`
                    )
                ),
                authenticatedFetch(
                    getApiUrl(
                        `${API_CONFIG.TRAKT_ENDPOINT}/get-stored-shows/?page=1&page_size=10`
                    )
                ),
                authenticatedFetch(
                    getApiUrl(
                        `${API_CONFIG.TRAKT_ENDPOINT}/completed-media/`
                    )
                ),
            ]);

            const moviesData = moviesRes.ok ? await moviesRes.json() : { movies: [] };
            const showsData = showsRes.ok ? await showsRes.json() : { shows: [] };
            const completedData = completedRes.ok ? await completedRes.json() : { completed_shows: [], completed_movies: [] };

            const recentMovies = moviesData.movies || [];
            const recentShows = showsData.shows || [];
            const completedShows = completedData.completed_shows || [];
            const completedMovies = completedData.completed_movies || [];

            // Simple derived \"activity\" based on recent watches so the section isn't empty
            const activities = [
                ...recentMovies.slice(0, 3).map((m: any) => ({
                    type: "check_in",
                    media_type: "movie",
                    title: m.movie?.title,
                    image_url: undefined,
                    timestamp: m.last_watched_at,
                    description: `Check-in: \"${m.movie?.title}\"`,
                })),
                ...recentShows.slice(0, 3).map((s: any) => ({
                    type: "check_in",
                    media_type: "show",
                    title: s.show?.title,
                    episode: undefined,
                    episode_title: undefined,
                    image_url: s.show?.image_url,
                    timestamp: s.last_watched_at,
                    description: `Watching: \"${s.show?.title}\"`,
                })),
            ];

            // Basic profile stats derived from stored movies/shows
            const profileStats = {
                total_movies: moviesData.total_items || recentMovies.length,
                total_shows: showsData.total_items || recentShows.length,
                total_plays: recentMovies.reduce(
                    (sum: number, m: any) => sum + (m.plays || 0),
                    0
                ),
                username: "", // filled from JWT/user info elsewhere in the app
            };

            setData({
                recentMovies,
                recentShows,
                activities,
                // Use actual completed media from backend endpoint
                completedShows,
                completedMovies,
                profileStats,
                // Rating comparison and trending use their own internal fallbacks
                ratingComparison: null,
                trending: null,
            });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115" }}>
                <SideBar activeItem="Movies" />
                <Box component="main" sx={{ flexGrow: 1, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography sx={{ color: "#fff" }}>Loading dashboard...</Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115" }}>
            <SideBar activeItem="Movies" />
            <Box component="main" sx={{ flexGrow: 1, padding: 3, backgroundColor: "#0f1115" }}>
                <Container maxWidth="xl" sx={{ padding: 0 }}>
                    <Grid container spacing={3}>
                        {/* Main Content */}
                        <Grid size={{ xs: 12, lg: 9 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <MediaSearch />
                                <LastScrobbled movies={data.recentMovies} shows={data.recentShows} />
                                <ActivityFeed activities={data.activities} />
                                <CompletedSection
                                    shows={data.completedShows.slice(0, 6)}
                                    movies={[]}
                                />
                            </Box>
                        </Grid>

                        {/* Sidebar */}
                        <Grid size={{ xs: 12, lg: 3 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <ProfileSidebar stats={data.profileStats} onSyncComplete={fetchDashboardData} />
                                <RatingComparison comparison={data.ratingComparison} />
                                <TrendingSection trending={data.trending} />
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </Box>
    );
}

export default MoviesDashboard;
