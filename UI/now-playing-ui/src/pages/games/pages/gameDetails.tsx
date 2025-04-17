import { Box, Grid } from '@mui/material';
import React from 'react';
import { useLocation } from 'react-router-dom';
import SideBar from '../../../components/sideBar';
import { SteamGame, PsnGame, RetroAchievementsGame } from '../utils/types';
import AchievementsSection from '../components/achievementsSection';
import GameHeader from '../components/gameDetailsHeader';
import NewsSection from '../components/gameNews';

const GameDetails: React.FC = () => {
    const location = useLocation();
    const game = location.state?.game as SteamGame | PsnGame| RetroAchievementsGame;

    if (!game) {
        return <div>Game not found</div>;
    }

    return (
        <Box sx={{ paddingLeft: 2.5 }}>
            <SideBar activeItem="Games" />
            <Box
                component="main"
                sx={{ marginLeft: 20, mt: 2, display: 'flex', height: '98vh', width: '89vw' }}
            >
                <Grid sx={{ display: 'flex' }}>
                    <Grid sx={{ width: '70vw', ml: 4 }}>
                        <GameHeader game={game}></GameHeader>
                        <AchievementsSection game={game}></AchievementsSection>
                    </Grid>
                    <Grid sx={{ width: '30vw', padding: 2, fontSize: '26px', fontFamily: 'Inter, sans-serif' }}>
                        <NewsSection gameName={game.name} />
                    </Grid>
                </Grid >
            </Box >
        </Box >

    );
};

export default GameDetails;