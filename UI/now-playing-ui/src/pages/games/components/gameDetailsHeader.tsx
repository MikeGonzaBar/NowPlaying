import React from 'react';
import { Box, Typography, IconButton, Card, CardMedia } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';
import { SteamGame, PsnGame } from '../utils/types';

interface GameHeaderProps {
    game: SteamGame | PsnGame;
}

const isPsnGame = (game: SteamGame | PsnGame): game is PsnGame => {
    return (game as PsnGame).platform !== undefined;
};

const isPs4 = (game: SteamGame | PsnGame): game is PsnGame => {
    return (game as PsnGame).platform == 'PS4';
};


const getPlatformLogo = (game: SteamGame | PsnGame): string => {
    if (isPsnGame(game)) {
        return game.platform === 'PS5'
            ? 'https://cdn2.iconfinder.com/data/icons/logos-brands-5/2017/playstation-5-seeklogo.com-5-512.png'
            : 'https://1000logos.net/wp-content/uploads/2017/05/PlayStation-Logo-2013.png';
    }
    return 'https://cdn3.iconfinder.com/data/icons/remixicon-logos/24/steam-fill-512.png';
};
const formatDate = (game: SteamGame | PsnGame): string => {
    if ('platform' in game) {
        const date = new Date(game.last_played);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } else {
        const date = new Date(game.last_played);
        const formatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        return formatted;
    }
};

const GameHeader: React.FC<GameHeaderProps> = ({ game }) => {
    const platformLogo = getPlatformLogo(game);
    const lastPlayed = formatDate(game);
    const totalPlaytime = isPsnGame(game) ? game.total_playtime : game.playtime_formatted;

    if (!game) {
        return <Typography variant="h6">Game not found</Typography>;
    }

    return (
        <Box>
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

                <Box
                    component="img"
                    src={platformLogo}
                    alt={`${isPsnGame(game) ? game.platform : 'Steam'} Logo`}
                    sx={{
                        width: isPsnGame(game) ? isPs4(game) ? '45px' : '55px' : '30px',
                        height: 'auto',
                        backgroundColor: 'transparent',
                        marginTop: isPsnGame(game) ? '0px' : '2px',
                        marginRight: '735px',
                        marginleft: '0px',
                    }}
                />
            </Box>
            <Box sx={{ display: 'flex', gap: 8 }}>
                <Card>
                    <CardMedia
                        component="img"
                        image={
                            isPsnGame(game) && game.img_icon_url
                                ? game.img_icon_url
                                : `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`
                        }
                        alt={game.name}
                        sx={{
                            width: isPsnGame(game) ? 300 : 460,
                            height: isPsnGame(game) ? 300 : 'auto',
                        }}
                    />
                </Card>
                <Box sx={{}}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Last time played: </b> {lastPlayed}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                        <b>Total playtime: </b>{totalPlaytime}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default GameHeader;