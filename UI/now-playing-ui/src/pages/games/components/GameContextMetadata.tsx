import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from '../utils/types';
import { zincColors } from '../../../theme';

interface GameContextMetadataProps {
    game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame;
}

const GameContextMetadata: React.FC<GameContextMetadataProps> = ({ game }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Check if game has description (may not exist in current types)
    const description = (game as any).description || null;
    const maxLines = 4;

    if (!description) {
        return null;
    }

    const shouldShowReadMore = description.length > 200; // Rough estimate for 4 lines

    return (
        <Box
            sx={{
                marginTop: 4,
                padding: 3,
                backgroundColor: 'rgba(24, 24, 27, 0.3)',
                border: '1px solid #27272a',
                borderRadius: 2,
            }}
        >
            <Typography
                variant="body2"
                sx={{
                    fontFamily: 'Inter, sans-serif',
                    color: zincColors.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.75rem',
                    marginBottom: 2,
                }}
            >
                About
            </Typography>
            <Box
                sx={{
                    position: 'relative',
                }}
            >
                <Typography
                    variant="body2"
                    sx={{
                        fontFamily: 'Inter, sans-serif',
                        color: zincColors.white,
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: isExpanded ? 'none' : maxLines,
                        WebkitBoxOrient: 'vertical',
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {description}
                </Typography>
                {shouldShowReadMore && (
                    <Button
                        onClick={() => setIsExpanded(!isExpanded)}
                        sx={{
                            marginTop: 1,
                            padding: 0,
                            minWidth: 'auto',
                            fontSize: '0.75rem',
                            fontFamily: 'Inter, sans-serif',
                            textTransform: 'none',
                            color: 'rgba(59, 130, 246, 0.9)',
                            backgroundColor: 'transparent',
                            border: '1px solid transparent',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                boxShadow: '0 0 8px rgba(59, 130, 246, 0.2)',
                            },
                        }}
                    >
                        {isExpanded ? 'Read Less' : 'Read More'}
                    </Button>
                )}
            </Box>
        </Box>
    );
};

export default GameContextMetadata;
