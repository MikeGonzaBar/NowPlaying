import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { PsnAchievement, RetroAchievementsAchievement, SteamAchievement } from '../utils/types'; // Import the Achievement interface

const AchievementCard: React.FC<{ achievement: SteamAchievement | PsnAchievement | RetroAchievementsAchievement }> = ({ achievement }) => {
    return (
        <Card
            sx={{
                display: 'flex',
                alignItems: 'center',
                boxShadow: 3,
                borderRadius: 2,
                padding: 2,
                marginBottom: 2,
                width: '95%',
                height: '65px',
            }}
        >
            <Box
                component="img"
                src={achievement.image}
                alt={achievement.name}
                sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 1,
                    objectFit: 'cover',
                    marginRight: 2,
                }}
            />

            <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }}>
                    {achievement.name}
                </Typography>

                <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', color: 'text.secondary', marginBottom: 1 }}>
                    {achievement.description || 'No description available.'}
                </Typography>

                {achievement.unlocked ? (
                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', color: 'green' }}>
                        🏆 Unlocked on: {achievement.unlock_time}
                    </Typography>
                ) : (
                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', color: 'red' }}>
                        🔒 This achievement is still locked.
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

export default AchievementCard;