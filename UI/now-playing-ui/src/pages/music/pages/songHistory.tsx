import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { format, parseISO } from "date-fns";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { MusicPageLayout } from "../components/MusicPageLayout";
import { formatPlayedAt, formatDuration, formatDateLabel } from "../utils/dateUtils";

interface Song {
    id: number;
    title: string;
    artist: string;
    album: string | null;
    played_at: string;
    album_thumbnail: string | null;
    track_url: string | null;
    artist_lastfm_url: string | null;
    duration_ms: number | null;
    source: "spotify" | "lastfm";
    loved: boolean | null;
    streamable: boolean | null;
}

interface SongHistoryResponse {
    results: Song[];
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
}

function SongHistory() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [sourceFilter, _setSourceFilter] = useState<"all" | "spotify" | "lastfm">("all");

    const fetchSongs = async (pageNum: number, isInitial: boolean = false) => {
        try {
            if (isInitial) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const sourceParam = sourceFilter !== "all" ? `&source=${sourceFilter}` : "";
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/get-stored-songs/?page=${pageNum}&page_size=50${sourceParam}`)
            );

            if (response.ok) {
                const data: SongHistoryResponse = await response.json();

                if (isInitial) {
                    setSongs(data.results);
                } else {
                    setSongs((prev) => [...prev, ...data.results]);
                }

                setHasMore(data.has_next);
                setTotalItems(data.total_items);
            } else {
                console.error("Failed to fetch song history");
            }
        } catch (error) {
            console.error("Error fetching song history:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setPage(1);
        setSongs([]);
        fetchSongs(1, true);
    }, [sourceFilter]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchSongs(nextPage, false);
        }
    };


    const handleSongClick = (song: Song) => {
        if (song.track_url) {
            window.open(song.track_url, "_blank");
        }
    };

    const handleArtistClick = (song: Song, e: React.MouseEvent) => {
        e.stopPropagation();
        if (song.artist_lastfm_url) {
            window.open(song.artist_lastfm_url, "_blank");
        }
    };

    // Group songs by date
    const groupedSongs = songs.reduce((acc, song) => {
        try {
            const date = parseISO(song.played_at);
            const dateKey = format(date, "yyyy-MM-dd");
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(song);
            return acc;
        } catch {
            const dateKey = "unknown";
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(song);
            return acc;
        }
    }, {} as Record<string, Song[]>);

    const sortedDates = Object.keys(groupedSongs).sort((a, b) => {
        if (a === "unknown") return 1;
        if (b === "unknown") return -1;
        return b.localeCompare(a);
    });

    if (loading && songs.length === 0) {
        return <LoadingSpinner />;
    }

    return (
        <MusicPageLayout>
            {/* Header */}
            <PageHeader
                title="Song History"
                description={`${totalItems.toLocaleString()} songs scrobbled | All time`}
            />

            {/* Songs List */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sortedDates.map((dateKey) => {
                    const dateSongs = groupedSongs[dateKey];
                    const dateLabel = formatDateLabel(dateKey);

                    return (
                        <Box key={dateKey}>
                            <Typography
                                sx={{
                                    mb: 2,
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    color: "#71717a",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                }}
                            >
                                {dateLabel}
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                {dateSongs.map((song) => (
                                    <Box
                                        key={song.id}
                                        onClick={() => handleSongClick(song)}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 2,
                                            p: 2,
                                            bgcolor: "#161618",
                                            border: "1px solid #262626",
                                            borderRadius: "12px",
                                            cursor: song.track_url ? "pointer" : "default",
                                            transition: "all 0.2s",
                                            "&:hover": {
                                                bgcolor: "#1a1a1c",
                                                borderColor: song.track_url ? "#EF4444" : "#262626",
                                            },
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={song.album_thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&size=64&background=262626&color=fff`}
                                            alt={song.title}
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: "8px",
                                                objectFit: "cover",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: "16px",
                                                    fontWeight: 600,
                                                    color: "#f4f4f5",
                                                    mb: 0.5,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {song.title}
                                            </Typography>
                                            <Typography
                                                onClick={(e) => handleArtistClick(song, e)}
                                                sx={{
                                                    fontSize: "14px",
                                                    color: song.artist_lastfm_url ? "#EF4444" : "#71717a",
                                                    cursor: song.artist_lastfm_url ? "pointer" : "default",
                                                    mb: 0.5,
                                                    "&:hover": {
                                                        textDecoration: song.artist_lastfm_url ? "underline" : "none",
                                                    },
                                                }}
                                            >
                                                {song.artist}
                                            </Typography>
                                            {song.album && (
                                                <Typography
                                                    sx={{
                                                        fontSize: "12px",
                                                        color: "#71717a",
                                                    }}
                                                >
                                                    {song.album}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, ml: 2 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: "12px",
                                                    color: "#71717a",
                                                }}
                                            >
                                                {formatPlayedAt(song.played_at)}
                                            </Typography>
                                            {song.duration_ms && (
                                                <Typography
                                                    sx={{
                                                        fontSize: "12px",
                                                        color: "#71717a",
                                                    }}
                                                >
                                                    {formatDuration(song.duration_ms)}
                                                </Typography>
                                            )}
                                            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                                                {song.loved && (
                                                    <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#EF4444" }}>
                                                        favorite
                                                    </span>
                                                )}
                                                <Typography
                                                    sx={{
                                                        fontSize: "10px",
                                                        color: "#71717a",
                                                        px: 1,
                                                        py: 0.25,
                                                        bgcolor: "#262626",
                                                        borderRadius: "4px",
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    {song.source}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* Load More Button */}
            {hasMore && (
                <Box sx={{ mt: 6, display: "flex", justifyContent: "center" }}>
                    <Button
                        onClick={loadMore}
                        disabled={loadingMore}
                        endIcon={loadingMore ? <CircularProgress size={16} /> : <ExpandMoreIcon />}
                        sx={{
                            px: 4,
                            py: 1.5,
                            bgcolor: "#161618",
                            border: "1px solid #262626",
                            borderRadius: "12px",
                            fontWeight: 700,
                            color: "#f4f4f5",
                            textTransform: "none",
                            "&:hover": {
                                bgcolor: "#1a1a1c",
                                borderColor: "rgba(239, 68, 68, 0.3)",
                            },
                            "&:disabled": {
                                opacity: 0.5,
                            },
                            transition: "all 0.2s",
                        }}
                    >
                        {loadingMore ? "Loading..." : "Load More Songs"}
                    </Button>
                </Box>
            )}

            {/* Footer */}
            <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <Typography sx={{ fontSize: "12px", color: "#71717a", fontWeight: 500 }}>
                    Showing {songs.length.toLocaleString()} of {totalItems.toLocaleString()} songs
                </Typography>
            </Box>
        </MusicPageLayout>
    );
}

export default SongHistory;
