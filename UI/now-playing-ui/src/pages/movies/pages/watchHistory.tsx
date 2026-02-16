import { useNavigate } from "react-router-dom";
import { Box, Container, Grid, Typography, Button, Card, LinearProgress, CircularProgress, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FilterListIcon from "@mui/icons-material/FilterList";
import GridViewIcon from "@mui/icons-material/GridView";
import CategoryIcon from "@mui/icons-material/Category";
import PersonIcon from "@mui/icons-material/Person";
import DownloadIcon from "@mui/icons-material/Download";
import { useEffect, useState, useMemo } from "react";
import SideBar from "../../../components/sideBar";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import { format, isToday, isYesterday, parseISO } from "date-fns";

interface HistoryItem {
    type: "movie" | "episode";
    id: number;
    watched_at: string | null;
    title: string;
    image_url: string | null;
    year: number | null;
    runtime: number | null;
    rating: number | null;
    trakt_id: string;
    tmdb_id: string | null;
    genres: string[];
    episode_info?: {
        season_number: number;
        episode_number: number;
        episode_title: string | null;
    };
}

interface WatchHistoryResponse {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    history: HistoryItem[];
}

function WatchHistory() {
    const navigate = useNavigate();
    const [historyData, setHistoryData] = useState<WatchHistoryResponse | null>(null);
    const [allHistoryItems, setAllHistoryItems] = useState<HistoryItem[]>([]); // Accumulated items
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filterType, setFilterType] = useState<"all" | "movies" | "shows">("all");
    const [page, setPage] = useState(1);
    const [movieGenres, setMovieGenres] = useState<Record<string, string[]>>({});
    const [topGenres, setTopGenres] = useState<Array<{ name: string; percentage: number }>>([]);
    const [heatmapData, setHeatmapData] = useState<Array<{ date: string; count: number }>>([]);

    const fetchHistory = async (pageNum: number, isInitial: boolean) => {
        try {
            if (isInitial) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/watch-history/?type=${filterType}&page=${pageNum}&page_size=20`)
            );

            if (response.ok) {
                const data = await response.json();

                // Check for duplicates in the response
                const historyIds = data.history?.map((item: HistoryItem) => `${item.type}-${item.id}-${item.watched_at}`) || [];
                const uniqueIds = new Set(historyIds);
                if (historyIds.length !== uniqueIds.size) {
                    console.warn("[WATCH_HISTORY] DUPLICATES DETECTED IN API RESPONSE!", {
                        total_items: historyIds.length,
                        unique_items: uniqueIds.size,
                        duplicates: historyIds.length - uniqueIds.size,
                    });

                    // Find duplicate IDs
                    const idCounts: Record<string, number> = {};
                    historyIds.forEach((id: string) => {
                        idCounts[id] = (idCounts[id] || 0) + 1;
                    });
                    const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
                    console.warn("[WATCH_HISTORY] Duplicate IDs:", duplicateIds.slice(0, 10));
                }

                // Update history data (for pagination info)
                setHistoryData(data);

                // Accumulate history items with deduplication
                if (isInitial) {
                    setAllHistoryItems(data.history || []);
                } else {
                    setAllHistoryItems((prev) => {
                        // Create a Set of existing item IDs for quick lookup
                        const existingIds = new Set(prev.map((item: HistoryItem) => `${item.type}-${item.id}`));

                        // Filter out items that already exist
                        const newItems = (data.history || []).filter(
                            (item: HistoryItem) => !existingIds.has(`${item.type}-${item.id}`)
                        );

                        if (newItems.length < (data.history || []).length) {
                            console.warn(`[WATCH_HISTORY] Filtered out ${(data.history || []).length - newItems.length} duplicate items when loading page ${pageNum}`);
                        }

                        return [...prev, ...newItems];
                    });
                }

                // Fetch genres for movies from TMDB
                const moviesToFetch = data.history.filter((item: HistoryItem) => item.type === "movie" && item.tmdb_id);
                const genresMap: Record<string, string[]> = {};

                for (const movie of moviesToFetch.slice(0, 10)) { // Limit to avoid too many API calls
                    if (movie.tmdb_id && !genresMap[movie.tmdb_id]) {
                        try {
                            const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
                            const tmdbRes = await fetch(
                                `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${apiKey}`
                            );
                            if (tmdbRes.ok) {
                                const tmdbData = await tmdbRes.json();
                                genresMap[movie.tmdb_id] = tmdbData.genres?.map((g: any) => g.name) || [];
                            }
                        } catch (e) {
                            console.error(`Error fetching genres for movie ${movie.tmdb_id}:`, e);
                        }
                    }
                }
                setMovieGenres((prev) => {
                    const updated = { ...prev, ...genresMap };
                    return updated;
                });

                // Top genres are fetched from backend endpoint which uses ALL stored data
                // No need to calculate from visible items here
            }
        } catch (error) {
            console.error("Error fetching watch history:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        // Reset when filter changes
        setPage(1);
        setAllHistoryItems([]);
        fetchHistory(1, true);
        fetchActivityHeatmap();
        fetchTopGenres();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType]);

    useEffect(() => {
        // Load more when page changes (but not on initial load)
        if (page > 1) {
            fetchHistory(page, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Fetch heatmap and genres on initial load
    useEffect(() => {
        fetchActivityHeatmap();
        fetchTopGenres();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Top genres are now fetched from backend endpoint which uses ALL stored data
    // Removed calculateTopGenres() function - using backend data instead

    const fetchActivityHeatmap = async () => {
        try {
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/activity-heatmap/`)
            );

            if (!response.ok) {
                console.warn("[WATCH_HISTORY] Failed to fetch activity heatmap:", response.status, response.statusText);
                return;
            }

            const data = await response.json();
            if (!data || !Array.isArray(data.activity)) {
                console.warn("[WATCH_HISTORY] Invalid activity heatmap response:", data);
                return;
            }

            setHeatmapData(data.activity || []);
        } catch (error) {
            console.warn("[WATCH_HISTORY] Error fetching activity heatmap:", error);
        }
    };

    const fetchTopGenres = async () => {
        try {
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/top-genres/`)
            );

            if (!response.ok) {
                console.warn("[WATCH_HISTORY] Failed to fetch top genres:", response.status, response.statusText);
                return;
            }

            const data = await response.json();
            if (!data || !Array.isArray(data.genres)) {
                console.warn("[WATCH_HISTORY] Invalid top genres response:", data);
                return;
            }

            setTopGenres(data.genres || []);
        } catch (error) {
            console.warn("[WATCH_HISTORY] Error fetching top genres:", error);
        }
    };

    const formatTime = (dateString: string | null) => {
        if (!dateString) return "Unknown";
        try {
            const date = parseISO(dateString);
            return format(date, "h:mm a");
        } catch {
            return dateString;
        }
    };

    const formatDuration = (runtime: number | null) => {
        if (!runtime) return "N/A";
        const hours = Math.floor(runtime / 60);
        const minutes = runtime % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const groupByDate = (items: HistoryItem[]) => {
        const groups: Record<string, HistoryItem[]> = {};

        items.forEach((item) => {
            if (!item.watched_at) return;

            try {
                const date = parseISO(item.watched_at);
                let key: string;

                if (isToday(date)) {
                    key = "today";
                } else if (isYesterday(date)) {
                    key = "yesterday";
                } else {
                    key = format(date, "MMMM d, yyyy");
                }

                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(item);
            } catch {
                // Skip invalid dates
            }
        });

        return groups;
    };

    const handleItemClick = (item: HistoryItem) => {
        if (item.type === "movie") {
            navigate("/movieDetails", {
                state: {
                    media: { movie: { ...item, ids: { trakt: item.trakt_id, tmdb: item.tmdb_id } } },
                    mediaType: "movie",
                },
            });
        } else {
            navigate("/showDetails", {
                state: {
                    show: {
                        id: 0,
                        title: item.title,
                        year: item.year,
                        image_url: item.image_url,
                        ids: { trakt: item.trakt_id, tmdb: item.tmdb_id },
                    },
                },
            });
        }
    };

    // Memoize grouped history to prevent re-rendering on every component update
    const groupedHistory = useMemo(() => {
        if (!allHistoryItems || allHistoryItems.length === 0) return {};
        return groupByDate(allHistoryItems);
    }, [allHistoryItems]);

    // Infinite scroll handler
    useEffect(() => {
        const handleScroll = () => {
            // Check if we're near the bottom of the page
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            // Load more when user is within 200px of the bottom
            if (scrollTop + windowHeight >= documentHeight - 200) {
                if (
                    historyData &&
                    page < historyData.total_pages &&
                    !loading &&
                    !loadingMore
                ) {
                    console.log("[WATCH_HISTORY] Loading more items, page:", page + 1);
                    setPage(page + 1);
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [historyData, page, loading, loadingMore]);

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#0f1115" }}>
            <SideBar activeItem="Movies" />
            <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>

                {/* Main Content */}
                <Container maxWidth="xl" sx={{ py: 3, flex: 1 }}>
                    {/* Back Button */}
                    <Box sx={{ mb: 2 }}>
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

                    {/* Title and Stats */}
                    <Box sx={{ mb: 4 }}>
                        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: { md: "flex-end" }, gap: 2 }}>
                            <Box>
                                <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, color: "#fff", mb: 0.5 }}>
                                    Watch History
                                </Typography>
                                <Typography component="div" sx={{ color: "#9ca3af", fontSize: "0.875rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    <Box component="span" sx={{ color: "#ed1c24", fontWeight: 700 }}>
                                        {historyData?.total_items || 0}
                                    </Box>{" "}
                                    Total Plays scrobbled
                                </Typography>
                            </Box>
                            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                                <Box sx={{ display: "flex", backgroundColor: "rgba(26, 29, 35, 0.8)", border: "1px solid #2a2e37", borderRadius: 2, p: 0.5 }}>
                                    <Button
                                        onClick={() => setFilterType("all")}
                                        sx={{
                                            px: 2,
                                            py: 0.75,
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            backgroundColor: filterType === "all" ? "#ed1c24" : "transparent",
                                            color: filterType === "all" ? "#fff" : "#9ca3af",
                                            borderRadius: 1,
                                            textTransform: "none",
                                            minWidth: "auto",
                                            "&:hover": {
                                                backgroundColor: filterType === "all" ? "#c41a20" : "rgba(255, 255, 255, 0.05)",
                                                color: "#fff",
                                            },
                                        }}
                                    >
                                        All
                                    </Button>
                                    <Button
                                        onClick={() => setFilterType("movies")}
                                        sx={{
                                            px: 2,
                                            py: 0.75,
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            backgroundColor: filterType === "movies" ? "#ed1c24" : "transparent",
                                            color: filterType === "movies" ? "#fff" : "#9ca3af",
                                            borderRadius: 1,
                                            textTransform: "none",
                                            minWidth: "auto",
                                            "&:hover": {
                                                backgroundColor: filterType === "movies" ? "#c41a20" : "rgba(255, 255, 255, 0.05)",
                                                color: "#fff",
                                            },
                                        }}
                                    >
                                        Movies
                                    </Button>
                                    <Button
                                        onClick={() => setFilterType("shows")}
                                        sx={{
                                            px: 2,
                                            py: 0.75,
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            backgroundColor: filterType === "shows" ? "#ed1c24" : "transparent",
                                            color: filterType === "shows" ? "#fff" : "#9ca3af",
                                            borderRadius: 1,
                                            textTransform: "none",
                                            minWidth: "auto",
                                            "&:hover": {
                                                backgroundColor: filterType === "shows" ? "#c41a20" : "rgba(255, 255, 255, 0.05)",
                                                color: "#fff",
                                            },
                                        }}
                                    >
                                        Shows
                                    </Button>
                                </Box>
                                <Button
                                    startIcon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        backgroundColor: "rgba(26, 29, 35, 0.8)",
                                        border: "1px solid #2a2e37",
                                        borderRadius: 2,
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: "#d1d5db",
                                        textTransform: "none",
                                        "&:hover": {
                                            borderColor: "rgba(237, 28, 36, 0.5)",
                                            backgroundColor: "rgba(26, 29, 35, 1)",
                                        },
                                    }}
                                >
                                    Date Range
                                </Button>
                                <Button
                                    startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        backgroundColor: "rgba(26, 29, 35, 0.8)",
                                        border: "1px solid #2a2e37",
                                        borderRadius: 2,
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: "#d1d5db",
                                        textTransform: "none",
                                        "&:hover": {
                                            borderColor: "rgba(237, 28, 36, 0.5)",
                                            backgroundColor: "rgba(26, 29, 35, 1)",
                                        },
                                    }}
                                >
                                    Sort
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Main History List */}
                        <Grid size={{ xs: 12, lg: 9 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {loading ? (
                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8 }}>
                                        <CircularProgress
                                            sx={{
                                                color: "#ed1c24",
                                                mb: 2,
                                                "& .MuiCircularProgress-circle": {
                                                    strokeLinecap: "round",
                                                },
                                            }}
                                            size={48}
                                            thickness={4}
                                        />
                                        <Typography sx={{ color: "#9ca3af", fontSize: "0.875rem", fontWeight: 500 }}>
                                            Loading watch history...
                                        </Typography>
                                    </Box>
                                ) : Object.keys(groupedHistory).length === 0 ? (
                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8 }}>
                                        <Typography sx={{ color: "#9ca3af", fontSize: "0.875rem", fontWeight: 500, mb: 1 }}>
                                            No watch history found
                                        </Typography>
                                        <Typography sx={{ color: "#6b7280", fontSize: "0.75rem" }}>
                                            Start watching movies and shows to see your history here
                                        </Typography>
                                    </Box>
                                ) : (
                                    Object.entries(groupedHistory).map(([dateKey, items]) => {

                                        // Check for duplicates in this group
                                        const itemKeys = items.map(item => `${item.type}-${item.id}-${item.watched_at}`);
                                        const uniqueKeys = new Set(itemKeys);
                                        if (itemKeys.length !== uniqueKeys.size) {
                                            console.warn(`[WATCH_HISTORY] DUPLICATES IN DATE GROUP ${dateKey}:`, {
                                                total: itemKeys.length,
                                                unique: uniqueKeys.size,
                                                duplicates: itemKeys.length - uniqueKeys.size,
                                            });
                                        }

                                        return (
                                            <Box key={dateKey}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 1, mb: 1 }}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: "10px",
                                                            fontWeight: 700,
                                                            color: dateKey === "today" ? "#ed1c24" : "#6b7280",
                                                            textTransform: "uppercase",
                                                            letterSpacing: "0.2em",
                                                        }}
                                                    >
                                                        {dateKey === "today" ? "Today" : dateKey === "yesterday" ? "Yesterday" : dateKey}
                                                    </Typography>
                                                    <Box sx={{ height: 1, flex: 1, backgroundColor: "#2a2e37" }} />
                                                </Box>
                                                {items.map((item) => {
                                                    // Use watch ID as key since it's guaranteed to be unique
                                                    const itemKey = `${item.type}-${item.id}`;

                                                    return (
                                                        <Card
                                                            key={itemKey}
                                                            onClick={() => handleItemClick(item)}
                                                            sx={{
                                                                position: "relative",
                                                                backgroundColor: "rgba(26, 29, 35, 0.8)",
                                                                border: "1px solid #2a2e37",
                                                                borderRadius: 2,
                                                                p: 1.5,
                                                                mb: 1,
                                                                display: "flex",
                                                                gap: 2,
                                                                alignItems: "center",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s",
                                                                "&:hover": {
                                                                    borderColor: "rgba(237, 28, 36, 0.3)",
                                                                    backgroundColor: "rgba(26, 29, 35, 1)",
                                                                },
                                                                "&::before": {
                                                                    content: '""',
                                                                    position: "absolute",
                                                                    top: 0,
                                                                    left: 0,
                                                                    width: 3,
                                                                    height: "100%",
                                                                    backgroundColor: "#ed1c24",
                                                                    borderRadius: "4px 0 0 4px",
                                                                },
                                                            }}
                                                        >
                                                            {/* Poster */}
                                                            <Box
                                                                sx={{
                                                                    width: 64,
                                                                    height: 96,
                                                                    flexShrink: 0,
                                                                    borderRadius: 1.5,
                                                                    overflow: "hidden",
                                                                    border: "1px solid #2a2e37",
                                                                    position: "relative",
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
                                                                            transition: "transform 0.5s",
                                                                            "&:hover": {
                                                                                transform: "scale(1.1)",
                                                                            },
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Box
                                                                        sx={{
                                                                            width: "100%",
                                                                            height: "100%",
                                                                            backgroundColor: "#27272a",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                        }}
                                                                    >
                                                                        <Typography sx={{ color: "#6b7280", fontSize: "10px" }}>No Image</Typography>
                                                                    </Box>
                                                                )}
                                                            </Box>

                                                            {/* Content */}
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Typography
                                                                            sx={{
                                                                                fontWeight: 700,
                                                                                fontSize: "1.125rem",
                                                                                color: "#fff",
                                                                                mb: 0.5,
                                                                                "&:hover": { color: "#ed1c24" },
                                                                                transition: "color 0.2s",
                                                                            }}
                                                                        >
                                                                            {item.title}
                                                                        </Typography>
                                                                        {item.type === "movie" ? (
                                                                            <Typography sx={{ fontSize: "10px", color: "#6b7280" }}>
                                                                                Movie{" "}
                                                                                {movieGenres[item.tmdb_id || ""] && movieGenres[item.tmdb_id || ""].length > 0
                                                                                    ? `• ${movieGenres[item.tmdb_id || ""].slice(0, 2).join(", ")}`
                                                                                    : ""}
                                                                            </Typography>
                                                                        ) : (
                                                                            item.episode_info && (
                                                                                <Typography sx={{ fontSize: "10px", color: "#ed1c24", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                                                    S{item.episode_info.season_number.toString().padStart(2, "0")}E
                                                                                    {item.episode_info.episode_number.toString().padStart(2, "0")}
                                                                                    {item.episode_info.episode_title ? ` • ${item.episode_info.episode_title}` : ""}
                                                                                </Typography>
                                                                            )
                                                                        )}
                                                                    </Box>
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: 2 }}>
                                                                        <Box sx={{ textAlign: "right" }}>
                                                                            <Typography sx={{ fontSize: "10px", fontWeight: 700, color: "#d1d5db" }}>
                                                                                {formatTime(item.watched_at)}
                                                                            </Typography>
                                                                            <Typography sx={{ fontSize: "10px", color: "#6b7280" }}>
                                                                                {formatDuration(item.runtime)} duration
                                                                            </Typography>
                                                                        </Box>
                                                                        {item.rating && (
                                                                            <Box
                                                                                sx={{
                                                                                    width: 40,
                                                                                    height: 40,
                                                                                    borderRadius: 1,
                                                                                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                                                                                    border: "1px solid #2a2e37",
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "center",
                                                                                }}
                                                                            >
                                                                                <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#ed1c24" }}>
                                                                                    {Math.round(item.rating)}
                                                                                </Typography>
                                                                            </Box>
                                                                        )}
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                        </Card>
                                                    );
                                                })}
                                            </Box>
                                        );
                                    })
                                )}

                                {/* Loading More Indicator */}
                                {loadingMore && (
                                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                                        <CircularProgress
                                            sx={{
                                                color: "#ed1c24",
                                                "& .MuiCircularProgress-circle": {
                                                    strokeLinecap: "round",
                                                },
                                            }}
                                            size={32}
                                            thickness={4}
                                        />
                                    </Box>
                                )}

                                {/* End of History Message */}
                                {historyData && page >= historyData.total_pages && !loadingMore && (
                                    <Box sx={{ textAlign: "center", py: 4 }}>
                                        <Typography sx={{ color: "#6b7280", fontSize: "0.75rem" }}>
                                            You've reached the end of your watch history
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Grid>

                        {/* Sidebar */}
                        <Grid size={{ xs: 12, lg: 3 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {/* Activity Heatmap */}
                                <Card
                                    sx={{
                                        backgroundColor: "rgba(26, 29, 35, 0.8)",
                                        border: "1px solid #2a2e37",
                                        borderRadius: 2,
                                        p: 2.5,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                            mb: 2,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        <GridViewIcon sx={{ fontSize: 16 }} />
                                        Activity Heatmap
                                    </Typography>
                                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(26, 1fr)", gap: 0.5, mb: 2, maxWidth: "100%", overflowX: "auto" }}>
                                        {useMemo(() => {
                                            // Generate last 6 months (180 days)
                                            const today = new Date();
                                            const sixMonthsAgo = new Date(today);
                                            sixMonthsAgo.setDate(today.getDate() - 180);

                                            const days: Date[] = [];
                                            for (let i = 0; i < 180; i++) {
                                                const date = new Date(sixMonthsAgo);
                                                date.setDate(sixMonthsAgo.getDate() + i);
                                                days.push(date);
                                            }

                                            // Create a map of date -> count
                                            const dateCountMap = new Map<string, number>();
                                            heatmapData.forEach((item) => {
                                                dateCountMap.set(item.date, item.count);
                                            });

                                            // Find max count for normalization
                                            const counts = Array.from(dateCountMap.values());
                                            const maxCount = counts.length > 0 ? Math.max(...counts, 1) : 1;

                                            // Generate grid cells
                                            const cells = days.map((day) => {
                                                const dateKey = format(day, "yyyy-MM-dd");
                                                const count = dateCountMap.get(dateKey) || 0;
                                                const intensity = maxCount > 0 ? count / maxCount : 0;

                                                // Determine color based on intensity
                                                let backgroundColor = "#1f2937"; // No activity
                                                if (intensity > 0.75) {
                                                    backgroundColor = "#ed1c24"; // High activity
                                                } else if (intensity > 0.5) {
                                                    backgroundColor = "rgba(237, 28, 36, 0.7)"; // Medium-high
                                                } else if (intensity > 0.25) {
                                                    backgroundColor = "rgba(237, 28, 36, 0.4)"; // Medium
                                                } else if (intensity > 0) {
                                                    backgroundColor = "rgba(237, 28, 36, 0.2)"; // Low
                                                }

                                                return { date: dateKey, count, backgroundColor };
                                            });

                                            // Group into weeks (7 days per week, ~26 weeks for 6 months)
                                            const weeks: Array<Array<{ date: string; count: number; backgroundColor: string }>> = [];
                                            for (let i = 0; i < cells.length; i += 7) {
                                                weeks.push(cells.slice(i, i + 7));
                                            }

                                            // Transpose: each row is a day of week, each column is a week
                                            const gridCells: Array<{ date: string; count: number; backgroundColor: string }> = [];
                                            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                                                for (let week = 0; week < weeks.length; week++) {
                                                    if (weeks[week] && weeks[week][dayOfWeek]) {
                                                        gridCells.push(weeks[week][dayOfWeek]);
                                                    } else {
                                                        gridCells.push({ date: "", count: 0, backgroundColor: "#1f2937" });
                                                    }
                                                }
                                            }

                                            return gridCells.map((cell, i) => (
                                                <Box
                                                    key={`heatmap-${i}-${cell.date}`}
                                                    title={cell.date ? `${cell.date}: ${cell.count} watches` : ""}
                                                    sx={{
                                                        aspectRatio: "1/1",
                                                        borderRadius: 0.5,
                                                        backgroundColor: cell.backgroundColor,
                                                        cursor: cell.count > 0 ? "pointer" : "default",
                                                        transition: "transform 0.2s",
                                                        "&:hover": {
                                                            transform: cell.count > 0 ? "scale(1.1)" : "none",
                                                            zIndex: 1,
                                                        },
                                                    }}
                                                />
                                            ));
                                        }, [heatmapData])}
                                    </Box>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
                                        <Typography sx={{ fontSize: "9px" }}>Last 6 Months</Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            <Typography sx={{ fontSize: "9px" }}>Less</Typography>
                                            <Box sx={{ width: 8, height: 8, backgroundColor: "#1f2937", borderRadius: 0.5 }} />
                                            <Box sx={{ width: 8, height: 8, backgroundColor: "rgba(237, 28, 36, 0.4)", borderRadius: 0.5 }} />
                                            <Box sx={{ width: 8, height: 8, backgroundColor: "rgba(237, 28, 36, 0.7)", borderRadius: 0.5 }} />
                                            <Box sx={{ width: 8, height: 8, backgroundColor: "#ed1c24", borderRadius: 0.5 }} />
                                            <Typography sx={{ fontSize: "9px" }}>More</Typography>
                                        </Box>
                                    </Box>
                                </Card>

                                {/* Top Genres */}
                                <Card
                                    sx={{
                                        backgroundColor: "rgba(26, 29, 35, 0.8)",
                                        border: "1px solid #2a2e37",
                                        borderRadius: 2,
                                        p: 2.5,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                            mb: 2,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        <CategoryIcon sx={{ fontSize: 16 }} />
                                        Top Genres
                                    </Typography>
                                    {topGenres.length > 0 ? (
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            {topGenres.map((genre) => (
                                                <Box key={genre.name}>
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "10px", mb: 0.75 }}>
                                                        <Typography sx={{ fontWeight: 700, color: "#fff" }}>{genre.name}</Typography>
                                                        <Typography sx={{ color: "#6b7280" }}>{genre.percentage}%</Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={genre.percentage}
                                                        sx={{
                                                            height: 6,
                                                            borderRadius: "9999px",
                                                            backgroundColor: "#1f2937",
                                                            "& .MuiLinearProgress-bar": {
                                                                backgroundColor: "#ed1c24",
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography sx={{ fontSize: "10px", color: "#6b7280", textAlign: "center", py: 2 }}>
                                            Loading genres...
                                        </Typography>
                                    )}
                                </Card>

                                {/* Frequent Talent - Placeholder for now */}
                                <Card
                                    sx={{
                                        backgroundColor: "rgba(26, 29, 35, 0.8)",
                                        border: "1px solid #2a2e37",
                                        borderRadius: 2,
                                        p: 2.5,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            color: "#6b7280",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                            mb: 2,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        <PersonIcon sx={{ fontSize: 16 }} />
                                        Frequent Talent
                                    </Typography>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                        <Typography sx={{ fontSize: "10px", color: "#6b7280", textAlign: "center", py: 2 }}>
                                            Coming soon
                                        </Typography>
                                    </Box>
                                </Card>

                                {/* Export History */}
                                <Button
                                    fullWidth
                                    startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        py: 1.5,
                                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                                        border: "1px solid #2a2e37",
                                        borderRadius: 2,
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: "#fff",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.1em",
                                        "&:hover": {
                                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                                        },
                                    }}
                                >
                                    Export History
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </Box>
    );
}

export default WatchHistory;
