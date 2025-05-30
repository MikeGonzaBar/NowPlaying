import React from 'react';
import { Box, Typography } from '@mui/material';

interface TrophyIconProps {
    src: string;
    alt: string;
    unlocked: number;
    total: number;
    grayscale?: boolean;
}

const TrophyIcon: React.FC<TrophyIconProps> = ({
    src,
    alt,
    unlocked,
    total,
    grayscale = false
}) => (
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
            loading="lazy"
        />
        <Typography
            variant="body2"
            sx={{ fontFamily: "Inter, sans-serif", fontSize: "20px" }}
        >
            {unlocked}/{total}
        </Typography>
    </Box>
);

export default React.memo(TrophyIcon); 