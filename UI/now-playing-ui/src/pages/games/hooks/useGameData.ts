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
    const [mostPlayed, setMostPlayed] = useState<(SteamGame | PsnGame)[]>([]);
    const [mostAchieved, setMostAchieved] = useState<(SteamGame | PsnGame)[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const api = useApi();

    const fetchGameData = async (url: string): Promise<any> => {
        const data = await api.request(url);
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
            const [
                steamArray,
                psnArray,
                retroArray,
                xboxArray,
                steamPlaytimeArray,
                psnPlaytimeArray,
                xboxPlaytimeArray,
                steamMostAchievedArray,
                psnMostAchievedArray,
                retroMostAchievedArray,
                xboxMostAchievedArray,
            ] = await Promise.all([
                fetchGameData(`${beBaseUrl}/steam/get-game-list-stored/`),
                fetchGameData(`${beBaseUrl}/psn/get-game-list-stored/`),
                fetchGameData(`${beBaseUrl}/retroachievements/fetch-games/`),
                fetchGameData(`${beBaseUrl}/xbox/get-game-list-stored/`),
                fetchGameData(`${beBaseUrl}/steam/get-game-list-total-playtime/`),
                fetchGameData(`${beBaseUrl}/psn/get-game-list-total-playtime/`),
                fetchGameData(`${beBaseUrl}/xbox/get-game-list-total-playtime/`),
                fetchGameData(`${beBaseUrl}/steam/get-game-list-most-achieved/`),
                fetchGameData(`${beBaseUrl}/psn/get-game-list-most-achieved/`),
                fetchGameData(`${beBaseUrl}/retroachievements/get-most-achieved-games/`),
                fetchGameData(`${beBaseUrl}/xbox/get-game-list-most-achieved/`),
            ]);

            const merged = mergeAndSortGames(steamArray, psnArray, retroArray, xboxArray);
            setLatestPlayedGames(merged);

            const mergedPlaytimeGames = [
                ...steamPlaytimeArray,
                ...psnPlaytimeArray,
                ...xboxPlaytimeArray,
            ]
                .filter((game) => getPlaytime(game))
                .sort((a, b) => getPlaytime(b) - getPlaytime(a));
            setMostPlayed(mergedPlaytimeGames);

            const mergedMostAchievedGames = [
                ...steamMostAchievedArray,
                ...psnMostAchievedArray,
                ...retroMostAchievedArray,
                ...xboxMostAchievedArray,
            ]
                .map((game) => ({
                    ...game,
                    achievementPercentage: calculateAchievementPercentage(game),
                }))
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

    useEffect(() => {
        fetchGames();
    }, []);

    return {
        latestPlayedGames,
        mostPlayed,
        mostAchieved,
        loading,
        error,
        refreshGames,
    };
}; 