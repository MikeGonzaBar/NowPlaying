
import { Box, Typography } from '@mui/material';
import SideBar from '../../../components/sideBar';
import { useState, useEffect } from 'react';
import { Movie, Show } from '../utils/types';
import MediaCard from '../components/mediaCard';

const fetchMoviesData = async (): Promise<Movie[]> => {
    const res = await fetch('http://localhost:8000/trakt/get-stored-movies');
    const data = await res.json();
    return data.movies;
};

const fetchShowsData = async (): Promise<Show[]> => {
    const res = await fetch('http://localhost:8000/trakt/get-stored-shows');
    const data = await res.json();
    return data.shows;
};


function Movies() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [shows, setShows] = useState<Show[]>([]);
    useEffect(() => {
        const fetchData = async () => {
            const moviesData = await fetchMoviesData();
            const showsData = await fetchShowsData();
            setMovies(moviesData);
            setShows(showsData);
        };

        fetchData();
    }, []);
    return (
        <div>
            <Box sx={{ display: 'flex' }}>
                <SideBar activeItem="Movies" /> {/* Highlight "Movies" */}
                <Box
                    component="main"
                    sx={{ width: '89vw', padding: 2, }}
                >
                    <Typography variant="h5" sx={{
                        mt: 2, ml: 1, fontFamily: 'Inter, sans-serif',
                        fontWeight: 700
                    }}>
                        Now Playing 📽️
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            width: '100%',
                            overflowX: 'scroll',
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
                            </Typography>)
                        }

                    </Box>
                    <Typography variant="h5" sx={{
                        mt: 2, ml: 1, fontFamily: 'Inter, sans-serif',
                        fontWeight: 700
                    }}>
                        Now Playing 📺
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            width: '100%',
                            overflowX: 'scroll',
                            gap: 2,
                            py: 1,
                            px: 1,
                        }}
                    >
                        {shows && shows.length > 0 ? (
                            shows.map((show: Show) => (
                                <MediaCard media={show} mediaType="show" key={show.show.ids.tmdb}/>
                            ))
                        ) : (
                            <Typography variant="body1" sx={{ ml: 1 }}>
                                No shows available.
                            </Typography>) // Use MediaCard component
                        }
                    </Box>
                </Box>
            </Box>
        </div >
    );
}

export default Movies;