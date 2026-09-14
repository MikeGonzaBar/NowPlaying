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
import { useGameDetail, useGameDetailById, usePlatformGameDetail } from "../hooks/useGameDetail";
import {
  calculateAchievementPercentage,
  formatMinutesCompact,
  getPlaytime,
} from "../utils/utils";
import { getPlatformMatch } from "../utils/platformHelper";
import { getCombinedDetailMetrics } from "../utils/gameDetail";
import {
  isPsnGame,
  isXboxGame,
  isRetroAchievementsGame,
} from "../utils/typeGuards";
import GameComparison from "../components/GameComparison";
import { GameImage } from "../components/GameImage";
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

  const directRouteId = id ? String(id) : undefined;
  const VALID_PROVIDERS = ["steam", "psn", "xbox", "retroachievements"] as const;
  const typedPlatform = VALID_PROVIDERS.find((p) => p === routePlatform);
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

  const gameTitle = routeTitle
    ? routeTitle
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
    typedPlatform,
  );
  const resolvedCrossPlatformGame = idGame || crossPlatformGame;

  const cardPosition = useMemo(() => {
    try {
      const stored = sessionStorage.getItem("gameCardPosition");
      if (stored) {
        const position = JSON.parse(stored);
        sessionStorage.removeItem("gameCardPosition");
        return position as {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }
    } catch {
      return undefined;
    }
    return undefined;
  }, []);

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

  const isCrossPlatform = resolvedCrossPlatformGame && resolvedCrossPlatformGame.platforms.length > 1;

  const onCombined = isCrossPlatform && selectedPlatformIndex === 0;
  const providerIndex =
    isCrossPlatform && selectedPlatformIndex > 0
      ? selectedPlatformIndex - 1
      : selectedPlatformIndex;

  const combinedMetrics = useMemo(() => {
    if (!isCrossPlatform || !resolvedCrossPlatformGame) return null;
    const { playtimeMinutes, unlocked, total } = getCombinedDetailMetrics(
      resolvedCrossPlatformGame.platforms,
    );
    return {
      playtime: formatMinutesCompact(playtimeMinutes),
      completionPercentage:
        total > 0 ? (unlocked / total) * 100 : 0,
    };
  }, [isCrossPlatform, resolvedCrossPlatformGame]);

  const selectedPlatformData =
    resolvedCrossPlatformGame && !onCombined
      ? resolvedCrossPlatformGame.platforms[providerIndex]
      : null;

  const {
    game: platformGameDetail,
    loading: platformLoading,
  } = usePlatformGameDetail(
    beBaseUrl,
    selectedPlatformData?.platform,
    selectedPlatformData?.data?.appid?.toString() || selectedPlatformData?.data?.id?.toString()
  );

  const displayGame = (selectedPlatformData
    ? platformGameDetail || selectedPlatformData.data
    : platformGameDetail || game || resolvedCrossPlatformGame?.platforms[0]?.data || null) as SteamGame | PsnGame | RetroAchievementsGame | XboxGame | null;

  const hasGameData = game || resolvedCrossPlatformGame || platformGameDetail;

  const platform = useMemo(
    () => (displayGame ? getPlatformMatch(displayGame) : null),
    [displayGame],
  );
  const currentScopeLabel = onCombined
    ? "Combined"
    : platform?.value
      ? platform.value
      : "This platform";
  const playtime = useMemo(
    () =>
      displayGame
        ? formatMinutesCompact(getPlaytime(displayGame))
        : "0m",
    [displayGame],
  );
  const hasPlaytime = useMemo(
    () => !!displayGame && ("playtime_forever" in displayGame || "total_playtime" in displayGame),
    [displayGame],
  );
  const completionPercentage = useMemo(() => {
    if (!displayGame) return 0;
    const percentage = calculateAchievementPercentage(displayGame);
    return isNaN(percentage) || !isFinite(percentage) ? 0 : percentage;
  }, [displayGame]);

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
  const rank = useMemo(() => {
    if (!displayGame) return null;
    const withRank = displayGame as {
      recency_rank?: { rank: number; total: number } | null;
    };
    return withRank.recency_rank?.rank ?? null;
  }, [displayGame]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
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
      <GameImage
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
