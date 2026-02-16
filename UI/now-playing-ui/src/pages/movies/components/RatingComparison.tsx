import { Box, Card, CardContent, Typography } from "@mui/material";

interface RatingComparisonProps {
    comparison: any;
}

function RatingComparison({ comparison }: RatingComparisonProps) {
    if (!comparison) return null;

    const movies = comparison.movies || { user_avg: 8.5, trakt_avg: 7.2 };
    const shows = comparison.shows || { user_avg: 9.2, trakt_avg: 8.4 };

    const getPercentage = (value: number) => {
        return Math.min((value / 10) * 100, 100);
    };

    return (
        <Card sx={{
            backgroundColor: "#1a1d23",
            border: "1px solid #2a2e37",
            borderRadius: 3,
        }}>
            <CardContent sx={{ p: 3 }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        mb: 2,
                        display: "block",
                    }}
                >
                    Trakt Global vs My Rating
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {/* Movies */}
                    <Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#fff" }}>
                                Movies Avg.
                            </Typography>
                            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#ed1c24" }}>
                                Me: {movies.user_avg} / Trakt: {movies.trakt_avg}
                            </Typography>
                        </Box>
                        <Box sx={{ position: "relative", height: 8, backgroundColor: "#27272a", borderRadius: 1, overflow: "hidden" }}>
                            <Box
                                sx={{
                                    position: "absolute",
                                    height: "100%",
                                    width: `${getPercentage(movies.trakt_avg)}%`,
                                    backgroundColor: "#6b7280",
                                    zIndex: 10,
                                }}
                            />
                            <Box
                                sx={{
                                    position: "absolute",
                                    height: "100%",
                                    width: `${getPercentage(movies.user_avg)}%`,
                                    backgroundColor: "#ed1c24",
                                    opacity: 0.4,
                                    zIndex: 0,
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Shows */}
                    <Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#fff" }}>
                                TV Shows Avg.
                            </Typography>
                            <Typography sx={{ fontSize: "11px", fontWeight: 600, color: "#ed1c24" }}>
                                Me: {shows.user_avg} / Trakt: {shows.trakt_avg}
                            </Typography>
                        </Box>
                        <Box sx={{ position: "relative", height: 8, backgroundColor: "#27272a", borderRadius: 1, overflow: "hidden" }}>
                            <Box
                                sx={{
                                    position: "absolute",
                                    height: "100%",
                                    width: `${getPercentage(shows.trakt_avg)}%`,
                                    backgroundColor: "#6b7280",
                                    zIndex: 10,
                                }}
                            />
                            <Box
                                sx={{
                                    position: "absolute",
                                    height: "100%",
                                    width: `${getPercentage(shows.user_avg)}%`,
                                    backgroundColor: "#ed1c24",
                                    opacity: 0.4,
                                    zIndex: 0,
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Legend */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, pt: 2, borderTop: "1px solid #27272a" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#6b7280" }} />
                            <Typography sx={{ fontSize: "10px", color: "#9ca3af" }}>
                                Global Average
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ed1c24", opacity: 0.4 }} />
                            <Typography sx={{ fontSize: "10px", color: "#9ca3af" }}>
                                Your Average
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export default RatingComparison;
