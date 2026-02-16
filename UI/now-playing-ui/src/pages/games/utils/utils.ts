import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from "./types"; // Adjust the import path as necessary
import { isPsnGame, isXboxGame, isRetroAchievementsGame, isSteamGame } from "./typeGuards";

export const parseDate = (dateString: string): Date => {
    if (!dateString) {
        // Return fallback invalid timestamp (Jan 1, 1970)
        return new Date(1970, 0, 1);
    }
    if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/").map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(dateString);
};

export const getPlaytime = (game: any): number => {
    // 1) Steam games
    if ("playtime_forever" in game) {
        return game.playtime_forever;
    }

    // 2) Xbox-style games: platform contains one of these → total_playtime is already minutes
    const xboxPlatforms = ["XboxOne", "XboxSeries", "PC", "Xbox360"];
    if (
        "platform" in game &&
        xboxPlatforms.some((plat) => (game.platform as string).includes(plat))
    ) {
        // cast to number, default 0 if it's missing/NaN
        const mins = parseInt(game.total_playtime as string, 10);
        return isNaN(mins) ? 0 : mins;
    }

    // 3) PSN / other "X days, HH:MM:SS" strings
    if ("total_playtime" in game && typeof game.total_playtime === "string") {
        const parts = game.total_playtime.split(/[:, ]+/);
        const hasDays = parts.includes("days");
        const days = hasDays ? parseInt(parts[0], 10) : 0;
        const hours = parseInt(parts[hasDays ? 2 : 0], 10);
        const mins = parseInt(parts[hasDays ? 3 : 1], 10);
        return days * 24 * 60 + hours * 60 + mins;
    }

    // anything else, give up
    return 0;
};

export const formatPlaytime = (game: any): string => {
    // 1) Steam games
    if ("playtime_forever" in game) {
        const m = game.playtime_formatted.match(/(\d+)\s*h\s*(\d+)\s*m/);
        if (!m) return "0m";

        let hours = parseInt(m[1], 10);
        let minutes = parseInt(m[2], 10);

        const days = Math.floor(hours / 24);
        const remHours = hours % 24;

        const pad2 = (n: number) => String(n).padStart(2, "0");

        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (remHours > 0) parts.push(`${pad2(remHours)}h`);
        if (minutes > 0) parts.push(`${pad2(minutes)}m`);

        // if it was all zero, show "0m"
        return parts.length > 0 ? parts.join(" ") : "0m";
    }

    // // 2) Xbox-style games: platform contains one of these → total_playtime is already minutes
    const xboxPlatforms = ["XboxOne", "XboxSeries", "PC", "Xbox360"];
    if (
        "platform" in game &&
        xboxPlatforms.some((plat) => (game.platform as string).includes(plat))
    ) {
        // cast to number, default 0 if it's missing/NaN
        const mins = parseInt(game.total_playtime as string, 10);
        let secondsLeft = mins * 60;

        const days = Math.floor(secondsLeft / (24 * 3600));
        secondsLeft = secondsLeft % (24 * 3600);

        const hours = Math.floor(secondsLeft / 3600);
        secondsLeft = secondsLeft % 3600;

        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0) parts.push(`${seconds}s`);

        // if it was zero minutes, show "0m"
        return parts.length > 0 ? parts.join(" ") : "0m";
    }
    // // 3) PSN / other "X days, HH:MM:SS" strings
    if ("total_playtime" in game && typeof game.total_playtime === "string") {
        return `${game.total_playtime}`;
    }

    // Default return statement
    return "Unknown playtime";
};

export const calculateAchievementPercentage = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): number => {
    if (isXboxGame(game)) {
        const percentage = (game.unlocked_achievements / game.total_achievements) * 100;
        return percentage;
    } else if (isPsnGame(game)) {
        const trophyValues = { bronze: 1, silver: 2, gold: 3, platinum: 20 };

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

        const percentage = totalPoints > 0 ? (unlockedPoints / totalPoints) * 100 : 0;
        return percentage;
    } else if (isRetroAchievementsGame(game)) {
        const percentage = (game.unlocked_achievements / game.total_achievements) * 100;
        return percentage;
    } else if (isSteamGame(game)) {
        const percentage = (game.unlocked_achievements_count / game.total_achievements) * 100;
        return percentage;
    }

    return 0;
};

