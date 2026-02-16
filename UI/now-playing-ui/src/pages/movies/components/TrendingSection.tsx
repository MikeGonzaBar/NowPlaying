import { Box, Card, CardContent, Typography, Button, IconButton } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import StarIcon from "@mui/icons-material/Star";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

interface TrendingSectionProps {
    trending: any;
}

function TrendingSection({ trending }: TrendingSectionProps) {
    if (!trending) return null;

    const trendingItems = [
        ...(trending.trending_shows || []).map((item: any) => ({ ...item, type: 'show' })),
        ...(trending.trending_movies || []).map((item: any) => ({ ...item, type: 'movie' }))
    ].slice(0, 4);

    const getPosterUrl = (item: any) => {
        // Note: TMDB poster URLs require fetching from API first
        // For now, return null and show placeholder
        return null;
    };

    return (
        <Card sx={{
            backgroundColor: "#1a1d23",
            border: "1px solid #2a2e37",
            borderRadius: 3,
        }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <TrendingUpIcon sx={{ color: "#ed1c24", fontSize: 20 }} />
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                        }}
                    >
                        Trending on Trakt
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {trendingItems.map((item, index) => {
                        const posterUrl = getPosterUrl(item);

                        return (
                            <Box
                                key={index}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    cursor: "pointer",
                                    "&:hover .title": {
                                        color: "#ed1c24",
                                    },
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: "#9ca3af",
                                        width: 16,
                                    }}
                                >
                                    {index + 1}
                                </Typography>

                                {posterUrl ? (
                                    <img
                                        src={posterUrl}
                                        alt={item.title}
                                        style={{
                                            width: 32,
                                            height: 40,
                                            borderRadius: 4,
                                            objectFit: "cover",
                                        }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 40,
                                            borderRadius: 4,
                                            backgroundColor: "#374151",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 8 }}>
                                            {item.title?.charAt(0) || "?"}
                                        </Typography>
                                    </Box>
                                )}

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        className="title"
                                        sx={{
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#fff",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            transition: "color 0.2s",
                                        }}
                                    >
                                        {item.title}
                                    </Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                                        <StarIcon sx={{ fontSize: 10, color: "#ed1c24", fill: "#ed1c24" }} />
                                        <Typography sx={{ fontSize: "10px", color: "#9ca3af" }}>
                                            {item.rating || "N/A"} Trakt Rating
                                        </Typography>
                                    </Box>
                                </Box>

                                <IconButton size="small" sx={{ color: "#9ca3af" }}>
                                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        );
                    })}
                </Box>

                <Button
                    fullWidth
                    sx={{
                        mt: 3,
                        py: 1,
                        border: "1px solid #2a2e37",
                        borderRadius: 1,
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#9ca3af",
                        "&:hover": {
                            color: "#ed1c24",
                            borderColor: "rgba(237, 28, 36, 0.5)",
                        },
                    }}
                >
                    Explore Trending
                </Button>
            </CardContent>
        </Card>
    );
}

export default TrendingSection;
