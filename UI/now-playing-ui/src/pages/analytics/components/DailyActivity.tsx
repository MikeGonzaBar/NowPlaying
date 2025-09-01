import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BoltIcon from '@mui/icons-material/Bolt';
import BarChartIcon from '@mui/icons-material/BarChart';

interface DailyActivityProps {
    data: any;
}

const DailyActivity: React.FC<DailyActivityProps> = ({ data }) => {
    const { comprehensive_stats } = data;

    // Get the last 7 days of activity
    const dailyStats = comprehensive_stats.daily_stats.slice(-7);

    // Calculate max values for scaling - handle empty arrays
    const maxGames = dailyStats.length > 0 ? Math.max(...dailyStats.map((day: any) => day.games_played)) : 0;
    const maxSongs = dailyStats.length > 0 ? Math.max(...dailyStats.map((day: any) => day.songs_listened)) : 0;
    const maxMovies = dailyStats.length > 0 ? Math.max(...dailyStats.map((day: any) => day.movies_watched + day.episodes_watched)) : 0;

    // Helper function to get most active day safely
    const getMostActiveDay = () => {
        if (dailyStats.length === 0) {
            return null;
        }
        return dailyStats.reduce((max: any, day: any) => {
            const totalActivity = day.games_played + day.songs_listened + day.movies_watched + day.episodes_watched;
            const maxActivity = max.games_played + max.songs_listened + max.movies_watched + max.episodes_watched;
            return totalActivity > maxActivity ? day : max;
        });
    };

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
                Daily Activity Overview
            </Typography>

            <Typography
                variant="subtitle1"
                color="text.secondary"
                sx={{
                    mb: 4,
                    fontFamily: 'Inter, sans-serif',
                    textAlign: 'center'
                }}
            >
                Your entertainment activity over the last 7 days
            </Typography>

            {/* Summary Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 3,
                mb: 4
            }}>
                <Card sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CalendarTodayIcon fontSize="large" />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                Active Days
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                {dailyStats.filter((day: any) =>
                                    day.games_played > 0 || day.songs_listened > 0 || day.movies_watched > 0 || day.episodes_watched > 0
                                ).length}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                out of 7 days
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <BoltIcon fontSize="large" />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                Most Active Day
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                {(() => {
                                    const mostActiveDay = getMostActiveDay();
                                    if (!mostActiveDay) {
                                        return 'N/A';
                                    }
                                    return new Date(mostActiveDay.date).toLocaleDateString('en-US', { weekday: 'short' });
                                })()}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                highest activity
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <BarChartIcon fontSize="large" />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                Average Daily
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                {Math.round(dailyStats.reduce((sum: number, day: any) =>
                                    sum + day.games_played + day.songs_listened + day.movies_watched + day.episodes_watched, 0
                                ) / Math.max(dailyStats.length, 1))}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                total items
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Activity Charts */}
            <Box sx={{ mb: 4 }}>
                {/* Gaming Activity */}
                <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    🎮 Gaming Activity
                </Typography>
                <Card sx={{ mb: 3 }}>
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
                            {dailyStats.map((day: any, index: number) => (
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
                                            background: 'linear-gradient(to top, #ff6b6b, #ee5a24)',
                                            opacity: day.games_played > 0 ? 1 : 0.6,
                                            height: `${maxGames > 0 ? (day.games_played / maxGames) * 100 : 0}%`,
                                            minHeight: 5,
                                            transition: 'height 0.5s ease'
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ mt: 1, color: '#444', fontWeight: 600 }}>
                                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </CardContent>
                </Card>

                {/* Music Activity */}
                <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    🎵 Music Activity
                </Typography>
                <Card sx={{ mb: 3 }}>
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
                            {dailyStats.map((day: any, index: number) => (
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
                                            background: 'linear-gradient(to top, #4ecdc4, #44a08d)',
                                            opacity: day.songs_listened > 0 ? 1 : 0.6,
                                            height: `${maxSongs > 0 ? (day.songs_listened / maxSongs) * 100 : 0}%`,
                                            minHeight: 5,
                                            transition: 'height 0.5s ease'
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ mt: 1, color: '#444', fontWeight: 600 }}>
                                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </CardContent>
                </Card>

                {/* Media Activity */}
                <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    📺 Media Activity
                </Typography>
                <Card sx={{ mb: 3 }}>
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
                            {dailyStats.map((day: any, index: number) => (
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
                                            background: 'linear-gradient(to top, #a8edea, #fed6e3)',
                                            opacity: (day.movies_watched + day.episodes_watched) > 0 ? 1 : 0.6,
                                            height: `${maxMovies > 0 ? ((day.movies_watched + day.episodes_watched) / maxMovies) * 100 : 0}%`,
                                            minHeight: 5,
                                            transition: 'height 0.5s ease'
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ mt: 1, color: '#444', fontWeight: 600 }}>
                                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Daily Breakdown */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Daily Breakdown
            </Typography>
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 2,
                mb: 4
            }}>
                {dailyStats.map((day: any, index: number) => (
                    <Card key={index}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                                    {new Date(day.date).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </Typography>
                                <Typography variant="h6">
                                    {day.games_played > 0 || day.songs_listened > 0 || day.movies_watched > 0 || day.episodes_watched > 0
                                        ? '🟢' : '⚪'}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography>🎮</Typography>
                                        <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Games:</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>{day.games_played}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography>🏆</Typography>
                                        <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Achievements:</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>{day.achievements_earned}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography>🎵</Typography>
                                        <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Songs:</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>{day.songs_listened}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography>🎬</Typography>
                                        <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Movies:</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>{day.movies_watched}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography>📺</Typography>
                                        <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Episodes:</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>{day.episodes_watched}</Typography>
                                </Box>
                            </Box>

                            <Box sx={{
                                pt: 2,
                                borderTop: 1,
                                borderColor: 'divider',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <Typography variant="body2" sx={{ color: '#555', fontWeight: 500 }}>Total Engagement:</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
                                    {day.total_engagement_time}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Activity Insights */}
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Activity Insights
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
                                Activity Pattern
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {(() => {
                                    const activeDays = dailyStats.filter((day: any) =>
                                        day.games_played > 0 || day.songs_listened > 0 || day.movies_watched > 0 || day.episodes_watched > 0
                                    ).length;

                                    if (activeDays >= 6) {
                                        return 'You\'re very consistent with your entertainment activities, engaging almost daily.';
                                    } else if (activeDays >= 4) {
                                        return 'You have a good balance of activity and rest days.';
                                    } else if (activeDays >= 2) {
                                        return 'You prefer focused entertainment sessions on specific days.';
                                    } else if (activeDays >= 1) {
                                        return 'You enjoy occasional entertainment sessions when you have time.';
                                    } else {
                                        return 'No activity recorded in the last 7 days. Start engaging with your entertainment!';
                                    }
                                })()}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4">🎯</Typography>
                        <Box>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                Peak Activity
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {(() => {
                                    const mostActiveDay = getMostActiveDay();
                                    if (!mostActiveDay) {
                                        return 'No peak activity day found. Start engaging with your entertainment to see patterns!';
                                    }

                                    const dayName = new Date(mostActiveDay.date).toLocaleDateString('en-US', { weekday: 'long' });
                                    return `Your most active day is ${dayName}, when you typically have more time for entertainment.`;
                                })()}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4">⚖️</Typography>
                        <Box>
                            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                Content Balance
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {(() => {
                                    const totalGames = dailyStats.reduce((sum: number, day: any) => sum + day.games_played, 0);
                                    const totalSongs = dailyStats.reduce((sum: number, day: any) => sum + day.songs_listened, 0);
                                    const totalMedia = dailyStats.reduce((sum: number, day: any) => sum + day.movies_watched + day.episodes_watched, 0);

                                    const max = Math.max(totalGames, totalSongs, totalMedia);

                                    if (max === 0) {
                                        return 'No content activity recorded. Start using the app to see your balance!';
                                    } else if (max === totalGames) {
                                        return 'Gaming is your primary entertainment activity this week.';
                                    } else if (max === totalSongs) {
                                        return 'Music listening dominates your entertainment time.';
                                    } else {
                                        return 'Movies and TV shows are your main entertainment focus.';
                                    }
                                })()}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default DailyActivity; 