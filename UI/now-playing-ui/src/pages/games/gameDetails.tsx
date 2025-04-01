import { Box, Card, CardMedia, Divider, FormControl, Grid, IconButton, InputLabel, List, MenuItem, Select, SelectChangeEvent, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Import the back icon
import SideBar from '../../components/sideBar';
import { SteamGame, PsnGame, SteamAchievement } from './types'; // Import interfaces
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';


import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';


import { useLocation } from 'react-router-dom';
import AchievementCard from './achievementCard';

const GameDetails: React.FC = () => {
    const location = useLocation();
    const game = location.state?.game as SteamGame | PsnGame;

    const [selectedOption, setSelectedOption] = useState<string>('All');
    const [newsItems, setNewsItems] = useState<any[]>([]);

    if (!game) {
        return <div>Game not found</div>;
    }

    const handleChange = (event: SelectChangeEvent<string>) => {
        setSelectedOption(event.target.value);
    };

    const fetchNews = async () => {
        try {
            const apiKey = process.env.VITE_REACT_APP_NEWS_API_KEY;
            const today = new Date();
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(today.getMonth() - 1);
            const fromDate = oneMonthAgo.toISOString().split('T')[0];
            const userLanguage = navigator.language.split('-')[0];

            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
                game.name
            )}&from=${fromDate}&sortBy=publishedAt&language=${userLanguage}&apiKey=${apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'ok') {
                setNewsItems(data.articles);
            } else {
                console.error('Error fetching news:', data);
                return [];
            }
        } catch (error) {
            console.error('Error fetching news:', error);
            return [];
        }
    }

    useEffect(() => {
        fetchNews();
    }, []);

    const filteredAchievements = game.achievements.filter((achievement: SteamAchievement) => {
        if (selectedOption === 'Unlocked') return achievement.unlocked;
        if (selectedOption === 'Locked') return !achievement.unlocked;
        return true;
    });

    return (
        <Box sx={{ paddingLeft: 2.5 }}>
            <SideBar activeItem="Games" />
            <Box
                component="main"
                sx={{ marginLeft: 20, mt: 2, display: 'flex', height: '98vh', width: '89vw' }}
            >
                <Grid sx={{ display: 'flex' }}>
                    <Grid sx={{ width: '70vw', ml: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, ml: -1 }}>
                            <IconButton
                                component={Link}
                                to="/page1"
                                color="primary"
                                sx={{ marginRight: 2 }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h5" sx={{
                                ml: 1, flexGrow: 1, fontFamily: 'Inter, sans-serif',
                                fontWeight: 700,
                            }}>
                                {game.name}
                            </Typography>
                            {'platform' in game && game.platform === 'PS5' ? (
                                <Box
                                    component="img"
                                    src="https://cdn2.iconfinder.com/data/icons/logos-brands-5/2017/playstation-5-seeklogo.com-5-512.png"
                                    alt="PS5 Logo"
                                    sx={{
                                        width: '55px',
                                        height: 'auto',
                                        backgroundColor: 'transparent',
                                        marginRight: '735px',
                                        marginBottom: '-3px',
                                    }}
                                />
                            ) : 'platform' in game && game.platform === 'PS4' ? (
                                <Box
                                    component="img"
                                    src="https://1000logos.net/wp-content/uploads/2017/05/PlayStation-Logo-2013.png"
                                    alt="PS4 Logo"
                                    sx={{
                                        width: '45px',
                                        height: 'auto',
                                        backgroundColor: 'transparent',
                                        marginRight: '8px',
                                    }}
                                />
                            ) : (
                                <Box
                                    component="img"
                                    src="https://cdn3.iconfinder.com/data/icons/remixicon-logos/24/steam-fill-512.png"
                                    alt="Steam Logo"
                                    sx={{
                                        width: '30px',
                                        height: 'auto',
                                        backgroundColor: 'transparent',
                                        marginTop: '2px',
                                        marginRight: '735px',
                                        marginBottom: '-3px',
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 8 }}>
                            <Card>
                                <CardMedia
                                    component="img"
                                    image={
                                        'platform' in game && game.img_icon_url
                                            ? game.img_icon_url
                                            : `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`
                                    }
                                    alt={game.name}
                                    sx={{
                                        width: 'platform' in game ? 300 : 460,
                                        height: 'platform' in game ? 300 : 'auto',
                                    }}
                                />
                            </Card>
                            <Box sx={{}}>
                                <Typography variant="subtitle1" gutterBottom sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                                    <b>Last time played: </b> {(() => {
                                        if ('platform' in game) {
                                            const date = new Date(game.last_played);
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const year = date.getFullYear();
                                            return `${day}/${month}/${year}`;
                                        } else {
                                            return game.rtime_last_played;
                                        }
                                    })()}
                                </Typography>
                                <Typography variant="subtitle1" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                                    <b>Total playtime: </b>{'platform' in game ? game.total_playtime : game.playtime_formatted}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Inter, sans-serif' }}>
                                <b>My achievements </b>
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid sx={{ textAlign: 'center', mb: 2 }}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    height: '100%',
                                }}>
                                    {'platform' in game && game.unlocked_achievements?.platinum !== undefined && (
                                        <Box
                                            component="img"
                                            src="https://i.psnprofiles.com/guides/18274/470bd2.png"
                                            alt="Platinum Trophy"
                                            sx={{
                                                width: '30px',
                                                height: 'auto',
                                                filter: game.unlocked_achievements.platinum === 0 ? 'grayscale(100%)' : 'none',
                                            }}
                                        />
                                    )}
                                    {'platform' in game && game.unlocked_achievements?.gold !== undefined && (
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Box
                                                component="img"
                                                src="https://i.psnprofiles.com/guides/18274/7186c5.png"
                                                alt="Gold Trophy"
                                                sx={{
                                                    width: '30px', height: 'auto'
                                                }}
                                            />
                                            < Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', mt: 0.5 }}>
                                                {game.unlocked_achievements.gold}/{game.total_achievements.gold}
                                            </Typography>
                                        </Box>
                                    )}
                                    {'platform' in game && game.unlocked_achievements?.silver !== undefined && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box
                                                component="img"
                                                src="https://i.psnprofiles.com/guides/18274/f179ed.png"
                                                alt="Silver Trophy"
                                                sx={{ width: '30px', height: 'auto' }}
                                            />
                                            <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', fontSize: '20px' }}>
                                                {game.unlocked_achievements.silver}/{game.total_achievements.silver}
                                            </Typography>
                                        </Box>
                                    )}
                                    {'platform' in game && game.unlocked_achievements?.bronze !== undefined && (
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Box
                                                component="img"
                                                src="https://i.psnprofiles.com/guides/18274/e8f659.png"
                                                alt="Bronze Trophy"
                                                sx={{ width: '30px', height: 'auto' }}
                                            />
                                            <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', fontSize: '20px' }}>
                                                {game.unlocked_achievements.bronze}/{game.total_achievements.bronze}
                                            </Typography>
                                        </Box>
                                    )}
                                    {!('platform' in game) && (
                                        <>
                                            <EmojiEventsIcon sx={{ fontSize: 27, mr: -1 }} />
                                            <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', fontSize: '20px' }}>
                                                {game.unlocked_achievements}/{game.total_achievements}
                                            </Typography>
                                        </>
                                    )}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: 300, ml: 50 }}>
                                        <FormControl fullWidth variant="outlined" size="small" sx={{ height: '40px' }}>
                                            <InputLabel id="dropdown-label" sx={{ fontSize: '14px' }}>Achievements filter</InputLabel>
                                            <Select
                                                labelId="dropdown-label"
                                                id="dropdown"
                                                value={selectedOption}
                                                onChange={handleChange}
                                                label="Achievements filter"
                                                sx={{
                                                    fontSize: '14px',
                                                    height: '40px',
                                                }}
                                            >
                                                <MenuItem value="All" sx={{ fontSize: '14px' }}>All achievements</MenuItem>
                                                <MenuItem value="Unlocked" sx={{ fontSize: '14px' }}>Unlocked</MenuItem>
                                                <MenuItem value="Locked" sx={{ fontSize: '14px' }}>Locked</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>
                            </Grid>
                            {filteredAchievements
                                .map((achievement: SteamAchievement, index: number) => (
                                    <AchievementCard key={index} achievement={achievement} />
                                ))}
                        </Box>
                    </Grid>
                    <Grid sx={{ width: '30vw', padding: 2, fontSize: '26px', fontFamily: 'Inter, sans-serif' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                            <b>News about the game </b>
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        {newsItems.length > 0 ? (
                            <List>
                                {newsItems.map((news, index) => (
                                    <Card
                                        key={index}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            mb: 2,
                                            boxShadow: 3,
                                            cursor: 'pointer',
                                            textDecoration: 'none',
                                            '&:hover': { boxShadow: 6 },
                                        }}
                                        onClick={() => window.open(news.url, '_blank')}
                                    >
                                        {news.urlToImage && (
                                            <Box
                                                component="img"
                                                src={news.urlToImage}
                                                alt={news.title}
                                                sx={{
                                                    width: '100%',
                                                    height: 150,
                                                    objectFit: 'cover',
                                                    borderTopLeftRadius: '4px',
                                                    borderTopRightRadius: '4px',
                                                }}
                                            />
                                        )}
                                        <Box sx={{ padding: 2 }}>
                                            <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', mb: 1 }}>
                                                {news.description || 'No description available.'}
                                            </Typography>

                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontFamily: 'Inter, sans-serif',
                                                    fontWeight: 'bold',
                                                    textAlign: 'right',
                                                    color: 'text.secondary',
                                                }}
                                            >
                                                {news.source?.name || 'Unknown Source'}
                                            </Typography>
                                        </Box>
                                    </Card>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', color: 'text.secondary', mt: 2 }}>
                                No news at the moment.
                            </Typography>
                        )}
                    </Grid>
                </Grid >
            </Box >
        </Box >

    );
};

export default GameDetails;