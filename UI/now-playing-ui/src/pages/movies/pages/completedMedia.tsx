import { Box, Container, Grid, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SideBar from "../../../components/sideBar";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import { formatDistanceToNow } from "date-fns";

interface CompletedItem {
    id: number;
    title: string;
    year: number | null;
    image_url: string | null;
    trakt_id: string;
    tmdb_id: string | null;
    last_watched_at: string | null;
    type: 'show' | 'movie';
}

function CompletedMedia() {
    const navigate = useNavigate();
    const [completedShows, setCompletedShows] = useState<CompletedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompletedMedia();
    }, []);

    const fetchCompletedMedia = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/completed-media/`)
            );

            if (response.ok) {
                const data = await response.json();
                const shows = (data.completed_shows || []).map((s: any) => ({ ...s, type: 'show' as const }));

                // Sort by last_watched_at (most recent first)
                shows.sort((a: CompletedItem, b: CompletedItem) => {
                    const aDate = a.last_watched_at ? new Date(a.last_watched_at).getTime() : 0;
                    const bDate = b.last_watched_at ? new Date(b.last_watched_at).getTime() : 0;
                    return bDate - aDate;
                });

                setCompletedShows(shows);
            }
        } catch (error) {
            console.warn("[COMPLETED_MEDIA] Error fetching completed media:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClick = (item: CompletedItem) => {
        navigate("/showDetails", {
            state: {
                show: {
                    id: item.id,
                    title: item.title,
                    year: item.year,
                    image_url: item.image_url,
                    ids: { trakt: item.trakt_id, tmdb: item.tmdb_id },
                },
            },
        });
    };

    const getTimeAgo = (dateString: string | null) => {
        if (!dateString) return "Unknown";
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return "Unknown";
        }
    };

    // Only shows, already sorted by most recent first
    const allItems = completedShows;

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115" }}>
            <SideBar activeItem="Movies" />
            <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
                    {/* Back Button */}
                    <Box sx={{ mb: 3 }}>
                        <IconButton
                            onClick={() => navigate("/movies")}
                            sx={{
                                color: "#9ca3af",
                                "&:hover": {
                                    color: "#ed1c24",
                                    backgroundColor: "rgba(237, 28, 36, 0.1)",
                                },
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    </Box>

                    {/* Header */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 4 }}>
                        <VerifiedIcon sx={{ color: "#ed1c24", fontSize: 32 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "#fff" }}>
                            100% Completed Shows
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#6b7280", ml: 2 }}>
                            {allItems.length} shows
                        </Typography>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                            <Typography sx={{ color: "#6b7280" }}>Loading completed media...</Typography>
                        </Box>
                    ) : allItems.length === 0 ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                            <Typography sx={{ color: "#6b7280" }}>No completed media found</Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {allItems.map((item, index) => (
                                <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={`${item.type}-${item.id}-${index}`}>
                                    <Box
                                        onClick={() => handleClick(item)}
                                        sx={{
                                            cursor: "pointer",
                                            "&:hover .poster": {
                                                transform: "scale(1.05)",
                                            },
                                        }}
                                    >
                                        <Box
                                            className="poster"
                                            sx={{
                                                position: "relative",
                                                aspectRatio: "2/3",
                                                borderRadius: 2,
                                                overflow: "hidden",
                                                mb: 1,
                                                border: "1px solid #2a2e37",
                                                transition: "transform 0.3s",
                                                backgroundColor: "#27272a",
                                            }}
                                        >
                                            {item.image_url ? (
                                                <Box
                                                    component="img"
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    sx={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            ) : (
                                                <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <Typography variant="caption" sx={{ color: "#6b7280" }}>No Image</Typography>
                                                </Box>
                                            )}

                                            <Box
                                                className="poster-overlay"
                                                sx={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    backgroundColor: "rgba(237, 28, 36, 0.2)",
                                                    opacity: 0,
                                                    transition: "opacity 0.3s",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    "&:hover": {
                                                        opacity: 1,
                                                    },
                                                }}
                                            >
                                                <WorkspacePremiumIcon sx={{ fontSize: 48, color: "#fff" }} />
                                            </Box>
                                        </Box>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontSize: "14px",
                                                fontWeight: 600,
                                                color: "#fff",
                                                mb: 0.5,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {item.title}
                                        </Typography>

                                        {item.last_watched_at && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontSize: "10px",
                                                    color: "#6b7280",
                                                }}
                                            >
                                                {getTimeAgo(item.last_watched_at)}
                                            </Typography>
                                        )}
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Container>
            </Box>
        </Box>
    );
}

export default CompletedMedia;
