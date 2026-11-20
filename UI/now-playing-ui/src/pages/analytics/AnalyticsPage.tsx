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
import MuiTooltip from '@mui/material/Tooltip';
import { useApi } from '../../hooks/useApi';
import { getApiUrl } from '../../config/api';
import SideBar from '../../components/sideBar';
import { useSections } from '../../preferences/SectionsContext';
import type { SectionKey } from '../../preferences/types';
import { formatDateRange } from '../../utils/dates';
import GamingStats from './components/GamingStats';
import MusicStats from './components/MusicStats';
import MediaStats from './components/MediaStats';


interface AnalyticsTotals {
    total_games_played: number | 'unavailable';
    total_achievements_earned: number | 'unavailable';
    total_gaming_time: string | 'unavailable';
    total_songs_listened: number | 'unavailable';
    total_listening_time: string | 'unavailable';
    total_movies_watched: number | 'unavailable';
    total_episodes_watched: number | 'unavailable';
    total_watch_time: string | 'unavailable';
    total_engagement_time: string | 'unavailable';
}

interface AnalyticsData {
    comprehensive_stats: {
        period: {
            start_date: string;
            end_date: string;
            days: number;
        };
        totals: AnalyticsTotals;
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
        epic: {
            games: number;
            achievements: number;
            playtime: string | null;
            playtime_scope?: "lifetime";
        };
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
    has_partial_failures?: boolean;
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

const normalizeAnalyticsData = (raw: AnalyticsData | null): AnalyticsData => {
    const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
    const rawStats = src.comprehensive_stats;
    const hasRealStats =
        rawStats &&
        typeof rawStats === "object" &&
        rawStats.period?.start_date &&
        rawStats.totals &&
        Object.keys(rawStats.totals).length > 0;
    const period = {
        start_date: "",
        end_date: "",
        days: 30,
        ...(hasRealStats && rawStats.period),
    };
    const unavailable = 'unavailable' as const;
    const hasPartialFailures =
        !!src.partial_failures &&
        typeof src.partial_failures === 'object' &&
        Object.keys(src.partial_failures).length > 0;
    const totals: AnalyticsTotals = {
        total_games_played: hasRealStats && rawStats.totals?.total_games_played != null ? rawStats.totals.total_games_played : unavailable,
        total_achievements_earned: hasRealStats && rawStats.totals?.total_achievements_earned != null ? rawStats.totals.total_achievements_earned : unavailable,
        total_gaming_time: hasRealStats && rawStats.totals?.total_gaming_time ? rawStats.totals.total_gaming_time : unavailable,
        total_songs_listened: hasRealStats && rawStats.totals?.total_songs_listened != null ? rawStats.totals.total_songs_listened : unavailable,
        total_listening_time: hasRealStats && rawStats.totals?.total_listening_time ? rawStats.totals.total_listening_time : unavailable,
        total_movies_watched: hasRealStats && rawStats.totals?.total_movies_watched != null ? rawStats.totals.total_movies_watched : unavailable,
        total_episodes_watched: hasRealStats && rawStats.totals?.total_episodes_watched != null ? rawStats.totals.total_episodes_watched : unavailable,
        total_watch_time: hasRealStats && rawStats.totals?.total_watch_time ? rawStats.totals.total_watch_time : unavailable,
        total_engagement_time: hasRealStats && rawStats.totals?.total_engagement_time ? rawStats.totals.total_engagement_time : unavailable,
    };
    const section = (key: string): any => src[key] ?? rawStats?.[key];

    return {
        ...src,
        has_partial_failures: hasPartialFailures,
        comprehensive_stats: { ...rawStats, period, totals },
        platform_distribution: section('platform_distribution') || {},
        achievement_efficiency: { efficiency_per_hour: 0, ...section('achievement_efficiency') },
        gaming_streaks: Array.isArray(section('gaming_streaks')) ? section('gaming_streaks') : [],
        weekly_trend: Array.isArray(section('weekly_trend')) ? section('weekly_trend') : [],
        monthly_comparison: { change_percentage: 0, ...section('monthly_comparison') },
        genre_distribution: section('genre_distribution') || {},
        music_genre_distribution: section('music_genre_distribution') || {},
        music_weekly_scrobbles: Array.isArray(section('music_weekly_scrobbles')) ? section('music_weekly_scrobbles') : [],
        music_listening_insights: section('music_listening_insights') || {},
        media_watch_breakdown: section('media_watch_breakdown') || {},
        media_genre_distribution: section('media_genre_distribution') || {},
        media_insights: section('media_insights') || {},
    } as AnalyticsData;
};

const getOptimalChartHeight = (genreCount: number) => {
  // Base height + ~20px per genre, max 300px
  const baseHeight = 160;
  const genreHeight = Math.min(20, Math.max(16, Math.floor(genreCount / 2) * 12));
  return Math.min(baseHeight + genreHeight * genreCount, 300);
};

const AnalyticsPage: React.FC = () => {
    type TabKey = 'overview' | 'games' | 'music' | 'movies';
    const TABS: { key: TabKey; label: string; section?: SectionKey }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'games', label: 'Gaming', section: 'games' },
        { key: 'music', label: 'Music', section: 'music' },
        { key: 'movies', label: 'Movies & TV', section: 'movies' },
    ];

