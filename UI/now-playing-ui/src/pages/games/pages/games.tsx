import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Typography,
    Alert,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Snackbar,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { Link } from "react-router-dom";
import SideBar from "../../../components/sideBar";
import GameSection from "../components/GameSection";
import PlatformFilter from "../components/PlatformFilter";
import PlatformUpdateButtons from "../components/PlatformUpdateButtons";
import GameSearch from "../components/GameSearch";
import { useGameData } from "../hooks/useGameData";
import { authenticatedFetch } from "../../../utils/auth";
import { API_CONFIG, getApiUrl } from "../../../config/api";

function Games() {
    const beBaseUrl = `http://${window.location.hostname}:8080`;
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [reconnectOpen, setReconnectOpen] = useState(false);
    const [npsso, setNpsso] = useState("");
    const [saving, setSaving] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const {
        latestPlayedGames,
        mostPlayed,
        mostAchieved,
        loading,
        error,
        clearError,
        refreshSteam,
        refreshPSN,
        refreshXbox,
        refreshRetroAchievements,
        missingServices,
        configuredServices,
        updatingPlatforms,
        getGamePlatform,
    } = useGameData(beBaseUrl);

    const isPsnError = useMemo(() => {
        if (!error) return false;
        const msg = error.toLowerCase();
        return msg.includes("npsso") || msg.includes("playstation");
    }, [error]);

    useEffect(() => {
        if (isPsnError) {
            setReconnectOpen(true);
        }
    }, [isPsnError]);

    const handleReconnect = async () => {
        try {
            setSaving(true);
            const resp = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.PSN_ENDPOINT}/exchange-npsso/`),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ npsso: npsso.trim() }),
                }
            );
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                throw new Error(data?.error || data?.detail || "Failed to store NPSSO");
            }
            await refreshPSN();
            clearError();
            setReconnectOpen(false);
            setNpsso("");
            setSnackbarOpen(true);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to reconnect PlayStation";
            // keep the alert visible; also show inline error by using TextField error/helperText
            // We'll set a simple window alert to ensure the user sees it without adding extra state
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

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
                        <Alert
                            severity="error"
                            sx={{ mb: 2 }}
                            onClose={clearError}
                            action={
                                isPsnError ? (
                                    <Button color="inherit" size="small" onClick={() => setReconnectOpen(true)}>
                                        Reconnect PlayStation
                                    </Button>
                                ) : null
                            }
                        >
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

            <Dialog open={reconnectOpen} onClose={() => setReconnectOpen(false)}>
                <DialogTitle>Reconnect PlayStation</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Your NPSSO seems expired or invalid. Paste a new NPSSO to reconnect.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        label="NPSSO"
                        value={npsso}
                        onChange={(e) => setNpsso(e.target.value)}
                        placeholder="Paste your NPSSO"
                        disabled={saving}
                    />
                    <Box sx={{ mt: 1 }}>
                        <Button
                            component={Link}
                            to="/profile"
                            size="small"
                            sx={{ textTransform: 'none' }}
                        >
                            How to get your NPSSO
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReconnectOpen(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={handleReconnect} variant="contained" disabled={saving || npsso.trim().length < 10}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message="PlayStation reconnected"
            />
        </div>
    );
}

export default Games;
