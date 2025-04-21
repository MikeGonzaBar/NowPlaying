import React from "react";
import { Box, Typography, IconButton, Card, CardMedia } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link } from "react-router-dom";
import { SteamGame, PsnGame, RetroAchievementsGame } from "../utils/types";

interface GameHeaderProps {
    game: SteamGame | PsnGame | RetroAchievementsGame;
}

const platformConfig = [
    {
        key: "platform",
        value: "PS5",
        src: "/Platforms/playstation-5.webp",
        alt: "PS5 Logo",
        width: "35px",
    },
    {
        key: "platform",
        value: "PS4",
        src: "/Platforms/playstation-4.png",
        alt: "PS4 Logo",
        width: "45px",
    },
    {
        key: "console_name",
        value: "PlayStation 2",
        src: "/Platforms/playstation-2.png",
        alt: "PS2 Logo",
        width: "45px",
    },
    {
        key: "console_name",
        value: "PlayStation",
        src: "/Platforms/playstation.webp",
        alt: "PS1 Logo",
        width: "25px",
    },
    {
        key: "console_name",
        value: "Nintendo DS",
        src: "/Platforms/nintendo-ds.png",
        alt: "Nintendo DS Logo",
        width: "45px",
    },
    {
        key: "default",
        value: "Steam",
        src: "/Platforms/steam.webp",
        alt: "Steam Logo",
        width: "30px",
    },
];

const getPlatformMatch = (
    game: SteamGame | PsnGame | RetroAchievementsGame
) => {
    return (
        platformConfig.find(
            ({ key, value }) =>
                key in game && (game as Record<string, any>)[key] === value
        ) || platformConfig.find((cfg) => cfg.key === "default")
    );
};

const isPsnGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame
): game is PsnGame => {
    return (game as PsnGame).platform !== undefined;
};


const formatDate = (
    game: SteamGame | PsnGame | RetroAchievementsGame
): string => {
    if ("platform" in game) {
        const date = new Date(game.last_played);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } else {
        const date = new Date(game.last_played);
        const formatted = `${String(date.getDate()).padStart(2, "0")}/${String(
            date.getMonth() + 1
        ).padStart(2, "0")}/${date.getFullYear()}`;
        return formatted;
    }
};

const GameHeader: React.FC<GameHeaderProps> = ({ game }) => {
    const platform = getPlatformMatch(game);
    const lastPlayed = formatDate(game);
    const totalPlaytime =
        isPsnGame(game) && game.total_playtime
            ? game.total_playtime
            : "playtime_formatted" in game && game.playtime_formatted
                ? game.playtime_formatted
                : "Not Available";

    if (!game) {
        return <Typography variant="h6">Game not found</Typography>;
    }

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2, ml: -1 }}>
                <IconButton
                    component={Link}
                    to="/games"
                    color="primary"
                    sx={{ marginRight: 2 }}
                >
                    <ArrowBackIcon />
                </IconButton>
                <Typography
                    variant="h5"
                    sx={{
                        ml: 1,
                        flexGrow: 1,
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 700,
                    }}
                >
                    {game.name}
                </Typography>

                <Box
                    component="img"
                    src={platform?.src}
                    alt={platform?.alt}
                    sx={{
                        width: platform?.width,
                        height: "auto",
                        backgroundColor: "transparent",
                        marginTop: isPsnGame(game) ? "0px" : "2px",
                        marginRight: "735px",
                        marginleft: "0px",
                    }}
                />
            </Box>
            <Box sx={{ display: "flex", gap: 8 }}>
                <Card>
                    <CardMedia
                        component="img"
                        image={
                            isPsnGame(game) && game.img_icon_url
                                ? game.img_icon_url
                                : (game as RetroAchievementsGame).console_name === "PlayStation 2"
                                    ? (game as RetroAchievementsGame).image_title
                                    : (game as RetroAchievementsGame).console_name === "PlayStation"
                                        ? (game as RetroAchievementsGame).image_title
                                        : (game as RetroAchievementsGame).console_name === "Nintendo DS"
                                            ? (game as RetroAchievementsGame).image_title
                                            : `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`
                        }
                        alt={game.name}
                        sx={{
                            width: isPsnGame(game) ? 300 : 460,
                            height: isPsnGame(game) ? 300 : "auto",
                        }}
                    />
                </Card>
                <Box sx={{}}>
                    <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontSize: "20px", fontFamily: "Inter, sans-serif" }}
                    >
                        <b>Last time played: </b> {lastPlayed}
                    </Typography>
                    <Typography
                        variant="subtitle1"
                        sx={{ fontSize: "20px", fontFamily: "Inter, sans-serif" }}
                    >
                        <b>Total playtime: </b>
                        {totalPlaytime}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default GameHeader;
