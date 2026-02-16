import { Box, Typography } from "@mui/material";
import { TopTrack } from "../types";

interface TopTracksListProps {
    tracks: TopTrack[];
    isFirst?: boolean;
}

export function TopTracksList({ tracks, isFirst = false }: TopTracksListProps) {
    return (
        <Box sx={{ width: { xs: "100%", lg: "66.666%" } }}>
            <Typography
                sx={{
                    mb: 1.5,
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#71717a",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                }}
            >
                Top 3 Tracks
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {tracks.map((track, trackIdx) => (
                    <Box
                        key={trackIdx}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1.5,
                            bgcolor: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: "12px",
                            "&:hover": {
                                bgcolor: "rgba(255,255,255,0.1)",
                            },
                            transition: "all 0.2s",
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <span
                                className="material-symbols-outlined"
                                style={{
                                    fontSize: "16px",
                                    color: isFirst ? "#EF4444" : "#71717a",
                                }}
                            >
                                {isFirst ? "play_arrow" : "music_note"}
                            </span>
                            <Typography
                                sx={{
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    color: isFirst ? "#e4e4e7" : "#71717a",
                                }}
                            >
                                {track.title}
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#71717a",
                                px: 1.5,
                                py: 0.5,
                                bgcolor: "#262626",
                                borderRadius: "8px",
                            }}
                        >
                            {track.count} plays
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
