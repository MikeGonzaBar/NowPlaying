import {
    Alert,
    Box,
    IconButton,
    Snackbar,
} from "@mui/material";
import SideBar from "../../../components/sideBar";
import { useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import MediaSection from "../components/MediaSection";
import { useMediaData } from "../hooks/useMediaData";
import { Movie, Show } from "../utils/types";

function Movies() {
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const { data: movies, error: moviesError, loadMore: loadMoreMovies, refresh: refreshMovies } = useMediaData<Movie>('/trakt/get-stored-movies');
    const { data: shows, error: showsError, loadMore: loadMoreShows, refresh: refreshShows } = useMediaData<Show>('/trakt/get-stored-shows');

    const fetchLatest = async () => {
        try {
            setSnackbarOpen(true);
            await Promise.all([
                refreshMovies(),
                refreshShows()
            ]);
        } catch (error) {
            console.error("Error fetching latest:", error);
        } finally {
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
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <IconButton onClick={fetchLatest} color="secondary" sx={{ mb: -2 }}>
                            <RefreshIcon />
                        </IconButton>
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
