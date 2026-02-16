import React, { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';
import { parseDate } from '../utils/utils';
import { zincColors } from '../../../theme';

interface RecentWinsStripProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

const RecentWinsStrip: React.FC<RecentWinsStripProps> = ({ game }) => {
    const recentAchievements = useMemo(() => {
        if (!game.achievements || !Array.isArray(game.achievements)) {
            return [];
        }

        // Get only unlocked achievements with unlock times
        const unlocked = game.achievements
            .filter((ach: any) => ach.unlocked && ach.unlock_time)
            .map((ach: any) => ({
                ...ach,
                unlockDate: parseDate(ach.unlock_time),
            }))
            .sort((a: any, b: any) => b.unlockDate.getTime() - a.unlockDate.getTime())
            .slice(0, 10); // Last 10

        return unlocked;
    }, [game.achievements]);

    const isRecent = (date: Date): boolean => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return date >= sevenDaysAgo;
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (recentAchievements.length === 0) {
        return null;
    }

    return (
        <Box
            sx={{
                marginTop: 4,
                padding: 3,
                backgroundColor: 'rgba(24, 24, 27, 0.3)',
                border: '1px solid #27272a',
                borderRadius: 2,
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
                    marginBottom: 2,
                }}
            >
                Recently Earned
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: 1,
                    '&::-webkit-scrollbar': {
                        height: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: 'rgba(39, 39, 42, 0.3)',
                        borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(161, 161, 170, 0.5)',
                        borderRadius: '3px',
                        '&:hover': {
                            backgroundColor: 'rgba(161, 161, 170, 0.7)',
                        },
                    },
                }}
            >
                {recentAchievements.map((achievement: any, index: number) => {
                    const recent = isRecent(achievement.unlockDate);
                    return (
                        <Tooltip
                            key={index}
                            title={
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        {achievement.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                        {achievement.description || 'No description'}
                                    </Typography>
                                </Box>
                            }
                            arrow
                            placement="top"
                        >
                            <Box
                                sx={{
                                    flexShrink: 0,
                                    width: 120,
                                    backgroundColor: 'rgba(39, 39, 42, 0.5)',
                                    border: recent
                                        ? '1px solid rgba(59, 130, 246, 0.5)'
                                        : '1px solid #27272a',
                                    borderRadius: 1,
                                    padding: 1.5,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: recent
                                        ? '0 0 12px rgba(59, 130, 246, 0.3)'
                                        : 'none',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        border: recent
                                            ? '1px solid rgba(59, 130, 246, 0.8)'
                                            : '1px solid #3f3f46',
                                        boxShadow: recent
                                            ? '0 0 16px rgba(59, 130, 246, 0.5)'
                                            : '0 4px 8px rgba(0, 0, 0, 0.2)',
                                    },
                                }}
                            >
                                {/* Achievement Icon */}
                                <Box
                                    sx={{
                                        width: '100%',
                                        aspectRatio: '1',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        backgroundColor: 'rgba(39, 39, 42, 0.8)',
                                    }}
                                >
                                    {achievement.image ? (
                                        <Box
                                            component="img"
                                            src={achievement.image}
                                            alt={achievement.name}
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
                                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: zincColors.white,
                                                    fontSize: '1.5rem',
                                                }}
                                            >
                                                ✓
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* Achievement Name */}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontFamily: 'Inter, sans-serif',
                                        color: zincColors.white,
                                        fontWeight: 500,
                                        fontSize: '0.75rem',
                                        lineHeight: 1.2,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                >
                                    {achievement.name}
                                </Typography>

                                {/* Date Earned */}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontFamily: 'Inter, sans-serif',
                                        color: zincColors.muted,
                                        fontSize: '0.65rem',
                                    }}
                                >
                                    {formatDate(achievement.unlockDate)}
                                </Typography>
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>
        </Box>
    );
};

export default RecentWinsStrip;
