import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { SteamGame, PsnGame } from '../utils/types';

interface GameCardProps {
    game: SteamGame | PsnGame;
}

const GameCard: React.FC<GameCardProps> = ({ game }) => {
    return (
        <Box
            sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 6,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': { transform: 'scale(1.03)' },
                minWidth: '250px',
                maxWidth: '250px',
                minHeight: '360px',
                maxHeight: '360px',
            }}
        >
            <Box
                component="img"
                src={game.img_icon_url}
                alt={game.name}
                sx={{
                    width: '100%',
                    height: '250px',
                    objectFit: 'cover',
                    display: 'block',
                    margin: '0 auto',
                }}
            />
            <Box sx={{ paddingLeft: 2, paddingRight: 2, paddingBottom: 2, paddingTop: 1 }}>
                <Grid container alignItems="center" justifyContent="space-between">
                    <Grid key={ game.appid }>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {game.name}
                        </Typography>
                    </Grid>
                </Grid>
                <Grid container alignItems="center" justifyContent="space-between">
                    <Grid sx={{ textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                {'platform' in game ? game.total_playtime : game.playtime_formatted}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
                <Grid container alignItems="center" justifyContent="space-between" sx={{ mt: 1, alignItems: 'end', minHeight: '100%' }}>
                    <Grid  >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EventIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                {(() => {
                                    if ('platform' in game) {
                                        const date = new Date(game.last_played);
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
                                        const year = date.getFullYear();
                                        return `${day}/${month}/${year}`;
                                    } else {
                                        const date = new Date(game.last_played);
                                        const formatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                                        return formatted;
                                    }
                                })()}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid sx={{ textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            {'platform' in game && game.unlocked_achievements?.platinum !== undefined && (
                                <Box
                                    component="img"
                                    src="https://i.psnprofiles.com/guides/18274/470bd2.png"
                                    alt="Platinum Trophy"
                                    sx={{
                                        width: '10.5px',
                                        height: '10.5px',
                                        filter: game.unlocked_achievements.platinum === 0 ? 'grayscale(100%)' : 'none',
                                    }}
                                />
                            )}

                            {'platform' in game && game.unlocked_achievements?.gold !== undefined && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box
                                        component="img"
                                        src="https://i.psnprofiles.com/guides/18274/7186c5.png"
                                        alt="Gold Trophy"
                                        sx={{ width: '10.5px', height: '10.5px' }}
                                    />
                                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                        {game.unlocked_achievements.gold}
                                    </Typography>
                                </Box>
                            )}

                            {'platform' in game && game.unlocked_achievements?.silver !== undefined && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box
                                        component="img"
                                        src="https://i.psnprofiles.com/guides/18274/f179ed.png"
                                        alt="Silver Trophy"
                                        sx={{ width: '10.5px', height: '10.5px' }}
                                    />
                                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                        {game.unlocked_achievements.silver}
                                    </Typography>
                                </Box>
                            )}

                            {'platform' in game && game.unlocked_achievements?.bronze !== undefined && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box
                                        component="img"
                                        src="https://i.psnprofiles.com/guides/18274/e8f659.png"
                                        alt="Bronze Trophy"
                                        sx={{ width: '10.5px', height: '10.5px' }}
                                    />
                                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                        {game.unlocked_achievements.bronze}
                                    </Typography>
                                </Box>
                            )}

                            {!('platform' in game) && (
                                <>
                                    <EmojiEventsIcon sx={{ fontSize: 16, mr: -1 }} />
                                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                        {game.unlocked_achievements_count}/{game.total_achievements}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Grid>
                    <Grid sx={{ textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {'platform' in game && game.platform === 'PS5' ? (
                                <Box
                                    component="img"
                                    src="https://cdn2.iconfinder.com/data/icons/logos-brands-5/2017/playstation-5-seeklogo.com-5-512.png"
                                    alt="PS5 Logo"
                                    sx={{
                                        width: '35px',
                                        height: 'auto',
                                        backgroundColor: 'transparent',
                                        marginRight: '8px',
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
                                        marginBottom: '-3px',
                                    }}
                                />
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default GameCard;