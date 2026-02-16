import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SideBar from '../../../components/sideBar';
import { useGameData } from '../hooks/useGameData';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';
import { zincColors } from '../../../theme';
import GameCard from '../components/gameCard';

const AllGames: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const beBaseUrl = `http://${window.location.hostname}:8080`;
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

    // Get platform filter from navigation state
    useEffect(() => {
        const platformFilter = location.state?.platformFilter;
        if (platformFilter) {
            setSelectedPlatform(platformFilter);
        }
    }, [location.state]);

    const {
        latestPlayedGames,
        loading,
        getGamePlatform,
    } = useGameData(beBaseUrl);

    // Filter games by platform
    const filteredGames = useMemo(() => {
        if (!selectedPlatform) return latestPlayedGames;
        return latestPlayedGames.filter((game) => getGamePlatform(game) === selectedPlatform);
    }, [latestPlayedGames, selectedPlatform, getGamePlatform]);

    const getPlatformIcon = (platformKey: string): string => {
        switch (platformKey) {
            case "steam": return "/Platforms/steam.webp";
            case "psn": return "/Platforms/playstation.webp";
            case "xbox": return "/Platforms/xbox.svg";
            case "retroachievements": return "/Platforms/retroachievements.png";
            default: return "/Platforms/steam.webp";
        }
    };

    const getPlatformIconSize = (platformKey: string): number => {
        return platformKey === "xbox" ? 60 : 24;
    };

    // Get unique platforms from games
    const availablePlatforms = useMemo(() => {
        const platforms = new Set<string>();
        latestPlayedGames.forEach((game) => {
            const platform = getGamePlatform(game);
            if (platform) platforms.add(platform);
        });
        return Array.from(platforms);
    }, [latestPlayedGames, getGamePlatform]);

    const handleGameClick = (game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame, event: React.MouseEvent<HTMLDivElement>) => {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        sessionStorage.setItem('gameCardPosition', JSON.stringify({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        }));
        navigate(`/game/${game.appid}`, { state: { game } });
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: zincColors.background }}>
            <SideBar activeItem="Games" />
            <Box
                sx={{
                    flex: 1,
                    marginLeft: '80px',
                    padding: 4,
                    backgroundColor: zincColors.background,
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton
                            onClick={() => navigate('/games')}
                            sx={{
                                color: zincColors.white,
                                backgroundColor: 'rgba(39, 39, 42, 0.5)',
                                border: '1px solid #27272a',
                                '&:hover': {
                                    backgroundColor: 'rgba(39, 39, 42, 0.7)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.2)',
                                },
                            }}
                        >
                            <ArrowLeft size={20} />
                        </IconButton>
                        <Typography
                            variant="h4"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 700,
                                color: zincColors.white,
                            }}
                        >
                            All Games
                            {selectedPlatform && ` (${filteredGames.length})`}
                        </Typography>
                    </Box>

                    {/* Platform Filter Buttons */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                            size="small"
                            onClick={() => setSelectedPlatform(null)}
                            variant={selectedPlatform === null ? 'contained' : 'outlined'}
                            sx={{
                                fontSize: '12px',
                                textTransform: 'none',
                                fontFamily: 'Inter, sans-serif',
                                backgroundColor: selectedPlatform === null ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                border: '1px solid rgba(59, 130, 246, 0.5)',
                                color: zincColors.white,
                                '&:hover': {
                                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                                    border: '1px solid rgba(59, 130, 246, 0.7)',
                                },
                            }}
                        >
                            All
                        </Button>
                        {availablePlatforms.map((platform) => (
                            <Button
                                key={platform}
                                size="small"
                                onClick={() => setSelectedPlatform(platform)}
                                variant={selectedPlatform === platform ? 'contained' : 'outlined'}
                                startIcon={
                                    <Box
                                        component="img"
                                        src={getPlatformIcon(platform)}
                                        alt={platform}
                                        sx={{
                                            width: getPlatformIconSize(platform) * 0.6,
                                            height: 'auto',
                                        }}
                                    />
                                }
                                sx={{
                                    fontSize: '12px',
                                    textTransform: 'none',
                                    fontFamily: 'Inter, sans-serif',
                                    backgroundColor: selectedPlatform === platform ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    border: '1px solid rgba(59, 130, 246, 0.5)',
                                    color: zincColors.white,
                                    '&:hover': {
                                        backgroundColor: 'rgba(59, 130, 246, 0.3)',
                                        border: '1px solid rgba(59, 130, 246, 0.7)',
                                    },
                                }}
                            >
                                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </Button>
                        ))}
                    </Box>
                </Box>

                {/* Games Grid */}
                {loading ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '400px',
                        }}
                    >
                        <Typography
                            variant="body1"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.muted,
                            }}
                        >
                            Loading games...
                        </Typography>
                    </Box>
                ) : filteredGames.length === 0 ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '400px',
                        }}
                    >
                        <Typography
                            variant="body1"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.muted,
                            }}
                        >
                            No games found{selectedPlatform ? ` for ${selectedPlatform}` : ''}
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(1, 1fr)',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)',
                                lg: 'repeat(4, 1fr)',
                                xl: 'repeat(6, 1fr)',
                            },
                            gap: 3,
                        }}
                    >
                        {filteredGames.map((game) => (
                            <Box
                                key={game.appid}
                                onClick={(e) => handleGameClick(game, e)}
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                        transform: 'scale(1.03)',
                                    },
                                }}
                            >
                                <GameCard game={game} />
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default AllGames;
