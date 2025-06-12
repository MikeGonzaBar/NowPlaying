import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

interface PlatformFilterProps {
    configuredServices: string[];
    selectedPlatforms: string[];
    onPlatformToggle: (platform: string) => void;
}

const platformConfig = {
    steam: {
        label: 'Steam',
        color: '#1b2838',
        icon: '🖥️'
    },
    psn: {
        label: 'PlayStation',
        color: '#003087',
        icon: '🎮'
    },
    xbox: {
        label: 'Xbox',
        color: '#107c10',
        icon: '🎮'
    },
    retroachievements: {
        label: 'RetroAchievements',
        color: '#cc9900',
        icon: '🕹️'
    }
};

const PlatformFilter: React.FC<PlatformFilterProps> = ({
    configuredServices,
    selectedPlatforms,
    onPlatformToggle
}) => {
    if (configuredServices.length === 0) {
        return null;
    }

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                Filter by Platform:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {configuredServices.map((service) => {
                    const config = platformConfig[service as keyof typeof platformConfig];
                    if (!config) return null;

                    const isSelected = selectedPlatforms.includes(service);

                    return (
                        <Chip
                            key={service}
                            label={`${config.icon} ${config.label}`}
                            onClick={() => onPlatformToggle(service)}
                            variant={isSelected ? 'filled' : 'outlined'}
                            sx={{
                                backgroundColor: isSelected ? config.color : 'transparent',
                                color: isSelected ? 'white' : config.color,
                                borderColor: config.color,
                                '&:hover': {
                                    backgroundColor: isSelected ? config.color : `${config.color}20`,
                                },
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 500,
                            }}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};

export default PlatformFilter; 