import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Box, Typography, Button, Skeleton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SideBar from "../../../components/sideBar";
import { useMusicDetail } from "../hooks/useMusicDetail";
import PlayHistorySection from "../components/PlayHistorySection";
import { formatShortDate } from "../../../utils/dates";
import { zincColors } from "../../../theme";

interface TrackDetailData {
  title: string;
  artist: string;
  album: string;
  count: number;
  thumbnail: string | null;
  track_url: string | null;
  artist_lastfm_url: string | null;
  loved: boolean;
  streamable: boolean;
  played_at: string | null;
  source: string;
  first_played: string | null;
  last_played: string | null;
  scope: { label: string };
}

function TrackDetail() {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const decodedName = name ? decodeURIComponent(name) : "";
  const recordingId = searchParams.get("recording_id") || undefined;

  const { data: track, loading } = useMusicDetail<TrackDetailData>({
    type: "track",
    name: decodedName,
    recordingId,
  });

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
        <Button
          onClick={() => navigate("/music/tracks")}
          startIcon={<ArrowBackIcon />}
          sx={{
            mb: 4,
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
            "&:hover": { bgcolor: "rgba(225, 29, 72, 0.2)" },
          }}
        >
          Back to Tracks
        </Button>

        {loading ? (
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{ bgcolor: "#18181b", borderRadius: 2 }}
          />
        ) : track ? (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 4, mb: 4 }}>
              {track.thumbnail && (
                <Box
                  component="img"
                  src={track.thumbnail}
                  alt={track.title}
                  sx={{
                    width: 150,
                    height: 150,
                    borderRadius: 2,
                    objectFit: "cover",
                    border: "3px solid #e11d48",
                  }}
                />
              )}
              <Box>
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: "28px", md: "42px" },
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  {track.title}
                </Typography>
                <Typography
                  sx={{ color: zincColors.muted, fontSize: "14px", mb: 1 }}
                >
                  by {track.artist}
                </Typography>
                <Typography
                  sx={{ color: zincColors.muted, fontSize: "14px", mb: 1 }}
                >
                  from {track.album}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography
                    sx={{ color: zincColors.muted, fontSize: "14px" }}
                  >
                    {track.count.toLocaleString()} {track.count === 1 ? "play" : "plays"} ({track.scope.label})
                  </Typography>
                  {track.loved && (
                    <FavoriteIcon sx={{ fontSize: 16, color: "#e11d48" }} />
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: zincColors.muted }}>
            Track not found
          </Typography>
        )}


        {track && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 3,
              mb: 4,
            }}
          >
            <Box
              sx={{
                bgcolor: "rgba(24, 24, 27, 0.5)",
                borderRadius: 2,
                p: 3,
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <Typography
                sx={{
                  color: zincColors.muted,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  mb: 1,
                }}
              >
                First Played
              </Typography>
              <Typography sx={{ fontSize: "16px", fontWeight: 600 }}>
                {track.first_played ? formatShortDate(track.first_played) : "Unknown"}
              </Typography>
            </Box>
            <Box
              sx={{
                bgcolor: "rgba(24, 24, 27, 0.5)",
                borderRadius: 2,
                p: 3,
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <Typography
                sx={{
                  color: zincColors.muted,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  mb: 1,
                }}
              >
                Last Played
              </Typography>
              <Typography sx={{ fontSize: "16px", fontWeight: 600 }}>
                {track.last_played ? formatShortDate(track.last_played) : "Unknown"}
              </Typography>
            </Box>
            <Box
              sx={{
                bgcolor: "rgba(24, 24, 27, 0.5)",
                borderRadius: 2,
                p: 3,
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <Typography
                sx={{
                  color: zincColors.muted,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  mb: 1,
                }}
              >
                Source
              </Typography>
              <Typography sx={{ fontSize: "16px", fontWeight: 600 }}>
                {track.source === "spotify" ? "Spotify" : "Last.fm"}
              </Typography>
            </Box>
          </Box>
        )}


        <PlayHistorySection
          type="track"
          name={decodedName}
          recordingId={recordingId}
          detailCount={track?.count ?? 0}
        />
      </Box>
    </Box>
  );
}

export default TrackDetail;
