import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';
import { parsePlatforms, formatPlatformName } from '../utils/utils';
import { zincColors } from '../../../theme';

interface PlatformPillsProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

const PlatformPills: React.FC<PlatformPillsProps> = ({ game }) => {
    const platforms = useMemo(() => {
        const parsed = parsePlatforms(game);
        // Remove duplicates
        return [...new Set(parsed)];
    }, [game]);

    // Don't show if only one platform (or none)
    if (platforms.length <= 1) {
        return null;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                marginTop: 2,
            }}
        >
            {platforms.map((platform, index) => (
                <Box
                    key={index}
                    sx={{
                        padding: '4px 8px',
                        backgroundColor: '#27272a', // zinc-800
                        borderRadius: '6px',
                        border: '1px solid rgba(39, 39, 42, 0.5)',
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            color: '#a1a1aa', // zinc-400
                            fontSize: '0.75rem',
                            fontWeight: 500,
                        }}
                    >
                        {formatPlatformName(platform)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

export default PlatformPills;
