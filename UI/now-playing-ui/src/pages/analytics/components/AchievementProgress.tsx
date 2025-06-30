import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

interface AchievementProgressProps {
    data: any;
}

const AchievementProgress: React.FC<AchievementProgressProps> = ({ data }) => {
    const { comprehensive_stats, achievement_efficiency, gaming_streaks } = data;

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
                Achievement Progress
            </Typography>

            {/* Achievement Overview */}
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
                            backgroundColor: '#4ecdc4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <EmojiEventsIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Total Achievements
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_achievements_earned}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
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
                            backgroundColor: '#ff6b6b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <LocalFireDepartmentIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Efficiency Rate
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {achievement_efficiency.efficiency_per_hour.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                achievements per hour
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
                            <TrendingUpIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Best Streak
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {gaming_streaks.length > 0 ? gaming_streaks[0].streak_length : 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                days
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Achievement Efficiency Details */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Achievement Efficiency Details
            </Typography>
            <Card sx={{ mb: 4 }}>
                <CardContent>
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
                    gap: 2
                }}>
                    {gaming_streaks.slice(0, 3).map((streak: any, index: number) => (
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
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="h4" sx={{ mb: 2 }}>🏆</Typography>
                        <Typography variant="body1" color="text.secondary">
                            No gaming streaks recorded yet. Start playing daily to build your streak!
                        </Typography>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default AchievementProgress; 