    const { isVisible, visibleCount } = useSections();
    const visibleTabs = TABS.filter((tab) => !tab.section || isVisible(tab.section));

    const { request } = useApi<AnalyticsData>();
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');

    // Keep the selected tab valid when a section is hidden while viewing it.
    useEffect(() => {
        if (!visibleTabs.some((tab) => tab.key === activeTab)) {
            setActiveTab('overview');
        }
    }, [visibleTabs, activeTab]);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await request(getApiUrl('/analytics/'));
            setAnalyticsData(normalizeAnalyticsData(response));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load analytics data.';
            console.error('Error fetching analytics data:', err);
            setError(message.includes('request_id=') ? message : `${message} Please try again later.`);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (_: React.SyntheticEvent, newValue: TabKey) => {
        setActiveTab(newValue);
    };

    const handleExportAnalytics = () => {
        if (!analyticsData || analyticsData.has_partial_failures) return;

        // The analytics payload is deeply nested (totals, distributions,
        // trends), so export it as JSON rather than flattening it into a CSV
        // that would lose the structure.
        const blob = new Blob([JSON.stringify(analyticsData, null, 2)], {
            type: 'application/json;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

    const renderPeriodLabel = () => {
        const { start_date, end_date } = analyticsData.comprehensive_stats.period;
        return formatDateRange(start_date, end_date);
    };

    const renderUnavailable = (value: number | string | 'unavailable', fallback: string = '—') => {
        if (value === 'unavailable') return fallback;
        return value;
    };

    const renderedSections = new Set<string>();
    const renderOnce = (id: string, content: React.ReactNode) => {
        if (renderedSections.has(id)) return null;
        renderedSections.add(id);
        return content;
    };

    const getMostActivePlatform = () => {
        const platforms = analyticsData.platform_distribution;
        const gamingPlatforms = ['steam', 'epic', 'psn', 'xbox', 'retroachievements'];
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
        if (mostActive === 'epic') {
            return 'Epic Games';
        }
        return mostActive.charAt(0).toUpperCase() + mostActive.slice(1);
    };

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#0f1115" }}>
            <SideBar activeItem="Analytics" />
            <Box component="main" sx={{ flexGrow: 1, maxWidth: "1400px", mx: "auto", px: { xs: 2, md: 4, lg: 8 }, py: 8 }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
                                Analytics
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#94a3b8' }}>
                                {renderPeriodLabel()}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleExportAnalytics}
                                disabled={analyticsData.has_partial_failures}
                                sx={{ textTransform: 'none', borderColor: '#27272a', color: '#e2e8f0', '&:hover': { borderColor: '#40b3a2' } }}
                            >
                                Export JSON
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={fetchAnalyticsData}
                                sx={{ textTransform: 'none', borderColor: '#27272a', color: '#e2e8f0', '&:hover': { borderColor: '#40b3a2' } }}
                            >
                                Refresh
                            </Button>
                        </Box>
                    </Box>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTabs-indicator': { backgroundColor: '#40b3a2', height: 3, borderRadius: '3px 3px 0 0' },
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: '#94a3b8',
                                minHeight: 48,
                                px: 3,
                                '&.Mui-selected': { color: '#40b3a2' },
                                '&:hover': { color: '#e2e8f0', backgroundColor: 'transparent' },
                            },
                        }}
                    >
                        {visibleTabs.map((tab) => (
                            <Tab key={tab.key} label={tab.label} value={tab.key} />
                        ))}
                    </Tabs>
                </Box>

