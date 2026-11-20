import { Box, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import MusicNoteIcon from "@mui/icons-material/MusicNote";

interface TopTrack {
  title: string;
  count: number;
  recording_id?: string;
}

interface TopTracksListProps {
  tracks: TopTrack[];
  isFirst?: boolean;
}

export function TopTracksList({ tracks, isFirst = false }: TopTracksListProps) {
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  return (
    <Box sx={{ width: { xs: "100%", lg: "66.666%" } }}>
      <Typography
        sx={{
          mb: 1.5,
          fontSize: "12px",
          fontWeight: 700,
          color: "#a1a1aa",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
        }}
      >
        Top 3 Tracks
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {tracks.map((track, trackIdx) => {
          const recordingParam = track.recording_id
            ? `?recording_id=${encodeURIComponent(track.recording_id)}`
            : "";
          // Preserve the ranking window so the detail page shows the same scope.
          const period = new URLSearchParams(location.search).get("period");
          const periodParam = period
            ? `${recordingParam ? "&" : "?"}period=${encodeURIComponent(period)}`
            : "";
          const href = `/music/tracks/${encodeURIComponent(track.title)}${recordingParam}${periodParam}`;

          return (
            <Box
              key={trackIdx}
              component={RouterLink}
              to={href}
              state={{ from }}
              aria-label={`View track ${track.title}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "12px",
                color: "inherit",
                textDecoration: "none",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.1)",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                },
                "&:focus-visible": {
                  outline: "2px solid #f43f5e",
                  outlineOffset: 2,
                },
                transition: "all 0.2s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                {isFirst ? (
                  <PlayArrowIcon sx={{ fontSize: 16, color: "#EF4444", flexShrink: 0 }} />
                ) : (
                  <MusicNoteIcon sx={{ fontSize: 16, color: "#71717a", flexShrink: 0 }} />
                )}
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: "14px",
                    color: isFirst ? "#e4e4e7" : "#a1a1aa",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
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
                  flexShrink: 0,
                  ml: 1.5,
                }}
              >
                {track.count} {track.count === 1 ? "play" : "plays"}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}