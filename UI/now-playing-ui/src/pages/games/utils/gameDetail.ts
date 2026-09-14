import { parsePlaytimeMinutes } from "./utils";

export interface PlatformGameData {
  platform: string;
  data: Record<string, unknown>;
}

export interface GameDetailResponse {
  title: string;
  platforms: PlatformGameData[];
  platform_count: number;
}

/** Detail views count achievement arrays only, without summary-count fallbacks. */
export const getDetailMetrics = (data: Record<string, unknown>) => {
  const achievements = Array.isArray(data.achievements)
    ? data.achievements
    : [];
  const unlocked = achievements.filter((achievement) => {
    const item = achievement as Record<string, unknown>;
    return item.achieved === true || item.unlocked === true;
  }).length;
  return {
    playtime: parsePlaytimeMinutes(
      data.playtime_forever ?? data.total_playtime,
    ),
    total: achievements.length,
    unlocked,
  };
};

export const getCombinedDetailMetrics = (
  platforms: readonly PlatformGameData[],
) => {
  let playtimeMinutes = 0;
  let unlocked = 0;
  let total = 0;
  const knownPlaytimePlatforms: string[] = [];
  const unavailablePlaytimePlatforms: string[] = [];
  platforms.forEach((entry) => {
    const metrics = getDetailMetrics(entry.data);
    if (metrics.playtime.available && metrics.playtime.minutes !== null) {
      playtimeMinutes += metrics.playtime.minutes;
      knownPlaytimePlatforms.push(entry.platform);
    } else {
      unavailablePlaytimePlatforms.push(entry.platform);
    }
    total += metrics.total;
    unlocked += metrics.unlocked;
  });
  return {
    playtimeMinutes,
    unlocked,
    total,
    knownPlaytimePlatforms,
    unavailablePlaytimePlatforms,
  };
};
