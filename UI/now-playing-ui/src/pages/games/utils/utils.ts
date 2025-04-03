import { SteamGame, PsnGame } from './utils/types';

export const parseDate = (dateString: string): Date => {
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

export const calculateAchievementPercentage = (game: SteamGame | PsnGame) => {
    if (typeof game.unlocked_achievements === 'number' && typeof game.total_achievements === 'number') {
        // Steam: unlocked_achievements and total_achievements are numbers
        return (game.unlocked_achievements / game.total_achievements) * 100;
    } else if (typeof game.unlocked_achievements === 'object' && typeof game.total_achievements === 'object') {
        // PSN: unlocked_achievements and total_achievements are objects
        const unlocked =
            (game.unlocked_achievements.platinum || 0) +
            (game.unlocked_achievements.gold || 0) +
            (game.unlocked_achievements.silver || 0) +
            (game.unlocked_achievements.bronze || 0);
        const total =
            (game.total_achievements.platinum || 0) +
            (game.total_achievements.gold || 0) +
            (game.total_achievements.silver || 0) +
            (game.total_achievements.bronze || 0);
        return (unlocked / total) * 100;
    }
    return 0;
};