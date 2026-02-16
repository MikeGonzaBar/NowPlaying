import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';
import { useGameData } from '../hooks/useGameData';
import { formatPlaytimeCompact, getGameRank, calculateAchievementPercentage } from '../utils/utils';
import { getPlatformMatch } from '../utils/platformHelper';
import CircularProgress from '../components/CircularProgress';
import ActivitySparkline from '../components/ActivitySparkline';
import PlatformPills from '../components/PlatformPills';
import RecentWinsStrip from '../components/RecentWinsStrip';
import MasterAchievementList from '../components/MasterAchievementList';
import EnhancedTimeMetrics from '../components/EnhancedTimeMetrics';
import GameContextMetadata from '../components/GameContextMetadata';
import { zincColors } from '../../../theme';

const GameDetails: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const beBaseUrl = `http://${window.location.hostname}:8080`;
    const [isTransitioning, setIsTransitioning] = useState(true);

    // Get game from location state or find by appid
    const gameFromState = location.state?.game as SteamGame | PsnGame | RetroAchievementsGame | XboxGame | undefined;
    const { mostPlayed } = useGameData(beBaseUrl);

    // Get card position from sessionStorage for shared element transition
    const cardPosition = useMemo(() => {
        try {
            const stored = sessionStorage.getItem('gameCardPosition');
            if (stored) {
                const position = JSON.parse(stored);
                sessionStorage.removeItem('gameCardPosition'); // Clean up after use
                return position as { x: number; y: number; width: number; height: number };
            }
        } catch (e) {
            // Ignore parsing errors
        }
        return undefined;
    }, []);

    const game = useMemo(() => {
        if (gameFromState) return gameFromState;
        // If no game in state, try to find it in mostPlayed
        if (id) {
            return mostPlayed.find(g => String(g.appid) === id) ||
                mostPlayed.find(g => String(g.appid) === String(id));
        }
        return null;
    }, [gameFromState, id, mostPlayed]);

    const platform = useMemo(() => game ? getPlatformMatch(game) : null, [game]);
    const playtime = useMemo(() => game ? formatPlaytimeCompact(game) : "0h", [game]);
    const completionPercentage = useMemo(() => {
        if (!game) return 0;
        const percentage = calculateAchievementPercentage(game);
        return isNaN(percentage) || !isFinite(percentage) ? 0 : percentage;
    }, [game]);
    const rank = useMemo(() => game && mostPlayed.length > 0 ? getGameRank(game, mostPlayed) : null, [game, mostPlayed]);

    // Handle transition animation
    useEffect(() => {
        // Trigger transition animation after mount
        const timer = setTimeout(() => {
            setIsTransitioning(false);
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        navigate('/games');
    };

    if (!game) {
        return (
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: zincColors.background,
                    zIndex: 9999,
                }}
            >
                <Typography variant="h5" sx={{ color: zincColors.white }}>
                    Game not found
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                overflow: 'auto',
            }}
        >
            {/* Background Image with Shared Element Transition */}
            <Box
                component="img"
                src={game.img_icon_url}
                alt={game.name}
                sx={{
                    position: 'fixed',
                    top: cardPosition && isTransitioning ? `${cardPosition.y}px` : 0,
                    left: cardPosition && isTransitioning ? `${cardPosition.x}px` : 0,
                    width: cardPosition && isTransitioning ? `${cardPosition.width}px` : '100%',
                    height: cardPosition && isTransitioning ? `${cardPosition.height}px` : '100%',
                    objectFit: 'cover',
                    zIndex: 1,
                    transition: cardPosition ? 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    borderRadius: cardPosition && isTransitioning ? '8px' : 0,
                }}
            />

            {/* Backdrop Blur and Dark Overlay */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(24, 24, 27, 0.8)', // zinc-950/80
                    backdropFilter: 'blur(40px)', // backdrop-blur-2xl
                    zIndex: 2,
                }}
            />

            {/* Content */}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 3,
                    minHeight: '100vh',
                    padding: 4,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Close Button */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 4,
                    }}
                >
                    <IconButton
                        onClick={handleClose}
                        sx={{
                            color: zincColors.white,
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid transparent',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 0 8px rgba(255, 255, 255, 0.2)',
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Header Section */}
                <Box
                    sx={{
                        marginBottom: 6,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            marginBottom: 2,
                        }}
                    >
                        {/* Game Title */}
                        <Typography
                            variant="h2"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 700,
                                fontSize: '3rem',
                                color: zincColors.white,
                                flex: 1,
                            }}
                        >
                            {game.name}
                        </Typography>

                        {/* Platform Icon (Muted/Monochromatic) */}
                        {platform && (
                            <Box
                                component="img"
                                src={platform.src}
                                alt={platform.alt}
                                sx={{
                                    width: platform.width,
                                    height: 'auto',
                                    opacity: 0.6, // Muted effect
                                    filter: 'grayscale(30%)', // Slight grayscale for monochromatic look
                                }}
                            />
                        )}
                    </Box>

                    {/* Platform Pills */}
                    <PlatformPills game={game} />
                </Box>

                {/* Bento Stats Row */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 3,
                        flexWrap: 'wrap',
                    }}
                >
                    {/* Stat 1: Time Invested */}
                    <Box
                        sx={{
                            flex: '1 1 300px',
                            backgroundColor: 'rgba(24, 24, 27, 0.3)', // Transparent with slight tint
                            border: '1px solid #27272a', // zinc-800
                            borderRadius: 2,
                            padding: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.muted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                fontSize: '0.75rem',
                            }}
                        >
                            Time Invested
                        </Typography>
                        <Typography
                            variant="h3"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 700,
                                color: zincColors.white,
                                fontSize: '2rem',
                            }}
                        >
                            {playtime}
                        </Typography>
                        <Box
                            sx={{
                                marginTop: 1,
                                width: '100%',
                            }}
                        >
                            <ActivitySparkline game={game} height={60} days={30} />
                        </Box>
                    </Box>

                    {/* Stat 2: Completion */}
                    <Box
                        sx={{
                            flex: '1 1 300px',
                            backgroundColor: 'rgba(24, 24, 27, 0.3)',
                            border: '1px solid #27272a',
                            borderRadius: 2,
                            padding: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.muted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                fontSize: '0.75rem',
                            }}
                        >
                            Completion
                        </Typography>
                        {isNaN(completionPercentage) || completionPercentage === 0 ? (
                            <Box
                                sx={{
                                    width: 140,
                                    height: 140,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontFamily: 'Inter, sans-serif',
                                        color: zincColors.muted,
                                        fontSize: '0.875rem',
                                        textAlign: 'center',
                                    }}
                                >
                                    {completionPercentage === 0 && game.achievements && game.achievements.length > 0
                                        ? 'Start Playing to see stats'
                                        : 'Calculating...'}
                                </Typography>
                            </Box>
                        ) : (
                            <CircularProgress percentage={completionPercentage} size={140} strokeWidth={10} />
                        )}
                    </Box>

                    {/* Stat 3: Standing */}
                    <Box
                        sx={{
                            flex: '1 1 300px',
                            backgroundColor: 'rgba(24, 24, 27, 0.3)',
                            border: '1px solid #27272a',
                            borderRadius: 2,
                            padding: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.muted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                fontSize: '0.75rem',
                            }}
                        >
                            Standing
                        </Typography>
                        <Typography
                            variant="h3"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 700,
                                color: zincColors.white,
                                fontSize: '2rem',
                            }}
                        >
                            {rank ? `#${rank} Most Played` : 'Not ranked'}
                        </Typography>
                    </Box>
                </Box>

                {/* Activity & Milestone Section */}
                <Box
                    sx={{
                        marginTop: 6,
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 700,
                            fontSize: '1.5rem',
                            color: zincColors.white,
                            marginBottom: 4,
                        }}
                    >
                        Activity & Milestones
                    </Typography>

                    {/* Recent Wins Strip */}
                    <RecentWinsStrip game={game} />

                    {/* Enhanced Time Metrics */}
                    <EnhancedTimeMetrics game={game} />

                    {/* Game Context & Metadata */}
                    <GameContextMetadata game={game} />

                    {/* Master Achievement List */}
                    <MasterAchievementList game={game} />
                </Box>
            </Box>
        </Box>
    );
};

export default GameDetails;
