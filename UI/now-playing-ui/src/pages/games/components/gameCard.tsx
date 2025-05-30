import React from "react";
import { Box, Grid, Typography } from "@mui/material";
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

interface GameCardProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

const GameCard: React.FC<GameCardProps> = ({ game }) => {
    const platformConfig = [
        {
            key: "platform",
            value: "PS5",
            src: "Platforms/playstation-5.webp",
            alt: "PS5 Logo",
            width: "45px",
            style: { marginTop: "-10px" },
        },
        {
            key: "platform",
            value: "PS4",
            src: "Platforms/playstation-4.png",
            alt: "PS4 Logo",
            width: "50px",
        },
        {
            key: "platform",
            value: "PC, XboxOne, XboxSeries, Xbox360",
            src: "Platforms/xbox.svg",
            alt: "XBOX Logo",
            width: "55px",
            style: { marginTop: "-5px" },
        },
        {
            key: "console_name",
            value: "PlayStation 2",
            src: "Platforms/playstation-2.png",
            alt: "PS2 Logo",
            width: "45px",
            style: { marginTop: "8px" },
        },
        {
            key: "console_name",
            value: "PlayStation",
            src: "Platforms/playstation.webp",
            alt: "PS1 Logo",
            width: "25px",
        },
        {
            key: "console_name",
            value: "Nintendo DS",
            src: "Platforms/nintendo-ds.png",
            alt: "Nintendo DS Logo",
            width: "80px",
            style: { marginTop: "8px" },
        },
        {
            key: "console_name",
            value: "Game Boy Color",
            src: "Platforms/gameboy-color.png",
            alt: "Game Boy Color Logo",
            width: "50px",
            style: { marginTop: "3px" },
        },
        {
            key: "console_name",
            value: "Game Boy Advance",
            src: "Platforms/gameboy-advance.png",
            alt: "Game Boy Advance Logo",
            width: "85px",
            style: { marginTop: "-30px" },
        },
    ];
    const playMins = formatPlaytime(game);
    const matchedPlatform = platformConfig.find(({ key, value }) => {
        if (!(key in game)) return false;

        const gameValue = (game as Record<string, any>)[key];
        if (typeof gameValue !== "string") return false;

        const gameValues = gameValue.split(",").map((v) => v.trim().toLowerCase());
        const configValues = value.split(",").map((v) => v.trim().toLowerCase());

        // Check if any value matches
        return configValues.some((configVal) => gameValues.includes(configVal));
    });
    const platformImg = matchedPlatform ? (
        <Box
            component="img"
            src={matchedPlatform.src}
            alt={matchedPlatform.alt}
            sx={{
                width: matchedPlatform.width,
                height: "auto",
                backgroundColor: "transparent",
                marginTop: matchedPlatform.style?.marginTop || "0px",
            }}
        />
    ) : (
        <Box
            component="img"
            src="Platforms/steam.webp"
            alt="Steam Logo"
            sx={{
                width: "22px",
                height: "auto",
                backgroundColor: "transparent",
                marginTop: "2px",
                marginBottom: "-3px",
            }}
        />
    );
    return (
        <Box
            sx={{
                backgroundColor: "#FFFFFF",
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: 6,
                transition: "transform 0.2s ease-in-out",
                "&:hover": { transform: "scale(1.03)" },
                minWidth: "250px",
                maxWidth: "250px",
                minHeight: "360px",
                maxHeight: "360px",
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
                    <Grid key={game.appid}>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {game.name}
                        </Typography>
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
                            <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
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
                            <EventIcon sx={{ fontSize: 15, mr: 0.5 }} />
                            <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
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
                                                src: "PSN_Trophies/PSN_platinum.png",
                                                alt: "Platinum Trophy",
                                            },
                                            {
                                                type: "gold",
                                                src: "PSN_Trophies/PSN_gold.png",
                                                alt: "Gold Trophy",
                                            },
                                            {
                                                type: "silver",
                                                src: "PSN_Trophies/PSN_silver.png",
                                                alt: "Silver Trophy",
                                            },
                                            {
                                                type: "bronze",
                                                src: "PSN_Trophies/PSN_bronze.png",
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
                                                    sx={{ fontFamily: "Inter, sans-serif" }}
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
                                            <EmojiEventsIcon sx={{ fontSize: 16, mr: -1 }} />
                                            <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
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
                                            <EmojiEventsIcon sx={{ fontSize: 16, mr: -1 }} />
                                            <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
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
};

export default GameCard;
