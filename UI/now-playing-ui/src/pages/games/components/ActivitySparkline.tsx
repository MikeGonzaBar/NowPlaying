import React, { useMemo, useState } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';
import { getAchievementUnlockDates, groupAchievementsByDate, parseDate } from '../utils/utils';
import { zincColors } from '../../../theme';

interface ActivitySparklineProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
    height?: number;
    days?: number;
}

const ActivitySparkline: React.FC<ActivitySparklineProps> = ({
    game,
    height = 60,
    days = 30
}) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Debug: Log state changes
    React.useEffect(() => {
        console.log('Dialog state changed:', { dialogOpen, selectedDate });
    }, [dialogOpen, selectedDate]);

    const chartData = useMemo(() => {
        const unlockDates = getAchievementUnlockDates(game);
        if (unlockDates.length === 0) {
            return null;
        }
        const grouped = groupAchievementsByDate(unlockDates, days);
        return grouped.map((item) => ({
            date: item.date,
            dateLabel: item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: item.count,
        }));
    }, [game, days]);

    // Get achievements for a specific date
    const selectedAchievements = useMemo(() => {
        if (!selectedDate || !game.achievements || !Array.isArray(game.achievements)) {
            return [];
        }

        const targetDateStr = selectedDate.toISOString().split('T')[0];

        return game.achievements.filter((achievement: any) => {
            if (!achievement.unlocked || !achievement.unlock_time) {
                return false;
            }
            const unlockDate = parseDate(achievement.unlock_time);
            // Filter out invalid dates
            if (unlockDate.getTime() === new Date(1970, 0, 1).getTime()) {
                return false;
            }
            const unlockDateStr = unlockDate.toISOString().split('T')[0];
            return unlockDateStr === targetDateStr;
        });
    }, [selectedDate, game]);

    // Custom dot component that's clickable
    const CustomDot = (props: any) => {
        const { cx, cy, payload } = props;
        console.log('CustomDot rendered:', { cx, cy, payload });

        if (!payload || payload.count === 0) {
            console.log('CustomDot: No payload or count is 0, returning null');
            return null;
        }

        const handleDotClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            console.log('CustomDot clicked!', payload);
            if (payload.date) {
                console.log('Setting selected date:', payload.date);
                setSelectedDate(payload.date);
                setDialogOpen(true);
            } else {
                console.error('No date in payload:', payload);
            }
        };

        return (
            // eslint-disable-next-line react/forbid-dom-props
            <circle
                cx={cx}
                cy={cy}
                r={4}
                fill="#3b82f6"
                stroke="#27272a"
                strokeWidth={2}
                onClick={handleDotClick}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    console.log('CustomDot mouse down');
                }}
                style={{ cursor: 'pointer' }}
            />
        );
    };

    const handleCloseDialog = () => {
        console.log('Closing dialog');
        setDialogOpen(false);
        setSelectedDate(null);
    };

    // Debug: Log when dialog should be visible
    React.useEffect(() => {
        console.log('Dialog state:', { dialogOpen, selectedDate, achievementCount: selectedAchievements.length });
    }, [dialogOpen, selectedDate, selectedAchievements.length]);

    const dateRange = useMemo(() => {
        if (!chartData || chartData.length === 0) return null;
        const startDate = chartData[0].date;
        const endDate = chartData[chartData.length - 1].date;
        return {
            start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
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
                        padding: 1,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            color: zincColors.white,
                            fontWeight: 600,
                            fontSize: '0.7rem',
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
                            fontSize: '0.65rem',
                        }}
                    >
                        {data.count} {data.count === 1 ? 'achievement' : 'achievements'} unlocked
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    if (!chartData || chartData.length === 0) {
        return (
            <Box
                sx={{
                    width: '100%',
                    height: height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: 'Inter, sans-serif',
                        color: zincColors.muted,
                        fontSize: '0.75rem',
                    }}
                >
                    No activity data
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: '100%',
                position: 'relative',
            }}
        >
            {/* Date Range Label */}
            {dateRange && (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 0.5,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            color: zincColors.muted,
                            fontSize: '0.65rem',
                        }}
                    >
                        {dateRange.start}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            color: zincColors.muted,
                            fontSize: '0.65rem',
                        }}
                    >
                        Last {days} days
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            color: zincColors.muted,
                            fontSize: '0.65rem',
                        }}
                    >
                        {dateRange.end}
                    </Typography>
                </Box>
            )}

            {/* Line Chart Container */}
            <Box
                sx={{
                    width: '100%',
                    height: height,
                    position: 'relative',
                }}
            >
                <ResponsiveContainer width="100%" height={height}>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                        onClick={(data: any) => {
                            console.log('AreaChart clicked:', data);
                            if (data && data.activePayload && data.activePayload[0]) {
                                const clickedData = data.activePayload[0].payload;
                                console.log('AreaChart click payload:', clickedData);
                                if (clickedData && clickedData.date) {
                                    setSelectedDate(clickedData.date);
                                    setDialogOpen(true);
                                }
                            }
                        }}
                    >
                        <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="dateLabel"
                            tick={{ fill: zincColors.muted, fontSize: 9, fontFamily: 'Inter, sans-serif' }}
                            tickLine={{ stroke: zincColors.muted }}
                            axisLine={{ stroke: '#27272a' }}
                            interval="preserveStartEnd"
                            hide={true}
                        />
                        <YAxis
                            tick={{ fill: zincColors.muted, fontSize: 9, fontFamily: 'Inter, sans-serif' }}
                            tickLine={{ stroke: zincColors.muted }}
                            axisLine={{ stroke: '#27272a' }}
                            hide={true}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#areaGradient)"
                            dot={<CustomDot />}
                            activeDot={(props: any) => {
                                console.log('ActiveDot rendered:', props);
                                const { cx, cy, payload } = props;
                                const handleActiveDotClick = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    console.log('ActiveDot clicked!', payload);
                                    if (payload && payload.date) {
                                        console.log('Setting selected date from activeDot:', payload.date);
                                        setSelectedDate(payload.date);
                                        console.log('About to set dialogOpen to true');
                                        setDialogOpen(true);
                                        console.log('dialogOpen should now be true');
                                    } else {
                                        console.error('No date in activeDot payload:', payload);
                                    }
                                };

                                return (
                                    // eslint-disable-next-line react/forbid-dom-props
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={5}
                                        fill="#3b82f6"
                                        stroke="#27272a"
                                        strokeWidth={2}
                                        onClick={handleActiveDotClick}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            console.log('ActiveDot mouse down');
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                );
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>

            {/* Legend/Explanation */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    marginTop: 0.5,
                }}
            >
                <Box
                    sx={{
                        width: 12,
                        height: 2,
                        backgroundColor: '#3b82f6',
                        borderRadius: 1,
                    }}
                />
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: 'Inter, sans-serif',
                        color: zincColors.muted,
                        fontSize: '0.65rem',
                    }}
                >
                    Activity based on achievements unlocked per day (click to view)
                </Typography>
            </Box>

            {/* Achievements Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                sx={{
                    zIndex: 10000, // Higher than the game detail overlay (9999)
                }}
                PaperProps={{
                    sx: {
                        backgroundColor: zincColors.background,
                        border: '1px solid #27272a',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontFamily: 'Inter, sans-serif',
                        color: zincColors.white,
                        borderBottom: '1px solid #27272a',
                        padding: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 600,
                                color: zincColors.white,
                                marginBottom: 0.5,
                            }}
                        >
                            Achievements Unlocked
                        </Typography>
                        {selectedDate && (
                            <Typography
                                variant="body2"
                                sx={{
                                    fontFamily: 'Inter, sans-serif',
                                    color: zincColors.muted,
                                    fontSize: '0.875rem',
                                }}
                            >
                                {selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Typography>
                        )}
                    </Box>
                    <IconButton
                        onClick={handleCloseDialog}
                        sx={{
                            color: zincColors.white,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ padding: 3 }}>
                    {selectedAchievements.length === 0 ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 4,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontFamily: 'Inter, sans-serif',
                                    color: zincColors.muted,
                                }}
                            >
                                No achievements found for this date
                            </Typography>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                gap: 2,
                            }}
                        >
                            {selectedAchievements.map((achievement: any, index: number) => (
                                <Box
                                    key={index}
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        padding: 2,
                                        backgroundColor: 'rgba(39, 39, 42, 0.3)',
                                        border: '1px solid #27272a',
                                        borderRadius: 2,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            backgroundColor: 'rgba(39, 39, 42, 0.5)',
                                            border: '1px solid #3f3f46',
                                        },
                                    }}
                                >
                                    {/* Achievement Icon */}
                                    <Box
                                        sx={{
                                            flexShrink: 0,
                                            width: 64,
                                            height: 64,
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

                                    {/* Achievement Info */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: 'Inter, sans-serif',
                                                color: zincColors.white,
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                marginBottom: 0.5,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
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
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ActivitySparkline;
