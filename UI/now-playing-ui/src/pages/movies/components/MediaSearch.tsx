import { useState, useEffect, useRef } from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    Typography,
    Card,
    CardContent,
    Grid,
    CircularProgress,
    Chip,
    IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { useNavigate } from 'react-router-dom';
import { authenticatedFetch } from '../../../utils/auth';
import { getApiUrl, API_CONFIG } from '../../../config/api';

interface SearchResult {
    id: number;
    title: string;
    type: 'movie' | 'show' | 'episode';
    cover_image: string;
    year?: number;
    tmdb_id?: number;
    show_title?: string;
    show_id?: number;
    season_number?: number;
    episode_number?: number;
    show_trakt_id?: string;
}

function MediaSearch() {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

    const searchMedia = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        setLoading(true);
        try {
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/search/?q=${encodeURIComponent(query)}`)
            );

            if (response.ok) {
                const data = await response.json();
                setResults(data.results || []);
                setShowResults(true);
            } else {
                console.error('Search failed:', response.statusText);
                setResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
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
            setResults([]);
            setShowResults(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    const handleResultClick = async (result: SearchResult) => {
        if (result.type === 'episode') {
            // Navigate to show details with episode info
            navigate("/showDetails", {
                state: {
                    show: {
                        id: result.show_id,
                        title: result.show_title,
                        ids: { trakt: result.show_trakt_id, tmdb: result.tmdb_id },
                    },
                },
            });
        } else if (result.type === 'movie') {
            navigate("/movieDetails", {
                state: {
                    media: {
                        movie: {
                            title: result.title,
                            year: result.year,
                            ids: { trakt: result.id.toString(), tmdb: result.tmdb_id?.toString() },
                        },
                        last_watched_at: null,
                    },
                    mediaType: 'movie',
                },
            });
        } else if (result.type === 'show') {
            navigate("/showDetails", {
                state: {
                    show: {
                        id: result.id,
                        title: result.title,
                        year: result.year,
                        ids: { trakt: result.id.toString(), tmdb: result.tmdb_id?.toString() },
                    },
                },
            });
        }
        setSearchQuery('');
        setShowResults(false);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'movie':
                return <MovieIcon sx={{ fontSize: 16 }} />;
            case 'show':
                return <TvIcon sx={{ fontSize: 16 }} />;
            case 'episode':
                return <PlayCircleIcon sx={{ fontSize: 16 }} />;
            default:
                return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'movie':
                return 'Movie';
            case 'show':
                return 'TV Show';
            case 'episode':
                return 'Episode';
            default:
                return type;
        }
    };

    return (
        <Box sx={{ mb: 3 }}>
            <TextField
                fullWidth
                placeholder="Search for movies, shows, or episodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#9ca3af' }} />
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            {loading && <CircularProgress size={20} sx={{ color: '#9ca3af' }} />}
                            {searchQuery && !loading && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setShowResults(false);
                                    }}
                                    sx={{ color: '#9ca3af' }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            )}
                        </InputAdornment>
                    ),
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#1a1d23',
                        color: '#fff',
                        '& fieldset': {
                            borderColor: '#2a2e37',
                        },
                        '&:hover fieldset': {
                            borderColor: '#3a3e47',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#ed1c24',
                        },
                    },
                    '& .MuiInputBase-input::placeholder': {
                        color: '#6b7280',
                        opacity: 1,
                    },
                }}
            />

            {showResults && results.length > 0 && (
                <Card
                    sx={{
                        mt: 2,
                        backgroundColor: '#1a1d23',
                        border: '1px solid #2a2e37',
                        borderRadius: 2,
                        maxHeight: '600px',
                        overflowY: 'auto',
                    }}
                >
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, color: '#fff', fontWeight: 600 }}>
                            Search Results ({results.length})
                        </Typography>
                        <Grid container spacing={2}>
                            {results.map((result) => (
                                <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={`${result.type}-${result.id}`}>
                                    <Card
                                        onClick={() => handleResultClick(result)}
                                        sx={{
                                            cursor: 'pointer',
                                            backgroundColor: '#27272a',
                                            border: '1px solid #2a2e37',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            transition: 'transform 0.2s, border-color 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                borderColor: '#ed1c24',
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                aspectRatio: '2/3',
                                                backgroundColor: '#1a1d23',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {result.cover_image ? (
                                                <Box
                                                    component="img"
                                                    src={result.cover_image}
                                                    alt={result.title}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            ) : (
                                                <Box
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#6b7280',
                                                    }}
                                                >
                                                    {getTypeIcon(result.type)}
                                                </Box>
                                            )}
                                            <Chip
                                                icon={getTypeIcon(result.type) ?? undefined}
                                                label={getTypeLabel(result.type)}
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                    color: '#fff',
                                                    fontSize: '10px',
                                                    height: '20px',
                                                    '& .MuiChip-icon': {
                                                        color: '#fff',
                                                    },
                                                }}
                                            />
                                        </Box>
                                        <CardContent sx={{ p: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: '#fff',
                                                    mb: 0.5,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {result.title}
                                            </Typography>
                                            {result.type === 'episode' && result.show_title && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontSize: '10px',
                                                        color: '#6b7280',
                                                        display: 'block',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {result.show_title} • S{result.season_number}E{result.episode_number}
                                                </Typography>
                                            )}
                                            {result.year && result.type !== 'episode' && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontSize: '10px',
                                                        color: '#6b7280',
                                                    }}
                                                >
                                                    {result.year}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {showResults && results.length === 0 && !loading && searchQuery.length >= 2 && (
                <Card
                    sx={{
                        mt: 2,
                        backgroundColor: '#1a1d23',
                        border: '1px solid #2a2e37',
                        borderRadius: 2,
                    }}
                >
                    <CardContent>
                        <Typography sx={{ color: '#6b7280', textAlign: 'center', py: 2 }}>
                            No results found for "{searchQuery}"
                        </Typography>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}

export default MediaSearch;
