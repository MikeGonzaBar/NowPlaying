import React, { useState } from "react";
import {
    Box,
    Typography,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    SelectChangeEvent,
} from "@mui/material";
import AchievementCard from "./achievementCard";
import { SteamGame, PsnGame, SteamAchievement, RetroAchievementsGame } from "../utils/types";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
interface AchievementSectionProps {
    game: SteamGame | PsnGame | RetroAchievementsGame;
}

const TrophyIcon: React.FC<{
    src: string;
    alt: string;
    unlocked: number;
    total: number;
    grayscale?: boolean;
}> = ({ src, alt, unlocked, total, grayscale = false }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
                width: "30px",
                height: "auto",
                filter: grayscale && unlocked === 0 ? "grayscale(100%)" : "none",
            }}
        />
        <Typography
            variant="body2"
            sx={{ fontFamily: "Inter, sans-serif", fontSize: "20px" }}
        >
            {unlocked}/{total}
        </Typography>
    </Box>
);

const AchievementSection: React.FC<AchievementSectionProps> = ({ game }) => {
    const [selectedOption, setSelectedOption] = useState<string>("All");

    const handleChange = (event: SelectChangeEvent<string>) => {
        setSelectedOption(event.target.value);
    };
    console.log("Selected option:", game);
    const filteredAchievements = game.achievements.filter(
        (achievement: SteamAchievement) => {
            if (selectedOption === "Unlocked") return achievement.unlocked;
            if (selectedOption === "Locked") return !achievement.unlocked;
            return true;
        }
    );

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Inter, sans-serif" }}>
                <b>My achievements </b>
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid sx={{ textAlign: "center", mb: 2 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: "100%",
                    }}
                >
                    {"platform" in game && game.unlocked_achievements && (
                        <>
                            {game.unlocked_achievements.platinum !== undefined && (
                                <TrophyIcon
                                    src="/PSN_Trophies/PSN_platinum.png"
                                    alt="Platinum Trophy"
                                    unlocked={game.unlocked_achievements.platinum}
                                    total={1}
                                    grayscale
                                />
                            )}
                            {game.unlocked_achievements.gold !== undefined && (
                                <TrophyIcon
                                    src="/PSN_Trophies/PSN_gold.png"
                                    alt="Gold Trophy"
                                    unlocked={game.unlocked_achievements.gold}
                                    total={game.total_achievements.gold!}
                                />
                            )}
                            {game.unlocked_achievements.silver !== undefined && (
                                <TrophyIcon
                                    src="/PSN_Trophies/PSN_silver.png"
                                    alt="Silver Trophy"
                                    unlocked={game.unlocked_achievements.silver}
                                    total={game.total_achievements.silver!}
                                />
                            )}
                            {game.unlocked_achievements.bronze !== undefined && (
                                <TrophyIcon
                                    src="/PSN_Trophies/PSN_bronze.png"
                                    alt="Bronze Trophy"
                                    unlocked={game.unlocked_achievements.bronze}
                                    total={game.total_achievements.bronze!}
                                />
                            )}
                        </>
                    )}
                    {!("platform" in game) && (
                        <>
                            <EmojiEventsIcon sx={{ fontSize: 27, mr: -1 }} />
                            <Typography
                                variant="body2"
                                sx={{ fontFamily: "Inter, sans-serif", fontSize: "20px" }}
                            >
                                {game.unlocked_achievements_count}/{game.total_achievements}
                            </Typography>
                        </>
                    )}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            width: 300,
                            ml: 50,
                        }}
                    >
                        <FormControl
                            fullWidth
                            variant="outlined"
                            size="small"
                            sx={{ height: "40px" }}
                        >
                            <InputLabel id="dropdown-label" sx={{ fontSize: "14px" }}>
                                Achievements filter
                            </InputLabel>
                            <Select
                                labelId="dropdown-label"
                                id="dropdown"
                                value={selectedOption}
                                onChange={handleChange}
                                label="Achievements filter"
                                sx={{
                                    fontSize: "14px",
                                    height: "40px",
                                }}
                            >
                                <MenuItem value="All" sx={{ fontSize: "14px" }}>
                                    All achievements
                                </MenuItem>
                                <MenuItem value="Unlocked" sx={{ fontSize: "14px" }}>
                                    Unlocked
                                </MenuItem>
                                <MenuItem value="Locked" sx={{ fontSize: "14px" }}>
                                    Locked
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Grid>
            {filteredAchievements.map((achievement: SteamAchievement, index: number) => (
                <AchievementCard key={index} achievement={achievement} />
            ))}
        </Box>
    );
};

export default AchievementSection;
