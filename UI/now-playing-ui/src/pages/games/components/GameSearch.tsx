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
import { getApiUrl, } from '../../../config/api';

interface GameSuggestion {
    id: number;
    title: string;
    platform: string;
    cover_image: string;
    appid?: number;
}

interface GameSearchProps {
    onSearch?: (query: string) => void;
}

function GameSearch({ onSearch }: GameSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<GameSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingGameDetails, setLoadingGameDetails] = useState(false);
    const [open, setOpen] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

    const searchGames = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await authenticatedFetch(
                getApiUrl(`/games/search/?q=${encodeURIComponent(query)}`)
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
                searchGames(searchQuery);
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

    const handleGameSelect = async (game: GameSuggestion | null) => {
        if (game) {
            setLoadingGameDetails(true);
            try {
                // Fetch complete game data from the appropriate platform
                let gameData;

                switch (game.platform.toLowerCase()) {
                    case 'steam':
                        const steamResponse = await authenticatedFetch(
                            getApiUrl(`/steam/get-game-list-stored/`)
                        );
                        if (steamResponse.ok) {
                            const steamData = await steamResponse.json();
                            // Steam returns {"result": [...]} - direct array
                            if (steamData.result && Array.isArray(steamData.result)) {
                                gameData = steamData.result.find((g: any) => g.appid === game.appid);
                            }
                        }
                        break;

                    case 'psn':
                        const psnResponse = await authenticatedFetch(
                            getApiUrl(`/psn/get-game-list-stored/`)
                        );
                        if (psnResponse.ok) {
                            const psnData = await psnResponse.json();
                            // PSN returns {"result": {"games": [...]}} - nested array
                            if (psnData.result && psnData.result.games && Array.isArray(psnData.result.games)) {
                                gameData = psnData.result.games.find((g: any) => g.appid === game.appid);
                            }
                        }
                        break;

                    case 'xbox':
                        const xboxResponse = await authenticatedFetch(
                            getApiUrl(`/xbox/get-game-list-stored/`)
                        );
                        if (xboxResponse.ok) {
                            const xboxData = await xboxResponse.json();
                            // Xbox returns {"result": {"games": [...]}} - nested array
                            if (xboxData.result && xboxData.result.games && Array.isArray(xboxData.result.games)) {
                                gameData = xboxData.result.games.find((g: any) => g.appid === game.appid);
                            }
                        }
                        break;

                    case 'retroachievements':
                        const retroResponse = await authenticatedFetch(
                            getApiUrl(`/retroachievements/fetch-games/`)
                        );
                        if (retroResponse.ok) {
                            const retroData = await retroResponse.json();
                            // RetroAchievements returns {"result": {"games": [...]}} - nested array
                            if (retroData.result && retroData.result.games && Array.isArray(retroData.result.games)) {
                                gameData = retroData.result.games.find((g: any) => g.appid === game.appid);
                            }
                        }
                        break;

                    default:
                        console.error('Unknown platform:', game.platform);
                        return;
                }

                if (gameData) {
                    // Navigate to game details page with complete game data
                    navigate('/game', {
                        state: { game: gameData }
                    });
                } else {
                    console.error('Game data not found for:', game);
                    // Show a brief error message to the user
                    alert(`Could not load details for "${game.title}". Please try again.`);
                }

            } catch (error) {
                console.error('Error fetching game details:', error);
            } finally {
                setLoadingGameDetails(false);
            }

            setSearchQuery('');
            setSuggestions([]);
            setOpen(false);
        }
    };

    const getPlatformColor = (platform: string) => {
        switch (platform.toLowerCase()) {
            case 'steam':
                return '#1b2838';
            case 'psn':
            case 'playstation':
                return '#003791';
            case 'xbox':
                return '#107c10';
            case 'retroachievements':
                return '#ff6b35';
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
                Search Games 🔍
            </Typography>

            <Autocomplete
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                options={suggestions}
                getOptionLabel={(option) => option.title}
                loading={loading || loadingGameDetails}
                value={null}
                onChange={(_, newValue) => handleGameSelect(newValue)}
                onInputChange={(_, newInputValue) => {
                    setSearchQuery(newInputValue);
                    if (onSearch) onSearch(newInputValue);
                }}
                filterOptions={(x) => x} // Disable built-in filtering
                disabled={loadingGameDetails}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder={loadingGameDetails ? "Loading game details..." : "Search for games by title or platform..."}
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
                                    {(loading || loadingGameDetails) ? <CircularProgress color="inherit" size={20} /> : null}
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
                                    height: 60,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    m: 1
                                }}
                                image={option.cover_image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzMzMzIi8+CjxwYXRoIGQ9Ik0zMCAzMEwzMCAzMEwzMCAzMFYzMFoiIGZpbGw9IiM2NjY2NjYiLz4KPHRleHQgeD0iMzAiIHk9IjQ1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCI+R2FtZTwvdGV4dD4KPC9zdmc+Cg=='}
                                alt={option.title}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzMzMzIi8+CjxwYXRoIGQ9Ik0zMCAzMEwzMCAzMEwzMCAzMFYzMFoiIGZpbGw9IiM2NjY2NjYiLz4KPHRleHQgeD0iMzAiIHk9IjQ1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOCI+R2FtZTwvdGV4dD4KPC9zdmc+Cg==';
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
                                </Typography>
                                <Chip
                                    label={option.platform.toUpperCase()}
                                    size="small"
                                    sx={{
                                        backgroundColor: getPlatformColor(option.platform),
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
                        : "No games found"
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

export default GameSearch; 