import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
} from "@mui/material";
import {
  Gamepad2,
  Film,
  Music,
  BarChart3,
  Link2,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AppShell from "../components/AppShell";
import { authenticatedFetch } from "../utils/auth";
import { getApiUrl, API_CONFIG } from "../config/api";
import { zincColors } from "../theme";

interface ServiceKey {
  id: number;
  service_name: string;
  service_user_id: string;
  created_at: string;
  last_used?: string | null;
}

interface TraktStatus {
  authenticated?: boolean;
  token_expired?: boolean;
}

interface MusicStats {
  recent_activity?: Array<{
    title: string;
    artist: string;
    minutes_ago: number;
  }>;
  total_scrobbles?: number;
}

interface RecentItem {
  type: "music" | "movie";
  title: string;
  detail?: string;
  minutesAgo?: number;
  when?: string | null;
}

const formatMinutes = (minutes: number): string => {
  if (!minutes && minutes !== 0) return "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  if (minutes < 60 * 24) return Math.floor(minutes / 60) + "h ago";
  return Math.floor(minutes / (60 * 24)) + "d ago";
};

function LandingPage() {
  const [apiKeys, setApiKeys] = useState<ServiceKey[]>([]);
  const [traktStatus, setTraktStatus] = useState<TraktStatus | null>(null);
  const [musicStats, setMusicStats] = useState<MusicStats | null>(null);
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [keysResult, traktResult, musicResult, moviesResult] =
        await Promise.allSettled([
          authenticatedFetch(
            getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/`),
          )
            .then(async (r) => (r.ok ? r.json() : { results: [] }))
            .catch(() => ({ results: [] })),
          authenticatedFetch(
            getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/auth-status/`),
          )
            .then(async (r) => (r.ok ? r.json() : null))
            .catch(() => null),
          authenticatedFetch(
            getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/dashboard-stats/?days=30`),
          )
            .then(async (r) => (r.ok ? r.json() : null))
            .catch(() => null),
          authenticatedFetch(
            getApiUrl(
              `${API_CONFIG.TRAKT_ENDPOINT}/get-stored-movies/?page=1&page_size=6`,
            ),
          )
            .then(async (r) => (r.ok ? r.json() : { movies: [] }))
            .catch(() => ({ movies: [] })),
        ]);

      if (!active) return;

      const keysValue =
        keysResult.status === "fulfilled"
          ? (keysResult.value as any)
          : { results: [] };
      setApiKeys(Array.isArray(keysValue.results) ? keysValue.results : []);
      setTraktStatus(
        traktResult.status === "fulfilled"
          ? (traktResult.value as TraktStatus | null)
          : null,
      );
      const musicValue =
        musicResult.status === "fulfilled"
          ? (musicResult.value as MusicStats | null)
          : null;
      setMusicStats(musicValue);
      const moviesValue =
        moviesResult.status === "fulfilled"
          ? (moviesResult.value as any)
          : { movies: [] };
      setRecentMovies(
        Array.isArray(moviesValue.movies) ? moviesValue.movies : [],
      );
      setHealthLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const needsAttention = traktStatus?.token_expired === true;
  const connectedCount = apiKeys.length;

  const recentItems = useMemo<RecentItem[]>(() => {
    const items: RecentItem[] = [];
    for (const activity of (musicStats?.recent_activity ?? []).slice(0, 3)) {
      items.push({
        type: "music",
        title: activity.title,
        detail: activity.artist,
        minutesAgo: activity.minutes_ago,
      });
    }
    for (const movie of recentMovies.slice(0, 3)) {
      const title = movie?.movie?.title;
      if (title) {
        items.push({
          type: "movie",
          title,
          detail: "Movie",
          when: movie?.last_watched_at ?? null,
        });
      }
    }
    return items;
  }, [musicStats, recentMovies]);

  const categories = [
    {
      title: "Games",
      desc: "Playtime, achievements and trophies",
      icon: <Gamepad2 size={22} strokeWidth={1.6} />,
      route: "/games",
    },
    {
      title: "Movies & TV",
      desc: "Watch history and progress",
      icon: <Film size={22} strokeWidth={1.6} />,
      route: "/movies",
    },
    {
      title: "Music",
      desc: "Scrobbles, artists and albums",
      icon: <Music size={22} strokeWidth={1.6} />,
      route: "/music",
    },
  ];

  const utilityItems = [
    {
      title: "Analytics",
      desc: "Cross-media insights",
      icon: <BarChart3 size={22} strokeWidth={1.6} />,
      route: "/analytics",
    },
    {
      title: "Connections",
      desc: "Linked services and API keys",
      icon: <Link2 size={22} strokeWidth={1.6} />,
      route: "/profile",
    },
  ];

  return (
    <AppShell activeItem="Home" mainSx={{ p: { xs: 2, md: 4 } }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 1080,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h1"
            sx={{ fontWeight: 800, mb: 0.5 }}
          >
            Dashboard
          </Typography>
          <Typography sx={{ color: zincColors.muted }}>
            Everything you have been playing, watching, and listening to — in
            one place.
          </Typography>
        </Box>

        {!healthLoading && needsAttention && (
          <Alert
            severity="warning"
            role="status"
            action={
              <Button
                component={Link}
                to="/profile"
                size="small"
                sx={{ color: "#fbbf24", fontWeight: 700 }}
              >
                Reconnect
              </Button>
            }
            sx={{
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              color: "#fbbf24",
              "& .MuiAlert-icon": { color: "#fbbf24" },
            }}
          >
            Trakt needs attention — your session expired. Reconnect to resume
            sync.
          </Alert>
        )}

        {!healthLoading && !needsAttention && connectedCount === 0 && (
          <Alert
            severity="info"
            role="status"
            action={
              <Button
                component={Link}
                to="/profile"
                size="small"
                sx={{ color: "#22d3ee", fontWeight: 700 }}
              >
                Connect
              </Button>
            }
            sx={{
              backgroundColor: "rgba(0, 168, 204, 0.12)",
              color: "#67e8f9",
              "& .MuiAlert-icon": { color: "#67e8f9" },
            }}
          >
            No services connected yet. Link Steam, Trakt, Last.fm or another
            service to start tracking.
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Activity size={16} strokeWidth={1.5} color={zincColors.muted} />
              <Typography
                variant="h6"
                sx={{ fontSize: 16, fontWeight: 600, color: zincColors.white }}
              >
                Recent activity
              </Typography>
              {connectedCount > 0 && (
                <Chip
                  label={
                    connectedCount === 1
                      ? "1 service connected"
                      : `${connectedCount} services connected`
                  }
                  size="small"
                  sx={{
                    ml: "auto",
                    color: "#4ade80",
                    borderColor: "rgba(74, 222, 128, 0.4)",
                    fontSize: 12,
                  }}
                  variant="outlined"
                />
              )}
            </Box>

            {recentItems.length === 0 ? (
              <Typography variant="body2" sx={{ color: zincColors.muted }}>
                Recent activity will appear here once your services are synced.
              </Typography>
            ) : (
              <Box
                component="ul"
                sx={{
                  listStyle: "none",
                  m: 0,
                  p: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {recentItems.map((item, index) => {
                  const href =
                    item.type === "music" && item.title
                      ? `/music/tracks/${encodeURIComponent(item.title)}`
                      : undefined;
                  return (
                    <Box
                      component={href ? "a" : "li"}
                      href={href}
                      key={item.type + "-" + index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        py: 1.25,
                        borderBottom:
                          index < recentItems.length - 1
                            ? "1px solid " + zincColors.border
                            : "none",
                        textDecoration: "none",
                        color: "inherit",
                        ...(href
                          ? {
                              "&:hover": {
                                bgcolor: "rgba(255, 255, 255, 0.03)",
                                borderRadius: 1,
                              },
                              "&:focus-visible": {
                                outline: "2px solid #f43f5e",
                                outlineOffset: 2,
                              },
                            }
                          : {}),
                      }}
                    >
                    <Chip
                      label={item.type === "music" ? "Music" : "Movies"}
                      size="small"
                      sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor:
                          item.type === "music"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(0, 168, 204, 0.15)",
                        color: item.type === "music" ? "#4ade80" : "#67e8f9",
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: zincColors.white,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </Typography>
                      {item.detail && (
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: zincColors.muted,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.detail}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: zincColors.muted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.when
                        ? formatDistanceToNow(new Date(item.when), {
                            addSuffix: true,
                          })
                        : formatMinutes(item.minutesAgo ?? 0)}
                    </Typography>
                  </Box>
                )})}
              </Box>
            )}
          </CardContent>
        </Card>

        <Box>
          <Typography
            variant="h6"
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: zincColors.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              mb: 1.5,
            }}
          >
            Explore
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {categories.map((category) => (
              <Card
                key={category.route}
                component={Link}
                to={category.route}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  minHeight: 88,
                  textDecoration: "none",
                  "&:hover": {
                    borderColor: "#3f3f46",
                    backgroundColor: "#1f1f23",
                  },
                  "&:focus-visible": {
                    outline: "2px solid #00a8cc",
                    outlineOffset: "2px",
                  },
                }}
              >
                <Box
                  sx={{ color: "#00a8cc", display: "flex" }}
                  aria-hidden="true"
                >
                  {category.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: zincColors.white,
                    }}
                  >
                    {category.title}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: zincColors.muted }}>
                    {category.desc}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Box>
        </Box>

        <Box>
          <Typography
            variant="h6"
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: zincColors.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              mb: 1.5,
            }}
          >
            Insights & settings
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              maxWidth: 520,
            }}
          >
            {utilityItems.map((item) => (
              <Card
                key={item.route}
                component={Link}
                to={item.route}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  minHeight: 72,
                  textDecoration: "none",
                  "&:hover": {
                    borderColor: "#3f3f46",
                    backgroundColor: "#1f1f23",
                  },
                  "&:focus-visible": {
                    outline: "2px solid #00a8cc",
                    outlineOffset: "2px",
                  },
                }}
              >
                <Box
                  sx={{ color: zincColors.muted, display: "flex" }}
                  aria-hidden="true"
                >
                  {item.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: zincColors.white,
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: zincColors.muted }}>
                    {item.desc}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    </AppShell>
  );
}

export default LandingPage;