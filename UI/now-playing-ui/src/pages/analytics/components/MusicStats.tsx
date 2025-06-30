import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent
} from '@mui/material';
import HeadsetIcon from '@mui/icons-material/Headset';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface MusicStatsProps {
    data: any;
}

const MusicStats: React.FC<MusicStatsProps> = ({ data }) => {
    const { comprehensive_stats, platform_distribution } = data;

    // Music platforms data
    const musicPlatforms = [
        { name: 'Spotify', data: platform_distribution.spotify, color: '#1db954', icon: '🎵' },
        { name: 'Last.fm', data: platform_distribution.lastfm, color: '#d51007', icon: '📻' },
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
                Music Statistics
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
                            backgroundColor: '#4ecdc4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <HeadsetIcon fontSize="large" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Songs Listened
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_songs_listened}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {comprehensive_stats.averages.avg_songs_per_day.toFixed(1)} per day
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
                            <Typography variant="subtitle2" color="text.secondary">
                                Total Listening Time
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#333' }}>
                                {comprehensive_stats.totals.total_listening_time}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {comprehensive_stats.averages.avg_listening_time_per_day} per day
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
                {musicPlatforms.map((platform) => (
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
                                    <Typography variant="body2" color="text.secondary">Songs:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.songs}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Listening Time:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.listening_time}</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Daily Music Activity */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Daily Music Activity
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
                                        background: day.songs_listened > 0 ? 'linear-gradient(to top, #4ecdc4, #44a08d)' : '#e0e0e0',
                                        opacity: day.songs_listened > 0 ? 1 : 0.3,
                                        height: `${Math.max((day.songs_listened / 50) * 100, 5)}%`,
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

export default MusicStats; 