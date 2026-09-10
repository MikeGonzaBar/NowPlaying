import React from "react";
import { Box, Grid, Tooltip, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventIcon from "@mui/icons-material/Event";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import {
    SteamGame,
    PsnGame,
    RetroAchievementsGame,
    XboxGame,
} from "../utils/types";
import { formatPlaytime } from "../utils/utils";
import { isPsnGame } from "../utils/typeGuards";
import { zincColors } from "../../../theme";

interface GameCardProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

const platformConfig = [
    {
        key: "platform",
        value: "PS5",
        src: "/Platforms/playstation-5.webp",
        alt: "PS5 Logo",
        width: "45px",
        marginTop: "0px",
    },
    {
        key: "platform",
        value: "PS4",
        src: "/Platforms/playstation-4.png",
        alt: "PS4 Logo",
        width: "50px",
        marginTop: "0px",
    },
    {
        key: "platform",
        value: "PC, XboxOne, XboxSeries, Xbox360",
        src: "/Platforms/xbox.svg",
        alt: "XBOX Logo",
        width: "55px",
        marginTop: "0px",
    },
    {
        key: "console_name",
        value: "PlayStation 2",
        src: "/Platforms/playstation-2.png",
        alt: "PS2 Logo",
        width: "45px",
        marginTop: "0px",
    },
    {
        key: "console_name",
        value: "PlayStation",
        src: "/Platforms/playstation.webp",
        alt: "PS1 Logo",
        width: "25px",
        marginTop: "0px",
    },
    {
        key: "console_name",
        value: "Nintendo DS",
        src: "/Platforms/nintendo-ds.png",
        alt: "Nintendo DS Logo",
        width: "80px",
        marginTop: "0px",
    },
    {
        key: "console_name",
        value: "Game Boy Color",
        src: "/Platforms/gameboy-color.png",
        alt: "Game Boy Color Logo",
        width: "50px",
        marginTop: "0px",
    },
    {
        key: "console_name",
        value: "Game Boy Advance",
        src: "/Platforms/gameboy-advance.png",
        alt: "Game Boy Advance Logo",
        width: "85px",
        marginTop: "0px",
    },
];

const normalize = (text: string) =>
    text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[\-–—:]/g, " ");

