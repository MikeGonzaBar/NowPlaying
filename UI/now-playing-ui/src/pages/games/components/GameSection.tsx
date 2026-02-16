import React from 'react';
import { Box, Typography, Grid, Skeleton } from '@mui/material';
import { Link } from 'react-router-dom';
import GameCard from './gameCard';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';


interface GameSectionProps {
    title: string;
    games: (SteamGame | PsnGame | RetroAchievementsGame | XboxGame)[];
    loading: boolean;
    selectedPlatforms?: string[];
    getGamePlatform?: (game: any) => string;
}

const renderLoadingSkeletons = (count = 10) =>
    Array.from(new Array(count)).map((_, i) => (
        <Grid component="div" key={i}>
            <Skeleton variant="rectangular" height={200} />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
        </Grid>
    ));



const GameSection: React.FC<GameSectionProps> = ({ title, games, loading, selectedPlatforms = [], getGamePlatform }) => {
    // Filter games based on selected platforms using the provided platform detection function
    const filteredGames = selectedPlatforms.length === 0 || !getGamePlatform
        ? games
        : games.filter(game => {
            const gamePlatform = getGamePlatform(game);
            return selectedPlatforms.includes(gamePlatform);
        });

    return (
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
                {title} {selectedPlatforms.length > 0 && `(${filteredGames.length})`}
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
                    : filteredGames.map((game) => (
                        <Grid key={game.appid}>
                            <Link
                                to={`/game/${game.appid}`}
                                state={{ game }}
                                style={{ textDecoration: "none" }}
                                onClick={(e) => {
                                    // Capture card position for shared element transition
                                    const cardElement = e.currentTarget.querySelector('[data-game-card]') as HTMLElement;
                                    if (cardElement) {
                                        const rect = cardElement.getBoundingClientRect();
                                        const cardPosition = {
                                            x: rect.left,
                                            y: rect.top,
                                            width: rect.width,
                                            height: rect.height,
                                        };
                                        // Store in sessionStorage for transition
                                        sessionStorage.setItem('gameCardPosition', JSON.stringify(cardPosition));
                                    }
                                }}
                            >
                                <Box data-game-card>
                                    <GameCard game={game} />
                                </Box>
                            </Link>
                        </Grid>
                    ))}
            </Box>
        </>
    );
};

export default React.memo(GameSection); 