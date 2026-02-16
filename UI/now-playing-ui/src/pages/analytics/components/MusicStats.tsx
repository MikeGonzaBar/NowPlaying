import React from 'react';
import {
    Box,
    Typography,
    Card,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ExploreIcon from '@mui/icons-material/Explore';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

const MUSIC_TEAL = '#40b3a2';
const MUSIC_BLUE = '#3b82f6';
const CARD_DARK = '#1a1d23';
const BORDER_SLATE = '#27272a';

interface MusicStatsProps {
    data: any;
}

const MusicStats: React.FC<MusicStatsProps> = ({ data }) => {
    const {
        comprehensive_stats,
        last_played_time,
        top_artist,
        top_track,
        new_discoveries,
        music_listening_insights,
        music_genre_distribution,
        music_weekly_scrobbles,
        genre_of_the_week,
    } = data;

    const totalSongs = comprehensive_stats?.totals?.total_songs_listened ?? 0;
    const totalListeningTime = comprehensive_stats?.totals?.total_listening_time ?? '0 minutes';
    const avgPerDay = comprehensive_stats?.averages?.avg_listening_time_per_day ?? '0 minutes';

    // Scrobbles per day: use music_weekly_scrobbles or fallback to last 7 days from daily_stats
    const scrobblesPerDay = music_weekly_scrobbles?.length
        ? music_weekly_scrobbles
        : (comprehensive_stats?.daily_stats?.slice(-7) || []).map((d: any) => ({
              day_name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }).replace(/^(\w)/, (m: string) => m.toUpperCase()),
              scrobbles: d.songs_listened ?? 0,
          }));
    const maxScrobbles = Math.max(...scrobblesPerDay.map((d: any) => d.scrobbles || 0), 1);

    const genres = music_genre_distribution?.genres ?? [];
    const genreCount = music_genre_distribution?.total_count ?? genres.length;
    const genreColors = [MUSIC_TEAL, MUSIC_BLUE, '#94a3b8', '#475569'];

    return (
        <Box sx={{ fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
            {/* Top row: 4 cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 4,
            }}>
                {/* Top Artist - teal card: white text for contrast */}
                <Card sx={{
                    bgcolor: MUSIC_TEAL,
                    p: 3,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 2,
                }}>
                    <PersonIcon sx={{ position: 'absolute', right: -16, bottom: -16, fontSize: '4rem', opacity: 0.15, color: '#fff' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <PersonIcon sx={{ fontSize: '1.125rem', color: '#fff' }} />
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff' }}>
                            Top Artist
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '1.875rem', fontWeight: 700, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>
                        {top_artist?.name ?? '—'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.875rem', mb: 2 }}>
                        {top_artist ? `${top_artist.scrobbles.toLocaleString()} scrobbles` : 'No data'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
                        {top_artist?.top_album ? `Top album: ${top_artist.top_album}` : '—'}
                    </Typography>
                </Card>

                {/* Top Track - dark card */}
                <Card sx={{
                    bgcolor: '#1e293b',
                    border: `1px solid ${BORDER_SLATE}`,
                    p: 3,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <MusicNoteIcon sx={{ position: 'absolute', right: -16, bottom: -16, fontSize: '4rem', opacity: 0.1, color: MUSIC_TEAL }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: MUSIC_TEAL }}>
                        <MusicNoteIcon sx={{ fontSize: '1.125rem' }} />
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Top Track
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '1.875rem', fontWeight: 700, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                        {top_track?.title ?? '—'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', mb: 2 }}>
                        {top_track ? `${top_track.plays} plays` : 'No data'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                        {top_track?.recently_played ? `Recently played: ${top_track.recently_played}` : (last_played_time ? `Last: ${last_played_time}` : '—')}
                    </Typography>
                </Card>

                {/* New Discoveries - dark card */}
                <Card sx={{
                    bgcolor: '#1e293b',
                    border: `1px solid ${BORDER_SLATE}`,
                    p: 3,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <ExploreIcon sx={{ position: 'absolute', right: -16, bottom: -16, fontSize: '4rem', opacity: 0.1, color: MUSIC_BLUE }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#60a5fa' }}>
                        <ExploreIcon sx={{ fontSize: '1.125rem' }} />
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            New Discoveries
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, mb: 0.5, color: '#fff' }}>
                        {new_discoveries?.new_artists_count ?? 0}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', mb: 2 }}>
                        New Artists Found
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                        {new_discoveries?.change_percentage != null
                            ? `${new_discoveries.change_percentage >= 0 ? '+' : ''}${new_discoveries.change_percentage}% from last period`
                            : '—'}
                    </Typography>
                </Card>

                {/* Total Listening Time - gradient: white text for contrast on teal and blue */}
                <Card sx={{
                    background: `linear-gradient(135deg, ${MUSIC_TEAL}, ${MUSIC_BLUE})`,
                    p: 3,
                    borderRadius: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <ScheduleIcon sx={{ position: 'absolute', right: -16, bottom: -16, fontSize: '4rem', opacity: 0.15, color: '#fff' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <ScheduleIcon sx={{ fontSize: '1.125rem', color: '#fff' }} />
                        <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff' }}>
                            Total Listening Time
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '1.875rem', fontWeight: 700, mb: 0.5, lineHeight: 1.2, color: '#ffffff' }}>
                        {totalListeningTime}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.875rem', mb: 2 }}>
                        {totalSongs.toLocaleString()} scrobbles total
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
                        Avg. {avgPerDay} per day
                    </Typography>
                </Card>
            </Box>

            {/* Scrobbles per day + Music Genres */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4, mb: 4 }}>
                {/* Scrobbles per Day */}
                <Card sx={{
                    bgcolor: CARD_DARK,
                    border: `1px solid ${BORDER_SLATE}`,
                    p: 3,
                    borderRadius: '1rem',
                    overflow: 'hidden',
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                        <Box>
                            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>
                                Scrobbles per Day
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Listening volume vs average duration
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 12, height: 4, borderRadius: 1, bgcolor: MUSIC_TEAL }} />
                                <Typography component="span" sx={{ color: '#94a3b8' }}>Scrobbles</Typography>
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ height: 256, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, px: 1 }}>
                        {scrobblesPerDay.map((day: any, i: number) => {
                            const scrobbles = day.scrobbles ?? 0;
                            const pct = maxScrobbles > 0 ? scrobbles / maxScrobbles : 0;
                            const barHeightPx = Math.max(pct * 200, scrobbles > 0 ? 12 : 8);
                            return (
                                <Box
                                    key={i}
                                    sx={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        height: '100%',
                                        minWidth: 0,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: barHeightPx,
                                            bgcolor: MUSIC_TEAL,
                                            borderRadius: '4px 4px 0 0',
                                            opacity: scrobbles > 0 ? 0.85 : 0.35,
                                            transition: 'opacity 0.2s',
                                            '&:hover': { opacity: 1 },
                                        }}
                                        title={`${scrobbles} scrobbles`}
                                    />
                                    <Typography sx={{ mt: 1, fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
                                        {day.day_name ?? day.dayName ?? '—'}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Card>

                {/* Music Genres */}
                <Card sx={{
                    bgcolor: CARD_DARK,
                    border: `1px solid ${BORDER_SLATE}`,
                    p: 3,
                    borderRadius: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', mb: 3 }}>
                        Music Genres
                    </Typography>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                        <Box sx={{
                            width: 176,
                            height: 176,
                            borderRadius: '50%',
                            border: '18px solid rgba(39,39,42,0.5)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {genres.length > 0 ? (
                                genres.slice(0, 3).map((_: any, i: number) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: '50%',
                                            border: `18px solid ${genreColors[i] || genreColors[0]}`,
                                            borderTop: i === 0 ? 'transparent' : undefined,
                                            borderLeft: i === 0 ? 'transparent' : undefined,
                                            borderRight: i === 1 ? 'transparent' : undefined,
                                            borderBottom: i === 1 ? 'transparent' : undefined,
                                            transform: i === 0 ? 'rotate(30deg)' : i === 1 ? 'rotate(-45deg)' : 'rotate(140deg)',
                                            opacity: i === 2 ? 0.6 : 1,
                                        }}
                                    />
                                ))
                            ) : (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: '50%',
                                        border: '18px solid transparent',
                                        borderTopColor: MUSIC_TEAL,
                                        borderRightColor: MUSIC_TEAL,
                                        transform: 'rotate(-45deg)',
                                        opacity: 0.5,
                                    }}
                                />
                            )}
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{genreCount}</Typography>
                            <Typography sx={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Genres</Typography>
                        </Box>
                    </Box>
                    {genres.length > 0 ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 3 }}>
                            {genres.slice(0, 4).map((g: any, i: number) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: genreColors[i] || MUSIC_TEAL }} />
                                    <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#cbd5e1' }}>
                                        {g.name} ({g.percentage}%)
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 2, textAlign: 'center', lineHeight: 1.5 }}>
                            No genre data yet. Connect Last.fm or add genre tags to see distribution.
                        </Typography>
                    )}
                </Card>
            </Box>

            {/* Quick Insights */}
            <Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', mb: 2 }}>
                    Quick Insights
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    <Card sx={{
                        bgcolor: CARD_DARK,
                        border: `1px solid ${BORDER_SLATE}`,
                        p: 2.5,
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        cursor: 'pointer',
                        '&:hover': { borderColor: `${MUSIC_TEAL}80` },
                    }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '0.5rem', bgcolor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                            <DarkModeIcon />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Morning vs. Evening
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: '#e2e8f0' }}>
                                {music_listening_insights?.morning_vs_evening ?? '—'}
                                {music_listening_insights?.evening_percentage != null && ` (${music_listening_insights.evening_percentage}%)`}
                            </Typography>
                        </Box>
                    </Card>

                    <Card sx={{
                        bgcolor: CARD_DARK,
                        border: `1px solid ${BORDER_SLATE}`,
                        p: 2.5,
                        borderRadius: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        cursor: 'pointer',
                        '&:hover': { borderColor: `${MUSIC_TEAL}80` },
                    }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '0.5rem', bgcolor: `${MUSIC_TEAL}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUSIC_TEAL }}>
                            <TrendingUpIcon />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Genre of the Week
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: '#e2e8f0' }}>
                                {genre_of_the_week ?? 'Not available'}
                            </Typography>
                        </Box>
                    </Card>

                    <Card sx={{
                        bgcolor: CARD_DARK,
                        border: `1px solid ${BORDER_SLATE}`,
                        p: 2.5,
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        '&:hover': { borderColor: `${MUSIC_TEAL}80` },
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '0.5rem', bgcolor: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                                <MilitaryTechIcon />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Scrobble Milestone
                                </Typography>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#e2e8f0' }}>
                                    {music_listening_insights?.scrobble_milestone
                                        ? `${music_listening_insights.scrobble_milestone.current?.toLocaleString()} / ${music_listening_insights.scrobble_milestone.target?.toLocaleString()} scrobbles`
                                        : `${totalSongs.toLocaleString()} scrobbles (this period)`}
                                </Typography>
                            </Box>
                        </Box>
                        {music_listening_insights?.scrobble_milestone && (
                            <Box sx={{ width: '100%', bgcolor: BORDER_SLATE, height: 6, borderRadius: 999, overflow: 'hidden' }}>
                                <Box
                                    sx={{
                                        bgcolor: MUSIC_TEAL,
                                        height: '100%',
                                        width: `${Math.min(music_listening_insights.scrobble_milestone.percentage ?? 0, 100)}%`,
                                        borderRadius: 999,
                                        transition: 'width 0.5s',
                                    }}
                                />
                            </Box>
                        )}
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default MusicStats;
