import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Snackbar,
    Typography,
} from "@mui/material";
import SideBar from "../../../components/sideBar";
import { useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import MediaSection from "../components/MediaSection";
import MovieShowSearch from "../components/MovieShowSearch";
import { useMediaData } from "../hooks/useMediaData";
import { Movie, Show } from "../utils/types";

function Movies() {
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [isUpdatingMovies, setIsUpdatingMovies] = useState(false);
    const [isUpdatingShows, setIsUpdatingShows] = useState(false);
    const { data: movies, error: moviesError, loadMore: loadMoreMovies, refresh: refreshMovies } = useMediaData<Movie>('/trakt/get-stored-movies');
    const { data: shows, error: showsError, loadMore: loadMoreShows, refresh: refreshShows } = useMediaData<Show>('/trakt/get-stored-shows');

    const fetchLatestMovies = async () => {
        try {
            setIsUpdatingMovies(true);
            setSnackbarOpen(true);
            await refreshMovies();
        } catch (error) {
            console.error("Error fetching latest movies:", error);
        } finally {
            setIsUpdatingMovies(false);
            setSnackbarOpen(false);
        }
    };

    const fetchLatestShows = async () => {
        try {
            setIsUpdatingShows(true);
            setSnackbarOpen(true);
            await refreshShows();
        } catch (error) {
            console.error("Error fetching latest shows:", error);
        } finally {
            setIsUpdatingShows(false);
            setSnackbarOpen(false);
        }
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    return (
        <div>
            <Box sx={{ display: "flex" }}>
                <SideBar activeItem="Movies" /> {/* Highlight "Movies" */}
                <Box component="main" sx={{ width: "89vw", padding: 2 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            mb: 3,
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 'bold',
                            color: '#333'
                        }}
                    >
                        Movies & Shows
                    </Typography>

                    {/* Movie & Show Search Component */}
                    <MovieShowSearch />

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#333' }}>
                            Update Media Lists:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                onClick={fetchLatestMovies}
                                disabled={isUpdatingMovies}
                                startIcon={
                                    isUpdatingMovies ? (
                                        <CircularProgress size={16} color="inherit" />
                                    ) : (
                                        <RefreshIcon />
                                    )
                                }
                                sx={{
                                    backgroundColor: '#e50914', // Netflix red color
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: '#b2070f',
                                    },
                                    '&:disabled': {
                                        backgroundColor: '#e5091466',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    },
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500,
                                    textTransform: 'none',
                                }}
                            >
                                {isUpdatingMovies ? 'Updating...' : '📽️ Update Movies'}
                            </Button>

                            <Button
                                variant="contained"
                                onClick={fetchLatestShows}
                                disabled={isUpdatingShows}
                                startIcon={
                                    isUpdatingShows ? (
                                        <CircularProgress size={16} color="inherit" />
                                    ) : (
                                        <RefreshIcon />
                                    )
                                }
                                sx={{
                                    backgroundColor: '#1a75ff', // Blue color for shows
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: '#0052cc',
                                    },
                                    '&:disabled': {
                                        backgroundColor: '#1a75ff66',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    },
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500,
                                    textTransform: 'none',
                                }}
                            >
                                {isUpdatingShows ? 'Updating...' : '📺 Update Shows'}
                            </Button>
                        </Box>
                    </Box>

                    {(moviesError || showsError) && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {moviesError || showsError}
                        </Alert>
                    )}
                    <MediaSection
                        title="Now Playing 📽️"
                        media={movies}
                        mediaType="movie"
                        onLoadMore={loadMoreMovies}
                    />
                    <MediaSection
                        title="Now Playing 📺"
                        media={shows}
                        mediaType="show"
                        onLoadMore={loadMoreShows}
                    />
                </Box>
            </Box>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={null} // Snackbar will stay open until closed manually
                onClose={handleSnackbarClose}
                message="Updating info..."
            />
        </div>
    );
}

export default Movies;
