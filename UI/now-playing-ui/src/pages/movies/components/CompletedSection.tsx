import { Box, Card, CardContent, Typography } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";

interface CompletedSectionProps {
    shows: any[];
    movies: any[];
}

function CompletedSection({ shows, movies }: CompletedSectionProps) {
    const navigate = useNavigate();

    // Only show completed shows (most recent first - already sorted by API)
    // Filter out shows without last_watched_at and limit to 6 for dashboard
    const completedShows = shows
        .filter(show => show.last_watched_at)
        .map(show => ({ ...show, type: 'show' as const }))
        .slice(0, 6);

    const completedMedia = completedShows;

    const handleClick = (media: any) => {
        // Only shows are displayed, so always navigate to show details
        navigate("/showDetails", {
            state: {
                show: {
                    id: media.id,
                    title: media.title,
                    year: media.year,
                    image_url: media.image_url,
                    ids: { trakt: media.trakt_id, tmdb: media.tmdb_id },
                },
            },
        });
    };

    const getPosterUrl = (media: any) => {
        // Use image_url if available
        if (media.image_url) {
            return media.image_url;
        }
        // Return null if no image available
        return null;
    };

    return (
        <Card sx={{
            backgroundColor: "#1a1d23",
            border: "1px solid #2a2e37",
            borderRadius: 3,
        }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <VerifiedIcon sx={{ color: "#ed1c24", fontSize: 24 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: "#fff" }}>
                            100% Completed
                        </Typography>
                    </Box>
                    <Typography
                        variant="caption"
                        onClick={() => navigate("/completed")}
                        sx={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#9ca3af",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            px: 1.5,
                            py: 0.5,
                            backgroundColor: "#27272a",
                            borderRadius: 1,
                            cursor: "pointer",
                            transition: "color 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            "&:hover": { color: "#ed1c24" },
                        }}
                    >
                        View All
                        <ArrowForwardIcon sx={{ fontSize: 14 }} />
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 2 }}>
                    {completedMedia.map((media, index) => {
                        const posterUrl = getPosterUrl(media);

                        return (
                            <Box
                                key={index}
                                onClick={() => handleClick(media)}
                                sx={{
                                    minWidth: 160,
                                    cursor: "pointer",
                                    "&:hover .poster": {
                                        transform: "scale(1.05)",
                                    },
                                }}
                            >
                                <Box
                                    className="poster"
                                    sx={{
                                        position: "relative",
                                        aspectRatio: "2/3",
                                        borderRadius: 2,
                                        overflow: "hidden",
                                        mb: 1,
                                        border: "1px solid #2a2e37",
                                        transition: "transform 0.3s",
                                        backgroundColor: "#27272a",
                                    }}
                                >
                                    {posterUrl ? (
                                        <Box
                                            component="img"
                                            src={posterUrl}
                                            alt={media.title}
                                            sx={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                            }}
                                        />
                                    ) : (
                                        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <Typography variant="caption" sx={{ color: "#6b7280" }}>No Image</Typography>
                                        </Box>
                                    )}

                                    <Box
                                        className="poster-overlay"
                                        sx={{
                                            position: "absolute",
                                            inset: 0,
                                            backgroundColor: "rgba(237, 28, 36, 0.2)",
                                            opacity: 0,
                                            transition: "opacity 0.3s",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            "&:hover": {
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        <WorkspacePremiumIcon sx={{ fontSize: 48, color: "#fff" }} />
                                    </Box>
                                </Box>

                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        color: "#fff",
                                        mb: 0.5,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {media.title}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </CardContent>
        </Card>
    );
}

export default CompletedSection;
