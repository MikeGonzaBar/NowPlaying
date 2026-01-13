import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    Snackbar,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { authenticatedFetch } from "../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../config/api";
import PaginationControls from "../../components/PaginationControls";
import SideBar from "../../components/sideBar";

interface MusicItem {
    id: number;
    title: string;
    artist: string;
    album: string;
    played_at: string;
    duration_ms: number;
    track_url: string;
    album_thumbnail: string;
    source: 'spotify' | 'lastfm';
    loved: boolean;
    streamable: boolean;
    artist_lastfm_url: string;
}

const getSourceColor = (source: 'spotify' | 'lastfm') => {
    switch (source) {
        case 'spotify':
            return '#1DB954'; // Spotify green
        case 'lastfm':
            return '#D51007'; // Last.fm red
        default:
            return '#FFFFFF'; // Default to white
    }
};

const formatDuration = (ms: number) => {
    if (!ms) return "N/A";
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${(parseInt(seconds) < 10 ? '0' : '')}${seconds}`;
};

function Music() {
    const [tracks, setTracks] = useState<MusicItem[]>([]);
    const [loadingSpotify, setLoadingSpotify] = useState(false);
    const [loadingLastfm, setLoadingLastfm] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [sourceFilter, setSourceFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchStoredSongs = async (source?: string, page: number = 1, append: boolean = false) => {
        if (!append) {
            setTracks([]);
        }
        setLoadingMore(true);

        try {
            const url = source && source !== 'all' ?
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/get-stored-songs/?source=${source}&page=${page}&page_size=50`) :
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/get-stored-songs/?page=${page}&page_size=50`);

            const res = await authenticatedFetch(url);

            if (!res.ok) {
                setError("Failed to fetch stored songs.");
                return;
            }

            const data = await res.json();

            setTracks(prevTracks => append ? [...prevTracks, ...data.results] : data.results);

            setTotalItems(data.total_items);
            setTotalPages(data.total_pages);
            setHasMore(data.has_next);
            setCurrentPage(data.page);

        } catch (error) {
            console.error("Error fetching stored songs: ", error);
            setError("Error fetching stored songs.");
        } finally {
            setLoadingMore(false);
        }
    };

    const loadMoreSongs = () => {
        if (hasMore && !loadingMore) {
            fetchStoredSongs(sourceFilter, currentPage + 1, true);
        }
    };

    const fetchSpotifyRecentlyPlayed = async () => {
        setLoadingSpotify(true);
        setError(null);
        try {
            const res = await authenticatedFetch(getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/fetch-spotify-recently-played/`), {
                method: "POST"
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to fetch from Spotify");
                return;
            }
            setSnackbarMessage("Successfully fetched latest Spotify listens!");
            setSnackbarOpen(true);
            await fetchStoredSongs(sourceFilter, 1, false);
        } catch (error) {
            console.error("Error fetching from Spotify: ", error);
            setError("Error fetching from Spotify");
        } finally {
            setLoadingSpotify(false);
        }
    };

    const fetchLastfmRecent = async () => {
        setLoadingLastfm(true);
        setError(null);
        setSnackbarMessage("Fetching complete Last.fm history. This may take a moment...");
        setSnackbarOpen(true);
        try {
            const res = await authenticatedFetch(getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/fetch-lastfm-recent/`), {
                method: "GET"
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to fetch from Last.fm");
                setSnackbarOpen(false);
                return;
            }
            setSnackbarMessage("Successfully fetched and updated Last.fm listens!");
            setSnackbarOpen(true);
            await fetchStoredSongs(sourceFilter, 1, false);
        } catch (error) {
            console.error("Error fetching from Last.fm: ", error);
            setError("Error fetching from Last.fm");
            setSnackbarOpen(false);
        } finally {
            setLoadingLastfm(false);
        }
    };

    const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleSourceFilterChange = (
        _event: React.MouseEvent<HTMLElement>,
        newFilter: string,
    ) => {
        if (newFilter !== null) {
            setSourceFilter(newFilter);
            setCurrentPage(1);
            fetchStoredSongs(newFilter, 1, false);
        }
    };

    useEffect(() => {
        fetchStoredSongs(sourceFilter);
    }, []);

    return (
        <Box sx={{ display: 'flex' }}>
            <SideBar activeItem="Music" />
            <Box component="main" sx={{ flexGrow: 1, p: 3, color: '#333' }}>
                <Typography variant="h4" gutterBottom sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#333' }}>
                    Now Listening
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', mb: 3, color: '#666' }}>
                    A log of all my music listens from Spotify and Last.fm
                </Typography>

                <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, color: '#333' }}>
                        Update Music Lists:
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={fetchSpotifyRecentlyPlayed}
                        disabled={loadingSpotify}
                        startIcon={loadingSpotify ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                        sx={{
                            backgroundColor: '#1DB954',
                            color: 'white',
                            '&:hover': { backgroundColor: '#1aa34a' },
                            '&:disabled': { backgroundColor: '#1DB954', opacity: 0.6 }
                        }}
                    >
                        {loadingSpotify ? 'Updating...' : 'Update Spotify'}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={fetchLastfmRecent}
                        disabled={loadingLastfm}
                        startIcon={loadingLastfm ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                        sx={{
                            backgroundColor: '#D51007',
                            color: 'white',
                            '&:hover': { backgroundColor: '#b70e05' },
                            '&:disabled': { backgroundColor: '#D51007', opacity: 0.6 }
                        }}
                    >
                        {loadingLastfm ? 'Updating...' : 'Update Last.fm'}
                    </Button>
                </Box>

                <Box>
                    <ToggleButtonGroup
                        value={sourceFilter}
                        exclusive
                        onChange={handleSourceFilterChange}
                        aria-label="source filter"
                        sx={{ mb: 2 }}
                    >
                        <ToggleButton value="all" aria-label="all sources">All Sources</ToggleButton>
                        <ToggleButton value="spotify" aria-label="spotify">Spotify</ToggleButton>
                        <ToggleButton value="lastfm" aria-label="last.fm">Last.fm</ToggleButton>
                    </ToggleButtonGroup>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {tracks.map((item, index) => {
                            const handleCardClick = () => {
                                if (item.track_url) {
                                    window.open(item.track_url, "_blank");
                                } else if (item.artist_lastfm_url) {
                                    window.open(item.artist_lastfm_url, "_blank");
                                }
                            };

                            return (
                                <Card
                                    key={`${item.source}-${item.id}-${index}`}
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        width: 280,
                                        mb: 2,
                                        boxShadow: 6,
                                        cursor: item.track_url || item.artist_lastfm_url ? "pointer" : "default",
                                        textDecoration: "none",
                                        transition: "transform 0.2s ease-in-out",
                                        "&:hover": {
                                            transform: item.track_url || item.artist_lastfm_url ? "scale(1.03)" : "none"
                                        },
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        border: `1px solid ${getSourceColor(item.source)}20`,
                                    }}
                                    onClick={handleCardClick}
                                >
                                    <CardMedia
                                        component="img"
                                        image={item.album_thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDI4MCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMzMzMzMzIi8+CjxwYXRoIGQ9Ik0xNDAgMTQwTDE0MCAxNDBMMTQwIDE0MFYxNDBaIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'}
                                        alt={item.album}
                                        sx={{
                                            width: "100%",
                                            height: 280,
                                            objectFit: "cover",
                                            borderTopLeftRadius: "4px",
                                            borderTopRightRadius: "4px",
                                        }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDI4MCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMzMzMzMzIi8+CjxwYXRoIGQ9Ik0xNDAgMTQwTDE0MCAxNDBMMTQwIDE0MFYxNDBaIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                                        }}
                                    />
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontFamily: "Inter, sans-serif",
                                                    fontWeight: 700,
                                                    flex: 1,
                                                    mr: 1
                                                }}
                                            >
                                                {item.title}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Chip
                                                    label={item.source.toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: getSourceColor(item.source),
                                                        color: 'white',
                                                        fontSize: '0.7rem',
                                                        height: 20
                                                    }}
                                                />
                                                {item.loved && (
                                                    <Tooltip title="Loved on Last.fm">
                                                        <FavoriteIcon sx={{ color: '#D51007', fontSize: 16 }} />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Box>

                                        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                                            🎤 {item.artist}
                                        </Typography>

                                        {item.album && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                🎵 {item.album}
                                            </Typography>
                                        )}

                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            📅 {new Date(item.played_at).toLocaleString()}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">
                                            ⌛ {formatDuration(item.duration_ms)}
                                        </Typography>

                                        {item.source === 'lastfm' && item.streamable && (
                                            <Chip
                                                label="Streamable"
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    mt: 1,
                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    fontSize: '0.7rem'
                                                }}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>

                    <PaginationControls
                        tracksCount={tracks.length}
                        totalItems={totalItems}
                        totalPages={totalPages}
                        currentPage={currentPage}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                        onLoadMore={loadMoreSongs}
                    />
                </Box>
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={6000}
                    onClose={handleSnackbarClose}
                    message={snackbarMessage}
                    action={
                        <Button color="secondary" size="small" onClick={handleSnackbarClose}>
                            Close
                        </Button>
                    }
                />
            </Box>
        </Box>
    );
}

export default Music;
