import { Box, Card, CardContent, Typography, IconButton, Button, CircularProgress } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SyncIcon from "@mui/icons-material/Sync";
import MovieIcon from "@mui/icons-material/Movie";
import TvIcon from "@mui/icons-material/Tv";
import { useState } from "react";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";

interface ProfileSidebarProps {
    stats: any;
    onSyncComplete?: () => void;
}

function ProfileSidebar({ stats, onSyncComplete }: ProfileSidebarProps) {
    const [syncingMovies, setSyncingMovies] = useState(false);
    const [syncingShows, setSyncingShows] = useState(false);

    const handleSyncMovies = async () => {
        try {
            setSyncingMovies(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/fetch-latest-movies/`)
            );

            if (response.ok) {
                const data = await response.json();
                console.log("Movie sync started:", data);
                // Show success message
                alert("Movie sync started in the background. The dashboard will refresh shortly.");
                // Wait a bit for background sync to start, then refresh dashboard
                setTimeout(() => {
                    if (onSyncComplete) {
                        onSyncComplete();
                    }
                }, 2000); // Wait 2 seconds before refreshing
            } else {
                const error = await response.json();
                console.error("Error syncing movies:", error);
                alert(error.error || "Failed to sync movies");
            }
        } catch (error) {
            console.error("Error syncing movies:", error);
            alert("Failed to sync movies. Please try again.");
        } finally {
            setSyncingMovies(false);
        }
    };

    const handleSyncShows = async () => {
        try {
            setSyncingShows(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/fetch-latest-shows/`)
            );

            if (response.ok) {
                const data = await response.json();
                console.log("Show sync started:", data);
                // Show success message
                alert("Show sync started in the background. This may take a few minutes. The dashboard will refresh shortly.");
                // Wait a bit for background sync to start, then refresh dashboard
                setTimeout(() => {
                    if (onSyncComplete) {
                        onSyncComplete();
                    }
                }, 3000); // Wait 3 seconds before refreshing (shows take longer)
            } else {
                const error = await response.json();
                console.error("Error syncing shows:", error);
                alert(error.error || "Failed to sync shows");
            }
        } catch (error) {
            console.error("Error syncing shows:", error);
            alert("Failed to sync shows. Please try again.");
        } finally {
            setSyncingShows(false);
        }
    };

    if (!stats) return null;

    return (
        <Card sx={{
            backgroundColor: "#1a1d23",
            border: "1px solid #2a2e37",
            borderRadius: 3,
        }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                        }}
                    >
                        Trakt Profile
                    </Typography>
                    <IconButton size="small" sx={{ color: "#ed1c24" }}>
                        <SettingsIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            border: "2px solid #ed1c24",
                            p: 0.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#27272a",
                        }}
                    >
                        <Typography sx={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>
                            {stats.username?.charAt(0).toUpperCase() || "U"}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>
                            {stats.username || "User"}
                        </Typography>
                        <Typography sx={{ fontSize: "12px", color: "#9ca3af" }}>
                            Trakt VIP since 2021
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 1,
                    mb: 2,
                }}>
                    <Box sx={{
                        backgroundColor: "#27272a",
                        p: 1.5,
                        borderRadius: 2,
                        textAlign: "center",
                    }}>
                        <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>
                            {stats.total_plays || 0}
                        </Typography>
                        <Typography sx={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase" }}>
                            Plays
                        </Typography>
                    </Box>
                    <Box sx={{
                        backgroundColor: "#27272a",
                        p: 1.5,
                        borderRadius: 2,
                        textAlign: "center",
                    }}>
                        <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>
                            {stats.total_movies || 0}
                        </Typography>
                        <Typography sx={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase" }}>
                            Movies
                        </Typography>
                    </Box>
                    <Box sx={{
                        backgroundColor: "#27272a",
                        p: 1.5,
                        borderRadius: 2,
                        textAlign: "center",
                    }}>
                        <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>
                            {stats.total_shows || 0}
                        </Typography>
                        <Typography sx={{ fontSize: "9px", color: "#9ca3af", textTransform: "uppercase" }}>
                            Shows
                        </Typography>
                    </Box>
                </Box>

                {/* Sync Buttons */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={syncingMovies ? <CircularProgress size={14} sx={{ color: "#ed1c24" }} /> : <MovieIcon />}
                        onClick={handleSyncMovies}
                        disabled={syncingMovies || syncingShows}
                        sx={{
                            borderColor: "#2a2e37",
                            color: "#fff",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            py: 1,
                            "&:hover": {
                                borderColor: "#ed1c24",
                                backgroundColor: "rgba(237, 28, 36, 0.1)",
                            },
                            "&:disabled": {
                                borderColor: "#2a2e37",
                                color: "#6b7280",
                            },
                        }}
                    >
                        {syncingMovies ? "Syncing..." : "Sync Movies"}
                    </Button>
                    <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={syncingShows ? <CircularProgress size={14} sx={{ color: "#ed1c24" }} /> : <TvIcon />}
                        onClick={handleSyncShows}
                        disabled={syncingMovies || syncingShows}
                        sx={{
                            borderColor: "#2a2e37",
                            color: "#fff",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            py: 1,
                            "&:hover": {
                                borderColor: "#ed1c24",
                                backgroundColor: "rgba(237, 28, 36, 0.1)",
                            },
                            "&:disabled": {
                                borderColor: "#2a2e37",
                                color: "#6b7280",
                            },
                        }}
                    >
                        {syncingShows ? "Syncing..." : "Sync Shows"}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}

export default ProfileSidebar;
