import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Alert,
    CircularProgress,
    Button,
    Card,
    CardContent,
    Tabs,
    Tab
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useApi } from '../../hooks/useApi';
import { getApiUrl } from '../../config/api';
import SideBar from '../../components/sideBar';
import GamingStats from './components/GamingStats';
import MusicStats from './components/MusicStats';
import MediaStats from './components/MediaStats';
import PlatformComparison from './components/PlatformComparison';
import DailyActivity from './components/DailyActivity';
import AchievementProgress from './components/AchievementProgress';

interface AnalyticsData {
    comprehensive_stats: {
        period: {
            start_date: string;
            end_date: string;
            days: number;
        };
        totals: {
            total_games_played: number;
            total_achievements_earned: number;
            total_gaming_time: string;
            total_songs_listened: number;
            total_listening_time: string;
            total_movies_watched: number;
            total_episodes_watched: number;
            total_watch_time: string;
            total_engagement_time: string;
        };
        averages: {
            avg_games_per_day: number;
            avg_achievements_per_day: number;
            avg_songs_per_day: number;
            avg_gaming_time_per_day: string;
            avg_listening_time_per_day: string;
            avg_watch_time_per_day: string;
        };
        daily_stats: Array<{
            date: string;
            games_played: number;
            achievements_earned: number;
            songs_listened: number;
            movies_watched: number;
            episodes_watched: number;
            total_engagement_time: string;
        }>;
    };
    platform_distribution: {
        steam: { games: number; achievements: number; playtime: string };
        psn: { games: number; achievements: number; playtime: string };
        xbox: { games: number; achievements: number; playtime: string };
        retroachievements: { games: number; achievements: number; playtime: string };
        spotify: { songs: number; listening_time: string };
        lastfm: { songs: number; listening_time: string };
        trakt: { movies: number; episodes: number; watch_time: string };
    };
    achievement_efficiency: {
        total_achievements: number;
        total_gaming_time: string;
        efficiency_per_hour: number;
    };
    gaming_streaks: Array<{
        start_date: string;
        end_date: string;
        streak_length: number;
        total_gaming_time: string;
        games_played: number;
        achievements_earned: number;
    }>;
}

