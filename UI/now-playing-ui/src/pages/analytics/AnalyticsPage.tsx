import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Alert,
    CircularProgress,
    Button,
    Card,
    Tabs,
    Tab
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import TvIcon from '@mui/icons-material/Tv';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useApi } from '../../hooks/useApi';
import { getApiUrl } from '../../config/api';
import SideBar from '../../components/sideBar';
import GamingStats from './components/GamingStats';
import MusicStats from './components/MusicStats';
import MediaStats from './components/MediaStats';


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
    monthly_comparison?: {
        current_time: number;
        previous_time: number;
        change_percentage: number;
    };
    platform_count?: number;
    genre_distribution?: {
        genres: Array<{
            name: string;
            percentage: number;
            type: string;
        }>;
        total_tags: number;
    };
    last_played_time?: string | null;
    weekly_trend?: Array<{
        date: string;
        day_name: string;
        gaming_percentage: number;
        music_percentage: number;
        tv_percentage: number;
        gaming_time_hours: number;
        music_time_hours: number;
        tv_time_hours: number;
        relative_height: number;
    }>;
    top_artist?: { name: string; scrobbles: number; top_album?: string } | null;
    top_track?: { title: string; artist: string; plays: number; recently_played?: string } | null;
    new_discoveries?: { new_artists_count: number; change_percentage?: number | null };
    music_listening_insights?: {
        morning_vs_evening: string;
        evening_percentage: number;
        scrobble_milestone: { current: number; target: number; percentage: number };
    } | null;
    music_genre_distribution?: { genres: Array<{ name: string; percentage: number }>; total_count: number };
    music_weekly_scrobbles?: Array<{ date: string; day_name: string; scrobbles: number }>;
    genre_of_the_week?: string | null;
    media_movies_change?: { change: number; current: number; previous: number };
    media_weekly_watch?: Array<{ date: string; day_name: string; movies: number; episodes: number; watch_time_hours: number }>;
    media_watch_breakdown?: { movies_percentage: number; tv_percentage: number };
    media_series_count?: number;
    media_genre_distribution?: { genres: Array<{ name: string; percentage: number }>; total_count: number };
    media_completion_rate?: number | null;
    media_insights?: { binge_streak: string | null; favorite_director: string | null; top_studio: string | null };
}

