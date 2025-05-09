import React from 'react';
import { Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrophyIcon from './TrophyIcon';
import { PsnGame, RetroAchievementsGame } from '../utils/types';

interface TrophyStatsProps {
    game: PsnGame | RetroAchievementsGame;
}

const isRetroAchievementsGame = (game: PsnGame | RetroAchievementsGame): game is RetroAchievementsGame => {
    return 'console_name' in game;
};

const TrophyStats: React.FC<TrophyStatsProps> = ({ game }) => {
    if ('platform' in game && game.unlocked_achievements) {
        return (
            <>
                {game.unlocked_achievements.platinum !== undefined && (
                    <TrophyIcon
                        src="/PSN_Trophies/PSN_platinum.png"
                        alt="Platinum Trophy"
                        unlocked={game.unlocked_achievements.platinum}
                        total={1}
                        grayscale
                    />
                )}
                {game.unlocked_achievements.gold !== undefined && (
                    <TrophyIcon
                        src="/PSN_Trophies/PSN_gold.png"
                        alt="Gold Trophy"
                        unlocked={game.unlocked_achievements.gold}
                        total={game.total_achievements.gold!}
                    />
                )}
                {game.unlocked_achievements.silver !== undefined && (
                    <TrophyIcon
                        src="/PSN_Trophies/PSN_silver.png"
                        alt="Silver Trophy"
                        unlocked={game.unlocked_achievements.silver}
                        total={game.total_achievements.silver!}
                    />
                )}
                {game.unlocked_achievements.bronze !== undefined && (
                    <TrophyIcon
                        src="/PSN_Trophies/PSN_bronze.png"
                        alt="Bronze Trophy"
                        unlocked={game.unlocked_achievements.bronze}
                        total={game.total_achievements.bronze!}
                    />
                )}
            </>
        );
    }

    if (isRetroAchievementsGame(game)) {
        return (
            <>
                <EmojiEventsIcon sx={{ fontSize: 27, mr: -1 }} />
                <Typography
                    variant="body2"
                    sx={{ fontFamily: "Inter, sans-serif", fontSize: "20px" }}
                >
                    {game.unlocked_achievements_count}/{game.total_achievements}
                </Typography>
            </>
        );
    }

    return null;
};

export default React.memo(TrophyStats); 