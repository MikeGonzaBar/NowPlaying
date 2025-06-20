import { useState, useEffect, useRef } from 'react';
import {
    Box,
    TextField,
    Autocomplete,
    CircularProgress,
    Typography,
    Card,
    CardContent,
    CardMedia,
    Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { authenticatedFetch } from '../../../utils/auth';
import { getApiUrl } from '../../../config/api';

interface MediaSuggestion {
    id: number;
    title: string;
    type: 'movie' | 'show';
    cover_image: string;
    year?: number;
    tmdb_id?: number;
}

interface MovieShowSearchProps {
    onSearch?: (query: string) => void;
}

function MovieShowSearch({ onSearch }: MovieShowSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMediaDetails, setLoadingMediaDetails] = useState(false);
    const [open, setOpen] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

    const searchMedia = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await authenticatedFetch(
                getApiUrl(`/trakt/search/?q=${encodeURIComponent(query)}`)
            );

            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.results || []);
            } else {
                console.error('Search failed:', response.statusText);
                setSuggestions([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout for debounced search
        if (searchQuery.trim()) {
            searchTimeoutRef.current = setTimeout(() => {
                searchMedia(searchQuery);
            }, 300);
        } else {
            setSuggestions([]);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    const handleMediaSelect = async (media: MediaSuggestion | null) => {
        if (media) {
            setLoadingMediaDetails(true);
            try {
                // Step 1: Fetch base media data from our backend
                let mediaData;
                const endpoint = media.type === 'movie' ? '/trakt/get-stored-movies' : '/trakt/get-stored-shows';
                const response = await authenticatedFetch(getApiUrl(`${endpoint}?page_size=1000`));

                if (response.ok) {
                    const data = await response.json();
                    const items = media.type === 'movie' ? data.movies : data.shows;
                    if (items && Array.isArray(items)) {
                        mediaData = items.find((item: any) => {
                            const itemIds = media.type === 'movie' ? item.movie.ids : item.show.ids;
                            return itemIds.tmdb == media.tmdb_id;
                        });
                    }
                }

                if (!mediaData) {
                    console.error('Media data not found in stored items for:', media);
                    alert(`Could not load details for "${media.title}". This item might not be in your watched list yet.`);
                    setLoadingMediaDetails(false);
                    return;
                }

                // Step 2: Fetch detailed media data from TMDB
                const apiKey = import.meta.env.VITE_REACT_APP_TMDB_API_KEY;
                const tmdbId = media.tmdb_id;
                const tmdbEndpoint = media.type === 'movie' ? 'movie' : 'tv';
                const tmdbUrl = `https://api.themoviedb.org/3/${tmdbEndpoint}/${tmdbId}?api_key=${apiKey}&append_to_response=videos`;

                const tmdbResponse = await fetch(tmdbUrl);
                if (!tmdbResponse.ok) {
                    throw new Error('Failed to fetch data from TMDB');
                }
                const tmdbDetails = await tmdbResponse.json();

                // Step 3: Navigate with both our DB data (media) and TMDB data (mediaDetails)
                navigate('/movieDetails', {
                    state: {
                        media: mediaData,
                        mediaType: media.type,
                        mediaDetails: tmdbDetails
                    }
                });

            } catch (error) {
                console.error('Error fetching media details:', error);
                alert('Failed to load media details. Please try again.');
            } finally {
                setLoadingMediaDetails(false);
                setSearchQuery('');
                setSuggestions([]);
                setOpen(false);
            }
        }
    };

    const getMediaTypeColor = (type: 'movie' | 'show') => {
        switch (type) {
            case 'movie':
                return '#e50914'; // Netflix red
            case 'show':
                return '#1a75ff'; // Blue
            default:
                return '#666';
        }
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Typography
                variant="h6"
                sx={{
                    mb: 2,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    color: '#333'
                }}
            >
                Search Movies & Shows 🔍
            </Typography>

            <Autocomplete
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                options={suggestions}
                getOptionLabel={(option) => option.title}
                loading={loading || loadingMediaDetails}
                value={null}
                onChange={(_, newValue) => handleMediaSelect(newValue)}
                onInputChange={(_, newInputValue) => {
                    setSearchQuery(newInputValue);
                    if (onSearch) onSearch(newInputValue);
                }}
                filterOptions={(x) => x} // Disable built-in filtering
                disabled={loadingMediaDetails}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder={loadingMediaDetails ? "Loading media details..." : "Search for movies or shows..."}
                        variant="outlined"
                        fullWidth
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                                <>
                                    <SearchIcon sx={{ color: '#666', mr: 1 }} />
                                    {params.InputProps.startAdornment}
                                </>
                            ),
                            endAdornment: (
                                <>
                                    {(loading || loadingMediaDetails) ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#ddd',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#999',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#1976d2',
                                },
                            },
                        }}
                    />
                )}
                renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ p: 0 }}>
                        <Card
                            sx={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                }
                            }}
                        >
                            <CardMedia
                                component="img"
                                sx={{
                                    width: 60,
                                    height: 90,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    m: 1
                                }}
                                image={option.cover_image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iOTAiIHZpZXdCb3g9IjAgMCA2MCA5MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjMzMzMzMzIi8+CjxwYXRoIGQ9Ik0zMCA0NUwzMCA0NUwzMCA0NVY0NVoiIGZpbGw9IiM2NjY2NjYiLz4KPHRleHQgeD0iMzAiIHk9IjY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCI+TWVkaWE8L3RleHQ+Cjwvc3ZnPgo='}
                                alt={option.title}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iOTAiIHZpZXdCb3g9IjAgMCA2MCA5MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjMzMzMzMzIi8+CjxwYXRoIGQ9Ik0zMCA0NUwzMCA0NUwzMCA0NVY0NVoiIGZpbGw9IiM2NjY2NjYiLz4KPHRleHQgeD0iMzAiIHk9IjY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCI+TWVkaWE8L3RleHQ+Cjwvc3ZnPgo=';
                                }}
                            />
                            <CardContent sx={{ flex: 1, py: 1, px: 2 }}>
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: 500,
                                        color: '#333',
                                        mb: 0.5
                                    }}
                                >
                                    {option.title}
                                    {option.year && ` (${option.year})`}
                                </Typography>
                                <Chip
                                    label={option.type.toUpperCase()}
                                    size="small"
                                    sx={{
                                        backgroundColor: getMediaTypeColor(option.type),
                                        color: 'white',
                                        fontSize: '0.7rem',
                                        height: 20
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </Box>
                )}
                noOptionsText={
                    searchQuery.length < 2
                        ? "Type at least 2 characters to search..."
                        : "No movies or shows found"
                }
                sx={{
                    '& .MuiAutocomplete-paper': {
                        maxHeight: 400,
                    },
                }}
            />
        </Box>
    );
}

export default MovieShowSearch; 