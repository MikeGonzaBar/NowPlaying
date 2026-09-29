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
import { alpha } from "@mui/material/styles";
import { Activity } from "lucide-react";
import AppShell from "../components/AppShell";
import { authenticatedFetch } from "../utils/auth";
import { getApiUrl, API_CONFIG } from "../config/api";
import { zincColors } from "../theme";
import {
  ACTIVITY_TYPE_META,
  RECENT_ACTIVITY_LIMIT,
  buildRecentActivity,
  formatActivityWhen,
} from "../utils/activity";

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

function LandingPage() {
  const [apiKeys, setApiKeys] = useState<ServiceKey[]>([]);
  const [traktStatus, setTraktStatus] = useState<TraktStatus | null>(null);
  const [activityPayload, setActivityPayload] = useState<unknown>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [keysResult, traktResult, activityResult] =
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
          // One cross-pillar feed with real timestamps, so games/music/movies
          // and TV share a single ordering (dashboard audit #1/#3).
          authenticatedFetch(
            getApiUrl(
              `/analytics/recent-activity/?limit=${RECENT_ACTIVITY_LIMIT}`,
            ),
          )
            .then(async (r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

      if (!active) return;

      const keysValue =
        keysResult.status === "fulfilled"
          ? (keysResult.value as { results?: unknown })
          : { results: [] };
      setApiKeys(Array.isArray(keysValue.results) ? keysValue.results : []);
      setTraktStatus(
        traktResult.status === "fulfilled"
          ? (traktResult.value as TraktStatus | null)
          : null,
      );
      const activityValue =
        activityResult.status === "fulfilled"
          ? (activityResult.value as { activities?: unknown } | null)
          : null;
      setActivityPayload(activityValue?.activities ?? null);
      setHealthLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const needsAttention = traktStatus?.token_expired === true;
  const connectedCount = apiKeys.length;

  const recentItems = useMemo(
    () => buildRecentActivity(activityPayload, RECENT_ACTIVITY_LIMIT),
    [activityPayload],
  );

  return (
    <AppShell activeItem="Home" mainSx={{ p: { xs: 2, md: 4 } }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 1280,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Box>
          <Typography component="h1" variant="h1" sx={{ mb: 0.5 }}>
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

        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box
              sx={{ display: "flex", color: zincColors.muted }}
              aria-hidden="true"
            >
              <Activity size={16} strokeWidth={1.5} />
            </Box>
            <Typography
              component="h2"
              variant="h6"
              sx={{
                fontSize: 14,
                fontWeight: 700,
                color: zincColors.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
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
                variant="outlined"
                sx={{
                  ml: "auto",
                  fontSize: 12,
                  color: zincColors.muted,
                  borderColor: zincColors.border,
                }}
              />
            )}
          </Box>

          <Card>
            <CardContent>
              {recentItems.length === 0 ? (
                <Typography variant="body2" sx={{ color: zincColors.muted }}>
                  Recent activity will appear here once your services are
                  synced.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {recentItems.map((item, index) => {
                    const meta = ACTIVITY_TYPE_META[item.type];
                    return (
                      <Box
                        component={Link}
                        to={item.href}
                        key={`${item.type}-${item.title}-${index}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          py: 1.5,
                          borderBottom:
                            index < recentItems.length - 1
                              ? "1px solid " + zincColors.border
                              : "none",
                          textDecoration: "none",
                          color: "inherit",
                          "&:hover": {
                            bgcolor: "rgba(255, 255, 255, 0.03)",
                            borderRadius: 1,
                          },
                          "&:focus-visible": {
                            outline: "2px solid #00a8cc",
                            outlineOffset: 2,
                          },
                        }}
                      >
                        <Chip
                          label={meta.label}
                          size="small"
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: alpha(meta.color, 0.15),
                            color: meta.color,
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
                          {formatActivityWhen(item.occurredAt)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </AppShell>
  );
}

export default LandingPage;
