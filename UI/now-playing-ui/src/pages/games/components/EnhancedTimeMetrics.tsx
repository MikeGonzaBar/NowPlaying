import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';
import { getAchievementUnlockDates, groupAchievementsByDate, parseDate } from '../utils/utils';
import { getPlatformMatch } from '../utils/platformHelper';
import { zincColors } from '../../../theme';

interface EnhancedTimeMetricsProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

const EnhancedTimeMetrics: React.FC<EnhancedTimeMetricsProps> = ({ game }) => {
    const platform = useMemo(() => getPlatformMatch(game), [game]);

    // Get first and last played dates
    const firstPlayed = useMemo(() => {
        if ('first_played' in game && game.first_played) {
            return parseDate(game.first_played);
        }
        return null;
    }, [game]);

    const lastPlayed = useMemo(() => {
        if ('last_played' in game && game.last_played) {
            return parseDate(game.last_played);
        }
        return null;
    }, [game]);

    // Generate bar chart data from achievement unlock dates
    // Using achievements as a proxy for activity (hours played per day)
    const chartData = useMemo(() => {
        const unlockDates = getAchievementUnlockDates(game);
        if (unlockDates.length === 0) {
            return [];
        }

        // Group by date and convert to hours (using count as proxy: 1 achievement ≈ 1 hour)
        const grouped = groupAchievementsByDate(unlockDates, 30);

        return grouped.map((item) => ({
            date: item.date,
            dateLabel: item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            hours: item.count, // Using achievement count as proxy for hours
        }));
    }, [game]);

    const maxHours = useMemo(() => {
        if (chartData.length === 0) return 1;
        return Math.max(...chartData.map(d => d.hours), 1);
    }, [chartData]);

    const formatTooltipDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <Box
                    sx={{
                        backgroundColor: 'rgba(24, 24, 27, 0.95)',
                        border: '1px solid #27272a',
                        borderRadius: 1,
                        padding: 1.5,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            color: zincColors.white,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            display: 'block',
                            marginBottom: 0.5,
                        }}
                    >
                        {formatTooltipDate(data.date)}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            color: zincColors.muted,
                            fontSize: '0.7rem',
                        }}
                    >
                        {data.hours} {data.hours === 1 ? 'hour' : 'hours'} played
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    return (
        <Box
            sx={{
                marginTop: 4,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '250px 1fr' },
                gap: 3,
            }}
        >
            {/* Metadata Sidebar */}
            <Box
                sx={{
                    backgroundColor: 'rgba(24, 24, 27, 0.3)',
                    border: '1px solid #27272a',
                    borderRadius: 2,
                    padding: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    height: 'fit-content',
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
                        marginBottom: 1,
                    }}
                >
                    Metadata
                </Typography>

                {/* Platform Identity */}
                {platform && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            marginBottom: 1,
                        }}
                    >
                        <Box
                            component="img"
                            src={platform.src}
                            alt={platform.alt}
                            sx={{
                                width: 24,
                                height: 24,
                                opacity: 0.8,
                                filter: 'grayscale(30%)',
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.white,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                            }}
                        >
                            {platform.alt}
                        </Typography>
                    </Box>
                )}

                {/* First Session */}
                {firstPlayed && firstPlayed.getTime() !== new Date(1970, 0, 1).getTime() && (
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.muted,
                                fontSize: '0.65rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'block',
                                marginBottom: 0.5,
                            }}
                        >
                            First Session
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.white,
                                fontSize: '0.875rem',
                            }}
                        >
                            {firstPlayed.toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </Typography>
                    </Box>
                )}

                {/* Most Recent Session */}
                {lastPlayed && lastPlayed.getTime() !== new Date(1970, 0, 1).getTime() && (
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.muted,
                                fontSize: '0.65rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'block',
                                marginBottom: 0.5,
                            }}
                        >
                            Most Recent Session
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                color: zincColors.white,
                                fontSize: '0.875rem',
                            }}
                        >
                            {lastPlayed.toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Bar Chart */}
            <Box
                sx={{
                    backgroundColor: 'rgba(24, 24, 27, 0.3)',
                    border: '1px solid #27272a',
                    borderRadius: 2,
                    padding: 3,
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
                        marginBottom: 3,
                    }}
                >
                    Activity (Last 30 Days)
                </Typography>
                {chartData.length === 0 ? (
                    <Box
                        sx={{
                            height: 300,
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
                            }}
                        >
                            No activity data available
                        </Typography>
                    </Box>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <XAxis
                                dataKey="dateLabel"
                                tick={{ fill: zincColors.muted, fontSize: 11, fontFamily: 'Inter, sans-serif' }}
                                tickLine={{ stroke: zincColors.muted }}
                                axisLine={{ stroke: '#27272a' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                label={{
                                    value: 'Hours Played',
                                    angle: -90,
                                    position: 'insideLeft',
                                    fill: zincColors.muted,
                                    fontSize: 11,
                                    fontFamily: 'Inter, sans-serif',
                                }}
                                tick={{ fill: zincColors.muted, fontSize: 11, fontFamily: 'Inter, sans-serif' }}
                                tickLine={{ stroke: zincColors.muted }}
                                axisLine={{ stroke: '#27272a' }}
                            />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.hours > maxHours * 0.7
                                                ? 'rgba(59, 130, 246, 0.9)'
                                                : entry.hours > maxHours * 0.4
                                                    ? 'rgba(59, 130, 246, 0.7)'
                                                    : 'rgba(59, 130, 246, 0.5)'
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </Box>
        </Box>
    );
};

export default EnhancedTimeMetrics;
