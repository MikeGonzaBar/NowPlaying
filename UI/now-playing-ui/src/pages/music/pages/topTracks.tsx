import { useMemo, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { RankingFilters } from "../components/RankingFilters";
import {
  getRankingPeriodLabel,
  getRankingSourceLabel,
} from "../utils/rankingFilters";
import { MusicPageLayout } from "../components/MusicPageLayout";
import { useMusicFetch } from "../hooks/useMusicFetch";
import { Track } from "../types";
import { formatLastPlayed } from "../utils/dateUtils";
import { avatarUrl } from "../../../utils/avatars";

function TopTracks() {
  const [period, setPeriod] = useState("all");
  const [source, setSource] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (period !== "all") params.set("days", period);
    if (source !== "all") params.set("source", source);
    return `top-tracks/?${params.toString()}`;
  }, [period, source]);

  const { data: tracks, loading } = useMusicFetch<Track>({
    endpoint,
    dataKey: "tracks",
  });

  const periodLabel = getRankingPeriodLabel(period);
  const sourceLabel = getRankingSourceLabel(source);

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
    <MusicPageLayout paddingBottom={{ xs: 12, md: 8 }}>
      <PageHeader
        title="Top Tracks"
        description={`Your most played tracks | ${periodLabel} | ${sourceLabel}`}
        filterButtons={
          <RankingFilters
            period={period}
            source={source}
            entityLabel="track"
            onPeriodChange={(value) => {
              setPeriod(value);
              setShowAll(false);
            }}
            onSourceChange={(value) => {
              setSource(value);
              setShowAll(false);
            }}
          />
        }
      />

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
                  src={track.thumbnail || avatarUrl(track.title, 300, "121214")}
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
                      color: "#a1a1aa",
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
                        color: "#a1a1aa",
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
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          bgcolor: "#e11d48",
                          color: "white",
                          px: 0.75,
                          py: 0.25,
                          borderRadius: "2px",
                          fontSize: "11px",
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
                          fontSize: "11px",
                          color: "#a1a1aa",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
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
                        color: "#a1a1aa",
                        fontSize: "11px",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
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
    </MusicPageLayout>
  );
}

export default TopTracks;
