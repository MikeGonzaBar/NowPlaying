import { Box, Card, CardContent, Typography } from "@mui/material";
import SensorsIcon from "@mui/icons-material/Sensors";
import AddIcon from "@mui/icons-material/Add";
import StarIcon from "@mui/icons-material/Star";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
    activities: any[];
}

function ActivityFeed({ activities }: ActivityFeedProps) {
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'check_in':
                return <AddIcon sx={{ fontSize: 14, color: "#ed1c24" }} />;
            case 'rating':
                return <StarIcon sx={{ fontSize: 14, color: "#ed1c24" }} />;
            case 'watchlist':
                return <BookmarkIcon sx={{ fontSize: 14, color: "#ed1c24" }} />;
            default:
                return <AddIcon sx={{ fontSize: 14, color: "#ed1c24" }} />;
        }
    };

    const getTimeAgo = (dateString: string | null) => {
        if (!dateString) return "Unknown";
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return "Unknown";
        }
    };

    return (
        <Card sx={{
            backgroundColor: "#1a1d23",
            border: "1px solid #2a2e37",
            borderRadius: 3,
        }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                    <SensorsIcon sx={{ color: "#ed1c24", fontSize: 24 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "#fff" }}>
                        Recent Activity & Check-ins
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {activities.length > 0 ? (
                        activities.map((activity, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    p: 1.5,
                                    backgroundColor: "#27272a",
                                    borderRadius: 2,
                                    border: "1px solid transparent",
                                    transition: "all 0.2s",
                                    "&:hover": {
                                        borderColor: "rgba(237, 28, 36, 0.2)",
                                    },
                                }}
                            >
                                <Box sx={{ position: "relative" }}>
                                    {activity.image_url ? (
                                        <img
                                            src={activity.image_url}
                                            alt={activity.title}
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 4,
                                                objectFit: "cover",
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 4,
                                                backgroundColor: "#374151",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 10 }}>
                                                {activity.title?.charAt(0) || "?"}
                                            </Typography>
                                        </Box>
                                    )}
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            bottom: -4,
                                            right: -4,
                                            backgroundColor: "#ed1c24",
                                            borderRadius: "50%",
                                            width: 16,
                                            height: 16,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {getActivityIcon(activity.type)}
                                    </Box>
                                </Box>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 0.5 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontSize: "14px",
                                                fontWeight: 500,
                                                color: "#fff",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {activity.description || activity.title}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: "10px",
                                                color: "#9ca3af",
                                                ml: 1,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {getTimeAgo(activity.timestamp)}
                                        </Typography>
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: "12px",
                                            color: "#9ca3af",
                                        }}
                                    >
                                        {activity.episode || "Currently watching"}
                                    </Typography>
                                </Box>
                            </Box>
                        ))
                    ) : (
                        <Typography variant="body2" sx={{ color: "#9ca3af", textAlign: "center", py: 4 }}>
                            No recent activity
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}

export default ActivityFeed;