const AnalyticsPage: React.FC = () => {
    const { request } = useApi();
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);

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

    const formatDateRange = () => {
        const start = new Date(analyticsData.comprehensive_stats.period.start_date);
        const end = new Date(analyticsData.comprehensive_stats.period.end_date);
        return `${start.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`;
    };

    const getMostActivePlatform = () => {
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

        if (mostActive === 'lastfm' || mostActive === 'spotify') {
            return 'Last.fm / Spotify';
        }
        return mostActive.charAt(0).toUpperCase() + mostActive.slice(1);
    };

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#0f1115" }}>
            <SideBar activeItem="Analytics" />
            <Box component="main" sx={{ flexGrow: 1, maxWidth: "1400px", mx: "auto", px: { xs: 2, md: 4, lg: 8 }, py: 8 }}>
                {/* Header */}
                <Box sx={{ mb: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'flex-end' }, gap: 4, mb: 8 }}>
                        <Box>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontSize: '1.875rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    mb: 1
                                }}
                            >
                                Analytics Dashboard
                            </Typography>
                            <Typography
                                sx={{
                                    color: '#94a3b8',
                                    fontSize: '0.875rem',
                                    mt: 1
                                }}
                            >
                                Your entertainment statistics for the last {analyticsData.comprehensive_stats.period.days} days
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Card sx={{
                                bgcolor: '#1a1d23',
                                border: '1px solid #27272a',
                                px: 4,
                                py: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#27272a' }
                            }}>
                                <CalendarTodayIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff' }}>
                                    {formatDateRange()}
                                </Typography>
                            </Card>
                            <Button
                                startIcon={<DownloadIcon />}
                                sx={{
                                    bgcolor: '#6366f1',
                                    color: '#fff',
                                    px: 4,
                                    py: 2,
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    borderRadius: '0.5rem',
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: '#5855eb', opacity: 0.9 }
                                }}
                            >
                                Export
                            </Button>
                        </Box>
                    </Box>
                </Box>

                {/* Navigation Tabs */}
                <Box sx={{ borderBottom: '1px solid #27272a', mb: 8 }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTab-root': {
                                fontFamily: 'Inter, sans-serif',
                                textTransform: 'none',
                                fontWeight: 500,
                                color: '#94a3b8',
                                fontSize: '0.875rem',
                                minHeight: 48,
                                pb: 3,
                                '&.Mui-selected': {
                                    color: '#fff',
                                    borderBottom: '2px solid #fff',
                                },
                                '&:hover': {
                                    color: '#fff',
                                }
                            },
                            '& .MuiTabs-indicator': {
                                display: 'none'
                            }
                        }}
                    >
                        <Tab label="Overview" />
                        <Tab label="Gaming" />
                        <Tab label="Music" />
                        <Tab label="Movies & TV" />
                    </Tabs>
                </Box>

                {activeTab === 0 && (
                    <>
                        <Box>
                            {/* Overview Cards */}
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                                gap: 4,
                                mb: 8
                            }}>
                                {/* Gaming Card */}
                                <Card sx={{
                                    bgcolor: '#ff5f40',
                                    color: '#fff',
                                    p: 6,
                                    borderRadius: '1rem',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                                }}>
                                    <SportsEsportsIcon sx={{
                                        position: 'absolute',
                                        right: -16,
                                        bottom: -16,
                                        fontSize: '6rem',
                                        opacity: 0.1,
                                        transform: 'scale(1.1)',
                                        transition: 'transform 0.2s'
                                    }} />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                        <SportsEsportsIcon sx={{ fontSize: '1.25rem' }} />
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff' }}>
                                            Gaming
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 1, color: '#fff' }}>
                                        {analyticsData.comprehensive_stats.totals.total_games_played}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.875rem', mb: 4, opacity: 0.8, fontWeight: 500, color: '#fff' }}>
                                        Games Played
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography sx={{ fontSize: '0.75rem', opacity: 0.7, color: '#fff' }}>
                                            {analyticsData.comprehensive_stats.totals.total_achievements_earned} achievements
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.75rem', opacity: 0.7, color: '#fff' }}>
                                            {analyticsData.comprehensive_stats.totals.total_gaming_time}
                                        </Typography>
                                    </Box>
                                </Card>

                                {/* Music Card */}
                                <Card sx={{
                                    bgcolor: '#40b3a2',
                                    color: '#fff',
                                    p: 6,
                                    borderRadius: '1rem',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                                }}>
                                    <MusicNoteIcon sx={{
                                        position: 'absolute',
                                        right: -16,
                                        bottom: -16,
                                        fontSize: '6rem',
                                        opacity: 0.1,
                                        transform: 'scale(1.1)',
                                        transition: 'transform 0.2s'
                                    }} />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                        <MusicNoteIcon sx={{ fontSize: '1.25rem' }} />
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff' }}>
                                            Music
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 1, color: '#fff' }}>
                                        {analyticsData.comprehensive_stats.totals.total_songs_listened}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.875rem', mb: 4, opacity: 0.8, fontWeight: 500, color: '#fff' }}>
                                        Songs Listened
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography sx={{ fontSize: '0.75rem', opacity: 0.7, color: '#fff' }}>
                                            {analyticsData.comprehensive_stats.averages.avg_songs_per_day.toFixed(1)} per day
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.75rem', opacity: 0.7, color: '#fff' }}>
                                            Last played: {analyticsData.last_played_time || 'Never'}
                                        </Typography>
                                    </Box>
                                </Card>

                                {/* Movies & TV Card */}
                                <Card sx={{
                                    bgcolor: '#e5e7eb',
                                    color: '#1f2937',
                                    p: 6,
                                    borderRadius: '1rem',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                                }}>
                                    <TvIcon sx={{
                                        position: 'absolute',
                                        right: -16,
                                        bottom: -16,
                                        fontSize: '6rem',
                                        opacity: 0.1,
                                        transform: 'scale(1.1)',
                                        transition: 'transform 0.2s'
                                    }} />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                        <TvIcon sx={{ fontSize: '1.25rem', color: '#4b5563' }} />
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#4b5563' }}>
                                            Movies & TV
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 1, color: '#1f2937' }}>
                                        {analyticsData.comprehensive_stats.totals.total_movies_watched +
                                            analyticsData.comprehensive_stats.totals.total_episodes_watched}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.875rem', mb: 4, color: '#4b5563', fontWeight: 500 }}>
                                        Items Watched
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                            {analyticsData.comprehensive_stats.totals.total_movies_watched} movies, {analyticsData.comprehensive_stats.totals.total_episodes_watched} episodes
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                            {analyticsData.comprehensive_stats.totals.total_watch_time}
                                        </Typography>
                                    </Box>
                                </Card>

                                {/* Total Engagement Card */}
                                <Card sx={{
                                    bgcolor: '#8b5cf6',
                                    color: '#fff',
                                    p: 6,
                                    borderRadius: '1rem',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                                }}>
                                    <BoltIcon sx={{
                                        position: 'absolute',
                                        right: -16,
                                        bottom: -16,
                                        fontSize: '6rem',
                                        opacity: 0.1,
                                        transform: 'scale(1.1)',
                                        transition: 'transform 0.2s',
                                        color: '#fbbf24'
                                    }} />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                        <BoltIcon sx={{ fontSize: '1.25rem', color: '#fbbf24' }} />
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff' }}>
                                            Total Engagement
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, mb: 1, lineHeight: 1.25, color: '#fff' }}>
                                        {analyticsData.comprehensive_stats.totals.total_engagement_time}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.875rem', mb: 4, opacity: 0.8, fontWeight: 500, color: '#fff' }}>
                                        Time Spent
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography sx={{ fontSize: '0.75rem', opacity: 0.7, color: '#fff' }}>
                                            Across {analyticsData.platform_count || 0} platforms
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.75rem', opacity: 0.7, color: '#fff' }}>
                                            {analyticsData.monthly_comparison
                                                ? `${analyticsData.monthly_comparison.change_percentage > 0 ? '+' : ''}${analyticsData.monthly_comparison.change_percentage.toFixed(1)}% vs last month`
                                                : 'No comparison data'}
                                        </Typography>
                                    </Box>
                                </Card>
                            </Box>

                            {/* Time Dedicated Trend & Recurring Genres - same APIs as Gaming / Music / Media tabs */}
                            {(() => {
                                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                const trend = analyticsData.weekly_trend || [];
                                const musicScrobbles = analyticsData.music_weekly_scrobbles || [];
                                const mediaWatch = analyticsData.media_weekly_watch || [];
                                const musicByDate: Record<string, number> = {};
                                musicScrobbles.forEach((d: { date: string; scrobbles: number }) => { musicByDate[d.date] = d.scrobbles; });
                                const mediaByDate: Record<string, number> = {};
                                mediaWatch.forEach((d: { date: string; watch_time_hours: number }) => { mediaByDate[d.date] = d.watch_time_hours; });
                                const MIN_PER_SCROBBLE = 3.5;
                                const MAX_GAMING_HOURS_PER_DAY = 24;
                                const trendPadded = Array.from({ length: 7 }, (_, i) => {
                                    const day = trend[i];
                                    const date = day?.date ?? musicScrobbles[i]?.date ?? mediaWatch[i]?.date;
                                    const name = day?.day_name ?? (date ? new Date(date).toLocaleDateString('en-US', { weekday: 'short' }) : dayNames[i]);
                                    const rawGaming = day?.gaming_time_hours ?? 0;
                                    const gaming = Math.min(rawGaming, MAX_GAMING_HOURS_PER_DAY);
                                    const musicHours = (musicByDate[date ?? ''] ?? 0) * MIN_PER_SCROBBLE / 60;
                                    const tvHours = mediaByDate[date ?? ''] ?? 0;
                                    return { name, Gaming: gaming, Music: musicHours, TV: tvHours };
                                });
                                const contentGenres = analyticsData.genre_distribution?.genres ?? [];
                                const musicGenres = analyticsData.music_genre_distribution?.genres ?? [];
                                const mediaGenres = analyticsData.media_genre_distribution?.genres ?? [];
                                const mergedGenres = [...contentGenres, ...musicGenres.map((g: { name: string; percentage: number }) => ({ ...g, type: 'music' })), ...mediaGenres.map((g: { name: string; percentage: number }) => ({ ...g, type: 'tv' }))];
                                const totalPct = mergedGenres.reduce((s: number, g: { percentage: number }) => s + (g.percentage || 0), 0);
                                const overviewGenres = totalPct > 0 ? mergedGenres.map((g: { name: string; percentage: number; type?: string }) => ({ ...g, percentage: Math.round((g.percentage / totalPct) * 1000) / 10 })) : mergedGenres;
                                const getGenreColor = (type: string) => (type === 'gaming' ? '#ff5f40' : type === 'music' ? '#40b3a2' : '#60a5fa');
                                return (
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
                                        gap: 8,
                                        mb: 8
                                    }}>
                                        {/* Time Dedicated Trend - all 7 days, Gaming + Music + TV */}
                                        <Card sx={{ bgcolor: '#1a1d23', border: '1px solid #27272a', p: 6, borderRadius: '1rem' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
                                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>
                                                    Time Dedicated Trend
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 4, fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff5f40' }} />
                                                        <Typography sx={{ color: '#e2e8f0' }}>Gaming</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#40b3b2' }} />
                                                        <Typography sx={{ color: '#e2e8f0' }}>Music</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#60a5fa' }} />
                                                        <Typography sx={{ color: '#e2e8f0' }}>TV</Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <ResponsiveContainer width="100%" height={256}>
                                                <BarChart
                                                    data={trendPadded}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                                    <XAxis
                                                        dataKey="name"
                                                        stroke="#e2e8f0"
                                                        style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                                    />
                                                    <YAxis
                                                        stroke="#e2e8f0"
                                                        style={{ fontSize: '0.75rem' }}
                                                        label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#e2e8f0' } }}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: '#1a1d23',
                                                            border: '1px solid #27272a',
                                                            borderRadius: '0.5rem',
                                                            color: '#e2e8f0'
                                                        }}
                                                        formatter={(value: number | undefined) => [`${Number(value ?? 0).toFixed(1)} hrs`, '']}
                                                    />
                                                    <Legend
                                                        wrapperStyle={{ paddingTop: '20px' }}
                                                        iconType="circle"
                                                        formatter={(value) => <span style={{ color: '#e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{value}</span>}
                                                    />
                                                    <Bar dataKey="Gaming" stackId="a" fill="#ff5f40" />
                                                    <Bar dataKey="Music" stackId="a" fill="#40b3a2" />
                                                    <Bar dataKey="TV" stackId="a" fill="#60a5fa" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Card>

                                        {/* Recurring Genres - merged from content types + music + media */}
                                        <Card sx={{ bgcolor: '#1a1d23', border: '1px solid #27272a', p: 6, borderRadius: '1rem', display: 'flex', flexDirection: 'column' }}>
                                            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0', mb: 6 }}>
                                                Recurring Genres
                                            </Typography>
                                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', mb: 6, height: 200 }}>
                                                {overviewGenres.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height={200}>
                                                        <PieChart>
                                                            <Pie
                                                                data={overviewGenres}
                                                                dataKey="percentage"
                                                                nameKey="name"
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={56}
                                                                outerRadius={80}
                                                                paddingAngle={1}
                                                            >
                                                                {overviewGenres.map((g: { type?: string }, idx: number) => (
                                                                    <Cell key={idx} fill={getGenreColor(g.type || 'tv')} stroke="#1a1d23" strokeWidth={2} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#1a1d23', border: '1px solid #27272a', borderRadius: '0.5rem', color: '#e2e8f0' }}
                                                                formatter={(value: number | undefined, name?: string) => [`${value ?? 0}%`, name ?? '']}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : null}
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    textAlign: 'center',
                                                    pointerEvents: 'none'
                                                }}>
                                                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0' }}>
                                                        {overviewGenres.length > 0 ? overviewGenres.length : (analyticsData.genre_distribution?.total_tags ?? 0)}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '0.625rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Tags
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                                                {(overviewGenres.length > 0 ? overviewGenres : (analyticsData.genre_distribution?.genres || [])).slice(0, 6).map((genre: { name: string; percentage: number; type?: string }, index: number) => (
                                                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Box sx={{
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: '50%',
                                                            bgcolor: getGenreColor(genre.type || 'tv')
                                                        }} />
                                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#e2e8f0' }}>
                                                            {genre.name} ({genre.percentage}%)
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Card>
                                    </Box>
                                );
                            })()}

                            {/* Quick Insights */}
                            <Box>
                                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', mb: 4 }}>
                                    Quick Insights
                                </Typography>
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                                    gap: 4
                                }}>
                                    <Card sx={{
                                        bgcolor: '#1a1d23',
                                        border: '1px solid #27272a',
                                        p: 5,
                                        borderRadius: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        cursor: 'pointer',
                                        '&:hover': { borderColor: '#6366f1', transition: 'border-color 0.2s' }
                                    }}>
                                        <Box sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '0.5rem',
                                            bgcolor: 'rgba(251, 146, 60, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <EmojiEventsIcon sx={{ color: '#fb923c', fontSize: '1.5rem' }} />
                                        </Box>
                                        <Box>
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                                                Best Gaming Streak
                                            </Typography>
                                            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                                                {analyticsData.gaming_streaks.length > 0
                                                    ? `${analyticsData.gaming_streaks[0].streak_length} Days Active`
                                                    : 'No streaks yet'}
                                            </Typography>
                                        </Box>
                                    </Card>

                                    <Card sx={{
                                        bgcolor: '#1a1d23',
                                        border: '1px solid #27272a',
                                        p: 5,
                                        borderRadius: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        cursor: 'pointer',
                                        '&:hover': { borderColor: '#6366f1', transition: 'border-color 0.2s' }
                                    }}>
                                        <Box sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '0.5rem',
                                            bgcolor: 'rgba(139, 92, 246, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <BoltIcon sx={{ color: '#8b5cf6', fontSize: '1.5rem' }} />
                                        </Box>
                                        <Box>
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                                                Achievement Efficiency
                                            </Typography>
                                            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                                                {analyticsData.achievement_efficiency.efficiency_per_hour.toFixed(2)} per hour
                                            </Typography>
                                        </Box>
                                    </Card>

                                    <Card sx={{
                                        bgcolor: '#1a1d23',
                                        border: '1px solid #27272a',
                                        p: 5,
                                        borderRadius: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        cursor: 'pointer',
                                        '&:hover': { borderColor: '#6366f1', transition: 'border-color 0.2s' }
                                    }}>
                                        <Box sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '0.5rem',
                                            bgcolor: 'rgba(236, 72, 153, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <TrackChangesIcon sx={{ color: '#ec4899', fontSize: '1.5rem' }} />
                                        </Box>
                                        <Box>
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                                                Most Active Platform
                                            </Typography>
                                            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                                                {getMostActivePlatform()}
                                            </Typography>
                                        </Box>
                                    </Card>
                                </Box>
                            </Box>
                        </Box>
                    </>
                )}

                {activeTab === 1 && <GamingStats data={analyticsData} />}
                {activeTab === 2 && <MusicStats data={analyticsData} />}
                {activeTab === 3 && <MediaStats data={analyticsData} />}
            </Box>
        </Box>
    );
};

export default AnalyticsPage; 