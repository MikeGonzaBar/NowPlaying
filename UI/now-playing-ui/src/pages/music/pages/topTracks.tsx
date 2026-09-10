import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import SideBar from "../../../components/sideBar";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ScheduleIcon from "@mui/icons-material/Schedule";
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

  // Canonical href per track: carries the recording_id so the detail page
  // resolves the exact artist + title recording instead of title alone.
  // Rendered as a real anchor (router Link), not a div onClick.
  const trackHref = (track: Track) => {
    const recordingId = track.recording_id
      ? `?recording_id=${encodeURIComponent(track.recording_id)}`
      : "";
    return `/music/tracks/${encodeURIComponent(track.title)}${recordingId}`;
  };

  const formatRank = (idx: number) => {
    return (idx + 1).toString().padStart(2, "0");
  };

  const displayedTracks = showAll ? tracks : tracks.slice(0, 8);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#0a0a0c",
        color: "#f4f4f5",
        position: "relative",
      }}
    >
      <SideBar activeItem="Music" />
      <Box
        sx={{
          flexGrow: 1,
          maxWidth: "1280px",
          mx: "auto",
          px: { xs: 2, md: 6 },
          pt: { xs: 4, md: 8 },
          pb: { xs: 20, md: 24 },
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 4,
            }}
          >
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
              Back to Music
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
                Your most played tracks, from Last.fm.
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
                component={RouterLink}
                to={trackHref(track)}
                aria-label={`${track.title} by ${track.artist} - view track details`}
                sx={{
                  bgcolor: "rgba(18, 18, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "inherit",
                  minWidth: 0,
                  transition: "all 0.3s",
                  display: "flex",
                  flexDirection: "column",
                  ...(isFirst
                    ? {
                        borderColor: "rgba(225, 29, 72, 0.5)",
                        boxShadow: "0 0 20px rgba(225, 29, 72, 0.15)",
                      }
                    : {}),
                  "&:hover": {
                    transform: "scale(1.02)",
                    "& .play-overlay": {
                      opacity: 1,
                    },
                  },
                  "&:focus-visible": {
                    outline: "2px solid #f43f5e",
                    outlineOffset: 3,
                  },
                }}
              >
                {/* Album Art */}
                <Box
                  sx={{
                    position: "relative",
                    aspectRatio: "1",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    component="img"
                    src={
                      track.thumbnail ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(track.title)}&size=300&background=121214&color=fff`
                    }
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
                      ...(isFirst
                        ? {
                            bgcolor: "#e11d48",
                            color: "white",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                          }
                        : {
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
                <Box
                  sx={{
                    p: 2.5,
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "#121214",
                  }}
                >
                  <Box sx={{ mb: 2, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#fff",
                        textTransform: "uppercase",
                        // Wrap long titles to two lines instead of forcing a
                        // nowrap minimum width that overflows small screens.
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        transition: "color 0.2s",
                        "&:hover": {
                          color: "#e11d48",
                        },
                      }}
                    >
                      {track.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#71717a",
                        fontSize: "14px",
                        fontWeight: 500,
                        mt: 0.5,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {track.artist}
                    </Typography>
                    {track.album && (
                      <Typography
                        sx={{
                          color: "#52525b",
                          fontSize: "12px",
                          mt: 0.5,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {track.album}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ mt: "auto" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
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
                        <ScheduleIcon sx={{ fontSize: 12, color: "inherit" }} />
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
    </Box>
  );
}

export default TopTracks;
