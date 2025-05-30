import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from './types';

export const isPsnGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is PsnGame => {
    return (game as PsnGame).platform !== undefined &&
        typeof (game as PsnGame).unlocked_achievements === 'object' &&
        (game as PsnGame).unlocked_achievements !== null &&
        !Array.isArray((game as PsnGame).unlocked_achievements) &&
        ('bronze' in (game as PsnGame).unlocked_achievements ||
            'silver' in (game as PsnGame).unlocked_achievements ||
            'gold' in (game as PsnGame).unlocked_achievements ||
            'platinum' in (game as PsnGame).unlocked_achievements);
};

export const isXboxGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is XboxGame => {
    const hasplatform = "platform" in game;
    const unlocked = (game as any).unlocked_achievements;
    const hasNumericUnlocked = typeof unlocked === 'number';
    const platform = (game as any).platform;
    const platformMatches = hasplatform && typeof platform === 'string' &&
        ["XboxOne", "XboxSeries", "PC", "Xbox360"].some(plat => platform.includes(plat));

    return hasplatform && hasNumericUnlocked && platformMatches;
};

export const isRetroAchievementsGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is RetroAchievementsGame => {
    return (game as RetroAchievementsGame).console_name !== undefined;
};

export const isSteamGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is SteamGame => {
    return !("platform" in game) && !("console_name" in game);
}; 