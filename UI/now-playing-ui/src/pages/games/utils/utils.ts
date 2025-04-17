import { SteamGame, PsnGame } from './types'; // Adjust the import path as necessary

export const parseDate = (dateString: string): Date => {
    if (!dateString) {
        // Return fallback invalid timestamp (Jan 1, 1970)
        return new Date(1970, 0, 1);
    }
    if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(dateString);
};

export const getPlaytime = (game: any) => {
    if ('playtime_forever' in game) {
        return game.playtime_forever; // Exclude Steam games with 0 minutes
    } else {
        const timeParts = game.total_playtime.split(/[:, ]+/); // Parse "X days, HH:MM:SS"
        const days = timeParts.includes('days') ? parseInt(timeParts[0]) : 0;
        const hours = parseInt(timeParts[timeParts.includes('days') ? 2 : 0]);
        const minutes = parseInt(timeParts[timeParts.includes('days') ? 3 : 1]);
        const totalMinutes = days * 24 * 60 + hours * 60 + minutes;
        return totalMinutes; // Exclude PSN games with 0 minutes
    }
};

function isSteamGame(game: SteamGame | PsnGame): game is SteamGame {
    // SteamGame doesn’t have a `platform` field
    return !("platform" in game);
}

export const calculateAchievementPercentage = (game: SteamGame | PsnGame) => {
    if (isSteamGame(game)) {
        return (game.unlocked_achievements_count / game.total_achievements) * 100;
    } else if (typeof game.unlocked_achievements === 'object' && typeof game.total_achievements === 'object') {
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
        return (unlockedPoints / totalPoints) * 100;
    }
    return 0;
};