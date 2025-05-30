import React from 'react';
import { Box, Typography, Grid, Skeleton } from '@mui/material';
import { Link } from 'react-router-dom';
import GameCard from './gameCard';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';

interface GameSectionProps {
    title: string;
    games: (SteamGame | PsnGame | RetroAchievementsGame | XboxGame)[];
    loading: boolean;
}

const renderLoadingSkeletons = (count = 10) =>
    Array.from(new Array(count)).map((_, i) => (
        <Grid component="div" key={i}>
            <Skeleton variant="rectangular" height={200} />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
        </Grid>
    ));

const GameSection: React.FC<GameSectionProps> = ({ title, games, loading }) => (
    <>
        <Typography
            variant="h5"
            sx={{
                mt: 2,
                ml: 1,
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
            }}
        >
            {title}
        </Typography>
        <Box
            sx={{
                display: "flex",
                overflowX: "auto",
                gap: 32,
                py: 1,
                px: 1,
            }}
        >
            {loading
                ? renderLoadingSkeletons()
                : games.map((game) => (
                    <Grid key={game.appid}>
                        <Link
                            to={`/game/${game.appid}`}
                            state={{ game }}
                            style={{ textDecoration: "none" }}
                        >
                            <GameCard game={game} />
                        </Link>
                    </Grid>
                ))}
        </Box>
    </>
);

export default React.memo(GameSection); 