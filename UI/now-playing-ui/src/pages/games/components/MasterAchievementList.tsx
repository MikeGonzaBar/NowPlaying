import React, { useMemo, useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';
import { zincColors } from '../../../theme';

interface MasterAchievementListProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

type FilterType = 'All' | 'Unlocked' | 'Locked';

const MasterAchievementList: React.FC<MasterAchievementListProps> = ({ game }) => {
    const [filter, setFilter] = useState<FilterType>('All');

    const achievements = useMemo(() => {
        if (!game.achievements || !Array.isArray(game.achievements)) {
            return [];
        }

        let filtered = [...game.achievements];

        if (filter === 'Unlocked') {
            filtered = filtered.filter((ach: any) => ach.unlocked);
        } else if (filter === 'Locked') {
            filtered = filtered.filter((ach: any) => !ach.unlocked);
        }

        // Sort: unlocked first, then by name
        return filtered.sort((a: any, b: any) => {
            if (a.unlocked !== b.unlocked) {
                return a.unlocked ? -1 : 1;
            }
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [game.achievements, filter]);

    if (!game.achievements || game.achievements.length === 0) {
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
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 3,
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
                    All Achievements ({achievements.length})
                </Typography>

                {/* Filter Bar */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                    }}
                >
                    {(['All', 'Unlocked', 'Locked'] as FilterType[]).map((filterType) => (
                        <Button
                            key={filterType}
                            onClick={() => setFilter(filterType)}
                            sx={{
                                minWidth: 'auto',
                                padding: '4px 12px',
                                fontSize: '0.75rem',
                                fontFamily: 'Inter, sans-serif',
                                textTransform: 'none',
                                color: filter === filterType ? zincColors.white : zincColors.muted,
                                backgroundColor:
                                    filter === filterType
                                        ? 'rgba(59, 130, 246, 0.2)'
                                        : 'transparent',
                                border: `1px solid ${filter === filterType ? 'rgba(59, 130, 246, 0.5)' : '#27272a'
                                    }`,
                                borderRadius: 1,
                                '&:hover': {
                                    backgroundColor:
                                        filter === filterType
                                            ? 'rgba(59, 130, 246, 0.3)'
                                            : 'rgba(39, 39, 42, 0.5)',
                                    border: `1px solid ${filter === filterType
                                            ? 'rgba(59, 130, 246, 0.7)'
                                            : '#3f3f46'
                                        }`,
                                },
                            }}
                        >
                            {filterType}
                        </Button>
                    ))}
                </Box>
            </Box>

            {/* Two-Column Grid */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 2,
                }}
            >
                {achievements.map((achievement: any, index: number) => (
                    <Box
                        key={index}
                        sx={{
                            display: 'flex',
                            gap: 2,
                            padding: 2,
                            backgroundColor: 'rgba(39, 39, 42, 0.3)',
                            border: '1px solid #27272a',
                            borderRadius: 1,
                            opacity: achievement.unlocked ? 1 : 0.4,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {/* Icon */}
                        <Box
                            sx={{
                                flexShrink: 0,
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                overflow: 'hidden',
                                backgroundColor: 'rgba(39, 39, 42, 0.8)',
                                filter: achievement.unlocked ? 'none' : 'grayscale(100%)',
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
                                        backgroundColor: achievement.unlocked
                                            ? 'rgba(59, 130, 246, 0.2)'
                                            : 'rgba(39, 39, 42, 0.8)',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: achievement.unlocked
                                                ? zincColors.white
                                                : zincColors.muted,
                                            fontSize: '1.25rem',
                                        }}
                                    >
                                        {achievement.unlocked ? '✓' : '○'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Name & Description */}
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                minWidth: 0,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontFamily: 'Inter, sans-serif',
                                    color: achievement.unlocked ? zincColors.white : zincColors.muted,
                                    fontWeight: 500,
                                    fontSize: '0.875rem',
                                    lineHeight: 1.3,
                                }}
                            >
                                {achievement.name || 'Unnamed Achievement'}
                            </Typography>
                            {achievement.description && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontFamily: 'Inter, sans-serif',
                                        color: zincColors.muted,
                                        fontSize: '0.75rem',
                                        lineHeight: 1.4,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                >
                                    {achievement.description}
                                </Typography>
                            )}
                        </Box>

                        {/* Status Badge */}
                        <Box
                            sx={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'flex-start',
                            }}
                        >
                            <Chip
                                label={achievement.unlocked ? 'Unlocked' : 'Locked'}
                                size="small"
                                sx={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '0.65rem',
                                    height: 20,
                                    backgroundColor: achievement.unlocked
                                        ? 'rgba(34, 197, 94, 0.2)'
                                        : 'rgba(39, 39, 42, 0.8)',
                                    color: achievement.unlocked
                                        ? '#22c55e'
                                        : zincColors.muted,
                                    border: `1px solid ${achievement.unlocked ? 'rgba(34, 197, 94, 0.3)' : '#27272a'
                                        }`,
                                }}
                            />
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default MasterAchievementList;
