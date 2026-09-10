import { Box, Typography, Button } from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useMusicPlayHistory } from "../hooks/useMusicDetail";
import { formatLastPlayed } from "../utils/dateUtils";
import { zincColors } from "../../../theme";

interface PlayHistorySectionProps {
  type: "artist" | "album" | "track";
  name: string;
  artist?: string;
  recordingId?: string;
  pageSize?: number;
  /** Lifetime play count from the detail payload, used to pick an honest empty state. */
  detailCount?: number;
}

/**
 * Shared "Recent Plays" section for track/album/artist detail pages (audit #5).
 *
 * The backend already returns `total_items`/`has_next` on every `*-plays`
 * endpoint and `useMusicPlayHistory` paginates — this component finally
 * surfaces that contract in the UI: an explicit `Recent N of M plays` label
 * and a `Load more` control instead of a silently truncated history.
 */
export function PlayHistorySection({
  type,
  name,
  artist,
  recordingId,
  pageSize = 50,
  detailCount = 0,
}: PlayHistorySectionProps) {
  const { plays, hasMore, totalItems, loadMore } = useMusicPlayHistory({
    type,
    name,
    artist,
    recordingId,
    pageSize,
  });

  const knownTotal = totalItems > 0 ? totalItems : plays.length;
  const isSampled = hasMore && plays.length < knownTotal;
  const heading = isSampled
    ? `Recent ${plays.length} of ${knownTotal.toLocaleString()} plays`
    : `${knownTotal.toLocaleString()} ${knownTotal === 1 ? "play" : "plays"}`;

  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontSize: "18px",
          fontWeight: 700,
          mb: 3,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Recent Plays
      </Typography>
      {plays.length === 0 ? (
        <Typography sx={{ color: zincColors.muted }}>
          {detailCount > 0
            ? "Detailed play history is not available from this source"
            : "No play history available"}
        </Typography>
      ) : (
        <>
          <Typography sx={{ color: zincColors.muted, fontSize: "13px", mb: 2 }}>
            {heading}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {plays.map((play) => (
              <Box
                key={play.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  bgcolor: "rgba(24, 24, 27, 0.3)",
                  borderRadius: 1,
                  "&:hover": { bgcolor: "rgba(24, 24, 27, 0.6)" },
                }}
              >
                {play.thumbnail && (
                  <Box
                    component="img"
                    src={play.thumbnail}
                    alt=""
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      objectFit: "cover",
                    }}
                  />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {play.title}
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: zincColors.muted }}>
                    {type === "album" ? play.artist : play.album}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 12, color: zincColors.muted }} />
                  <Typography sx={{ fontSize: "12px", color: zincColors.muted }}>
                    {formatLastPlayed(play.played_at)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          {isSampled && (
            <Button
              onClick={loadMore}
              startIcon={<ExpandMoreIcon />}
              sx={{
                mt: 2,
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
              Load {pageSize} more
            </Button>
          )}
        </>
      )}
    </Box>
  );
}

export default PlayHistorySection;