const AnalyticsPage: React.FC = () => {
    const { request } = useApi();
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<number>(0);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await request(getApiUrl('/analytics/'));
            setAnalyticsData(response);
        } catch (err) {
            console.error('Error fetching analytics data:', err);
            setError('Failed to load analytics data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex" }}>
                <SideBar activeItem="Analytics" />
                <Box component="main" sx={{ width: "89vw", p: 4 }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '60vh'
                    }}>
                        <CircularProgress size={60} sx={{ mb: 3 }} />
                        <Typography variant="h6" color="text.secondary">
                            Loading your analytics...
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: "flex" }}>
                <SideBar activeItem="Analytics" />
                <Box component="main" sx={{ width: "89vw", p: 4 }}>
                    <Alert
                        severity="error"
                        sx={{ mb: 3 }}
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={fetchAnalyticsData}
                                startIcon={<RefreshIcon />}
                            >
                                Retry
                            </Button>
                        }
                    >
                        <Typography variant="h6" sx={{ mb: 1 }}>Error Loading Analytics</Typography>
                        <Typography variant="body2">{error}</Typography>
                    </Alert>
                </Box>
            </Box>
        );
    }

    if (!analyticsData) {
        return (
            <Box sx={{ display: "flex" }}>
                <SideBar activeItem="Analytics" />
                <Box component="main" sx={{ width: "89vw", p: 4 }}>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>No Data Available</Typography>
                        <Typography variant="body2">
                            No analytics data found. Start using the app to see your statistics!
                        </Typography>
                    </Alert>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex" }}>
            <SideBar activeItem="Analytics" />
            <Box component="main" sx={{ width: "89vw", p: 3 }}>
                <Typography
                    variant="h4"
                    sx={{
                        mb: 1,
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 'bold',
                        color: '#333'
                    }}
                >
                    Analytics Dashboard
                </Typography>

                <Typography
                    variant="subtitle1"
                    sx={{
                        mb: 1,
                        fontFamily: 'Inter, sans-serif',
                        color: '#555',
                        fontWeight: 500
                    }}
                >
                    Your entertainment statistics for the last {analyticsData.comprehensive_stats.period.days} days
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        mb: 3,
                        fontFamily: 'Inter, sans-serif',
                        color: '#666',
                        fontWeight: 500
                    }}
                >
                    {new Date(analyticsData.comprehensive_stats.period.start_date).toLocaleDateString()} -
                    {new Date(analyticsData.comprehensive_stats.period.end_date).toLocaleDateString()}
                </Typography>

                <Card sx={{ mb: 3 }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            '& .MuiTab-root': {
                                fontFamily: 'Inter, sans-serif',
                                textTransform: 'none',
                                fontWeight: 500,
                            }
                        }}
                    >
                        <Tab label="Overview" />
                        <Tab label="Gaming" />
                        <Tab label="Music" />
                        <Tab label="Movies & TV" />
                        <Tab label="Platforms" />
                        <Tab label="Daily Activity" />
                        <Tab label="Achievements" />
                    </Tabs>

                    <CardContent sx={{ p: 3 }}>
                        {activeTab === 0 && (
                            <Box>
                                {/* Overview Section */}
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: 3,
                                    mb: 4
                                }}>
                                    <Card sx={{
                                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                                        color: 'white'
                                    }}>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Inter, sans-serif' }}>
                                                🎮 Gaming
                                            </Typography>
                                            <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
                                                {analyticsData.comprehensive_stats.totals.total_games_played}
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                                                Games Played
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                                {analyticsData.comprehensive_stats.totals.total_achievements_earned} achievements
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                                {analyticsData.comprehensive_stats.totals.total_gaming_time}
                                            </Typography>
                                        </CardContent>
                                    </Card>

                                    <Card sx={{
                                        background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                                        color: 'white'
                                    }}>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Inter, sans-serif' }}>
                                                🎵 Music
                                            </Typography>
                                            <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
                                                {analyticsData.comprehensive_stats.totals.total_songs_listened}
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                                                Songs Listened
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                                {analyticsData.comprehensive_stats.averages.avg_songs_per_day.toFixed(1)} per day
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                                {analyticsData.comprehensive_stats.totals.total_listening_time}
                                            </Typography>
                                        </CardContent>
                                    </Card>

                                    <Card sx={{
                                        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                                        color: '#333'
                                    }}>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Inter, sans-serif' }}>
                                                📺 Movies & TV
                                            </Typography>
                                            <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
                                                {analyticsData.comprehensive_stats.totals.total_movies_watched +
                                                    analyticsData.comprehensive_stats.totals.total_episodes_watched}
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                                                Items Watched
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                                {analyticsData.comprehensive_stats.totals.total_movies_watched} movies,
                                                {analyticsData.comprehensive_stats.totals.total_episodes_watched} episodes
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                                {analyticsData.comprehensive_stats.totals.total_watch_time}
                                            </Typography>
                                        </CardContent>
                                    </Card>

                                    <Card sx={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white'
                                    }}>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Inter, sans-serif' }}>
                                                ⚡ Total Engagement
                                            </Typography>
                                            <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
                                                {analyticsData.comprehensive_stats.totals.total_engagement_time}
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                                                Time Spent
                                            </Typography>
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                                Across {Object.keys(analyticsData.platform_distribution).length} platforms
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Box>

                                {/* Quick Insights */}
                                <Typography variant="h5" sx={{ mb: 3, fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
                                    Quick Insights
                                </Typography>
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                    gap: 3
                                }}>
                                    <Card>
                                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography variant="h4">🏆</Typography>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                                    Best Gaming Streak
                                                </Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    {analyticsData.gaming_streaks.length > 0
                                                        ? `${analyticsData.gaming_streaks[0].streak_length} days`
                                                        : 'No streaks yet'}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography variant="h4">⚡</Typography>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                                    Achievement Efficiency
                                                </Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    {analyticsData.achievement_efficiency.efficiency_per_hour.toFixed(2)} per hour
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography variant="h4">🎯</Typography>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                                    Most Active Platform
                                                </Typography>
                                                <Typography variant="body1" color="text.secondary">
                                                    {(() => {
                                                        const platforms = analyticsData.platform_distribution;
                                                        const gamingPlatforms = ['steam', 'psn', 'xbox', 'retroachievements'];
                                                        const musicPlatforms = ['spotify', 'lastfm'];

                                                        let maxActivity = 0;
                                                        let mostActive = '';

                                                        gamingPlatforms.forEach(platform => {
                                                            const platformData = platforms[platform as keyof typeof platforms];
                                                            if (platformData && 'games' in platformData && platformData.games > maxActivity) {
                                                                maxActivity = platformData.games;
                                                                mostActive = platform;
                                                            }
                                                        });

                                                        musicPlatforms.forEach(platform => {
                                                            const platformData = platforms[platform as keyof typeof platforms];
                                                            if (platformData && 'songs' in platformData && platformData.songs > maxActivity) {
                                                                maxActivity = platformData.songs;
                                                                mostActive = platform;
                                                            }
                                                        });

                                                        return mostActive.charAt(0).toUpperCase() + mostActive.slice(1);
                                                    })()}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Box>
                            </Box>
                        )}

                        {activeTab === 1 && <GamingStats data={analyticsData} />}
                        {activeTab === 2 && <MusicStats data={analyticsData} />}
                        {activeTab === 3 && <MediaStats data={analyticsData} />}
                        {activeTab === 4 && <PlatformComparison data={analyticsData} />}
                        {activeTab === 5 && <DailyActivity data={analyticsData} />}
                        {activeTab === 6 && <AchievementProgress data={analyticsData} />}
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default AnalyticsPage; 