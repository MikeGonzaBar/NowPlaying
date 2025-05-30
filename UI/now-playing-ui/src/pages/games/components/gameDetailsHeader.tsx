import React, { useMemo } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link } from "react-router-dom";
import {
    SteamGame,
    PsnGame,
    RetroAchievementsGame,
    XboxGame,
} from "../utils/types";
import GameImage from "./GameImage";
import GameInfo from "./GameInfo";

interface GameHeaderProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
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
        key: "platform",
        value: "PC, XboxOne, XboxSeries, Xbox360",
        src: "/Platforms/xbox.svg",
        alt: "XBOX Logo",
        width: "75px",
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
        key: "console_name",
        value: "Game Boy Advance",
        src: "/Platforms/gameboy-advance.png",
        alt: "Game Boy Advance Logo",
        width: "60px",
    },
    {
        key: "console_name",
        value: "Game Boy Color",
        src: "/Platforms/gameboy-color.png",
        alt: "Game Boy Color Logo",
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
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
) => {
    const matchedPlatform = platformConfig.find(({ key, value }) => {
        if (!(key in game)) return false;

        const gameValue = (game as Record<string, any>)[key];
        if (typeof gameValue !== "string") return false;

        const gameValues = gameValue.split(",").map((v) => v.trim().toLowerCase());
        const configValues = value.split(",").map((v) => v.trim().toLowerCase());

        return configValues.some((configVal) => gameValues.includes(configVal));
    });

    return matchedPlatform || platformConfig.find((cfg) => cfg.key === "default");
};

const isPsnGame = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): game is PsnGame => {
    return (game as PsnGame).platform !== undefined;
};


const formatDate = (
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame
): string => {
    const date = new Date(game.last_played);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const GameHeader: React.FC<GameHeaderProps> = ({ game }) => {
    const platform = useMemo(() => getPlatformMatch(game), [game]);
    const lastPlayed = useMemo(() => formatDate(game), [game]);
    const totalPlaytime = useMemo(() =>
        isPsnGame(game) && game.total_playtime
            ? game.total_playtime
            : "playtime_formatted" in game && game.playtime_formatted
                ? game.playtime_formatted
                : "Not Available",
        [game]
    );

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
                    loading="lazy"
                />
            </Box>
            <Box sx={{ display: "flex", gap: 8 }}>
                <GameImage game={game} />
                <GameInfo lastPlayed={lastPlayed} totalPlaytime={totalPlaytime} />
            </Box>
        </Box>
    );
};

export default React.memo(GameHeader);
