import { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import {
    SteamGame,
    PsnGame,
    RetroAchievementsGame,
    XboxGame,
} from '../utils/types';
import { parseDate, getPlaytime, calculateAchievementPercentage } from '../utils/utils';

export const useGameData = (beBaseUrl: string) => {
    const [latestPlayedGames, setLatestPlayedGames] = useState<(SteamGame | PsnGame | RetroAchievementsGame | XboxGame)[]>([]);
    const [mostPlayed, setMostPlayed] = useState<(SteamGame | PsnGame | RetroAchievementsGame | XboxGame)[]>([]);
    const [mostAchieved, setMostAchieved] = useState<(SteamGame | PsnGame | RetroAchievementsGame | XboxGame)[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [missingServices, setMissingServices] = useState<string[]>([]);

    const api = useApi();

    const fetchGameData = async (url: string): Promise<any> => {
        const data = await api.request(url);

        // Check if the response has the expected structure
        if (data.result && data.result.games) {
            return data.result.games;
        }

        // Fallback: if result is already an array (for different endpoints)
        if (Array.isArray(data.result)) {
            return data.result;
        }

        // Last resort: try to extract values (original logic)
        return Object.values(data.result);
    };

    const mergeAndSortGames = (
        steamArray: SteamGame[],
        psnArray: PsnGame[],
        retroArray: RetroAchievementsGame[],
        xboxArray: XboxGame[]
    ): (SteamGame | PsnGame | RetroAchievementsGame | XboxGame)[] => {
        const invalidTimestamp = new Date(1970, 0, 1).getTime();
        return [...steamArray, ...psnArray, ...retroArray, ...xboxArray]
            .map((game) => ({
                ...game,
                lastPlayed: parseDate(game.last_played),
            }))
            .filter((game) => game.lastPlayed.getTime() !== invalidTimestamp)
            .sort((a, b) => b.lastPlayed.getTime() - a.lastPlayed.getTime());
    };

    const fetchGames = async () => {
        try {
            setLoading(true);

            // Optimize: Make only 4 API calls instead of 11
            const [steamArray, psnArray, retroArray, xboxArray] = await Promise.all([
                fetchGameData(`${beBaseUrl}/steam/get-game-list-stored/`),
                fetchGameData(`${beBaseUrl}/psn/get-game-list-stored/`),
                fetchGameData(`${beBaseUrl}/retroachievements/fetch-games/`),
                fetchGameData(`${beBaseUrl}/xbox/get-game-list-stored/`),
            ]);

            // Process all three views from the same data
            const allGames = [...steamArray, ...psnArray, ...retroArray, ...xboxArray];

            // Latest played games
            const merged = mergeAndSortGames(steamArray, psnArray, retroArray, xboxArray);
            setLatestPlayedGames(merged);

            // Most played games - filter from all games instead of separate API calls
            const mergedPlaytimeGames = allGames
                .filter((game) => getPlaytime(game) > 0)
                .sort((a, b) => getPlaytime(b) - getPlaytime(a));
            setMostPlayed(mergedPlaytimeGames);

            // Most achieved games - process from all games instead of separate API calls
            const mergedMostAchievedGames = allGames
                .map((game) => {
                    const percentage = calculateAchievementPercentage(game);
                    return {
                        ...game,
                        achievementPercentage: percentage,
                    };
                })
                .filter((game) => {
                    const percentage = game.achievementPercentage;
                    return !isNaN(percentage) && percentage > 0;
                })
                .sort((a, b) => b.achievementPercentage - a.achievementPercentage);
            setMostAchieved(mergedMostAchievedGames);
        } catch (err) {
            console.error(err);
            setError("Failed to load games data");
        } finally {
            setLoading(false);
        }
    };

    const refreshGames = async () => {
        try {
            await Promise.all([
                api.request(`${beBaseUrl}/steam/get-game-list/`),
                api.request(`${beBaseUrl}/psn/get-game-list/`),
                api.request(`${beBaseUrl}/retroachievements/fetch-recently-played-games/`),
                api.request(`${beBaseUrl}/xbox/get-game-list/`)
            ]);
            await fetchGames();
            setError(null);
        } catch (error) {
            console.error("Error refreshing games:", error);
            setError("An error occurred while refreshing games");
        }
    };

    const checkApiKeys = async () => {
        try {
            const response = await api.request(`${beBaseUrl}/users/api-keys/services/`);
            const configuredServices = response || [];

            const requiredServices = ['steam', 'xbox', 'psn', 'retroachievements'];
            const missing = requiredServices.filter(service => !configuredServices.includes(service));
            setMissingServices(missing);

            if (missing.length > 0) {
                console.log(`Missing API keys for: ${missing.join(', ')}`);
            }
        } catch (error) {
            console.error('Error checking API keys:', error);
        }
    };

    useEffect(() => {
        fetchGames();
        checkApiKeys();
    }, []);

    return {
        latestPlayedGames,
        mostPlayed,
        mostAchieved,
        loading,
        error,
        refreshGames,
        missingServices,
    };
}; 