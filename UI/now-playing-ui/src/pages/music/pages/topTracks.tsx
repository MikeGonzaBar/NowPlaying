import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SideBar from "../../../components/sideBar";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useMusicFetch } from "../hooks/useMusicFetch";
import { Track } from "../types";
import { formatLastPlayed } from "../utils/dateUtils";

function TopTracks() {
    const navigate = useNavigate();
    const { data: tracks, loading } = useMusicFetch<Track>({
        endpoint: "top-tracks/?limit=100",
        dataKey: "tracks",
    });
    const [showAll, setShowAll] = useState(false);

    const handleTrackClick = (track: Track) => {
        if (track.track_url) {
            window.open(track.track_url, "_blank");
        } else if (track.artist_lastfm_url) {
            window.open(track.artist_lastfm_url, "_blank");
        }
    };

    const formatRank = (idx: number) => {
        return (idx + 1).toString().padStart(2, "0");
    };

    const displayedTracks = showAll ? tracks : tracks.slice(0, 8);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#0a0a0c", color: "#f4f4f5", position: "relative" }}>
            <SideBar activeItem="Music" />
            <Box sx={{ flexGrow: 1, maxWidth: "1280px", mx: "auto", px: { xs: 2, md: 6 }, pt: { xs: 4, md: 8 }, pb: { xs: 20, md: 24 } }}>
                {/* Header */}
                <Box sx={{ mb: 6 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4 }}>
                        <Button
                            onClick={() => navigate("/music")}
                            startIcon={<ArrowBackIcon />}
                            sx={{
                                px: 2,
                                py: 1,
                                bgcolor: "rgba(225, 29, 72, 0.1)",
                                border: "1px solid rgba(225, 29, 72, 0.2)",
                                borderRadius: "8px",
                                color: "#e11d48",
                                fontSize: "12px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                "&:hover": {
                                    bgcolor: "rgba(225, 29, 72, 0.2)",
                                    boxShadow: "0 0 15px -3px rgba(225, 29, 72, 0.4)",
                                },
                                transition: "all 0.3s",
                            }}
                        >
                            Back to Dashboard
                        </Button>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", md: "row" },
                            md: { alignItems: "flex-end" },
                            justifyContent: "space-between",
                            gap: 2,
                            pb: 3,
                            borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                    >
                        <Box>
                            <Typography
                                variant="h1"
                                sx={{
                                    fontSize: { xs: "32px", md: "48px" },
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "-0.02em",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                }}
                            >
                                Top Tracks <span style={{ color: "#e11d48" }}>Leaderboard</span>
                            </Typography>
                            <Typography sx={{ color: "#71717a", mt: 0.5, fontWeight: 500 }}>
                                Your most played anthems across all platforms.
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Tracks Grid */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, 1fr)",
                            md: "repeat(3, 1fr)",
                            lg: "repeat(4, 1fr)",
                        },
                        gap: 3,
                    }}
                >
                    {displayedTracks.map((track, idx) => {
                        const isFirst = idx === 0;
                        const rank = formatRank(idx);

                        return (
                            <Box
                                key={idx}
                                onClick={() => handleTrackClick(track)}
                                sx={{
                                    bgcolor: "rgba(18, 18, 20, 0.7)",
                                    backdropFilter: "blur(12px)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                    cursor: track.track_url || track.artist_lastfm_url ? "pointer" : "default",
                                    transition: "all 0.3s",
                                    display: "flex",
                                    flexDirection: "column",
                                    ...(isFirst ? {
                                        borderColor: "rgba(225, 29, 72, 0.5)",
                                        boxShadow: "0 0 20px rgba(225, 29, 72, 0.15)",
                                    } : {}),
                                    "&:hover": {
                                        transform: "scale(1.02)",
                                        "& .play-overlay": {
                                            opacity: 1,
                                        },
                                    },
                                }}
                            >
                                {/* Album Art */}
                                <Box sx={{ position: "relative", aspectRatio: "1", overflow: "hidden" }}>
                                    <Box
                                        component="img"
                                        src={track.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(track.title)}&size=300&background=121214&color=fff`}
                                        alt={track.title}
                                        sx={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            transition: "transform 0.5s",
                                            "&:hover": {
                                                transform: "scale(1.1)",
                                            },
                                        }}
                                    />
                                    {/* Ranking Badge */}
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: 12,
                                            left: 12,
                                            width: 32,
                                            height: 32,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "12px",
                                            fontWeight: 900,
                                            borderRadius: "8px",
                                            ...(isFirst ? {
                                                bgcolor: "#e11d48",
                                                color: "white",
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                            } : {
                                                bgcolor: "rgba(255,255,255,0.2)",
                                                backdropFilter: "blur(8px)",
                                                color: "white",
                                                border: "1px solid rgba(255,255,255,0.2)",
                                            }),
                                        }}
                                    >
                                        {rank}
                                    </Box>
                                </Box>

                                {/* Track Info */}
                                <Box sx={{ p: 2.5, flexGrow: 1, display: "flex", flexDirection: "column", bgcolor: "#121214" }}>
                                    <Box sx={{ mb: 2 }}>
                                        <Typography
                                            sx={{
                                                fontSize: "20px",
                                                fontWeight: 700,
                                                color: "#fff",
                                                textTransform: "uppercase",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                transition: "color 0.2s",
                                                "&:hover": {
                                                    color: "#e11d48",
                                                },
                                            }}
                                        >
                                            {track.title}
                                        </Typography>
                                        <Typography sx={{ color: "#71717a", fontSize: "14px", fontWeight: 500, mt: 0.5 }}>
                                            {track.artist}
                                        </Typography>
                                        {track.album && (
                                            <Typography sx={{ color: "#52525b", fontSize: "12px", mt: 0.5 }}>
                                                {track.album}
                                            </Typography>
                                        )}
                                    </Box>

                                    <Box sx={{ mt: "auto" }}>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                <Box
                                                    sx={{
                                                        bgcolor: "#e11d48",
                                                        color: "white",
                                                        px: 0.75,
                                                        py: 0.25,
                                                        borderRadius: "2px",
                                                        fontSize: "9px",
                                                        fontWeight: 900,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.05em",
                                                    }}
                                                >
                                                    {track.source === "spotify" ? "Spotify" : "Last.fm"}
                                                </Box>
                                            </Box>
                                            <Typography
                                                sx={{
                                                    color: "#fff",
                                                    fontSize: "18px",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {track.count}{" "}
                                                <span
                                                    style={{
                                                        fontSize: "10px",
                                                        color: "#71717a",
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.1em",
                                                        marginLeft: "4px",
                                                    }}
                                                >
                                                    Plays
                                                </span>
                                            </Typography>
                                        </Box>
                                        {track.played_at && (
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                    color: "#52525b",
                                                    fontSize: "10px",
                                                    fontWeight: 500,
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.1em",
                                                    pt: 1.5,
                                                    borderTop: "1px solid rgba(255,255,255,0.05)",
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>
                                                    schedule
                                                </span>
                                                Last Played: {formatLastPlayed(track.played_at)}
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>

                {/* Show More Button */}
                {!showAll && tracks.length > 8 && (
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 8, pb: 6 }}>
                        <Button
                            onClick={() => setShowAll(true)}
                            endIcon={<ExpandMoreIcon />}
                            sx={{
                                px: 6,
                                py: 1.5,
                                bgcolor: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                color: "#fff",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                "&:hover": {
                                    bgcolor: "rgba(255,255,255,0.1)",
                                    borderColor: "rgba(225, 29, 72, 0.5)",
                                },
                                transition: "all 0.2s",
                            }}
                        >
                            Show More Tracks
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Bottom Player Bar (Fixed) */}
            <Box
                sx={{
                    position: "fixed",
                    bottom: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    bgcolor: "rgba(18, 18, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "999px",
                    px: 3,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    border: "1px solid rgba(225, 29, 72, 0.2)",
                    zIndex: 50,
                    maxWidth: "90%",
                }}
            >
                {tracks.length > 0 && (
                    <>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box
                                component="img"
                                src={tracks[0].thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(tracks[0].title)}&size=40&background=121214&color=fff`}
                                alt={tracks[0].title}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                }}
                            />
                            <Box sx={{ display: { xs: "none", sm: "block" } }}>
                                <Typography
                                    sx={{
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: "#fff",
                                        textTransform: "uppercase",
                                        letterSpacing: "-0.02em",
                                        lineHeight: 1,
                                    }}
                                >
                                    {tracks[0].title}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: "10px",
                                        color: "#e11d48",
                                        textTransform: "uppercase",
                                        fontWeight: 600,
                                        letterSpacing: "0.1em",
                                        lineHeight: 1,
                                        mt: 0.5,
                                    }}
                                >
                                    {tracks[0].artist}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#fff" }}>
                            <Button
                                sx={{
                                    minWidth: "auto",
                                    p: 0.5,
                                    color: "#fff",
                                    "&:hover": { color: "#e11d48" },
                                }}
                            >
                                <span className="material-symbols-outlined">skip_previous</span>
                            </Button>
                            <Button
                                sx={{
                                    minWidth: "auto",
                                    p: 0.5,
                                    bgcolor: "#e11d48",
                                    color: "white",
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    boxShadow: "0 0 15px -3px rgba(225, 29, 72, 0.4)",
                                    "&:hover": { bgcolor: "#be185d" },
                                    "&:active": { transform: "scale(0.95)" },
                                }}
                            >
                                <span className="material-symbols-outlined">pause</span>
                            </Button>
                            <Button
                                sx={{
                                    minWidth: "auto",
                                    p: 0.5,
                                    color: "#fff",
                                    "&:hover": { color: "#e11d48" },
                                }}
                            >
                                <span className="material-symbols-outlined">skip_next</span>
                            </Button>
                        </Box>
                        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1, width: 128 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#71717a" }}>
                                volume_up
                            </span>
                            <Box sx={{ flexGrow: 1, height: 4, bgcolor: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
                                <Box sx={{ width: "66%", height: "100%", bgcolor: "#e11d48", boxShadow: "0 0 15px -3px rgba(225, 29, 72, 0.4)" }} />
                            </Box>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
}

export default TopTracks;
