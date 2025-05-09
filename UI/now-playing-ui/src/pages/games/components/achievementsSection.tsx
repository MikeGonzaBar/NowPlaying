import React, { useState, useMemo } from "react";
import {
    Box,
    Typography,
    Divider,
    Grid,
    SelectChangeEvent,
} from "@mui/material";
import AchievementCard from "./achievementCard";
import TrophyStats from "./TrophyStats";
import AchievementFilter from "./AchievementFilter";
import { SteamGame, PsnGame, SteamAchievement, RetroAchievementsGame } from "../utils/types";

interface AchievementSectionProps {
    game: SteamGame | PsnGame | RetroAchievementsGame;
}

const AchievementSection: React.FC<AchievementSectionProps> = ({ game }) => {
    const [selectedOption, setSelectedOption] = useState<string>("All");

    const handleChange = (event: SelectChangeEvent<string>) => {
        setSelectedOption(event.target.value);
    };

    const filteredAchievements = useMemo(() =>
        game.achievements.filter((achievement: SteamAchievement) => {
            if (selectedOption === "Unlocked") return achievement.unlocked;
            if (selectedOption === "Locked") return !achievement.unlocked;
            return true;
        }),
        [game.achievements, selectedOption]
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
                    {'platform' in game && <TrophyStats game={game} />}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            width: 300,
                            ml: 50,
                        }}
                    >
                        <AchievementFilter
                            selectedOption={selectedOption}
                            onFilterChange={handleChange}
                        />
                    </Box>
                </Box>
            </Grid>
            {filteredAchievements.map((achievement: SteamAchievement, index: number) => (
                <AchievementCard
                    key={index}
                    achievement={achievement}
                />
            ))}
        </Box>
    );
};

export default React.memo(AchievementSection);
