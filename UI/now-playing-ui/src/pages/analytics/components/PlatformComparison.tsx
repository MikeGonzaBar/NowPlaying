import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent
} from '@mui/material';

interface PlatformComparisonProps {
    data: any;
}

const PlatformComparison: React.FC<PlatformComparisonProps> = ({ data }) => {
    const { platform_distribution } = data;

    const platforms = [
        { name: 'Steam', data: platform_distribution.steam, color: '#1b2838', icon: '🎮', type: 'gaming' },
        { name: 'PlayStation', data: platform_distribution.psn, color: '#003791', icon: '🎯', type: 'gaming' },
        { name: 'Xbox', data: platform_distribution.xbox, color: '#107c10', icon: '🎮', type: 'gaming' },
        { name: 'RetroAchievements', data: platform_distribution.retroachievements, color: '#ff6b35', icon: '🏆', type: 'gaming' },
        { name: 'Spotify', data: platform_distribution.spotify, color: '#1db954', icon: '🎵', type: 'music' },
        { name: 'Last.fm', data: platform_distribution.lastfm, color: '#d51007', icon: '📻', type: 'music' },
        { name: 'Trakt', data: platform_distribution.trakt, color: '#ed1c24', icon: '📺', type: 'media' },
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
                Platform Comparison
            </Typography>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 3
            }}>
                {platforms.map((platform) => (
                    <Card key={platform.name} sx={{ borderLeft: `4px solid ${platform.color}` }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                    {platform.name}
                                </Typography>
                                <Typography variant="h4">{platform.icon}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {platform.type === 'gaming' && (
                                    <>
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
                                    </>
                                )}
                                {platform.type === 'music' && (
                                    <>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Songs:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.songs}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Listening Time:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.listening_time}</Typography>
                                        </Box>
                                    </>
                                )}
                                {platform.type === 'media' && (
                                    <>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Movies:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.movies}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Episodes:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.episodes}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Watch Time:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{platform.data.watch_time}</Typography>
                                        </Box>
                                    </>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>
        </Box>
    );
};

export default PlatformComparison; 