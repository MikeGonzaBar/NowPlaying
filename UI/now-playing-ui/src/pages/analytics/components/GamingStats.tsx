import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip
} from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BarChartIcon from '@mui/icons-material/BarChart';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

interface GamingStatsProps {
    data: any;
}

const GamingStats: React.FC<GamingStatsProps> = ({ data }) => {
    const { comprehensive_stats, platform_distribution, achievement_efficiency, gaming_streaks } = data;

    // Calculate completion rate
    const totalGames = Object.values(platform_distribution)
        .filter((platform: any) => platform.games !== undefined)
        .reduce((sum: number, platform: any) => sum + platform.games, 0);

    const completionRate = totalGames > 0 ? (comprehensive_stats.totals.total_games_completed / totalGames * 100) : 0;

    // Gaming platforms data
    const gamingPlatforms = [
        { name: 'Steam', data: platform_distribution.steam, color: '#1b2838', icon: '🎮' },
        { name: 'PlayStation', data: platform_distribution.psn, color: '#003791', icon: '🎯' },
        { name: 'Xbox', data: platform_distribution.xbox, color: '#107c10', icon: '🎮' },
        { name: 'RetroAchievements', data: platform_distribution.retroachievements, color: '#ff6b35', icon: '🏆' },
    ];

    return (
        <Box>
            <Typography
                variant="h5"
                sx={{
                    mb: 4,
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 600,
                    color: '#333',
                    textAlign: 'center'
                }}
            >
                Gaming Statistics
            </Typography>

            {/* Overview Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 3,
                mb: 4
            }}>
                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundColor: '#ff6b6b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <SportsEsportsIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#555', fontWeight: 500 }}>
                                Games Played
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_games_played}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                                {comprehensive_stats.averages.avg_games_per_day.toFixed(1)} per day
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundColor: '#4ecdc4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <EmojiEventsIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#555', fontWeight: 500 }}>
                                Achievements Earned
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_achievements_earned}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                                {comprehensive_stats.averages.avg_achievements_per_day.toFixed(1)} per day
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundColor: '#a8edea',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#333'
                        }}>
                            <AccessTimeIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#555', fontWeight: 500 }}>
                                Total Gaming Time
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_gaming_time}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                                {comprehensive_stats.averages.avg_gaming_time_per_day} per day
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundColor: '#667eea',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <BarChartIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#555', fontWeight: 500 }}>
                                Completion Rate
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {completionRate.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                                {comprehensive_stats.totals.total_games_completed} of {totalGames} games
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Platform Distribution */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Platform Distribution
            </Typography>
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 3,
                mb: 4
            }}>
                {gamingPlatforms.map((platform) => (
                    <Card key={platform.name} sx={{ borderLeft: `4px solid ${platform.color}` }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                    {platform.name}
                                </Typography>
                                <Typography variant="h4">{platform.icon}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Games:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.games}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Achievements:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.achievements}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Playtime:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.playtime}</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Achievement Efficiency */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Achievement Efficiency
            </Typography>
            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                        <Box sx={{
                            width: 70,
                            height: 70,
                            borderRadius: '50%',
                            backgroundColor: '#4ecdc4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <LocalFireDepartmentIcon fontSize="large" />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">
                                Efficiency Score
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, color: '#333' }}>
                                {achievement_efficiency.efficiency_per_hour.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                achievements per hour
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 2
                    }}>
                        <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">Total Achievements:</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {achievement_efficiency.total_achievements}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">Total Gaming Time:</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {achievement_efficiency.total_gaming_time}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Gaming Streaks */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Gaming Streaks
            </Typography>
            {gaming_streaks.length > 0 ? (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: 2,
                    mb: 4
                }}>
                    {gaming_streaks.slice(0, 5).map((streak: any, index: number) => (
                        <Card key={index}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Chip
                                        label={`#${index + 1}`}
                                        size="small"
                                        sx={{ backgroundColor: '#667eea', color: 'white' }}
                                    />
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#333' }}>
                                        {streak.streak_length} days
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {new Date(streak.start_date).toLocaleDateString()} - {new Date(streak.end_date).toLocaleDateString()}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">Games:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{streak.games_played}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">Achievements:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{streak.achievements_earned}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">Time:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{streak.total_gaming_time}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <Card sx={{ mb: 4 }}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="h4" sx={{ mb: 2 }}>📅</Typography>
                        <Typography variant="body1" color="text.secondary">
                            No gaming streaks recorded yet. Start playing daily to build your streak!
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {/* Daily Gaming Activity */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Daily Gaming Activity
            </Typography>
            <Card>
                <CardContent>
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        alignItems: 'end',
                        height: 200,
                        p: 2,
                        backgroundColor: 'white',
                        borderRadius: 2
                    }}>
                        {comprehensive_stats.daily_stats.slice(-7).map((day: any, index: number) => (
                            <Box key={index} sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                height: '100%',
                                width: 60,
                                position: 'relative'
                            }}>
                                <Box
                                    sx={{
                                        width: 40,
                                        borderRadius: '4px 4px 0 0',
                                        background: day.games_played > 0 ? 'linear-gradient(to top, #ff6b6b, #ee5a24)' : '#e0e0e0',
                                        opacity: day.games_played > 0 ? 1 : 0.3,
                                        height: `${Math.max((day.games_played / 10) * 100, 5)}%`,
                                        minHeight: 5,
                                        transition: 'height 0.5s ease'
                                    }}
                                />
                                <Typography variant="caption" sx={{ mt: 1, color: '#666', fontWeight: 500 }}>
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default GamingStats; 