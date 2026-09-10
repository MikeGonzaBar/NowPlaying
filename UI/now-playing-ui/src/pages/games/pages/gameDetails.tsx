import React, { useMemo, useState, useEffect } from "react";
import { Box, Typography, IconButton, Tab, Tabs } from "@mui/material";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import {
  SteamGame,
  PsnGame,
  RetroAchievementsGame,
  XboxGame,
} from "../utils/types";
// NOTE: useGameData (which downloads all four provider libraries) is
// intentionally not used here — canonical detail endpoints now carry
// recency_rank so one game detail never loads every provider's library.
import { useGameDetail, useGameDetailById, usePlatformGameDetail } from "../hooks/useGameDetail";
import {
  calculateAchievementPercentage,
  formatMinutesCompact,
  getPlaytime,
  parsePlaytimeMinutes,
} from "../utils/utils";
import { getPlatformMatch } from "../utils/platformHelper";
import {
  isPsnGame,
  isXboxGame,
  isRetroAchievementsGame,
} from "../utils/typeGuards";
import GameComparison from "../components/GameComparison";
import CircularProgress from "../components/CircularProgress";
import ActivitySparkline from "../components/ActivitySparkline";
import PlatformPills from "../components/PlatformPills";
import RecentWinsStrip from "../components/RecentWinsStrip";
import MasterAchievementList from "../components/MasterAchievementList";
import EnhancedTimeMetrics from "../components/EnhancedTimeMetrics";
import GameContextMetadata from "../components/GameContextMetadata";
import { zincColors } from "../../../theme";
import { API_CONFIG } from "../../../config/api";

const GameDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, title: routeTitle, platform: routePlatform } = useParams<{
    id?: string;
    title?: string;
    platform?: string;
  }>();
  const beBaseUrl = API_CONFIG.BASE_URL;
  const [selectedPlatformIndex, setSelectedPlatformIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Route params are canonical. Location state is only an optimization and must
  // never override a direct URL load or stale browser history state.
  const directRouteId = id ? String(id) : undefined;
  const routeGame = location.state?.game as
    | SteamGame
    | PsnGame
    | RetroAchievementsGame
    | XboxGame
    | undefined;
  const matchingRouteGame =
    routeGame && directRouteId
      ? String((routeGame as { appid?: number | string }).appid) === directRouteId
        ? routeGame
        : undefined
      : routeGame;
  // Deferred provider loading: the four provider libraries are intentionally
  // NOT fetched here. The canonical detail endpoints supply everything the
  // detail view needs, including recency_rank for the "#N Most Played" badge.

  // Prefer the canonical route ID, then fall back to a title lookup only when
  // the route does not carry a valid app identifier.
  const gameTitle = routeTitle
    ? decodeURIComponent(routeTitle)
    : !directRouteId
      ? matchingRouteGame?.name
      : undefined;
  const {
    game: crossPlatformGame,
    loading: crossPlatformLoading,
  } = useGameDetail(beBaseUrl, gameTitle);
  const { game: idGame, loading: idLoading, error: idError } = useGameDetailById(
    beBaseUrl,
    directRouteId,
    routePlatform,
  );
  const resolvedCrossPlatformGame = idGame || crossPlatformGame;

  // Get card position from sessionStorage for shared element transition
  const cardPosition = useMemo(() => {
    try {
      const stored = sessionStorage.getItem("gameCardPosition");
      if (stored) {
        const position = JSON.parse(stored);
        sessionStorage.removeItem("gameCardPosition"); // Clean up after use
        return position as {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }, []);

  // Find the game from navigation state, or from the resolved detail payload.
  const game = useMemo(() => {
    if (matchingRouteGame) return matchingRouteGame;
    if (directRouteId) {
      return (
        (resolvedCrossPlatformGame?.platforms?.[0]?.data as
          | SteamGame
          | PsnGame
          | RetroAchievementsGame
          | XboxGame
          | undefined) || null
      );
    }
    return null;
  }, [matchingRouteGame, directRouteId, resolvedCrossPlatformGame]);

  // Determine if this is a cross-platform game
  const isCrossPlatform = resolvedCrossPlatformGame && resolvedCrossPlatformGame.platforms.length > 1;

  // Tab index 0 is the combined cross-platform truth (default); provider
  // tabs start at index 1 and are drill-downs. For single-platform games
  // there is no Combined tab and index 0 maps to the only platform.
  const onCombined = isCrossPlatform && selectedPlatformIndex === 0;
  const providerIndex =
    isCrossPlatform && selectedPlatformIndex > 0
      ? selectedPlatformIndex - 1
      : selectedPlatformIndex;

  // Combined truth across every connected provider, computed the same way
  // the Comparison footer does so header, body, and footer always agree
  // (audit: list/detail/headline numbers must reconcile).
  const combinedMetrics = useMemo(() => {
    if (!isCrossPlatform || !resolvedCrossPlatformGame) return null;
    let playtimeMinutes = 0;
    let unlocked = 0;
    let total = 0;
    resolvedCrossPlatformGame.platforms.forEach((entry) => {
      const data = entry.data;
      const minutes = parsePlaytimeMinutes(
        data.playtime_forever ?? data.total_playtime,
      );
      if (minutes.available && minutes.minutes !== null) {
        playtimeMinutes += minutes.minutes;
      }
      const achievements = Array.isArray(data.achievements)
        ? data.achievements
        : [];
      total += achievements.length;
      unlocked += achievements.filter((achievement) => {
        const item = achievement as Record<string, unknown>;
        return item.achieved === true || item.unlocked === true;
      }).length;
    });
    return {
      playtime: formatMinutesCompact(playtimeMinutes),
      completionPercentage:
        total > 0 ? (unlocked / total) * 100 : 0,
    };
  }, [isCrossPlatform, resolvedCrossPlatformGame]);

  // Keep the tab index aligned with the API platform array (Combined shifts
  // provider indices by 1, so the selected platform for detail drills is
  // providerIndex, and the Combined tab intentionally defers provider data).
  const selectedPlatformData =
    resolvedCrossPlatformGame && !onCombined
      ? resolvedCrossPlatformGame.platforms[providerIndex]
      : null;

  // Fetch detailed data for the selected platform if needed
  const {
    game: platformGameDetail,
    loading: platformLoading,
  } = usePlatformGameDetail(
    beBaseUrl,
    selectedPlatformData?.platform,
    selectedPlatformData?.data?.appid?.toString() || selectedPlatformData?.data?.id?.toString()
  );

  // Use the selected platform's detail/data for every platform-specific section.
  const displayGame = (selectedPlatformData
    ? platformGameDetail || selectedPlatformData.data
    : platformGameDetail || game || resolvedCrossPlatformGame?.platforms[0]?.data || null) as SteamGame | PsnGame | RetroAchievementsGame | XboxGame | null;

  // Check if we have any game data to display
  const hasGameData = game || resolvedCrossPlatformGame || platformGameDetail;

  const platform = useMemo(
    () => (displayGame ? getPlatformMatch(displayGame) : null),
    [displayGame],
  );
  // Headline scope, declared after `platform` resolves: the Combined tab shows
  // cross-platform truth, provider tabs show that provider's name.
  const currentScopeLabel = onCombined
    ? "Combined"
    : platform?.value
      ? platform.value
      : "This platform";
  // When a game is selected, use the merged total playtime so the
  // headline always reflects combined truth — not one provider's view.
  const playtime = useMemo(
    () =>
      displayGame
        ? formatMinutesCompact(getPlaytime(displayGame))
        : "0m",
    [displayGame],
  );
  // Sources that do not report playtime (e.g. RetroAchievements) must not be
  // presented as "0h" — that reads as zero activity rather than missing data.
  const hasPlaytime = useMemo(
    () => !!displayGame && ("playtime_forever" in displayGame || "total_playtime" in displayGame),
    [displayGame],
  );
  const completionPercentage = useMemo(() => {
    if (!displayGame) return 0;
    const percentage = calculateAchievementPercentage(displayGame);
    return isNaN(percentage) || !isFinite(percentage) ? 0 : percentage;
  }, [displayGame]);

  // Headline bento values: Combined tab shows the cross-platform truth;
  // provider tabs show that provider's figures. Everything below carries the
  // scope label so viewers never conflate one provider with the whole game.
  const bentoPlaytime = onCombined && combinedMetrics
    ? combinedMetrics.playtime
    : hasPlaytime
      ? playtime
      : null;
  const bentoCompletion = onCombined && combinedMetrics
    ? combinedMetrics.completionPercentage
    : completionPercentage;
  const bentoHasPlaytime =
    onCombined ? Boolean(combinedMetrics) : hasPlaytime;
  // Deferred provider loading: rank comes from the detail response's
  // recency_rank (computed server-side); no full library fetches here.
  const rank = useMemo(() => {
    if (!displayGame) return null;
    const withRank = displayGame as {
      recency_rank?: { rank: number; total: number } | null;
    };
    return withRank.recency_rank?.rank ?? null;
  }, [displayGame]);

  // Legacy URL canonicalization: bare /game/:id bookmarks still resolve, then
  // the address bar is replaced with the canonical /games/:platform/:id form
  // so exactly one shareable URL scheme exists. No-op on canonical routes.
  // NOTE: `platform` above (getPlatformMatch) is a display-config OBJECT, not a
  // string — it must never be interpolated into the URL. Interpolating it used
  // to produce "/games/[object Object]/:id", whose captured `:platform` was then
  // forwarded to the API as ?platform=[object%20Object] → HTTP 400. Derive the
  // provider key explicitly instead.
  const providerKey = useMemo<string | null>(() => {
    if (!displayGame) return null;
    if (isRetroAchievementsGame(displayGame)) return "retroachievements";
    if (isXboxGame(displayGame)) return "xbox";
    if (isPsnGame(displayGame)) return "psn";
    return "steam";
  }, [displayGame]);

  useEffect(() => {
    if (!location.pathname.startsWith("/game/")) return;
    if (location.pathname.startsWith("/game/title/")) return;
    if (!providerKey || !displayGame) return;
    const platformGameId =
      (displayGame as { appid?: number | string }).appid?.toString() ||
      (displayGame as { id?: number | string }).id?.toString() ||
      directRouteId;
    if (!platformGameId) return;
    navigate(
      `/games/${providerKey}/${encodeURIComponent(platformGameId)}${location.search}`,
      { replace: true },
    );
  }, [
    providerKey,
    displayGame,
    location.pathname,
    location.search,
    navigate,
    directRouteId,
  ]);

  // Handle transition animation
  useEffect(() => {
    // Trigger transition animation after mount
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    // Return to wherever the user came from (e.g. a filtered All Games
    // list) instead of always bouncing back to /games and losing context.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/games");
    }
  };

  if (!hasGameData || !displayGame) {
    const isResolving = crossPlatformLoading || idLoading || platformLoading;
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
          backgroundColor: zincColors.background,
          zIndex: 9999,
        }}
      >
        <Typography variant="h5" sx={{ color: zincColors.white }}>
          {isResolving ? "Loading game details..." : "Couldn’t load this game"}
        </Typography>
        {!isResolving && idError && (
          <Typography
            variant="body2"
            sx={{ color: zincColors.muted, maxWidth: 420, textAlign: "center" }}
          >
            {idError}
          </Typography>
        )}
        {!isResolving && (
          <Box sx={{ display: "flex", gap: 2 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "#18181b",
                color: "#fff",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        overflow: "auto",
      }}
    >
      {/* Background Image with Shared Element Transition */}
      <Box
        component="img"
        src={
          typeof displayGame.img_icon_url === "string"
            ? displayGame.img_icon_url
            : typeof resolvedCrossPlatformGame?.platforms[0]?.data?.img_icon_url === "string"
              ? resolvedCrossPlatformGame.platforms[0].data.img_icon_url
              : ""
        }
        alt={displayGame?.name || resolvedCrossPlatformGame?.title || "Game"}
        sx={{
          position: "fixed",
          top: cardPosition && isTransitioning ? `${cardPosition.y}px` : 0,
          left: cardPosition && isTransitioning ? `${cardPosition.x}px` : 0,
          width:
            cardPosition && isTransitioning
              ? `${cardPosition.width}px`
              : "100%",
          height:
            cardPosition && isTransitioning
              ? `${cardPosition.height}px`
              : "100%",
          objectFit: "cover",
          zIndex: 1,
          transition: cardPosition
            ? "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
          borderRadius: cardPosition && isTransitioning ? "8px" : 0,
        }}
      />

      {/* Backdrop Blur and Dark Overlay */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(24, 24, 27, 0.8)", // zinc-950/80
          backdropFilter: "blur(40px)", // backdrop-blur-2xl
          zIndex: 2,
        }}
      />

      {/* Content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 3,
          minHeight: "100vh",
          padding: 4,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Close Button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 4,
          }}
        >
          <IconButton
            onClick={handleClose}
            aria-label="Close game details"
            sx={{
              color: zincColors.white,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              border: "1px solid transparent",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 0 8px rgba(255, 255, 255, 0.2)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Header Section */}
        <Box
          sx={{
            marginBottom: 6,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              marginBottom: 2,
            }}
          >
            {/* Game Title */}
            <Typography
              variant="h2"
              sx={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: "3rem",
                color: zincColors.white,
                flex: 1,
              }}
            >
              {displayGame?.name || resolvedCrossPlatformGame?.title || "Game"}
            </Typography>

            {/* Platform Icon (Muted/Monochromatic) */}
            {platform && (
              <Box
                component="img"
                src={platform.src}
                alt={platform.alt}
                sx={{
                  width: platform.width,
                  height: "auto",
                  opacity: 0.6, // Muted effect
                  filter: "grayscale(30%)", // Slight grayscale for monochromatic look
                }}
              />
            )}
          </Box>

          {/* Platform Pills */}
          {displayGame && <PlatformPills game={displayGame} />}
        </Box>

        {/* Platform Tabs for cross-platform games */}
        {isCrossPlatform && resolvedCrossPlatformGame && (
          <Box sx={{ marginBottom: 3 }}>
            <Tabs
              value={selectedPlatformIndex}
              onChange={(_e, newValue) => setSelectedPlatformIndex(newValue)}
              sx={{
                "& .MuiTab-root": {
                  color: zincColors.muted,
                  textTransform: "none",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  "&.Mui-selected": {
                    color: zincColors.white,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: zincColors.white,
                },
              }}
            >
              <Tab key="combined" label="Combined" />
              {resolvedCrossPlatformGame.platforms.map((p) => (
                <Tab
                  key={p.platform}
                  label={
                    p.platform === "psn"
                      ? "PlayStation"
                      : p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
                  }
                />
              ))}
            </Tabs>
          </Box>
        )}

        {/* Bento Stats Row */}
        <Box
          sx={{
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          {/* Stat 1: Time Invested */}
          <Box
            sx={{
              flex: "1 1 300px",
              backgroundColor: "rgba(24, 24, 27, 0.3)", // Transparent with slight tint
              border: "1px solid #27272a", // zinc-800
              borderRadius: 2,
              padding: 3,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "Inter, sans-serif",
                color: zincColors.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontSize: "0.75rem",
              }}
            >
              Time Invested
            </Typography>
            <Typography
              sx={{
                fontFamily: "Inter, sans-serif",
                color: zincColors.muted,
                fontSize: "0.625rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {currentScopeLabel}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                color: zincColors.white,
                fontSize: "2rem",
              }}
            >
              {bentoHasPlaytime && bentoPlaytime
                ? bentoPlaytime
                : "Playtime unavailable"}
            </Typography>
            <Box
              sx={{
                marginTop: 1,
                width: "100%",
              }}
            >
              {displayGame && (
                <ActivitySparkline game={displayGame} height={60} days={30} />
              )}
            </Box>
          </Box>

          {/* Stat 2: Completion */}
          <Box
            sx={{
              flex: "1 1 300px",
              backgroundColor: "rgba(24, 24, 27, 0.3)",
              border: "1px solid #27272a",
              borderRadius: 2,
              padding: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "Inter, sans-serif",
                color: zincColors.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontSize: "0.75rem",
              }}
            >
              Completion
            </Typography>
            <Typography
              sx={{
                fontFamily: "Inter, sans-serif",
                color: zincColors.muted,
                fontSize: "0.625rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {currentScopeLabel}
            </Typography>
            {isNaN(bentoCompletion) || bentoCompletion === 0 ? (
              <Box
                sx={{
                  width: 140,
                  height: 140,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "Inter, sans-serif",
                    color: zincColors.muted,
                    fontSize: "0.875rem",
                    textAlign: "center",
                  }}
                >
                  {bentoCompletion === 0 &&
                    displayGame?.achievements &&
                    displayGame.achievements.length > 0
                    ? "Start Playing to see stats"
                    : "Calculating..."}
                </Typography>
              </Box>
            ) : (
              <CircularProgress
                percentage={bentoCompletion}
                size={140}
                strokeWidth={10}
              />
            )}
          </Box>

          {/* Stat 3: Standing */}
          <Box
            sx={{
              flex: "1 1 300px",
              backgroundColor: "rgba(24, 24, 27, 0.3)",
              border: "1px solid #27272a",
              borderRadius: 2,
              padding: 3,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "Inter, sans-serif",
                color: zincColors.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontSize: "0.75rem",
              }}
            >
              Standing
            </Typography>
            <Typography
              sx={{
                fontFamily: "Inter, sans-serif",
                color: zincColors.muted,
                fontSize: "0.625rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {currentScopeLabel}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                color: zincColors.white,
                fontSize: "2rem",
              }}
            >
              {rank ? `#${rank} Most Played` : "Not ranked"}
            </Typography>
          </Box>
        </Box>

        {/* Cross-Platform Comparison - shown at top for cross-platform games */}
        {isCrossPlatform && resolvedCrossPlatformGame && (
          <Box sx={{ marginTop: 4, marginBottom: 4 }}>
            <GameComparison game={resolvedCrossPlatformGame} />
          </Box>
        )}

        {/* Activity & Milestone Section */}
        <Box
          sx={{
            marginTop: 4,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: "1.5rem",
              color: zincColors.white,
              marginBottom: 4,
            }}
          >
            Activity & Milestones
          </Typography>

          {/* Recent Wins Strip */}
          <RecentWinsStrip game={displayGame} />

          {/* Enhanced Time Metrics */}
          <EnhancedTimeMetrics game={displayGame} />

          {/* Game Context & Metadata */}
          <GameContextMetadata game={displayGame} />

          {/* Master Achievement List */}
          <MasterAchievementList game={displayGame} />
        </Box>
      </Box>
    </Box>
  );
};

export default GameDetails;
