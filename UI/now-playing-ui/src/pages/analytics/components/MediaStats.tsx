import React from 'react';
import { Box, Typography, Card } from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import BoltIcon from '@mui/icons-material/Bolt';
import PersonIcon from '@mui/icons-material/Person';
import CastIcon from '@mui/icons-material/Cast';

const TRAKT_RED = '#ed1c24';
const SILVER_LIGHT = '#f1f5f9';
const CARD_BG = '#1a1d23';
const BORDER_SLATE = '#27272a';

interface MediaStatsProps {
    data: any;
}

const MediaStats: React.FC<MediaStatsProps> = ({ data }) => {
    const {
        comprehensive_stats,
        media_movies_change,
        media_weekly_watch,
        media_watch_breakdown,
        media_series_count,
        media_genre_distribution,
        media_completion_rate,
        media_insights,
    } = data;

    const moviesWatched = comprehensive_stats?.totals?.total_movies_watched ?? 0;
    const episodesWatched = comprehensive_stats?.totals?.total_episodes_watched ?? 0;
    const totalWatchTime = comprehensive_stats?.totals?.total_watch_time ?? '0 minutes';
    const periodDays = comprehensive_stats?.period?.days ?? 30;
    const moviesChange = media_movies_change?.change ?? 0;
    const seriesCount = media_series_count ?? 0;
    const breakdown = media_watch_breakdown ?? { movies_percentage: 0, tv_percentage: 0 };
    const completionRate = media_completion_rate ?? 0;
    const genres = media_genre_distribution?.genres ?? [];
    const genreCount = media_genre_distribution?.total_count ?? genres.length;
    const insights = media_insights ?? { binge_streak: null, favorite_director: null, top_studio: null };

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun=0, Mon=1, ... Sat=6
    const dailyWatch = media_weekly_watch?.length
        ? media_weekly_watch
        : (comprehensive_stats?.daily_stats?.slice(-7) || []).map((d: any) => ({
              day_name: dayLabels[new Date(d.date).getDay()] ?? '—',
              watch_time_hours: (d.movies_watched ?? 0) * 2 + (d.episodes_watched ?? 0) * (45 / 60),
          }));
    const maxWatchHours = Math.max(...dailyWatch.map((d: any) => d.watch_time_hours ?? 0), 0.1);
    const genreColors = [TRAKT_RED, '#cbd5e1', '#64748b', '#475569'];

    return (
        <Box sx={{ fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
            {/* Top row: 4 cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 4,
            }}>
                {/* Movies Watched - light card */}
                <Card sx={{
                    bgcolor: SILVER_LIGHT,
                    color: '#0f172a',
                    p: 3,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 2,
                }}>
                    <MovieIcon sx={{ position: 'absolute', right: -16, bottom: -16, fontSize: '4rem', opacity: 0.1, color: '#64748b' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#475569' }}>
                        <MovieIcon sx={{ fontSize: '1.125rem' }} />
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Movies Watched
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 0.5, color: '#0f172a' }}>
                        {moviesWatched}
                    </Typography>
                    <Typography sx={{ color: '#475569', fontSize: '0.875rem', mb: 2 }}>
                        {moviesChange >= 0 ? `+${moviesChange}` : moviesChange} from last period
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Re-watched / Premieres not tracked yet
                        </Typography>
                    </Box>
                </Card>

                {/* Episodes Scrobbled - Trakt red */}
                <Card sx={{
                    bgcolor: TRAKT_RED,
                    color: '#fff',
                    p: 3,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 2,
                }}>
                    <LiveTvIcon sx={{ position: 'absolute', right: -16, bottom: -16, fontSize: '4rem', opacity: 0.1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <LiveTvIcon sx={{ fontSize: '1.125rem' }} />
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>
                            Episodes Scrobbled
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 0.5, color: '#fff' }}>
                        {episodesWatched}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', mb: 2 }}>
                        Avg. {(episodesWatched / periodDays).toFixed(1)} per day
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
                            {seriesCount} series in period
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
                            Trakt data
                        </Typography>
                    </Box>
                </Card>

                {/* Time Spent Watching - dark card */}
                <Card sx={{
                    bgcolor: CARD_BG,
                    border: `1px solid ${BORDER_SLATE}`,
                    p: 3,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <ScheduleIcon sx={{ position: 'absolute', right: -16, bottom: -16, fontSize: '4rem', opacity: 0.05, color: '#94a3b8' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#94a3b8' }}>
                        <ScheduleIcon sx={{ fontSize: '1.125rem' }} />
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Time Spent Watching
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 0.5, color: SILVER_LIGHT }}>
                        {totalWatchTime}
                    </Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem', mb: 2 }}>
                        Total screen time
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {breakdown.tv_percentage}% TV Series
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {breakdown.movies_percentage}% Feature Films
                        </Typography>
                    </Box>
                </Card>

                {/* Completion Progress - dark card */}
                <Card sx={{
                    bgcolor: CARD_BG,
                    border: `1px solid ${BORDER_SLATE}`,
                    p: 3,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <DonutLargeIcon sx={{ position: 'absolute', right: -16, bottom: -16, fontSize: '4rem', opacity: 0.05, color: TRAKT_RED }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#94a3b8' }}>
                        <DonutLargeIcon sx={{ fontSize: '1.125rem', color: TRAKT_RED }} />
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Completion Progress
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 0.5, color: SILVER_LIGHT }}>
                        {typeof completionRate === 'number' ? `${completionRate}%` : '—'}
                    </Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.875rem', mb: 2 }}>
                        Started series finished
                    </Typography>
                    {typeof completionRate === 'number' && (
                        <Box sx={{ width: '100%', bgcolor: BORDER_SLATE, height: 6, borderRadius: 999, overflow: 'hidden', mt: 1 }}>
                            <Box sx={{ bgcolor: TRAKT_RED, height: '100%', width: `${Math.min(completionRate, 100)}%`, borderRadius: 999 }} />
                        </Box>
                    )}
                </Card>
            </Box>

            {/* Daily Watch Time + Recurring Genres */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4, mb: 4 }}>
                <Card sx={{
                    bgcolor: CARD_BG,
                    border: `1px solid ${BORDER_SLATE}`,
                    p: 3,
                    borderRadius: '1rem',
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                        <Box>
                            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: SILVER_LIGHT }}>
                                Daily Watch Time
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Peak viewing on Weekends
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TRAKT_RED }} />
                            <Typography component="span" sx={{ color: '#94a3b8' }}>Watch Time (Hrs)</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ height: 256, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, px: 1 }}>
                        {dailyWatch.map((day: any, i: number) => {
                            const hours = day.watch_time_hours ?? 0;
                            const pct = maxWatchHours > 0 ? hours / maxWatchHours : 0;
                            const barHeightPx = Math.max(pct * 200, hours > 0 ? 12 : 8);
                            const isWeekend = day.day_name === 'S';
                            return (
                                <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 0 }}>
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: barHeightPx,
                                            bgcolor: isWeekend ? TRAKT_RED : '#475569',
                                            borderRadius: '4px 4px 0 0',
                                            opacity: hours > 0 ? 0.9 : 0.5,
                                            '&:hover': { opacity: 1 },
                                            boxShadow: isWeekend && hours > 0 ? `0 0 15px ${TRAKT_RED}4D` : 'none',
                                        }}
                                        title={`${hours.toFixed(1)} hrs`}
                                    />
                                    <Typography sx={{ mt: 1, fontSize: '10px', color: isWeekend ? TRAKT_RED : '#64748b', fontWeight: isWeekend ? 700 : 500 }}>
                                        {day.day_name ?? '—'}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Card>

                {/* Recurring Genres */}
                <Card sx={{
                    bgcolor: CARD_BG,
                    border: `1px solid ${BORDER_SLATE}`,
                    p: 3,
                    borderRadius: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: SILVER_LIGHT, mb: 3 }}>
                        Recurring Genres
                    </Typography>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                        <Box sx={{
                            width: 176,
                            height: 176,
                            borderRadius: '50%',
                            border: '12px solid rgba(39,39,42,0.8)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {genres.length > 0 ? (
                                genres.slice(0, 3).map((_: any, idx: number) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            position: 'absolute',
                                            inset: -12,
                                            borderRadius: '50%',
                                            border: `12px solid ${genreColors[idx] || TRAKT_RED}`,
                                            borderTop: idx === 0 ? 'transparent' : undefined,
                                            borderLeft: idx === 0 ? 'transparent' : undefined,
                                            borderRight: idx === 1 ? 'transparent' : undefined,
                                            borderBottom: idx === 1 ? 'transparent' : undefined,
                                            transform: idx === 0 ? 'rotate(-60deg)' : idx === 1 ? 'rotate(15deg)' : 'rotate(140deg)',
                                        }}
                                    />
                                ))
                            ) : (
                                <Box sx={{ position: 'absolute', inset: -12, borderRadius: '50%', border: '12px solid transparent', borderTopColor: TRAKT_RED, borderRightColor: TRAKT_RED, transform: 'rotate(-45deg)', opacity: 0.5 }} />
                            )}
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: SILVER_LIGHT }}>{genreCount}</Typography>
                            <Typography sx={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Genres</Typography>
                        </Box>
                    </Box>
                    {genres.length > 0 ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 3 }}>
                            {genres.slice(0, 4).map((g: any, idx: number) => (
                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: genreColors[idx] || TRAKT_RED }} />
                                    <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>{g.name} ({g.percentage}%)</Typography>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 2, textAlign: 'center' }}>
                            Genre data not available from Trakt yet.
                        </Typography>
                    )}
                </Card>
            </Box>

            {/* Quick Insights */}
            <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: SILVER_LIGHT, mb: 2 }}>
                    Quick Insights
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER_SLATE}`, p: 2.5, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { borderColor: `${TRAKT_RED}80` } }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '0.5rem', bgcolor: `${TRAKT_RED}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TRAKT_RED }}>
                            <BoltIcon />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Binge Streak</Typography>
                            <Typography sx={{ fontWeight: 600, color: SILVER_LIGHT }}>{insights.binge_streak ?? '—'}</Typography>
                        </Box>
                    </Card>
                    <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER_SLATE}`, p: 2.5, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { borderColor: `${TRAKT_RED}80` } }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '0.5rem', bgcolor: 'rgba(241,245,249,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SILVER_LIGHT }}>
                            <PersonIcon />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Favorite Director</Typography>
                            <Typography sx={{ fontWeight: 600, color: SILVER_LIGHT }}>{insights.favorite_director ?? '—'}</Typography>
                        </Box>
                    </Card>
                    <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${BORDER_SLATE}`, p: 2.5, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { borderColor: `${TRAKT_RED}80` } }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '0.5rem', bgcolor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <CastIcon />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top Studio/Network</Typography>
                            <Typography sx={{ fontWeight: 600, color: SILVER_LIGHT }}>{insights.top_studio ?? '—'}</Typography>
                        </Box>
                    </Card>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${BORDER_SLATE}`, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                    <Typography component="span" sx={{ color: TRAKT_RED, fontWeight: 700, fontSize: '1.125rem' }}>trakt</Typography>
                    <Typography component="span" sx={{ color: '#64748b', fontSize: '0.875rem' }}>Data Integrated</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>Master Entertainment Analytics • 2026</Typography>
            </Box>
        </Box>
    );
};

export default MediaStats;
