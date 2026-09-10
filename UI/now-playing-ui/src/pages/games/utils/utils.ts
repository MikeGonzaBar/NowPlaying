import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from "./types"; // Adjust the import path as necessary
import {
  isPsnGame,
  isXboxGame,
  isRetroAchievementsGame,
  isSteamGame,
} from "./typeGuards";

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
  return formatMinutesCompact(getPlaytime(game));
};

export const calculateAchievementPercentage = (
  game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame,
): number => {
  if (isXboxGame(game)) {
    const percentage =
      (game.unlocked_achievements / game.total_achievements) * 100;
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

    const percentage =
      totalPoints > 0 ? (unlockedPoints / totalPoints) * 100 : 0;
    return percentage;
  } else if (isRetroAchievementsGame(game)) {
    const percentage =
      (game.unlocked_achievements / game.total_achievements) * 100;
    return percentage;
  } else if (isSteamGame(game)) {
    const percentage =
      (game.unlocked_achievements_count / game.total_achievements) * 100;
    return percentage;
  }

  return 0;
};

/**
 * Formats playtime in a compact "Xd Yh" format (e.g., "41d 11h")
 * Returns days and hours only, omitting minutes for cleaner display
 */
export const formatPlaytimeCompact = (
  game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame,
): string => {
  return formatMinutesCompact(getPlaytime(game));
};

/**
 * Gets the rank of a game in the "Most Played" list
 * Returns the 1-based rank, or null if the game is not in the list
 */
export const getGameRank = (
  game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame,
  mostPlayed: (SteamGame | PsnGame | RetroAchievementsGame | XboxGame)[],
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

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Extracts all achievement unlock dates from a game
 * Returns array of Date objects for unlocked achievements
 */
export const getAchievementUnlockDates = (
  game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame,
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
  days: number = 30,
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
    const dateKey = date.toISOString().split("T")[0];
    dailyCounts.set(dateKey, 0);
  }

  // Count unlocks per day
  unlockDates.forEach((date) => {
    const dateKey = date.toISOString().split("T")[0];
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
  game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame,
): string[] => {
  const platforms: string[] = [];

  // Xbox games have comma-separated platform string
  if (isXboxGame(game) && game.platform) {
    const platformList = game.platform.split(",").map((p) => p.trim());
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
    platforms.push("Steam");
  }

  return platforms.filter(Boolean);
};

/**
 * Formats platform name for display
 * Converts "XboxOne" to "Xbox One", etc.
 */
/**
 * Formats a raw minute count into a compact human-readable string.
 * Example: 125 → "2h 5m", 1500 → "1d 1h", 45 → "45m"
 */
export const formatMinutesCompact = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))}s`;

  minutes = Math.round(minutes);

  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);

  return parts.length > 0 ? parts.join(" ") : "0m";
};

/** Converts provider playtime values to minutes while preserving unavailable data. */
export const parsePlaytimeMinutes = (
  value: unknown,
): { minutes: number | null; available: boolean } => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return { minutes: value, available: true };
  }

  if (typeof value !== "string" || value.trim() === "") {
    return { minutes: null, available: false };
  }

  const normalized = value.trim().toLowerCase();
  const numericMinutes = normalized.match(/^\d+(?:\.\d+)?$/);
  if (numericMinutes) {
    return { minutes: Number(numericMinutes[0]), available: true };
  }

  const dayMatch = normalized.match(/(\d+(?:\.\d+)?)\s*d(?:ays?)?/);
  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/);
  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/);
  const secondMatch = normalized.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:onds?)?)?/);

  if (dayMatch || hourMatch || minuteMatch || secondMatch) {
    const days = Number(dayMatch?.[1] || 0);
    const hours = Number(hourMatch?.[1] || 0);
    const minutes = Number(minuteMatch?.[1] || 0);
    const seconds = Number(secondMatch?.[1] || 0);
    return {
      minutes: days * 24 * 60 + hours * 60 + minutes + seconds / 60,
      available: true,
    };
  }

  const clockParts = normalized.match(/^(?:(\d+)\s+days?,?\s+)?(\d+):(\d+)(?::(\d+))?$/);
  if (clockParts) {
    const days = Number(clockParts[1] || 0);
    const hoursOrMinutes = Number(clockParts[2]);
    const minutesOrSeconds = Number(clockParts[3]);
    const seconds = Number(clockParts[4] || 0);
    const minutes = clockParts[4]
      ? days * 24 * 60 + hoursOrMinutes * 60 + minutesOrSeconds + seconds / 60
      : days * 24 * 60 + hoursOrMinutes * 60 + minutesOrSeconds;
    return { minutes, available: true };
  }

  return { minutes: null, available: false };
};

export const formatPlatformName = (platform: string): string => {
  const platformMap: Record<string, string> = {
    XboxOne: "Xbox One",
    XboxSeries: "Xbox Series",
    Xbox360: "Xbox 360",
    PC: "PC",
    PS4: "PlayStation 4",
    PS5: "PlayStation 5",
    Steam: "Steam",
  };

  return platformMap[platform] || platform;
};

/**
 * Normalizes an achievement description produced by provider adapters.
 *
 * Providers (especially Xbox/RetroAchievements) occasionally concatenate a
 * description with itself or add double terminal punctuation, e.g.
 * `Ten 999 turbas en una parcela.. Ten 999 turbas en una parcela.`
 * (audit #8). We collapse exact duplicated halves and stray punctuation
 * anywhere descriptions are displayed so the product reads as one curated
 * system rather than several APIs printed side by side.
 */
export const cleanAchievementDescription = (text: string): string => {
  const value = (text || "").trim();
  if (!value) return value;

  // Collapse sequences of terminal punctuation created by concatenation.
  let cleaned = value.replace(/\.{2,}/g, ".").replace(/\.\s*$/g, ".").trim();

  // If the whole string is exactly two copies of itself, keep one copy.
  if (cleaned.length >= 2 && cleaned.length % 2 === 0) {
    const half = cleaned.length / 2;
    if (cleaned.slice(0, half) === cleaned.slice(half)) {
      cleaned = cleaned.slice(0, half);
    }
  }

  return cleaned.trim();
};

/**
 * Joins a list of provider names with English list grammar:
 * `["Steam"]` → "Steam"; `["Steam","Xbox"]` → "Steam and Xbox";
 * `["Steam","PlayStation","Xbox"]` → "Steam, PlayStation, and Xbox"
 * (audit #8: "across Steam, and Xbox" was ungrammatical).
 */
export const formatProviderList = (names: string[]): string => {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
};
