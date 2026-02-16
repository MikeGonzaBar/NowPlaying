import { Box, Card, CardContent, Typography, IconButton, Chip } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Movie, Show } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";

interface LastScrobbledProps {
    movies: Movie[];
    shows: Show[];
}

interface ShowProgress {
    [traktId: string]: {
        progress: number;
        lastEpisode: string;
    };
}

function LastScrobbled({ movies, shows }: LastScrobbledProps) {
    const navigate = useNavigate();
    const [showProgress, setShowProgress] = useState<ShowProgress>({});

    // Combine and sort by last_watched_at
    const allMedia = [
        ...movies.map(m => ({ ...m, type: 'movie' as const })),
        ...shows.map(s => ({ ...s, type: 'show' as const }))
    ].sort((a, b) => {
        const aDate = new Date(a.last_watched_at || 0).getTime();
        const bDate = new Date(b.last_watched_at || 0).getTime();
        return bDate - aDate;
    }).slice(0, 5);

    const handleCardClick = (media: any) => {
        if (media.type === 'show') {
            navigate("/showDetails", {
                state: {
                    show: {
                        id: media.show?.id,
                        title: media.show?.title,
                        year: media.show?.year,
                        image_url: media.show?.image_url,
                        ids: media.show?.ids,
                    },
                },
            });
        } else {
            navigate("/movieDetails", {
                state: {
                    media: media,
                    mediaType: media.type,
                },
            });
        }
    };

    const getPosterUrl = (media: any) => {
        if (media.type === 'movie') {
            // Use image_url if available (from Trakt), otherwise try TMDB
            if (media.movie?.image_url) {
                return media.movie.image_url;
            }
            console.log("No movie image_url found, returning null");
            // Note: Direct TMDB poster URLs require the poster_path from API, not just the ID
            // For now, return null and show placeholder
            return null;
        } else {
            const url = media.show?.image_url || null;
            return url;
        }
    };

    const getTitle = (media: any) => {
        return media.type === 'movie' ? media.movie?.title : media.show?.title;
    };

    const getTimeAgo = (dateString: string | null) => {
        if (!dateString) return "Unknown";
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return "Unknown";
        }
    };

    // Fetch progress for shows
    useEffect(() => {
        const fetchShowProgress = async () => {
            const progressMap: ShowProgress = {};

            for (const show of shows) {
                const traktId = show.show?.ids?.trakt;
                if (traktId) {
                    try {
                        const response = await authenticatedFetch(
                            getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/get-watched-seasons-episodes/?trakt_id=${traktId}`)
                        );
                        if (response.ok) {
                            const data = await response.json();
                            const episodes = data.episodes || [];
                            if (episodes.length > 0) {
                                // Find the last watched episode
                                const lastEpisode = episodes.sort((a: any, b: any) =>
                                    new Date(b.last_watched_at || 0).getTime() - new Date(a.last_watched_at || 0).getTime()
                                )[0];

                                // Calculate progress (simplified - would need total episodes for accurate percentage)
                                progressMap[traktId] = {
                                    progress: 100, // Simplified - would need total episodes
                                    lastEpisode: `S${lastEpisode.season__season_number}E${lastEpisode.episode_number}`,
                                };
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching progress for show ${traktId}:`, error);
                    }
                }
            }

            setShowProgress(progressMap);
        };

        if (shows.length > 0) {
            fetchShowProgress();
        }
    }, [shows]);

    return (
        <Card sx={{
            backgroundColor: "#1a1d23",
            border: "1px solid #2a2e37",
            borderRadius: 3,
            position: "relative",
            overflow: "hidden",
        }}>
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: "linear-gradient(180deg, rgba(237, 28, 36, 0.2) 0%, rgba(15, 17, 21, 0) 100%)",
                }}
            />
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <HistoryIcon sx={{ color: "#ed1c24", fontSize: 24 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: "#fff" }}>
                            Last Scrobbled
                        </Typography>
                    </Box>
                    <Typography
                        variant="caption"
                        onClick={() => navigate("/history")}
                        sx={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            px: 1.5,
                            py: 0.5,
                            backgroundColor: "#27272a",
                            borderRadius: 1,
                            cursor: "pointer",
                            transition: "color 0.2s",
                            "&:hover": { color: "#ed1c24" },
                        }}
                    >
                        Full History
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2 }}>
                    {allMedia.length > 0 ? allMedia.map((media, index) => {
                        const posterUrl = getPosterUrl(media);
                        const title = getTitle(media);
                        const isShow = media.type === 'show';
                        const show = isShow ? media.show : null;

                        return (
                            <Box
                                key={index}
                                onClick={() => handleCardClick(media)}
                                sx={{
                                    minWidth: 160,
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
                                    {posterUrl ? (
                                        <Box
                                            component="img"
                                            src={posterUrl}
                                            alt={title}
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

                                    {/* Progress bar for shows */}
                                    {isShow && show && showProgress[show.ids?.trakt] && (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: "6px",
                                                backgroundColor: "#1f2937",
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    height: "100%",
                                                    width: `${showProgress[show.ids.trakt].progress}%`,
                                                    backgroundColor: "#ed1c24",
                                                }}
                                            />
                                        </Box>
                                    )}

                                    {/* Scrobbled badge */}
                                    <Chip
                                        icon={<CheckCircleIcon sx={{ fontSize: 12, color: "#ed1c24" }} />}
                                        label="Scrobbled"
                                        size="small"
                                        sx={{
                                            position: "absolute",
                                            top: 8,
                                            left: 8,
                                            backgroundColor: "rgba(0, 0, 0, 0.6)",
                                            backdropFilter: "blur(8px)",
                                            color: "#fff",
                                            fontSize: "10px",
                                            height: 20,
                                            "& .MuiChip-label": { px: 1 },
                                        }}
                                    />
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
                                    {title}
                                </Typography>

                                {isShow && show && showProgress[show.ids?.trakt] && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            color: "#ed1c24",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {showProgress[show.ids.trakt].lastEpisode}
                                    </Typography>
                                )}

                                {!isShow && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: "12px",
                                            color: "#9ca3af",
                                        }}
                                    >
                                        {getTimeAgo(media.last_watched_at)}
                                    </Typography>
                                )}
                            </Box>
                        );
                    }) : (
                        <Typography variant="body2" sx={{ color: "#9ca3af", textAlign: "center", py: 4 }}>
                            No recent scrobbles
                        </Typography>
                    )}

                    <Box sx={{ minWidth: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconButton
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                backgroundColor: "#27272a",
                                border: "1px solid #2a2e37",
                                color: "#9ca3af",
                                "&:hover": {
                                    backgroundColor: "#ed1c24",
                                    color: "#fff",
                                },
                            }}
                        >
                            <ArrowForwardIcon />
                        </IconButton>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default LastScrobbled;
