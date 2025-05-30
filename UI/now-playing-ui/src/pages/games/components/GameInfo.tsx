import React from 'react';
import { Box, Typography } from '@mui/material';

interface GameInfoProps {
    lastPlayed: string;
    totalPlaytime: string;
}

const GameInfo: React.FC<GameInfoProps> = ({ lastPlayed, totalPlaytime }) => (
    <Box>
        <Typography
            variant="subtitle1"
            gutterBottom
            sx={{ fontSize: "20px", fontFamily: "Inter, sans-serif" }}
        >
            <b>Last time played: </b> {lastPlayed}
        </Typography>
        <Typography
            variant="subtitle1"
            sx={{ fontSize: "20px", fontFamily: "Inter, sans-serif" }}
        >
            <b>Total playtime: </b>
            {totalPlaytime}
        </Typography>
    </Box>
);

export default React.memo(GameInfo); 