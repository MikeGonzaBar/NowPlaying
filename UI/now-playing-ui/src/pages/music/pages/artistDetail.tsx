import { useParams, useNavigate, useLocation, useSearchParams, Link as RouterLink } from "react-router-dom";
import { Box, Typography, Button, Skeleton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SideBar from "../../../components/sideBar";
import { useMusicDetail } from "../hooks/useMusicDetail";
import PlayHistorySection from "../components/PlayHistorySection";
import { formatLastPlayed } from "../utils/dateUtils";
import { zincColors } from "../../../theme";
import { getBackLabel, withDaysParam } from "../utils/navigation";

interface ArtistDetailData {
  name: string;
  count: number;
  thumbnail: string | null;
  artist_lastfm_url: string | null;
  top_tracks: Array<{ title: string; recording_id?: string; count: number }>;
  albums_count: number;
  latest_played: string | null;
  first_played: string | null;
  last_played: string | null;
  scope: { label: string };
}

function ArtistDetail() {
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
      : "/music/artists";
  const backLabel = getBackLabel(backTo);

  const { data: artist, loading } = useMusicDetail<ArtistDetailData>({
    type: "artist",
    name: decodedName,
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
          // Without minWidth: 0 the flex item refuses to shrink below its
          // content's min-content width, letting long artist/track names
          // stretch the whole page past the mobile viewport.
          minWidth: 0,
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
        ) : artist ? (
          <Box sx={{ mb: 6 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                gap: { xs: 2, sm: 4 },
                mb: 4,
                minWidth: 0,
              }}
            >
              {artist.thumbnail && (
                <Box
                  component="img"
                  src={artist.thumbnail}
                  alt={artist.name}
                  sx={{
                    width: { xs: 112, sm: 150 },
                    height: { xs: 112, sm: 150 },
                    flexShrink: 0,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #e11d48",
                  }}
                />
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    fontSize: { xs: "28px", md: "42px" },
                    fontWeight: 700,
                    mb: 1,
                    overflowWrap: "anywhere",
                  }}
                >
                  {artist.name}
                </Typography>
                <Typography sx={{ color: zincColors.muted, fontSize: "14px", overflowWrap: "anywhere" }}>
                  {artist.count.toLocaleString()} {artist.count === 1 ? "play" : "plays"} ({artist.scope.label}) &middot;{" "}
                  top {artist.top_tracks.length} tracks &middot; {artist.albums_count} albums
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {artist.first_played && (
                <Box>
                  <Typography sx={{ color: zincColors.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    First Played
                  </Typography>
                  <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
                    {formatLastPlayed(artist.first_played)}
                  </Typography>
                </Box>
              )}
              {artist.last_played && (
                <Box>
                  <Typography sx={{ color: zincColors.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Last Played
                  </Typography>
                  <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
                    {formatLastPlayed(artist.last_played)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: zincColors.muted }}>Artist not found</Typography>
        )}


        {artist?.top_tracks && artist.top_tracks.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontSize: "18px", fontWeight: 700, mb: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Top {artist.top_tracks.length} Tracks
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {artist.top_tracks.map((track, idx) => (
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
                    minWidth: 0,
                    "&:focus-visible": { outline: "2px solid #f43f5e", outlineOffset: 3 },
                  }}
                >
                  <Typography sx={{ color: zincColors.muted, fontSize: "14px", fontWeight: 600, minWidth: 24, flexShrink: 0 }}>
                    #{idx + 1}
                  </Typography>
                  <Typography sx={{ flex: 1, minWidth: 0, fontSize: "14px", overflowWrap: "anywhere" }}>{track.title}</Typography>
                  <Typography sx={{ color: zincColors.muted, fontSize: "12px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {track.count} {track.count === 1 ? "play" : "plays"}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}


        <PlayHistorySection
          type="artist"
          name={decodedName}
          detailCount={artist?.count ?? 0}
          days={days}
        />
      </Box>
    </Box>
  );
}

export default ArtistDetail;