/**
 * Formats playtime in a compact "Xd Yh" format (e.g., "41d 11h")
 * Returns days and hours only, omitting minutes for cleaner display
 */
export const formatPlaytimeCompact = (game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame): string => {
    const minutes = getPlaytime(game);
    if (minutes === 0) return "0h";

    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);

    return parts.length > 0 ? parts.join(" ") : "0h";
};

/**
 * Gets the rank of a game in the "Most Played" list
 * Returns the 1-based rank, or null if the game is not in the list
 */
export const getGameRank = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame,
    mostPlayed: (SteamGame | PsnGame | RetroAchievementsGame | XboxGame)[]
): number | null => {
    const gameId = String(game.appid);
    const index = mostPlayed.findIndex((g) => String(g.appid) === gameId);
    return index >= 0 ? index + 1 : null;
};

/**
 * Formats a date string to "Last played on [Date]" format
 */
export const formatLastPlayedDate = (dateString: string): string => {
    if (!dateString) return "Never played";

    const date = parseDate(dateString);
    if (date.getTime() === new Date(1970, 0, 1).getTime()) {
        return "Never played";
    }

    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

/**
 * Extracts all achievement unlock dates from a game
 * Returns array of Date objects for unlocked achievements
 */
export const getAchievementUnlockDates = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): Date[] => {
    const unlockDates: Date[] = [];

    if (!game.achievements || !Array.isArray(game.achievements)) {
        return unlockDates;
    }

    game.achievements.forEach((achievement: any) => {
        if (achievement.unlocked && achievement.unlock_time) {
            const date = parseDate(achievement.unlock_time);
            // Filter out invalid dates
            if (date.getTime() !== new Date(1970, 0, 1).getTime()) {
                unlockDates.push(date);
            }
        }
    });

    return unlockDates.sort((a, b) => a.getTime() - b.getTime());
};

/**
 * Groups achievement unlock dates by day and counts unlocks per day
 * Returns array of { date: Date, count: number } for last 30 days
 */
export const groupAchievementsByDate = (
    unlockDates: Date[],
    days: number = 30
): Array<{ date: Date; count: number }> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    // Initialize all days with 0 count
    const dailyCounts: Map<string, number> = new Map();
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        dailyCounts.set(dateKey, 0);
    }

    // Count unlocks per day
    unlockDates.forEach((date) => {
        const dateKey = date.toISOString().split('T')[0];
        const currentCount = dailyCounts.get(dateKey) || 0;
        dailyCounts.set(dateKey, currentCount + 1);
    });

    // Convert to array and sort by date
    const result: Array<{ date: Date; count: number }> = [];
    dailyCounts.forEach((count, dateKey) => {
        result.push({
            date: new Date(dateKey),
            count,
        });
    });

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
};

/**
 * Parses platforms from a game object
 * Returns array of platform names
 */
export const parsePlatforms = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): string[] => {
    const platforms: string[] = [];

    // Xbox games have comma-separated platform string
    if (isXboxGame(game) && game.platform) {
        const platformList = game.platform.split(',').map(p => p.trim());
        platforms.push(...platformList);
    }
    // PSN games have single platform
    else if (isPsnGame(game) && game.platform) {
        platforms.push(game.platform);
    }
    // RetroAchievements games have console_name
    else if (isRetroAchievementsGame(game) && game.console_name) {
        platforms.push(game.console_name);
    }
    // Steam games - default to Steam
    else {
        platforms.push('Steam');
    }

    return platforms.filter(Boolean);
};

/**
 * Formats platform name for display
 * Converts "XboxOne" to "Xbox One", etc.
 */
export const formatPlatformName = (platform: string): string => {
    const platformMap: Record<string, string> = {
        'XboxOne': 'Xbox One',
        'XboxSeries': 'Xbox Series',
        'Xbox360': 'Xbox 360',
        'PC': 'PC',
        'PS4': 'PlayStation 4',
        'PS5': 'PlayStation 5',
        'Steam': 'Steam',
    };

    return platformMap[platform] || platform;
};