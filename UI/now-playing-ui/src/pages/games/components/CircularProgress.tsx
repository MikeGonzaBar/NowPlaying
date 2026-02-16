import React from 'react';
import { Box, Typography } from '@mui/material';

interface CircularProgressProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
    percentage,
    size = 120,
    strokeWidth = 8
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    // Clamp percentage between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    return (
        <Box
            sx={{
                position: 'relative',
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Box
                component="svg"
                width={size}
                height={size}
                sx={{
                    transform: 'rotate(-90deg)',
                    '& circle': {
                        transition: 'stroke-dashoffset 0.5s ease-in-out',
                    },
                }}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(39, 39, 42, 0.5)" // zinc-800 with opacity
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#3b82f6" // blue-500
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </Box>
            <Typography
                variant="h5"
                sx={{
                    position: 'absolute',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    color: '#ffffff',
                }}
            >
                {Math.round(clampedPercentage)}%
            </Typography>
        </Box>
    );
};

export default CircularProgress;
