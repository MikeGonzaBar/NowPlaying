import React, { useMemo } from 'react';
import { Card, CardMedia } from '@mui/material';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';

interface GameImageProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

const isPsnGame = (game: any): game is PsnGame => {
    return game.platform !== undefined;
};

const isRetroAchievementsGame = (game: any): game is RetroAchievementsGame => {
    return game.console_name !== undefined;
};

const GameImage: React.FC<GameImageProps> = ({ game }) => {
    const imageUrl = useMemo(() => {
        if (isPsnGame(game) && game.img_icon_url) {
            return game.img_icon_url;
        }
        if (isRetroAchievementsGame(game) && game.image_title) {
            return game.image_title;
        }
        return `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
    }, [game]);

    return (
        <Card>
            <CardMedia
                component="img"
                image={imageUrl}
                alt={game.name}
                sx={{
                    width: isPsnGame(game) ? 300 : 460,
                    height: isPsnGame(game) ? 300 : "auto",
                    objectFit: "cover",
                }}
                loading="lazy"
            />
        </Card>
    );
};

export default React.memo(GameImage); 