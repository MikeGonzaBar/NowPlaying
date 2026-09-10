import React from "react";
import { Box, Typography, Divider } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventIcon from "@mui/icons-material/Event";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { formatMinutesCompact, parsePlaytimeMinutes } from "../utils/utils";
import { zincColors } from "../../../theme";

export interface PlatformData {
    platform: string;
    data: Record<string, unknown>;
}

export interface GameDetailResponse {
    title: string;
    platforms: PlatformData[];
    platform_count: number;
}

interface GameComparisonProps {
    game: GameDetailResponse;
}

const GameComparison: React.FC<GameComparisonProps> = ({ game }) => {
    if (!game || game.platforms.length < 2) return null;

    let totalPlaytime = 0;
    let totalUnlocked = 0;
    let totalAchievements = 0;
    const knownPlaytimePlatforms: string[] = [];
    const unavailablePlaytimePlatforms: string[] = [];

    game.platforms.forEach((platform) => {
        const data = platform.data;
        const playtime = parsePlaytimeMinutes(
            data.playtime_forever ?? data.total_playtime,
        );

        if (playtime.available && playtime.minutes !== null) {
            totalPlaytime += playtime.minutes;
            knownPlaytimePlatforms.push(getPlatformName(platform.platform));
        } else {
            unavailablePlaytimePlatforms.push(getPlatformName(platform.platform));
        }

        const achievements = Array.isArray(data.achievements)
            ? data.achievements
            : [];
        totalAchievements += achievements.length;
        totalUnlocked += achievements.filter((achievement) => {
            const item = achievement as Record<string, unknown>;
            return item.achieved === true || item.unlocked === true;
        }).length;
    });

    const completionRate = totalAchievements > 0
        ? ((totalUnlocked / totalAchievements) * 100).toFixed(1)
        : "0.0";
    const playtimeSummary = knownPlaytimePlatforms.length > 0
        ? `${formatMinutesCompact(totalPlaytime)} across ${knownPlaytimePlatforms.join(", ").replace(/, ([^,]*)$/, ", and $1")}`
        : "Playtime unavailable";

    return (
        <Box sx={{ backgroundColor: "rgba(24, 24, 27, 0.6)", border: "1px solid #27272a", borderRadius: 2, p: 3 }}>
            <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: zincColors.white, mb: 1 }}>
                Cross-Platform Comparison
            </Typography>
            <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: zincColors.muted, mb: 3 }}>
                {game.platform_count} platforms • {game.title}
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: `repeat(${Math.min(game.platforms.length, 4)}, 1fr)` }, gap: 2 }}>
                {game.platforms.map((platform, index) => (
                    <React.Fragment key={platform.platform}>
                        {index > 0 && <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" }, borderColor: "rgba(255, 255, 255, 0.08)" }} />}
                        <SourceCard platform={platform} />
                    </React.Fragment>
                ))}
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", flexWrap: "wrap", gap: 3 }}>
                <AggregatedStat icon={<AccessTimeIcon sx={{ fontSize: 16, color: zincColors.muted }} />} label="Total Playtime" value={playtimeSummary} />
                <AggregatedStat icon={<EmojiEventsIcon sx={{ fontSize: 16, color: zincColors.muted }} />} label="Achievements" value={`${totalUnlocked}/${totalAchievements}`} />
                <AggregatedStat icon={<EmojiEventsIcon sx={{ fontSize: 16, color: zincColors.muted }} />} label="Completion" value={`${completionRate}%`} />
            </Box>
            {unavailablePlaytimePlatforms.length > 0 && (
                <Typography sx={{ mt: 1.5, fontSize: "11px", color: zincColors.muted }}>
                    {unavailablePlaytimePlatforms.join(" and ")} playtime unavailable
                </Typography>
            )}
        </Box>
    );
};

interface SourceCardProps {
    platform: PlatformData;
}

const SourceCard: React.FC<SourceCardProps> = ({ platform }) => {
    const data = platform.data;
    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    const unlockedAchievements = achievements.filter((achievement) => {
        const item = achievement as Record<string, unknown>;
        return item.achieved === true || item.unlocked === true;
    }).length;
    const playtime = parsePlaytimeMinutes(data.playtime_forever ?? data.total_playtime);
    const lastPlayed = data.last_played ? new Date(String(data.last_played)) : null;
    const platformName = getPlatformName(platform.platform);
    const platformColor = platform.platform === "steam"
        ? "#1b2838"
        : platform.platform === "psn"
            ? "#003087"
            : platform.platform === "xbox"
                ? "#107c10"
                : "#cc9900";
    const completionRate = achievements.length > 0
        ? ((unlockedAchievements / achievements.length) * 100).toFixed(1)
        : "0.0";

    return (
        <Box sx={{ backgroundColor: "rgba(9, 9, 11, 0.5)", borderRadius: 1, p: 2, borderLeft: `3px solid ${platformColor}` }}>
            <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: platformColor, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
                {platformName}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                <AccessTimeIcon sx={{ fontSize: 14, color: zincColors.muted }} />
                <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: zincColors.white }}>
                    {playtime.available && playtime.minutes !== null ? formatMinutesCompact(playtime.minutes) : "Playtime unavailable"}
                </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                <EmojiEventsIcon sx={{ fontSize: 14, color: zincColors.muted }} />
                <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: zincColors.white }}>
                    {unlockedAchievements}/{achievements.length}
                </Typography>
                <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: zincColors.muted }}>
                    ({completionRate}%)
                </Typography>
            </Box>
            {lastPlayed && !Number.isNaN(lastPlayed.getTime()) && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <EventIcon sx={{ fontSize: 14, color: zincColors.muted }} />
                    <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: zincColors.muted }}>
                        {lastPlayed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

interface AggregatedStatProps {
    icon: React.ReactNode;
    label: string;
    value: string;
}

const AggregatedStat: React.FC<AggregatedStatProps> = ({ icon, label, value }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {icon}
        <Box>
            <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: zincColors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
            </Typography>
            <Typography sx={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: zincColors.white }}>
                {value}
            </Typography>
        </Box>
    </Box>
);

const getPlatformName = (platform: string): string => {
    if (platform === "steam") return "Steam";
    if (platform === "psn") return "PlayStation";
    if (platform === "xbox") return "Xbox";
    return "RetroAchievements";
};

export default GameComparison;
