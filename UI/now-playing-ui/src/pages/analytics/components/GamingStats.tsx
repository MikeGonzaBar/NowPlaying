import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
} from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

interface GamingStatsProps {
    data: any;
}

const GamingStats: React.FC<GamingStatsProps> = ({ data }) => {
    const { comprehensive_stats, platform_distribution, achievement_efficiency, gaming_streaks, weekly_trend, most_played_game, hardest_achievement } = data;

    // Calculate completion rate - placeholder for now, needs API support
    const totalGames = Object.values(platform_distribution)
        .filter((platform: any) => platform.games !== undefined)
        .reduce((sum: number, platform: any) => sum + platform.games, 0);

    const completionRate = comprehensive_stats.totals.total_games_completed
        ? ((comprehensive_stats.totals.total_games_completed / totalGames) * 100).toFixed(1)
        : '0.0';

    // Format gaming time - parse the formatted string or use directly
    const formatTimeString = (timeStr: string) => {
        // If it's already formatted like "16 days, 16 hours and 35 minutes", return as is
        // Otherwise, try to format it
        return timeStr || '0 minutes';
    };

    // Platform data with icons
    const platforms = [
        {
            name: 'Steam',
            data: platform_distribution.steam,
            color: '#6366f1',
            icon: VideogameAssetIcon,
            borderColor: '#6366f1'
        },
        {
            name: 'PlayStation',
            data: platform_distribution.psn,
            color: '#3b82f6',
            icon: VideogameAssetIcon,
            borderColor: '#3b82f6'
        },
        {
            name: 'Xbox',
            data: platform_distribution.xbox,
            color: '#10b981',
            icon: VideogameAssetIcon,
            borderColor: '#10b981'
        },
        {
            name: 'RetroAchievements',
            data: platform_distribution.retroachievements,
            color: '#f97316',
            icon: MilitaryTechIcon,
            borderColor: '#f97316'
        },
    ];

    // Most played game - use API data or fallback
    const mostPlayedGame = most_played_game || {
        name: 'N/A',
        image_url: null
    };

    // Hardest achievement - use API data or fallback
    const hardestAchievementData = hardest_achievement || {
        name: 'N/A',
        rarity_percentage: null
    };

    // Gaming consistency - calculate from daily stats
    const daysWithGaming = comprehensive_stats.daily_stats.filter((day: any) => day.games_played > 0).length;
    const totalDays = comprehensive_stats.period.days;
    const consistencyText = `Playing on ${daysWithGaming}/${totalDays} days`;

    // Daily gaming activity data - use weekly_trend or calculate from daily_stats
    const dailyActivityData = weekly_trend && weekly_trend.length > 0
        ? weekly_trend.map((day: any) => ({
            dayName: day.day_name?.toUpperCase() || 'MON',
            hoursPerDay: day.gaming_time_hours || 0,
            avgSession: (day.avg_session_duration_minutes || 0) / 60, // Convert minutes to hours
            relativeHeight: day.relative_height || 0
        }))
        : Array.from({ length: 7 }, (_, i) => {
            const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
            return {
                dayName: dayNames[i],
                hoursPerDay: 0,
                avgSession: 0,
                relativeHeight: 0
            };
        });

    const maxHours = Math.max(...dailyActivityData.map((d: any) => d.hoursPerDay), 1);

    return (
        <Box sx={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Stats Overview Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 5
            }}>
                {/* Games Played */}
                <Card sx={{
                    bgcolor: '#1a1d23',
                    border: '1px solid #27272a',
                    borderRadius: '1rem',
                    p: 3,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444'
                        }}>
                            <SportsEsportsIcon />
                        </Box>
                        <Box>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Games Played
                            </Typography>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                                {comprehensive_stats.totals.total_games_played}
                            </Typography>
                            <Typography sx={{
                                fontSize: '10px',
                                color: '#94a3b8',
                                mt: 0.5
                            }}>
                                {comprehensive_stats.averages.avg_games_per_day.toFixed(1)} per day
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        p: 1,
                        opacity: 0.05
                    }}>
                        <SportsEsportsIcon sx={{ fontSize: '4rem' }} />
                    </Box>
                </Card>

                {/* Achievements Earned */}
                <Card sx={{
                    bgcolor: '#1a1d23',
                    border: '1px solid #27272a',
                    borderRadius: '1rem',
                    p: 3,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            bgcolor: 'rgba(6, 182, 212, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#06b6d4'
                        }}>
                            <EmojiEventsIcon />
                        </Box>
                        <Box>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Achievements Earned
                            </Typography>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                                {comprehensive_stats.totals.total_achievements_earned}
                            </Typography>
                            <Typography sx={{
                                fontSize: '10px',
                                color: '#94a3b8',
                                mt: 0.5
                            }}>
                                {comprehensive_stats.averages.avg_achievements_per_day.toFixed(1)} per day
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        p: 1,
                        opacity: 0.05,
                        color: '#06b6d4'
                    }}>
                        <EmojiEventsIcon sx={{ fontSize: '4rem' }} />
                    </Box>
                </Card>

                {/* Total Gaming Time */}
                <Card sx={{
                    bgcolor: '#1a1d23',
                    border: '1px solid #27272a',
                    borderRadius: '1rem',
                    p: 3,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            bgcolor: 'rgba(20, 184, 166, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#14b8a6'
                        }}>
                            <ScheduleIcon />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Total Gaming Time
                            </Typography>
                            <Typography sx={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: '#fff',
                                truncate: true
                            }}>
                                {formatTimeString(comprehensive_stats.totals.total_gaming_time)}
                            </Typography>
                            <Typography sx={{
                                fontSize: '10px',
                                color: '#94a3b8',
                                mt: 0.5
                            }}>
                                Avg: {comprehensive_stats.averages.avg_gaming_time_per_day} / day
                            </Typography>
                        </Box>
                    </Box>
                </Card>

                {/* Completion Rate */}
                <Card sx={{
                    bgcolor: '#1a1d23',
                    border: '1px solid #27272a',
                    borderRadius: '1rem',
                    p: 3,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            bgcolor: 'rgba(99, 102, 241, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6366f1'
                        }}>
                            <ChecklistRtlIcon />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Completion Rate
                            </Typography>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                                {completionRate}%
                            </Typography>
                            <Box sx={{
                                width: '100%',
                                bgcolor: '#27272a',
                                height: 4,
                                mt: 1,
                                borderRadius: '999px',
                                overflow: 'hidden'
                            }}>
                                <Box sx={{
                                    bgcolor: '#f97316',
                                    height: '100%',
                                    borderRadius: '999px',
                                    width: `${completionRate}%`,
                                    transition: 'width 0.3s'
                                }} />
                            </Box>
                        </Box>
                    </Box>
                </Card>
            </Box>

            {/* Platform Distribution */}
            <Box sx={{ mb: 6 }}>
                <Typography sx={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    mb: 2
                }}>
                    Platform Distribution
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                    gap: 2
                }}>
                    {platforms.map((platform) => {
                        const IconComponent = platform.icon;
                        return (
                            <Card key={platform.name} sx={{
                                bgcolor: '#1a1d23',
                                border: '1px solid #27272a',
                                borderLeft: `4px solid ${platform.borderColor}`,
                                borderRadius: '0.75rem',
                                p: 2.5
                            }}>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    mb: 2
                                }}>
                                    <Typography sx={{
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        color: '#fff'
                                    }}>
                                        {platform.name}
                                    </Typography>
                                    <IconComponent sx={{
                                        color: platform.color,
                                        fontSize: '1.125rem'
                                    }} />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '12px',
                                        color: '#94a3b8'
                                    }}>
                                        <span>Games:</span>
                                        <Typography component="span" sx={{ color: '#e2e8f0' }}>{platform.data.games}</Typography>
                                    </Box>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '12px',
                                        color: '#94a3b8'
                                    }}>
                                        <span>Achievements:</span>
                                        <Typography component="span" sx={{ color: '#e2e8f0' }}>{platform.data.achievements}</Typography>
                                    </Box>
                                    <Typography sx={{
                                        mt: 1,
                                        fontSize: '10px',
                                        lineHeight: 1.4,
                                        color: '#64748b'
                                    }}>
                                        Playtime: {platform.data.playtime || '0 minutes'}
                                    </Typography>
                                </Box>
                            </Card>
                        );
                    })}
                </Box>
            </Box>

            {/* Achievement Efficiency & Gaming Streaks */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
                gap: 3,
                mb: 6
            }}>
                {/* Achievement Efficiency */}
                <Card sx={{
                    bgcolor: '#1a1d23',
                    border: '1px solid #27272a',
                    borderRadius: '1rem',
                    p: 3
                }}>
                    <Typography sx={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        mb: 3
                    }}>
                        Achievement Efficiency
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                        <Box sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            bgcolor: 'rgba(20, 184, 166, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#14b8a6'
                        }}>
                            <LocalFireDepartmentIcon sx={{ fontSize: '2rem' }} />
                        </Box>
                        <Box>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Efficiency Score
                            </Typography>
                            <Typography sx={{ fontSize: '1.875rem', fontWeight: 700, color: '#fff' }}>
                                {achievement_efficiency.efficiency_per_hour.toFixed(2)}
                            </Typography>
                            <Typography sx={{
                                fontSize: '12px',
                                color: '#94a3b8'
                            }}>
                                achievements per hour
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 2
                    }}>
                        <Box sx={{
                            bgcolor: 'rgba(17, 24, 39, 0.5)',
                            p: 2,
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(39, 39, 42, 0.5)'
                        }}>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Total Achievements
                            </Typography>
                            <Typography sx={{
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                color: '#e2e8f0'
                            }}>
                                {achievement_efficiency.total_achievements}
                            </Typography>
                        </Box>
                        <Box sx={{
                            bgcolor: 'rgba(17, 24, 39, 0.5)',
                            p: 2,
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(39, 39, 42, 0.5)'
                        }}>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Total Gaming Time
                            </Typography>
                            <Typography sx={{
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                color: '#e2e8f0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {achievement_efficiency.total_gaming_time}
                            </Typography>
                        </Box>
                    </Box>
                </Card>

                {/* Gaming Streaks */}
                <Card sx={{
                    bgcolor: '#1a1d23',
                    border: '1px solid #27272a',
                    borderRadius: '1rem',
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    <Typography sx={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        alignSelf: 'flex-start',
                        mb: 3
                    }}>
                        Gaming Streaks
                    </Typography>
                    {gaming_streaks.length > 0 ? (
                        <Box>
                            {gaming_streaks.slice(0, 3).map((streak: any, index: number) => (
                                <Box key={index} sx={{ mb: 2 }}>
                                    <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                                        {streak.streak_length} days
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Box sx={{ py: 4 }}>
                            <Box sx={{
                                width: 48,
                                height: 48,
                                bgcolor: 'rgba(39, 39, 42, 0.5)',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2
                            }}>
                                <CalendarTodayIcon sx={{ color: '#475569', fontSize: '1.5rem' }} />
                            </Box>
                            <Typography sx={{
                                color: '#94a3b8',
                                fontSize: '14px'
                            }}>
                                No gaming streaks recorded yet.<br />Start playing daily to build your streak!
                            </Typography>
                        </Box>
                    )}
                </Card>
            </Box>

            {/* Daily Gaming Activity */}
            <Card sx={{
                bgcolor: '#1a1d23',
                border: '1px solid #27272a',
                borderRadius: '1rem',
                p: 4,
                mb: 6
            }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 4
                }}>
                    <Typography sx={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#fff'
                    }}>
                        Daily Gaming Activity
                    </Typography>
                    <Box sx={{
                        display: 'flex',
                        gap: 4,
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: '#f97316'
                            }} />
                            <Typography component="span" sx={{ color: '#64748b' }}>Hours / Day</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: 'rgba(251, 191, 36, 0.5)'
                            }} />
                            <Typography component="span" sx={{ color: '#64748b' }}>Avg. Session</Typography>
                        </Box>
                    </Box>
                </Box>
                <Box sx={{
                    height: 256,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 2,
                    px: 1
                }}>
                    {dailyActivityData.map((day: any, index: number) => {
                        const hoursHeight = maxHours > 0 ? (day.hoursPerDay / maxHours) * 100 : 0;
                        const sessionHeight = maxHours > 0 ? (day.avgSession / maxHours) * 100 : 0;
                        return (
                            <Box
                                key={index}
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                    height: '100%',
                                    justifyContent: 'flex-end',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        '& > div:first-of-type': {
                                            bgcolor: 'rgba(251, 191, 36, 0.4)'
                                        },
                                        '& > div:nth-of-type(2)': {
                                            filter: 'brightness(1.1)'
                                        }
                                    }
                                }}
                            >
                                <Box sx={{
                                    width: '100%',
                                    bgcolor: 'rgba(251, 191, 36, 0.2)',
                                    height: `${Math.max(sessionHeight, 5)}%`,
                                    borderRadius: '0.375rem',
                                    transition: 'background-color 0.2s'
                                }} />
                                <Box sx={{
                                    width: '100%',
                                    bgcolor: '#f97316',
                                    height: `${Math.max(hoursHeight, 5)}%`,
                                    borderRadius: '0.375rem',
                                    transition: 'filter 0.2s'
                                }} />
                                <Typography sx={{
                                    fontSize: '10px',
                                    color: '#64748b',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    mt: 1
                                }}>
                                    {day.dayName}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Card>

            {/* Quick Insights */}
            <Box>
                <Typography sx={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#fff',
                    mb: 3
                }}>
                    Quick Insights
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                    gap: 3
                }}>
                    {/* Most Played Game */}
                    <Card sx={{
                        bgcolor: '#1a1d23',
                        border: '1px solid #27272a',
                        borderRadius: '1rem',
                        p: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        '&:hover': {
                            borderColor: 'rgba(249, 115, 22, 0.5)'
                        }
                    }}>
                        <Box sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '0.75rem',
                            bgcolor: '#27272a',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: '1px solid #3f3f46'
                        }}>
                            {mostPlayedGame.image_url ? (
                                <Box
                                    component="img"
                                    src={mostPlayedGame.image_url}
                                    alt="Game Thumbnail"
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        opacity: 0.8
                                    }}
                                />
                            ) : (
                                <Box sx={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#f97316'
                                }}>
                                    <SportsEsportsIcon />
                                </Box>
                            )}
                        </Box>
                        <Box>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Most Played Game
                            </Typography>
                            <Typography sx={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#e2e8f0'
                            }}>
                                {mostPlayedGame.name || 'N/A'}
                            </Typography>
                        </Box>
                    </Card>

                    {/* Hardest Achievement */}
                    <Card sx={{
                        bgcolor: '#1a1d23',
                        border: '1px solid #27272a',
                        borderRadius: '1rem',
                        p: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        '&:hover': {
                            borderColor: 'rgba(249, 115, 22, 0.5)'
                        }
                    }}>
                        <Box sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '0.75rem',
                            bgcolor: 'rgba(154, 52, 18, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f97316',
                            border: '1px solid rgba(249, 115, 22, 0.2)'
                        }}>
                            <MilitaryTechIcon sx={{ fontSize: '1.875rem' }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Hardest Achievement
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: '#e2e8f0',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {hardestAchievementData.name || 'N/A'}
                                </Typography>
                                {hardestAchievementData.rarity_percentage && (
                                    <Box sx={{
                                        fontSize: '10px',
                                        px: 1,
                                        py: 0.5,
                                        bgcolor: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: '0.25rem',
                                        fontWeight: 700
                                    }}>
                                        {hardestAchievementData.rarity_percentage}%
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Card>

                    {/* Gaming Consistency */}
                    <Card sx={{
                        bgcolor: '#1a1d23',
                        border: '1px solid #27272a',
                        borderRadius: '1rem',
                        p: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        '&:hover': {
                            borderColor: 'rgba(249, 115, 22, 0.5)'
                        }
                    }}>
                        <Box sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '0.75rem',
                            bgcolor: 'rgba(154, 52, 18, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f97316',
                            border: '1px solid rgba(249, 115, 22, 0.2)'
                        }}>
                            <CalendarMonthIcon sx={{ fontSize: '1.875rem' }} />
                        </Box>
                        <Box>
                            <Typography sx={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Gaming Consistency
                            </Typography>
                            <Typography sx={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#e2e8f0'
                            }}>
                                {consistencyText}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                {Array.from({ length: 5 }).map((_, i) => {
                                    const shouldShow = (daysWithGaming / totalDays) >= (i + 1) / 5;
                                    return (
                                        <Box
                                            key={i}
                                            sx={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                bgcolor: shouldShow ? '#f97316' : '#374151'
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        </Box>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default GamingStats;
