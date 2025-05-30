import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Card,
    CardContent,
    CardMedia,
    IconButton,
    Typography,
    Snackbar,
    Button,
    Chip,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CloseIcon from "@mui/icons-material/Close";
import SideBar from "../../components/sideBar";
import { authenticatedFetch } from "../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../config/api";

interface MusicItem {
    id: number;
    title: string;
    artist: string;
    album: string;
    played_at: string;
    album_thumbnail: string;
    track_url: string;
    artists_url: string;
    duration_ms: number;
    source: 'spotify' | 'lastfm';
    // Last.fm specific fields
    artist_lastfm_url?: string;
    track_mbid?: string;
    artist_mbid?: string;
    album_mbid?: string;
    loved?: boolean;
    streamable?: boolean;
    album_thumbnail_small?: string;
    album_thumbnail_medium?: string;
    album_thumbnail_large?: string;
    album_thumbnail_extralarge?: string;
}

function Music() {
    // State to store the tracks
    const [tracks, setTracks] = useState<MusicItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [sourceFilter, setSourceFilter] = useState<string>("all");
    const [refreshing, setRefreshing] = useState<{ spotify: boolean; lastfm: boolean }>({
        spotify: false,
        lastfm: false
    });

    const fetchStoredSongs = async (source?: string) => {
        try {
            const url = source ?
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/get-stored-songs/?source=${source}`) :
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/get-stored-songs/`);

            const res = await authenticatedFetch(url);

            if (!res.ok) {
                setError("Failed to fetch stored songs.");
                return;
            }

            const data = await res.json();

            if (data.results.length === 0) {
                setError("No stored songs available.");
                return;
            }

            setTracks(data.results);
            setError(null);
        } catch (error) {
            console.error("Error fetching stored songs:", error);
            setError("An error occurred while fetching stored songs.");
        }
    };

    const fetchSpotifyRecentlyPlayed = async () => {
        try {
            setRefreshing(prev => ({ ...prev, spotify: true }));
            setSnackbarMessage("Fetching Spotify tracks...");
            setSnackbarOpen(true);

            const res = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/fetch-recently-played/`)
            );

            if (!res.ok) {
                const errorData = await res.json();
                setError(errorData.error || "Failed to fetch Spotify recently played tracks.");
                setSnackbarOpen(false);
                return;
            }

            // Refresh stored songs after successful fetch
            await fetchStoredSongs(sourceFilter === "all" ? undefined : sourceFilter);

            setError(null);
            setSnackbarMessage("Spotify tracks updated successfully!");
            setTimeout(() => setSnackbarOpen(false), 2000);
        } catch (error) {
            console.error("Error fetching Spotify recently played tracks:", error);
            setError("An error occurred while fetching Spotify recently played tracks.");
            setSnackbarOpen(false);
        } finally {
            setRefreshing(prev => ({ ...prev, spotify: false }));
        }
    };

    const fetchLastfmRecent = async () => {
        try {
            setRefreshing(prev => ({ ...prev, lastfm: true }));
            setSnackbarMessage("Fetching Last.fm tracks...");
            setSnackbarOpen(true);

            const res = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/fetch-lastfm-recent/`)
            );

            if (!res.ok) {
                const errorData = await res.json();
                setError(errorData.error || "Failed to fetch Last.fm recent tracks.");
                setSnackbarOpen(false);
                return;
            }

            // Refresh stored songs after successful fetch
            await fetchStoredSongs(sourceFilter === "all" ? undefined : sourceFilter);

            setError(null);
            setSnackbarMessage("Last.fm tracks updated successfully!");
            setTimeout(() => setSnackbarOpen(false), 2000);
        } catch (error) {
            console.error("Error fetching Last.fm recent tracks:", error);
            setError("An error occurred while fetching Last.fm recent tracks.");
            setSnackbarOpen(false);
        } finally {
            setRefreshing(prev => ({ ...prev, lastfm: false }));
        }
    };

    const handleSourceFilterChange = (
        _event: React.MouseEvent<HTMLElement>,
        newFilter: string,
    ) => {
        if (newFilter !== null) {
            setSourceFilter(newFilter);
            fetchStoredSongs(newFilter === "all" ? undefined : newFilter);
        }
    };

    useEffect(() => {
        fetchStoredSongs();
    }, []);

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    const handleErrorDismiss = () => {
        setError(null);
    };

    // Helper function to format duration in minutes and seconds
    const formatDuration = (ms: number) => {
        if (ms === 0) return "N/A";
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    };

    const getSourceColor = (source: string) => {
        switch (source) {
            case 'spotify':
                return '#1DB954';
            case 'lastfm':
                return '#D51007';
            default:
                return '#666';
        }
    };

    return (
        <div>
            <Box sx={{ display: "flex", paddingLeft: 2.5 }}>
                <SideBar activeItem="Music" />
                <Box
                    component="main"
                    sx={{
                        width: '89vw',
                        minHeight: '100vh',
                        padding: 3
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 3
                        }}
                    >
                        <Typography
                            variant="h4"
                            sx={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontWeight: 'bold'
                            }}
                        >
                            Now Listening 🎧
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={refreshing.spotify ? <CircularProgress size={16} /> : <RefreshIcon />}
                                onClick={fetchSpotifyRecentlyPlayed}
                                disabled={refreshing.spotify}
                                sx={{
                                    color: '#1DB954',
                                    borderColor: '#1DB954',
                                    '&:hover': {
                                        backgroundColor: 'rgba(29, 185, 84, 0.1)',
                                        borderColor: '#1DB954'
                                    },
                                    '&:disabled': {
                                        color: 'rgba(29, 185, 84, 0.5)',
                                        borderColor: 'rgba(29, 185, 84, 0.3)'
                                    }
                                }}
                            >
                                {refreshing.spotify ? 'Fetching...' : ''}
                            </Button>

                            <Button
                                variant="outlined"
                                startIcon={refreshing.lastfm ? <CircularProgress size={16} /> : <RefreshIcon />}
                                onClick={fetchLastfmRecent}
                                disabled={refreshing.lastfm}
                                sx={{
                                    color: '#D51007',
                                    borderColor: '#D51007',
                                    '&:hover': {
                                        backgroundColor: 'rgba(213, 16, 7, 0.1)',
                                        borderColor: '#D51007'
                                    },
                                    '&:disabled': {
                                        color: 'rgba(213, 16, 7, 0.5)',
                                        borderColor: 'rgba(213, 16, 7, 0.3)'
                                    }
                                }}
                            >
                                {refreshing.lastfm ? 'Fetching...' : ''}
                            </Button>
                        </Box>
                    </Box>

                    {/* Source Filter */}
                    <Box sx={{ mb: 3 }}>
                        <ToggleButtonGroup
                            value={sourceFilter}
                            exclusive
                            onChange={handleSourceFilterChange}
                            aria-label="music source filter"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    color: 'rgba(136, 136, 136, 0.8)',
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                    '&:hover': {
                                        color: '#000000',
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    },
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(0, 168, 204, 0.2)',
                                        color: '#00a8cc',
                                        borderColor: '#00a8cc',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 168, 204, 0.3)',
                                        }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="all" aria-label="all sources">
                                All Sources
                            </ToggleButton>
                            <ToggleButton value="spotify" aria-label="spotify">
                                🎵 Spotify
                            </ToggleButton>
                            <ToggleButton value="lastfm" aria-label="lastfm">
                                🎧 Last.fm
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {/* Display error banner if there is an error */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2 }}
                            action={
                                <IconButton
                                    aria-label="close"
                                    color="inherit"
                                    size="small"
                                    onClick={handleErrorDismiss}
                                >
                                    <CloseIcon fontSize="inherit" />
                                </IconButton>
                            }
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Flex container for the cards */}
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
                                        image={item.album_thumbnail || '/placeholder-album.png'}
                                        alt={item.album}
                                        sx={{
                                            width: "100%",
                                            height: 280,
                                            objectFit: "cover",
                                            borderTopLeftRadius: "4px",
                                            borderTopRightRadius: "4px",
                                        }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/placeholder-album.png';
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
                </Box>
            </Box>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={null}
                onClose={handleSnackbarClose}
                message={snackbarMessage}
                action={
                    <Button color="secondary" size="small" onClick={handleSnackbarClose}>
                        Close
                    </Button>
                }
            />
        </div>
    );
}

export default Music;