const GameCard: React.FC<GameCardProps> = React.memo(({ game }) => {
    const playMins = formatPlaytime(game);
    const gameRecord = game as unknown as Record<string, unknown>;
    const platformText = typeof gameRecord.platform === "string" ? gameRecord.platform : "";
    const consoleText = typeof gameRecord.console_name === "string" ? gameRecord.console_name : "";

    const matchedPlatform = platformConfig.find((candidate) => {
        const source = candidate.key === "platform" ? platformText : consoleText;
        if (!source) return false;
        const sourceValues = normalize(source)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        const configValues = normalize(candidate.value)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

        return configValues.some((configVal) =>
            sourceValues.some((sourceVal) => sourceVal === configVal || sourceVal.includes(configVal)),
        );
    });

    const platformImg = matchedPlatform ? (
        <Box
            component="img"
            src={matchedPlatform.src}
            alt={matchedPlatform.alt}
            sx={{
                width: matchedPlatform.width,
                maxHeight: "40px",
                height: "auto",
                objectFit: "contain",
                backgroundColor: "transparent",
                display: "block",
                marginTop: matchedPlatform.marginTop,
                marginBottom: "0px",
                alignSelf: "center",
                filter: "none",
            }}
        />
    ) : (
        <Box
            component="img"
            src="/Platforms/steam.webp"
            alt="Steam Logo"
            sx={{
                width: "22px",
                maxHeight: "40px",
                height: "auto",
                objectFit: "contain",
                backgroundColor: "transparent",
                display: "block",
                marginTop: "2px",
                marginBottom: "-3px",
                filter: "none",
            }}
        />
    );
    return (
        <Box
            data-game-card
            sx={{
                backgroundColor: zincColors.card || "#18181b",
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: 6,
                transition: "transform 0.2s ease-in-out",
                "&:hover": { transform: "scale(1.03)" },
                width: "100%",
                maxWidth: "260px",
                height: "360px",
                mx: "auto",
            }}
        >
            <Box
                component="img"
                src={game.img_icon_url}
                alt={game.name}
                sx={{
                    width: "100%",
                    height: "250px",
                    objectFit: "cover",
                    display: "block",
                    margin: "0 auto",
                }}
            />
            <Box
                sx={{ paddingLeft: 2, paddingRight: 2, paddingBottom: 2, paddingTop: 1 }}
            >
                <Grid container alignItems="center" justifyContent="space-between">
                    <Grid key={game.appid} sx={{ minWidth: 0, width: "100%" }}>
                        <Tooltip title={game.name} placement="top" enterDelay={400}>
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    fontFamily: "Inter, sans-serif",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    color: zincColors.white,
                                }}
                            >
                                {game.name}
                            </Typography>
                        </Tooltip>
                    </Grid>
                </Grid>
                <Grid container alignItems="center" justifyContent="space-between">
                    <Grid sx={{ textAlign: "right" }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                            }}
                        >
                            <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, color: zincColors.muted }} />
                            <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif", color: zincColors.muted }}>
                                {playMins}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
                <Grid
                    container
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ alignItems: "end", minHeight: "100%" }}
                >
                    <Grid>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <EventIcon sx={{ fontSize: 15, mr: 0.5, color: zincColors.muted }} />
                            <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif", color: zincColors.muted }}>
                                {(() => {
                                    if ("platform" in game) {
                                        const date = new Date(game.last_played);
                                        const day = String(date.getDate()).padStart(2, "0");
                                        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
                                        const year = date.getFullYear();
                                        return `${day}/${month}/${year}`;
                                    } else {
                                        const date = new Date(game.last_played);
                                        const formatted = `${String(date.getDate()).padStart(
                                            2,
                                            "0"
                                        )}/${String(date.getMonth() + 1).padStart(
                                            2,
                                            "0"
                                        )}/${date.getFullYear()}`;
                                        return formatted;
                                    }
                                })()}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid sx={{ textAlign: "center" }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 1,
                            }}
                        >
                            {(() => {
                                // Only compute this once
                                const psn = isPsnGame(game) ? game.unlocked_achievements : null;

                                if (psn) {
                                    // Define your trophy types and images in one place
                                    const trophies: {
                                        type: keyof typeof psn;
                                        src: string;
                                        alt: string;
                                    }[] = [
                                            {
                                                type: "platinum",
                                                src: "/PSN_Trophies/PSN_platinum.png",
                                                alt: "Platinum Trophy",
                                            },
                                            {
                                                type: "gold",
                                                src: "/PSN_Trophies/PSN_gold.png",
                                                alt: "Gold Trophy",
                                            },
                                            {
                                                type: "silver",
                                                src: "/PSN_Trophies/PSN_silver.png",
                                                alt: "Silver Trophy",
                                            },
                                            {
                                                type: "bronze",
                                                src: "/PSN_Trophies/PSN_bronze.png",
                                                alt: "Bronze Trophy",
                                            },
                                        ];

                                    return trophies.map(({ type, src, alt }) => {
                                        const count = psn[type];
                                        // skip rendering if this tier isn't defined
                                        if (count === undefined) return null;
                                        return (
                                            <Box
                                                key={type}
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={src}
                                                    alt={alt}
                                                    sx={{
                                                        width: "10.5px",
                                                        height: "10.5px",
                                                        filter: count === 0 ? "grayscale(100%)" : "none",
                                                    }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontFamily: "Inter, sans-serif", color: zincColors.muted }}
                                                >
                                                    {count}
                                                </Typography>
                                            </Box>
                                        );
                                    });
                                }

                                // For Steam games (use unlocked_achievements_count)
                                if ("unlocked_achievements_count" in game && "total_achievements" in game) {
                                    return (
                                        <>
                                            <EmojiEventsIcon sx={{ fontSize: 16, mr: -1, color: zincColors.muted }} />
                                            <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif", color: zincColors.muted }}>
                                                {
                                                    (
                                                        game as Pick<
                                                            SteamGame,
                                                            "unlocked_achievements_count" | "total_achievements"
                                                        >
                                                    ).unlocked_achievements_count
                                                }
                                                /
                                                {
                                                    (
                                                        game as Pick<
                                                            SteamGame,
                                                            "unlocked_achievements_count" | "total_achievements"
                                                        >
                                                    ).total_achievements
                                                }
                                            </Typography>
                                        </>
                                    );
                                }

                                // For Xbox and RetroAchievements games (use unlocked_achievements)
                                if ("unlocked_achievements" in game && "total_achievements" in game) {
                                    return (
                                        <>
                                            <EmojiEventsIcon sx={{ fontSize: 16, mr: -1, color: zincColors.muted }} />
                                            <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif", color: zincColors.muted }}>
                                                {
                                                    (
                                                        game as Pick<
                                                            XboxGame | RetroAchievementsGame,
                                                            "unlocked_achievements" | "total_achievements"
                                                        >
                                                    ).unlocked_achievements
                                                }
                                                /
                                                {
                                                    (
                                                        game as Pick<
                                                            XboxGame | RetroAchievementsGame,
                                                            "unlocked_achievements" | "total_achievements"
                                                        >
                                                    ).total_achievements
                                                }
                                            </Typography>
                                        </>
                                    );
                                }

                                return null;
                            })()}
                        </Box>
                    </Grid>
                </Grid>
                <Grid sx={{ textAlign: "right" }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        {platformImg}
                    </Box>
                </Grid>
            </Box>
        </Box>
    );
});

export default GameCard;
