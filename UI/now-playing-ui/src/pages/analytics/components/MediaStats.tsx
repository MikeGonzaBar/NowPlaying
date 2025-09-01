import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface MediaStatsProps {
    data: any;
}

const MediaStats: React.FC<MediaStatsProps> = ({ data }) => {
    const { comprehensive_stats, platform_distribution } = data;

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
                Movies & TV Statistics
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
                            backgroundColor: '#e50914',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <MovieIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#555', fontWeight: 500 }}>
                                Movies Watched
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_movies_watched}
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
                            backgroundColor: '#1a75ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <TvIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#555', fontWeight: 500 }}>
                                Episodes Watched
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_episodes_watched}
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
                                Total Watch Time
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_watch_time}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Platform Distribution */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Platform Distribution
            </Typography>
            <Card sx={{ mb: 4, borderLeft: '4px solid #ed1c24' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                            Trakt
                        </Typography>
                        <Typography variant="h4">📺</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Movies:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                                {platform_distribution.trakt?.movies || 0}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Episodes:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                                {platform_distribution.trakt?.episodes || 0}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Watch Time:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                                {platform_distribution.trakt?.watch_time || '0h 0m'}
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Daily Watching Activity */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Daily Watching Activity
            </Typography>
            <Card sx={{ mb: 4 }}>
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
                                        background: (day.movies_watched + day.episodes_watched) > 0 ? 'linear-gradient(to top, #a8edea, #fed6e3)' : '#d0d0d0',
                                        opacity: (day.movies_watched + day.episodes_watched) > 0 ? 1 : 0.6,
                                        height: `${Math.max(((day.movies_watched + day.episodes_watched) / 10) * 100, 5)}%`,
                                        minHeight: 5,
                                        transition: 'height 0.5s ease'
                                    }}
                                />
                                <Typography variant="caption" sx={{ mt: 1, color: '#444', fontWeight: 600 }}>
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </Card>

            {/* Watching Insights */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Watching Insights
            </Typography>
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 3
            }}>
                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4">📈</Typography>
                        <Box>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                Daily Average
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                {((comprehensive_stats.totals.total_movies_watched + comprehensive_stats.totals.total_episodes_watched) / 7).toFixed(1)} items per day
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4">📺</Typography>
                        <Box>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                Content Preference
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                {comprehensive_stats.totals.total_episodes_watched > comprehensive_stats.totals.total_movies_watched
                                    ? 'You prefer TV shows over movies'
                                    : 'You prefer movies over TV shows'}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4">⏰</Typography>
                        <Box>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                Watch Time Per Day
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                {comprehensive_stats.averages.avg_watch_time_per_day}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default MediaStats; 