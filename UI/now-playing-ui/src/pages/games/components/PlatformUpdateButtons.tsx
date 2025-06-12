import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface PlatformUpdateButtonsProps {
    configuredServices: string[];
    updatingPlatforms: Record<string, boolean>;
    onRefreshSteam: () => void;
    onRefreshPSN: () => void;
    onRefreshXbox: () => void;
    onRefreshRetroAchievements: () => void;
}

const platformConfig = {
    steam: {
        label: 'Steam',
        color: '#1b2838',
        icon: '🎮',
        refreshFunction: 'onRefreshSteam'
    },
    psn: {
        label: 'PlayStation',
        color: '#003087',
        icon: '🎮',
        refreshFunction: 'onRefreshPSN'
    },
    xbox: {
        label: 'Xbox',
        color: '#107c10',
        icon: '🎮',
        refreshFunction: 'onRefreshXbox'
    },
    retroachievements: {
        label: 'RetroAchievements',
        color: '#cc9900',
        icon: '🕹️',
        refreshFunction: 'onRefreshRetroAchievements'
    }
};

const PlatformUpdateButtons: React.FC<PlatformUpdateButtonsProps> = ({
    configuredServices,
    updatingPlatforms,
    onRefreshSteam,
    onRefreshPSN,
    onRefreshXbox,
    onRefreshRetroAchievements
}) => {
    const refreshFunctions = {
        steam: onRefreshSteam,
        psn: onRefreshPSN,
        xbox: onRefreshXbox,
        retroachievements: onRefreshRetroAchievements
    };

    if (configuredServices.length === 0) {
        return null;
    }

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Update Game Lists:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {configuredServices.map((service) => {
                    const config = platformConfig[service as keyof typeof platformConfig];
                    if (!config) return null;

                    const isUpdating = updatingPlatforms[service] || false;
                    const refreshFunction = refreshFunctions[service as keyof typeof refreshFunctions];

                    return (
                        <Button
                            key={service}
                            variant="contained"
                            onClick={refreshFunction}
                            disabled={isUpdating}
                            startIcon={
                                isUpdating ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <RefreshIcon />
                                )
                            }
                            sx={{
                                backgroundColor: config.color,
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: `${config.color}dd`,
                                },
                                '&:disabled': {
                                    backgroundColor: `${config.color}66`,
                                    color: 'rgba(255, 255, 255, 0.6)',
                                },
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 500,
                                textTransform: 'none',
                            }}
                        >
                            {isUpdating ? 'Updating...' : `${config.icon} ${config.label}`}
                        </Button>
                    );
                })}
            </Box>
        </Box>
    );
};

export default PlatformUpdateButtons; 