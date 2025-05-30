import { useState } from "react";
import {
    Box,
    Typography,
    IconButton,
    Alert,
    Snackbar,
    Button,
    Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import { Link } from "react-router-dom";
import SideBar from "../../../components/sideBar";
import GameSection from "../components/GameSection";
import { useGameData } from "../hooks/useGameData";

function Games() {
    const beBaseUrl = `http://${window.location.hostname}:8080`;
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const {
        latestPlayedGames,
        mostPlayed,
        mostAchieved,
        loading,
        error,
        refreshGames,
        missingServices,
    } = useGameData(beBaseUrl);

    const handleRefresh = async () => {
        setSnackbarOpen(true);
        await refreshGames();
        setSnackbarOpen(false);
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    return (
        <div>
            <Box sx={{ display: "flex", paddingLeft: 2.5 }}>
                <SideBar activeItem="Games" />
                <Box component="main" sx={{ width: "89vw" }}>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <IconButton
                            onClick={handleRefresh}
                            color="secondary"
                            sx={{ mb: -2 }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Box>
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
                    <GameSection
                        title="Now Playing 🎮"
                        games={latestPlayedGames}
                        loading={loading}
                    />
                    <GameSection
                        title="Most Played ⌛"
                        games={mostPlayed}
                        loading={loading}
                    />
                    <GameSection
                        title="Most Achieved 🏆"
                        games={mostAchieved}
                        loading={loading}
                    />
                </Box>
            </Box>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={null}
                onClose={handleSnackbarClose}
                message="Updating info..."
                action={
                    <Button color="secondary" size="small" onClick={handleSnackbarClose}>
                        Close
                    </Button>
                }
            />
        </div>
    );
}

export default Games;
