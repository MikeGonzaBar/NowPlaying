import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from './types';

export const isPsnGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is PsnGame => {
    return (game as PsnGame).platform !== undefined;
};

export const isRetroAchievementsGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is RetroAchievementsGame => {
    return (game as RetroAchievementsGame).console_name !== undefined;
};

export const isSteamGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is SteamGame => {
    return !("platform" in game);
};

export const isXboxGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is XboxGame => {
    return "platform" in game &&
        ["XboxOne", "XboxSeries", "PC", "Xbox360"].some(
            plat => (game.platform as string).includes(plat)
        );
};

export const calculateAchievementPercentage = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): number => {
    if (isSteamGame(game) || isXboxGame(game)) {
        return (game.unlocked_achievements_count / game.total_achievements) * 100;
    } else if (isPsnGame(game)) {
        const trophyValues = { bronze: 15, silver: 30, gold: 90, platinum: 300 };

        const unlockedPoints =
            (game.unlocked_achievements.bronze || 0) * trophyValues.bronze +
            (game.unlocked_achievements.silver || 0) * trophyValues.silver +
            (game.unlocked_achievements.gold || 0) * trophyValues.gold +
            (game.unlocked_achievements.platinum || 0) * trophyValues.platinum;

        const totalPoints =
            (game.total_achievements.bronze || 0) * trophyValues.bronze +
            (game.total_achievements.silver || 0) * trophyValues.silver +
            (game.total_achievements.gold || 0) * trophyValues.gold +
            (game.total_achievements.platinum || 0) * trophyValues.platinum;

        return totalPoints > 0 ? (unlockedPoints / totalPoints) * 100 : 0;
    } else if (isRetroAchievementsGame(game)) {
        return (game.unlocked_achievements_count / game.total_achievements) * 100;
    }
    return 0;
}; 