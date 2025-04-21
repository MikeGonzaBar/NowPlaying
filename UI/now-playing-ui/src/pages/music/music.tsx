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
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SideBar from "../../components/sideBar";

interface SpotifyItem {
    id: number;
    title: string;
    artist: string;
    album: string;
    played_at: string;
    album_thumbnail: string;
    track_url: string;
    artists_url: string;
    duration_ms: number; // Timestamp of when the track was played
}

function Music() {
    const beBaseUrl = `http://${window.location.hostname}:8000`
    const drawerWidth = 160;

    // State to store the tracks
    const [tracks, setTracks] = useState<SpotifyItem[]>([]);
    const [error, setError] = useState<string | null>(null); // Error state
    const [snackbarOpen, setSnackbarOpen] = useState(false); // State to control the snackbar visibility

    const fetchStoredSongs = async () => {
        try {
            const res = await fetch(`${beBaseUrl}/spotify/get-stored-songs/`);

            if (!res.ok) {
                setError("Failed to fetch stored songs.");
                return; // Skip setting tracks if there's an error
            }

            const data = await res.json();

            // Check if there are results
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
    const fetchRecentlyPlayed = async () => {
        try {
            setSnackbarOpen(true); // Show snackbar when fetching starts

            const res = await fetch(
                `${beBaseUrl}/spotify/fetch-recently-played/`
            );

            if (!res.ok) {
                setError("Failed to fetch recently played tracks.");
                setSnackbarOpen(false); // Hide snackbar when fetch fails
                return;
            }

            // Call fetchStoredSongs to refresh the stored songs after the recently played fetch
            await fetchStoredSongs();

            setError(null);
            setSnackbarOpen(false); // Hide snackbar when fetch is successful
        } catch (error) {
            console.error("Error fetching recently played tracks:", error);
            setError("An error occurred while fetching recently played tracks.");
            setSnackbarOpen(false); // Hide snackbar when an error occurs
        }
    };

    useEffect(() => {
        fetchStoredSongs();
    }, []);

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    // Helper function to format duration in minutes and seconds
    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    };

    return (
        <div>
            <Box sx={{ display: "flex" }}>
                <SideBar activeItem="Music" />
                <Box
                    component="main"
                    sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, p: 2 }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography
                            variant="h5"
                            sx={{
                                mt: 2,
                                mb: 1,
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 700,
                            }}
                        >
                            Now Listening 🎧
                        </Typography>
                        <IconButton
                            onClick={fetchRecentlyPlayed}
                            color="secondary"
                            sx={{ mb: -2 }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                    {/* Display error banner if there is an error */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    {/* Flex container for the cards */}
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {tracks.map((item, index) => {
                            return (
                                <Card
                                    key={index}
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        width: 250,
                                        mb: 2,
                                        boxShadow: 6,
                                        cursor: "pointer",
                                        textDecoration: "none",
                                        transition: "transform 0.2s ease-in-out",
                                        "&:hover": { transform: "scale(1.03)" },
                                    }}
                                    onClick={() => window.open(item.track_url, "_blank")}
                                >
                                    <CardMedia
                                        component="img"
                                        image={item.album_thumbnail}
                                        alt={item.album}
                                        sx={{
                                            width: "100%",

                                            objectFit: "cover",
                                            borderTopLeftRadius: "4px",
                                            borderTopRightRadius: "4px",
                                        }}
                                    />
                                    <CardContent>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontFamily: "Inter, sans-serif",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {item.title}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">
                                            🎤
                                            {item.artists_url.split(", ").map((url, index) => (
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    key={index}
                                                    style={{ color: "#1DB954", marginRight: "10px" }}
                                                >
                                                    {`${item.artist.split(", ")[index]}`}
                                                </a>
                                            ))}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            🎵{item.album}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            📅 {new Date(item.played_at).toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            ⌛ {formatDuration(item.duration_ms)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                </Box>
            </Box>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={null} // Snackbar will stay open until closed manually
                onClose={handleSnackbarClose}
                message="Updating info..."
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
