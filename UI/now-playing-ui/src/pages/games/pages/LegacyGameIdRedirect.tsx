import { useParams, Navigate } from "react-router-dom";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useGameDetailById } from "../hooks/useGameDetail";
import { API_CONFIG } from "../../../config/api";
import { zincColors } from "../../../theme";

/**
 * Legacy /game/:id resolver (audit #4).
 *
 * Old bookmarks, notifications and stale internal links carry only a raw id
 * (Steam numeric, PSN concept id like PPSA01649_00, Xbox id, ...). This route
 * resolves the id once through the canonical `detail-by-id` endpoint and:
 *   - redirects (with `replace`) to the stable canonical `/games/title/{title}`
 *     destination on success, so the URL can never keep leaking `[object Object]`
 *     platform fragments, and
 *   - renders a deliberate not-found state for unknown/obsolete ids instead of
 *     a successful-looking page with a corrupt URL.
 */
const LegacyGameIdRedirect: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const directRouteId = id ? String(id) : undefined;

  const { game, loading, error } = useGameDetailById(
    API_CONFIG.BASE_URL,
    directRouteId,
    undefined,
  );

  if (game?.title) {
    return (
      <Navigate
        to={`/games/title/${encodeURIComponent(game.title)}`}
        replace
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: zincColors.background,
        color: zincColors.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 2,
        px: { xs: 2, md: 6 },
      }}
    >
      {loading ? (
        <CircularProgress sx={{ color: "#facc15" }} />
      ) : (
        <>
          <Typography variant="h1" sx={{ fontSize: "1.5rem", fontWeight: 700 }}>
            This game link is outdated
          </Typography>
          <Typography variant="body2" sx={{ color: zincColors.muted, maxWidth: 440, textAlign: "center" }}>
            {error || "We could not resolve this game from the link. It may have been removed or the provider account may have changed."}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              window.location.href = "/games/all";
            }}
            sx={{ color: zincColors.white, bgcolor: "#18181b", border: "1px solid #3f3f46", textTransform: "none" }}
          >
            Browse all games
          </Button>
        </>
      )}
    </Box>
  );
};

export default LegacyGameIdRedirect;
