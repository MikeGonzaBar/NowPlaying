import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import LockIcon from "@mui/icons-material/Lock";
import HistoryIcon from "@mui/icons-material/History";
import SyncIcon from "@mui/icons-material/Sync";

interface MilestonesSidebarProps {
    masteryPercentage: number;
    watchedCount: number;
    totalEpisodes: number;
    onSync: () => void;
}

function MilestonesSidebar({ masteryPercentage, watchedCount, totalEpisodes, onSync }: MilestonesSidebarProps) {
    // Determine which achievements are unlocked
    const achievements = [
        {
            id: "early_adopter",
            icon: VerifiedIcon,
            title: "Early Adopter",
            description: "Watched the series premiere within 24h of release.",
            unlocked: watchedCount > 0, // Simplified - would need air_date data
        },
        {
            id: "binge_season",
            icon: WorkspacePremiumIcon,
            title: "Binged Season",
            description: "Completed 10 episodes in less than 24 hours.",
            unlocked: watchedCount >= 10, // Simplified
        },
        {
            id: "series_finale",
            icon: LockIcon,
            title: "Series Finale",
            description: "Watch the final episode to unlock this badge.",
            unlocked: masteryPercentage === 100,
        },
        {
            id: "rewatch_king",
            icon: HistoryIcon,
            title: "Re-watch King",
            description: "Watch the entire series twice.",
            unlocked: false, // Would need play count data
        },
    ];

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Typography
                sx={{
                    color: "#fff",
                    fontSize: "22px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                }}
            >
                Milestones
            </Typography>

            <Card
                sx={{
                    backgroundColor: "rgba(34, 16, 17, 0.6)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(238, 32, 39, 0.1)",
                    borderRadius: 3,
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                }}
            >
                {achievements.map((achievement) => {
                    const IconComponent = achievement.icon;
                    const isUnlocked = achievement.unlocked;

                    return (
                        <Box
                            key={achievement.id}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                opacity: isUnlocked ? 1 : 0.4,
                                filter: isUnlocked ? "none" : "grayscale(100%)",
                            }}
                        >
                            <Box
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: "50%",
                                    backgroundColor: isUnlocked ? "rgba(237, 28, 36, 0.2)" : "rgba(255, 255, 255, 0.1)",
                                    border: `2px solid ${isUnlocked ? "#ed1c24" : "rgba(255, 255, 255, 0.2)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: isUnlocked ? "0 0 10px rgba(237, 28, 36, 0.3)" : "none",
                                    flexShrink: 0,
                                }}
                            >
                                <IconComponent
                                    sx={{
                                        color: isUnlocked ? "#ed1c24" : "rgba(255, 255, 255, 0.5)",
                                        fontSize: 28,
                                    }}
                                />
                            </Box>
                            <Box>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: "14px",
                                        color: "#fff",
                                    }}
                                >
                                    {achievement.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: "#b99d9d",
                                        fontSize: "11px",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {achievement.description}
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Card>

            {/* Sync Card */}
            <Card
                sx={{
                    borderRadius: 3,
                    background: "linear-gradient(135deg, rgba(237, 28, 36, 0.3) 0%, transparent 100%)",
                    border: "1px solid rgba(237, 28, 36, 0.2)",
                    p: 2.5,
                }}
            >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: "14px",
                                color: "#fff",
                            }}
                        >
                            Trakt Sync
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "10px",
                                color: "#b99d9d",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            Connected Account
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: "#22c55e",
                            boxShadow: "0 0 8px #22c55e",
                        }}
                    />
                </Box>
                <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SyncIcon />}
                    onClick={onSync}
                    sx={{
                        backgroundColor: "#ed1c24",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        py: 1,
                        borderRadius: 2,
                        "&:hover": {
                            backgroundColor: "rgba(237, 28, 36, 0.8)",
                        },
                    }}
                >
                    Force Update
                </Button>
            </Card>
        </Box>
    );
}

export default MilestonesSidebar;
