import { useParams, useNavigate, useLocation, useSearchParams, Link as RouterLink } from "react-router-dom";
import { Box, Typography, Button, Skeleton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SideBar from "../../../components/sideBar";
import { useMusicDetail } from "../hooks/useMusicDetail";
import PlayHistorySection from "../components/PlayHistorySection";
import { formatLastPlayed } from "../utils/dateUtils";
import { zincColors } from "../../../theme";
import { getBackLabel, withDaysParam } from "../utils/navigation";

interface AlbumDetailData {
  name: string;
  artist: string;
  count: number;
  thumbnail: string | null;
  track_url: string | null;
  top_tracks: Array<{ title: string; recording_id?: string; count: number }>;
  latest_played: string | null;
  first_played: string | null;
  last_played: string | null;
  scope: { label: string };
}

function AlbumDetail() {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const decodedName = name ? decodeURIComponent(name) : "";
  const days = searchParams.get("days") || searchParams.get("period");
  const fromState = (location.state as { from?: unknown } | null)?.from;
  const backTo =
    typeof fromState === "string" && fromState.startsWith("/")
      ? fromState
      : "/music/albums";
  const backLabel = getBackLabel(backTo);

  const { data: album, loading } = useMusicDetail<AlbumDetailData>({
    type: "album",
    name: decodedName,
    artist: searchParams.get("artist") || undefined,
    days,
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
          onClick={() => navigate(backTo)}
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
          {backLabel}
        </Button>

        {loading ? (
          <Skeleton variant="rectangular" height={200} sx={{ bgcolor: "#18181b", borderRadius: 2 }} />
        ) : album ? (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 4, mb: 4 }}>
              {album.thumbnail && (
                <Box
                  component="img"
                  src={album.thumbnail}
                  alt={album.name}
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
                  variant="h1"
                  component="h1"
                  sx={{ fontSize: { xs: "28px", md: "42px" }, fontWeight: 700, mb: 1 }}
                >
                  {album.name}
                </Typography>
                <Typography sx={{ color: zincColors.muted, fontSize: "14px", mb: 1 }}>
                  by {album.artist}
                </Typography>
                <Typography sx={{ color: zincColors.muted, fontSize: "14px" }}>
                  {album.count.toLocaleString()} {album.count === 1 ? "play" : "plays"} ({album.scope.label}) &middot;{" "}
                  top {album.top_tracks.length} tracks
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {album.first_played && (
                <Box>
                  <Typography sx={{ color: zincColors.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    First Played
                  </Typography>
                  <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
                    {formatLastPlayed(album.first_played)}
                  </Typography>
                </Box>
              )}
              {album.last_played && (
                <Box>
                  <Typography sx={{ color: zincColors.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Last Played
                  </Typography>
                  <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
                    {formatLastPlayed(album.last_played)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: zincColors.muted }}>Album not found</Typography>
        )}


        {album?.top_tracks && album.top_tracks.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontSize: "18px", fontWeight: 700, mb: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Top {album.top_tracks.length} Tracks
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {album.top_tracks.map((track, idx) => (
                <Box
                  key={idx}
                  component={RouterLink}
                  to={withDaysParam(
                    `/music/tracks/${encodeURIComponent(track.title)}${
                      track.recording_id
                        ? `?recording_id=${encodeURIComponent(track.recording_id)}`
                        : ""
                    }`,
                    days,
                  )}
                  state={{ from: `${location.pathname}${location.search}` }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    bgcolor: "rgba(24, 24, 27, 0.5)",
                    borderRadius: 1,
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    textDecoration: "none",
                    color: "inherit",
                    "&:focus-visible": { outline: "2px solid #f43f5e", outlineOffset: 3 },
                  }}
                >
                  <Typography sx={{ color: zincColors.muted, fontSize: "14px", fontWeight: 600, minWidth: 24 }}>
                    #{idx + 1}
                  </Typography>
                  <Typography sx={{ flex: 1, fontSize: "14px" }}>{track.title}</Typography>
                  <Typography sx={{ color: zincColors.muted, fontSize: "12px" }}>
                    {track.count} {track.count === 1 ? "play" : "plays"}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}


        <PlayHistorySection
          type="album"
          name={decodedName}
          artist={searchParams.get("artist") || undefined}
          detailCount={album?.count ?? 0}
          days={days}
        />
      </Box>
    </Box>
  );
}

export default AlbumDetail;
