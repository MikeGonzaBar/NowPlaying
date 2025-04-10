import {
    Alert,
    Box,
    Button,
    IconButton,
    Snackbar,
    Typography,
} from "@mui/material";
import SideBar from "../../../components/sideBar";
import { useState, useEffect } from "react";
import { Movie, Show } from "../utils/types";
import MediaCard from "../components/mediaCard";
import RefreshIcon from "@mui/icons-material/Refresh";

const fetchMoviesData = async (): Promise<Movie[]> => {
    const res = await fetch("http://localhost:8000/trakt/get-stored-movies");
    const data = await res.json();
    return data.movies;
};

const fetchShowsData = async (): Promise<Show[]> => {
    const res = await fetch("http://localhost:8000/trakt/get-stored-shows");
    const data = await res.json();
    return data.shows;
};

function Movies() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [shows, setShows] = useState<Show[]>([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false); // State to control the snackbar visibility
    const [error, setError] = useState<string | null>(null); // Error state
    const [loading, setLoading] = useState(true);

    const fetchLatest = async () => {
        try {
            setSnackbarOpen(true);
            const res = await fetch("http://localhost:8000/trakt/fetch-latest-movies/");
            if (!res.ok) {
                setError("Failed to fetch recently played movies.");
                setLoading(false);
                setSnackbarOpen(false); // Hide snackbar when fetch fails
                return;
            }
            const resShows = await fetch(
                "http://localhost:8000/trakt/fetch-latest-shows/"
            );
            if (!resShows.ok) {
                setError("Failed to fetch recently palyes tv shows.");
                setLoading(false);
                setSnackbarOpen(false); // Hide snackbar when fetch fails
                return;
            }
            await fetchMoviesData();
            await fetchShowsData();
            setError(null);
            setLoading(false);
            setSnackbarOpen(false); // Hide snackbar when fetch is successful
        } catch (error) {
            console.error("Error fetching recently played tracks:", error);
            setError("An error occurred while fetching recently played tracks.");
            setLoading(false);
            setSnackbarOpen(false); // Hide snackbar when an error occurs
        }
    };
    useEffect(() => {
        const fetchData = async () => {
            const moviesData = await fetchMoviesData();
            const showsData = await fetchShowsData();
            setMovies(moviesData);
            setShows(showsData);
        };

        fetchData();
    }, []);
    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };
    return (
        <div>
            <Box sx={{ display: "flex" }}>
                <SideBar activeItem="Movies" /> {/* Highlight "Movies" */}
                <Box component="main" sx={{ width: "89vw", padding: 2 }}>
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
                                ml: 1,
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 700,
                            }}
                        >
                            Now Playing 📽️
                        </Typography>
                        <IconButton onClick={fetchLatest} color="secondary" sx={{ mb: -2 }}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                    {/* Display error banner if there is an error */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box
                        sx={{
                            display: "flex",
                            width: "100%",
                            overflowX: "scroll",
                            gap: 2,
                            py: 1,
                            px: 1,
                        }}
                    >
                        {movies && movies.length > 0 ? (
                            movies.map((movie: Movie) => (
                                <MediaCard media={movie} mediaType="movie" key={movie.movie.ids.tmdb} />
                            ))
                        ) : (
                            <Typography variant="body1" sx={{ ml: 1 }}>
                                No movies available.
                            </Typography>
                        )}
                    </Box>
                    <Typography
                        variant="h5"
                        sx={{
                            mt: 2,
                            ml: 1,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 700,
                        }}
                    >
                        Now Playing 📺
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            width: "100%",
                            overflowX: "scroll",
                            gap: 2,
                            py: 1,
                            px: 1,
                        }}
                    >
                        {
                            shows && shows.length > 0 ? (
                                shows.map((show: Show) => (
                                    <MediaCard media={show} mediaType="show" key={show.show.ids.tmdb} />
                                ))
                            ) : (
                                <Typography variant="body1" sx={{ ml: 1 }}>
                                    No shows available.
                                </Typography>
                            ) // Use MediaCard component
                        }
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

export default Movies;