                {activeTab === 'overview' && (
                    <>
                        {/* Summary Cards */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                                gap: 3,
                                mb: 6,
                            }}
                        >
                            {/* Gaming Card */}
                            {isVisible('games') && (
                            <Card sx={{
                                bgcolor: '#1e1e2e',
                                border: '1px solid #27272a',
                                p: 3.5,
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
                                    color: '#ff5f40',
                                    transform: 'scale(1.1)',
                                    transition: 'transform 0.2s'
                                }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                    <SportsEsportsIcon sx={{ fontSize: '1.25rem', color: '#ff5f40' }} />
                                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#ff5f40' }}>
                                        Gaming
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 1, color: '#fff' }}>
                                    {renderUnavailable(analyticsData.comprehensive_stats.totals.total_games_played, '—')}
                                </Typography>
                                <Typography sx={{ fontSize: '0.875rem', mb: 4, color: '#94a3b8', fontWeight: 500 }}>
                                    Games Played
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {renderUnavailable(analyticsData.comprehensive_stats.totals.total_achievements_earned, '—')} achievements earned
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {renderUnavailable(analyticsData.comprehensive_stats.totals.total_gaming_time, '—')} total time
                                    </Typography>
                                </Box>
                            </Card>
                            )}

                            {/* Music Card - use dark text for 4.5:1 contrast on teal background */}
                            {isVisible('music') && (
                            <Card sx={{
                                bgcolor: '#40b3a2',
                                p: 3.5,
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
                                    opacity: 0.15,
                                    color: '#064e3b',
                                }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                    <MusicNoteIcon sx={{ fontSize: '1.25rem', color: '#064e3b' }} />
                                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#064e3b' }}>
                                        Music
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 1, color: '#064e3b' }}>
                                    {renderUnavailable(analyticsData.comprehensive_stats.totals.total_songs_listened, '—')}
                                </Typography>
                                <Typography sx={{ fontSize: '0.875rem', mb: 4, fontWeight: 500, color: '#064e3b' }}>
                                    Songs Scrobbled
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#064e3b' }}>
                                        {renderUnavailable(analyticsData.comprehensive_stats.totals.total_listening_time, '—')} listening time
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#064e3b' }}>
                                        {analyticsData.comprehensive_stats.averages?.avg_songs_per_day != null
                                            ? `${analyticsData.comprehensive_stats.averages.avg_songs_per_day.toFixed(1)} per day`
                                            : '—'}
                                    </Typography>
                                </Box>
                            </Card>
                            )}

                            {/* Movies & TV Card */}
                            {isVisible('movies') && (
                            <Card sx={{
                                bgcolor: '#f1f5f9',
                                color: '#1e293b',
                                p: 3.5,
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
                                    color: '#64748b',
                                    transform: 'scale(1.1)',
                                    transition: 'transform 0.2s'
                                }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                    <TvIcon sx={{ fontSize: '1.25rem', color: '#475569' }} />
                                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#475569' }}>
                                        Movies & TV
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 1, color: '#1e293b' }}>
                                    {(() => {
                                        const movies = analyticsData.comprehensive_stats.totals.total_movies_watched;
                                        const episodes = analyticsData.comprehensive_stats.totals.total_episodes_watched;
                                        if (movies === 'unavailable' || episodes === 'unavailable') return '—';
                                        if (movies != null && episodes != null) return movies + episodes;
                                        return '—';
                                    })()}
                                </Typography>
                                <Typography sx={{ fontSize: '0.875rem', mb: 4, color: '#475569', fontWeight: 500 }}>
                                    Items Watched
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {renderUnavailable(analyticsData.comprehensive_stats.totals.total_movies_watched, '—')} movies, {renderUnavailable(analyticsData.comprehensive_stats.totals.total_episodes_watched, '—')} episodes
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {renderUnavailable(analyticsData.comprehensive_stats.totals.total_watch_time, '—')}
                                    </Typography>
                                </Box>
                            </Card>
                            )}

                            {/* Total Engagement Card - use dark text for 4.5:1 contrast on purple background */}
                            <Card sx={{
                                bgcolor: '#8b5cf6',
                                p: 3.5,
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
                                    color: '#3c096c',
                                }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                    <BoltIcon sx={{ fontSize: '1.25rem', color: '#fbbf24' }} />
                                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#3c096c' }}>
                                        Connected sections
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, mb: 1, lineHeight: 1.25, color: '#3c096c' }}>
                                    {renderUnavailable(analyticsData.comprehensive_stats.totals.total_engagement_time, '—')}
                                </Typography>
                                <Typography sx={{ fontSize: '0.875rem', mb: 4, fontWeight: 500, color: '#3c096c' }}>
                                    Time across the {visibleCount} sections you show
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#3c096c' }}>
                                        Across {analyticsData.platform_count || 0} platforms
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#3c096c' }}>
                                        {analyticsData.has_partial_failures ? 'Partial data (some sources failed)' : 'All sources synced'}
                                    </Typography>
                                </Box>
                            </Card>
                        </Box>

                        {/* Charts Row */}
                        <Box sx={{ mb: 6 }}>
                            {(() => {
                                // Time Dedicated Trend data preparation
                                const trend = analyticsData.weekly_trend ?? [];
                                const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                                const musicScrobbles = analyticsData.music_weekly_scrobbles ?? [];
                                const mediaWatch = analyticsData.media_weekly_watch ?? [];
                                const musicByDate: Record<string, number> = {};
                                const mediaByDate: Record<string, number> = {};
                                musicScrobbles.forEach((d: { date: string; scrobbles: number }) => { musicByDate[d.date] = d.scrobbles; });
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
                                    const tvHours = isVisible('movies') ? (mediaByDate[date ?? ''] ?? 0) : 0;
                                    return { name, Gaming: gaming, Music: musicHours, TV: tvHours };
                                });
                                const contentGenres = analyticsData.genre_distribution?.genres ?? [];
                                const musicGenres = analyticsData.music_genre_distribution?.genres ?? [];
                                const mediaGenres = analyticsData.media_genre_distribution?.genres ?? [];
                                // Filter to only include actual genres (type === 'music') from contentGenres,
                                // and include music/media genres which are already typed correctly
                                const filteredContentGenres = contentGenres.filter((g: { type?: string }) => g.type === 'music');
                                const mergedGenres = [
                                    ...filteredContentGenres,
                                    ...musicGenres.map((g: { name: string; percentage: number }) => ({ ...g, type: 'music' })),
                                    ...mediaGenres.map((g: { name: string; percentage: number }) => ({ ...g, type: 'tv' }))
                                ];
                                const totalPct = mergedGenres.reduce((s: number, g: { percentage: number }) => s + (g.percentage || 0), 0);
                                const overviewGenres = totalPct > 0
                                    ? mergedGenres.map((g: { name: string; percentage: number; type?: string }) => ({
                                        ...g,
                                        percentage: Math.round((g.percentage / totalPct) * 1000) / 10
                                    }))
                                    : mergedGenres;
                                const getGenreColor = (type: string) => (type === 'gaming' ? '#ff5f40' : type === 'music' ? '#40b3a2' : '#60a5fa');
                                const showTV = isVisible('movies');
                                return (
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
                                        gap: 8,
                                        mb: 4
                                    }}>
                                        {/* Time Dedicated Trend - all 7 days, Gaming + Music + TV */}
                                        {renderOnce('time-dedicated-trend',
                                            <Card sx={{ bgcolor: '#18181b', border: '1px solid #27272a', p: 3.5, borderRadius: '1rem' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
                                                    <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>
                                                        Time Dedicated Trend
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 3, fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff5f40' }} />
                                                            <Typography sx={{ color: '#e2e8f0' }}>Gaming</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#40b3b2' }} />
                                                            <Typography sx={{ color: '#e2e8f0' }}>Music</Typography>
                                                        </Box>
                                                        {showTV && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#60a5fa' }} />
                                                                <Typography sx={{ color: '#e2e8f0' }}>TV</Typography>
                                                            </Box>
                                                        )}
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
                                                            style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                                        />
                                                        <YAxis
                                                            stroke="#e2e8f0"
                                                            style={{ fontSize: '0.75rem' }}
                                                            label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#e2e8f0' } }}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: '#18181b',
                                                                border: '1px solid #27272a',
                                                                borderRadius: '0.5rem',
                                                                color: '#e2e8f0'
                                                            }}
                                                            formatter={(value: number | undefined) => [`${Number(value ?? 0).toFixed(1)} hrs`, '']}
                                                        />
                                                        <Legend
                                                            wrapperStyle={{ paddingTop: '20px' }}
                                                            iconType="none"
                                                            formatter={(value) => (
                                                                <span style={{ color: '#e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    {value}
                                                                </span>
                                                            )}
                                                        />
                                                        <Bar dataKey="Gaming" stackId="a" fill="#ff5f40" />
                                                        <Bar dataKey="Music" stackId="a" fill="#40b3a2" />
                                                        {showTV && <Bar dataKey="TV" stackId="a" fill="#60a5fa" />}
                                                    </BarChart>
                                                </ResponsiveContainer>
                                                <Typography sx={{ mt: 2, fontSize: '0.7rem', color: '#a1a1aa' }}>
                                                    Music hours are estimated at 3.5 minutes per scrobble.{showTV ? ' TV and gaming use reported watch/play time.' : ' Gaming uses reported play time.'}
                                                </Typography>
                                            </Card>
                                        )}

                                        {/* Recurring Genres - merged from content types + music + media */}
                                        {renderOnce('recurring-genres',
                                            <Card sx={{ bgcolor: '#18181b', border: '1px solid #27272a', p: 3.5, borderRadius: '1rem', display: 'flex', flexDirection: 'column' }}>
                                                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0', mb: 6 }}>
                                                    Recurring Genres
                                                </Typography>
                                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', mb: 6, height: 200 }}>
                                                    {overviewGenres.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={getOptimalChartHeight(overviewGenres.length)}>
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
                                                                    label={({ name, percent }) => (
                                                                        <text
                                                                            x={0}
                                                                            y={0}
                                                                            fill="#e2e8f0"
                                                                            fontSize="11"
                                                                            fontWeight={500}
                                                                            textAnchor="middle"
                                                                            dominantBaseline="middle"
                                                                        >
                                                                            {name}
                                                                        </text>
                                                                    )}
                                                                >
                                                                    {overviewGenres.map((g: { type?: string }, idx: number) => (
                                                                        <Cell key={idx} fill={getGenreColor(g.type || 'tv')} stroke="#18181b" strokeWidth={2} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0.5rem', color: '#e2e8f0' }}
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
                                                        <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            Genres
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
                                        )}
                                    </Box>
                                );
                            })()}
                        </Box>

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
                                    bgcolor: '#18181b',
                                    border: '1px solid #27272a',
                                    p: 5,
                                    borderRadius: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
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
                                    bgcolor: '#18181b',
                                    border: '1px solid #27272a',
                                    p: 5,
                                    borderRadius: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
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
                                    bgcolor: '#18181b',
                                    border: '1px solid #27272a',
                                    p: 5,
                                    borderRadius: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
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
                    </>
                )}

                {activeTab === 'games' && <GamingStats data={analyticsData} />}
                {activeTab === 'music' && <MusicStats data={analyticsData} />}
                {activeTab === 'movies' && <MediaStats data={analyticsData} />}
            </Box>
        </Box>
    );
};

export default AnalyticsPage;