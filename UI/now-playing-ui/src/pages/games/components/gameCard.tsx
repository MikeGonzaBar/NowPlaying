import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventIcon from "@mui/icons-material/Event";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { SteamGame, PsnGame, RetroAchievementsGame } from "../utils/types";

interface GameCardProps {
    game: SteamGame | PsnGame | RetroAchievementsGame;
}

const GameCard: React.FC<GameCardProps> = ({ game }) => {
    const platformConfig = [
        { key: "platform", value: "PS5", src: "Platforms/playstation-5.webp", alt: "PS5 Logo", width: "35px" },
        { key: "platform", value: "PS4", src: "Platforms/playstation-4.png", alt: "PS4 Logo", width: "45px" },
        { key: "console_name", value: "PlayStation 2", src: "Platforms/playstation-2.png", alt: "PS2 Logo", width: "45px" },
        { key: "console_name", value: "PlayStation", src: "Platforms/playstation.webp", alt: "PS1 Logo", width: "25px" },
        { key: "console_name", value: "Nintendo DS", src: "Platforms/nintendo-ds.png", alt: "Nintendo DS Logo", width: "45px" },
    ];

    const matchedPlatform = platformConfig.find(
        ({ key, value }) =>
            key in game && (game as Record<string, any>)[key] === value
    );
    const platformImg = matchedPlatform ? (
        <Box
            component="img"
            src={matchedPlatform.src}
            alt={matchedPlatform.alt}
            sx={{
                width: matchedPlatform.width,
                height: "auto",
                backgroundColor: "transparent",
                marginRight: "8px",
            }}
        />
    ) : (
        <Box
            component="img"
            src="Platforms/steam.webp"
            alt="Steam Logo"
            sx={{
                width: "30px",
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
                                {"platform" in game
                                    ? game.total_playtime
                                    : "playtime_formatted" in game && game.playtime_formatted
                                        ? game.playtime_formatted
                                        : "Not Available"}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
                <Grid
                    container
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mt: 1, alignItems: "end", minHeight: "100%" }}
                >
                    <Grid>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <EventIcon sx={{ fontSize: 16, mr: 0.5 }} />
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
                            {"platform" in game &&
                                game.unlocked_achievements?.platinum !== undefined && (
                                    <Box
                                        component="img"
                                        src="PSN_Trophies/PSN_platinum.png"
                                        alt="Platinum Trophy"
                                        sx={{
                                            width: "10.5px",
                                            height: "10.5px",
                                            filter:
                                                game.unlocked_achievements.platinum === 0
                                                    ? "grayscale(100%)"
                                                    : "none",
                                        }}
                                    />
                                )}

                            {"platform" in game &&
                                game.unlocked_achievements?.gold !== undefined && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <Box
                                            component="img"
                                            src="PSN_Trophies/PSN_gold.png"
                                            alt="Gold Trophy"
                                            sx={{ width: "10.5px", height: "10.5px" }}
                                        />
                                        <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
                                            {game.unlocked_achievements.gold}
                                        </Typography>
                                    </Box>
                                )}

                            {"platform" in game &&
                                game.unlocked_achievements?.silver !== undefined && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <Box
                                            component="img"
                                            src="PSN_Trophies/PSN_silver.png"
                                            alt="Silver Trophy"
                                            sx={{ width: "10.5px", height: "10.5px" }}
                                        />
                                        <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
                                            {game.unlocked_achievements.silver}
                                        </Typography>
                                    </Box>
                                )}

                            {"platform" in game &&
                                game.unlocked_achievements?.bronze !== undefined && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <Box
                                            component="img"
                                            src="PSN_Trophies/PSN_bronze.png"
                                            alt="Bronze Trophy"
                                            sx={{ width: "10.5px", height: "10.5px" }}
                                        />
                                        <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
                                            {game.unlocked_achievements.bronze}
                                        </Typography>
                                    </Box>
                                )}

                            {!("platform" in game) && (
                                <>
                                    <EmojiEventsIcon sx={{ fontSize: 16, mr: -1 }} />
                                    <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
                                        {game.unlocked_achievements_count}/{game.total_achievements}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Grid>
                    <Grid sx={{ textAlign: "right" }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                            }}
                        >
                            {platformImg}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default GameCard;
