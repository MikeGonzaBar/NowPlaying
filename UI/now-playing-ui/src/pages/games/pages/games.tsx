import { useState } from "react";
import {
    Box,
    Typography,
    Alert,
    Button,
    Chip,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { Link } from "react-router-dom";
import SideBar from "../../../components/sideBar";
import GameSection from "../components/GameSection";
import PlatformFilter from "../components/PlatformFilter";
import PlatformUpdateButtons from "../components/PlatformUpdateButtons";
import GameSearch from "../components/GameSearch";
import { useGameData } from "../hooks/useGameData";

function Games() {
    const beBaseUrl = `http://${window.location.hostname}:8080`;
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

    const {
        latestPlayedGames,
        mostPlayed,
        mostAchieved,
        loading,
        error,
        refreshSteam,
        refreshPSN,
        refreshXbox,
        refreshRetroAchievements,
        missingServices,
        configuredServices,
        updatingPlatforms,
        getGamePlatform,
    } = useGameData(beBaseUrl);

    const handlePlatformToggle = (platform: string) => {
        setSelectedPlatforms(prev => {
            if (prev.includes(platform)) {
                return prev.filter(p => p !== platform);
            } else {
                return [...prev, platform];
            }
        });
    };

    return (
        <div>
            <Box sx={{ display: "flex", paddingLeft: 2.5 }}>
                <SideBar activeItem="Games" />
                <Box component="main" sx={{ width: "89vw", p: 2 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            mb: 3,
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 'bold',
                            color: '#333'
                        }}
                    >
                        Games
                    </Typography>

                    {/* Game Search Component */}
                    <GameSearch />

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {missingServices && missingServices.length > 0 && (
                        <Alert
                            severity="info"
                            sx={{ mb: 2 }}
                            action={
                                <Button
                                    component={Link}
                                    to="/profile"
                                    color="inherit"
                                    size="small"
                                    startIcon={<SettingsIcon />}
                                >
                                    Configure API Keys
                                </Button>
                            }
                        >
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                To see games from all platforms, please configure your API keys for:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {missingServices.map((service) => (
                                    <Chip
                                        key={service}
                                        label={service.charAt(0).toUpperCase() + service.slice(1)}
                                        size="small"
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        </Alert>
                    )}

                    {/* Platform Controls - Side by Side */}
                    <Box sx={{
                        display: 'flex',
                        gap: 4,
                        mb: 2,
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'flex-start', md: 'flex-start' }
                    }}>
                        {/* Platform Update Buttons */}
                        <Box sx={{ flex: 1 }}>
                            <PlatformUpdateButtons
                                configuredServices={configuredServices}
                                updatingPlatforms={updatingPlatforms}
                                onRefreshSteam={refreshSteam}
                                onRefreshPSN={refreshPSN}
                                onRefreshXbox={refreshXbox}
                                onRefreshRetroAchievements={refreshRetroAchievements}
                            />
                        </Box>

                        {/* Platform Filter */}
                        <Box sx={{ flex: 1 }}>
                            <PlatformFilter
                                configuredServices={configuredServices}
                                selectedPlatforms={selectedPlatforms}
                                onPlatformToggle={handlePlatformToggle}
                            />
                        </Box>
                    </Box>

                    <GameSection
                        title="Now Playing 🎮"
                        games={latestPlayedGames}
                        loading={loading}
                        selectedPlatforms={selectedPlatforms}
                        getGamePlatform={getGamePlatform}
                    />
                    <GameSection
                        title="Most Played ⌛"
                        games={mostPlayed}
                        loading={loading}
                        selectedPlatforms={selectedPlatforms}
                        getGamePlatform={getGamePlatform}
                    />
                    <GameSection
                        title="Most Achieved 🏆"
                        games={mostAchieved}
                        loading={loading}
                        selectedPlatforms={selectedPlatforms}
                        getGamePlatform={getGamePlatform}
                    />
                </Box>
            </Box>
        </div>
    );
}

export default Games;
