import React from "react";
import { Box, Typography, Card } from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import BoltIcon from "@mui/icons-material/Bolt";
import PersonIcon from "@mui/icons-material/Person";
import CastIcon from "@mui/icons-material/Cast";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const TRAKT_RED = "#ed1c24";
const SILVER_LIGHT = "#f1f5f9";
const CARD_BG = "#18181b";
const BORDER_SLATE = "#27272a";
const TEXT_WHITE = "#fff";
const TEXT_DARK = "#212121";
const TEXT_SECONDARY = "#71717a";
// Dark text for contrast on colored backgrounds
const TEXT_ON_RED = "#7f1d1d";
const TEXT_ON_SILVER = "#1e293b";

interface MediaStatsProps {
  data: any;
}

const getOptimalChartHeight = (genreCount: number) => {
  // Base height + 20px per genre, max 300px
  const baseHeight = 160;
  const genreHeight = Math.min(20, Math.max(16, Math.floor(genreCount / 2) * 12));
  return Math.min(baseHeight + genreHeight * genreCount, 300);
};

const getGenreColor = (index: number) => {
  const colors = [TRAKT_RED, "#cbd5e1", "#64748b", "#475569"];
  return colors[index % colors.length];
};

const MediaStats: React.FC<MediaStatsProps> = ({ data }) => {
  const {
    comprehensive_stats,
    media_movies_change,
    media_weekly_watch,
    media_watch_breakdown,
    media_series_count,
    media_genre_distribution,
    media_completion_rate,
    media_insights,
  } = data;

  const moviesWatched = comprehensive_stats?.totals?.total_movies_watched ?? 0;
  const episodesWatched =
    comprehensive_stats?.totals?.total_episodes_watched ?? 0;
  const totalWatchTime =
    comprehensive_stats?.totals?.total_watch_time ?? "0 minutes";
  const periodDays = comprehensive_stats?.period?.days ?? 30;
  const moviesChange = media_movies_change?.change ?? 0;
  const seriesCount = media_series_count ?? 0;
  const breakdown = media_watch_breakdown ?? {
    movies_percentage: 0,
    tv_percentage: 0,
  };
  const completionRate =
    typeof media_completion_rate === "number" ? media_completion_rate : null;
  const genres = media_genre_distribution?.genres ?? [];
  const genreCount = media_genre_distribution?.total_count ?? genres.length;
  const insights = media_insights ?? {
    binge_streak: null,
    favorite_director: null,
    top_studio: null,
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const dailyWatch = media_weekly_watch?.length
    ? media_weekly_watch
    : (comprehensive_stats?.daily_stats?.slice(-7) || []).map((d: any) => ({
      day_name: dayLabels[new Date(d.date).getDay()] ?? "—",
      watch_time_hours:
        (d.movies_watched ?? 0) * 2 + (d.episodes_watched ?? 0) * (45 / 60),
    }));
  const maxWatchHours = Math.max(
    ...dailyWatch.map((d: any) => d.watch_time_hours ?? 0),
    0.1,
  );
  const hasViewingData = moviesWatched > 0 || episodesWatched > 0 ||
    dailyWatch.some((day: any) => Number(day.watch_time_hours ?? 0) > 0);

  return (
    <Box sx={{ fontFamily: "'Inter', sans-serif", color: "#e2e8f0" }}>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 4,
        }}
      >

        <Card
          sx={{
            bgcolor: SILVER_LIGHT,
            color: TEXT_DARK,
            p: 3,
            borderRadius: "1rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: 2,
          }}
        >
          <MovieIcon
            sx={{
              position: "absolute",
              right: -16,
              bottom: -16,
              fontSize: "4rem",
              opacity: 0.1,
              color: "#94a3b8",
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              color: "#475569",
            }}
          >
            <MovieIcon sx={{ fontSize: "1.125rem" }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Movies Watched
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: "2.25rem",
              fontWeight: 700,
              mb: 0.5,
              color: TEXT_DARK,
            }}
          >
            {moviesWatched}
          </Typography>
          <Typography sx={{ color: "#475569", fontSize: "0.875rem", mb: 2 }}>
            {moviesChange >= 0 ? `+${moviesChange}` : moviesChange} from last
            period
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Re-watched / Premieres not tracked yet
            </Typography>
          </Box>
        </Card>

        {/* Episodes Scrobbled - Trakt red with dark text for contrast */}
        <Card
          sx={{
            bgcolor: TRAKT_RED,
            p: 3,
            borderRadius: "1rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: 2,
          }}
        >
          <LiveTvIcon
            sx={{
              position: "absolute",
              right: -16,
              bottom: -16,
              fontSize: "4rem",
              opacity: 0.1,
              color: TEXT_ON_RED,
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <LiveTvIcon sx={{ fontSize: "1.125rem", color: TEXT_ON_RED }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: TEXT_ON_RED,
              }}
            >
              Episodes Scrobbled
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: "2.25rem",
              fontWeight: 700,
              mb: 0.5,
              color: TEXT_ON_RED,
            }}
          >
            {episodesWatched}
          </Typography>
          <Typography
            sx={{ color: TEXT_ON_RED, fontSize: "0.875rem", mb: 2 }}
          >
            Avg. {(episodesWatched / periodDays).toFixed(1)} per day
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography
              sx={{ fontSize: "0.75rem", color: TEXT_ON_RED }}
            >
              {seriesCount} series in period
            </Typography>
            <Typography
              sx={{ fontSize: "0.75rem", color: TEXT_ON_RED }}
            >
              Trakt data
            </Typography>
          </Box>
        </Card>

        {/* Time Spent Watching - dark card */}
        <Card
          sx={{
            bgcolor: CARD_BG,
            border: `1px solid ${BORDER_SLATE}`,
            p: 3,
            borderRadius: "1rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ScheduleIcon
            sx={{
              position: "absolute",
              right: -16,
              bottom: -16,
              fontSize: "4rem",
              opacity: 0.05,
              color: "#94a3b8",
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              color: "#94a3b8",
            }}
          >
            <ScheduleIcon sx={{ fontSize: "1.125rem" }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Time Spent Watching
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: "2.25rem",
              fontWeight: 700,
              mb: 0.5,
              color: SILVER_LIGHT,
            }}
          >
            {totalWatchTime}
          </Typography>
          <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem", mb: 2 }}>
            Total screen time
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {breakdown.tv_percentage}% TV Series
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {breakdown.movies_percentage}% Feature Films
            </Typography>
          </Box>
        </Card>

        {/* Completion Progress - dark card */}
        <Card
          sx={{
            bgcolor: CARD_BG,
            border: `1px solid ${BORDER_SLATE}`,
            p: 3,
            borderRadius: "1rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <DonutLargeIcon
            sx={{
              position: "absolute",
              right: -16,
              bottom: -16,
              fontSize: "4rem",
              opacity: 0.05,
              color: TRAKT_RED,
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              color: "#94a3b8",
            }}
          >
            <DonutLargeIcon sx={{ fontSize: "1.125rem", color: TRAKT_RED }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Completion Progress
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: "2.25rem",
              fontWeight: 700,
              mb: 0.5,
              color: SILVER_LIGHT,
            }}
          >
            {typeof completionRate === "number" ? `${completionRate}%` : "—"}
          </Typography>
          <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem", mb: 2 }}>
            Started series finished
          </Typography>
          {typeof completionRate === "number" && (
            <Box
              sx={{
                width: "100%",
                bgcolor: BORDER_SLATE,
                height: 6,
                borderRadius: 999,
                overflow: "hidden",
                mt: 1,
              }}
            >
              <Box
                sx={{
                  bgcolor: TRAKT_RED,
                  height: "100%",
                  width: `${Math.min(completionRate, 100)}%`,
                  borderRadius: 999,
                }}
              />
            </Box>
          )}
        </Card>
      </Box>

      {/* Daily Watch Time + Recurring Genres */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 4,
          mb: 4,
        }}
      >
        <Card
          sx={{
            bgcolor: CARD_BG,
            border: `1px solid ${BORDER_SLATE}`,
            p: 3,
            borderRadius: "1rem",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 3,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: SILVER_LIGHT,
                }}
              >
                Daily Watch Time
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                {hasViewingData ? "Peak viewing on Weekends" : "No viewing pattern yet"}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: TRAKT_RED,
                }}
              />
              <Typography component="span" sx={{ color: "#94a3b8" }}>
                Watch Time (Hrs)
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              height: 256,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 1,
              px: 1,
            }}
          >
            {dailyWatch.map((day: any, i: number) => {
              const hours = day.watch_time_hours ?? 0;
              const pct = maxWatchHours > 0 ? hours / maxWatchHours : 0;
              const barHeightPx = Math.max(pct * 200, hours > 0 ? 12 : 8);
              const isWeekend = day.day_name === "S";
              return (
                <Box
                  key={i}
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: barHeightPx,
                      bgcolor: isWeekend ? TRAKT_RED : "#475569",
                      borderRadius: "4px 4px 0 0",
                      opacity: hours > 0 ? 0.9 : 0.5,
                      "&:hover": { opacity: 1 },
                      boxShadow:
                        isWeekend && hours > 0
                          ? `0 0 15px ${TRAKT_RED}4D`
                          : "none",
                    }}
                    title={`${hours.toFixed(1)} hrs`}
                  />
                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: "12px",
                      color: isWeekend ? TRAKT_RED : "#64748b",
                      fontWeight: isWeekend ? 700 : 500,
                    }}
                  >
                    {day.day_name ?? "—"}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Card>

        {/* Recurring Genres */}
        <Card
          sx={{
            bgcolor: CARD_BG,
            border: `1px solid ${BORDER_SLATE}`,
            p: 3,
            borderRadius: "1rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: SILVER_LIGHT,
              mb: 3,
            }}
          >
            Recurring Genres
          </Typography>
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 2,
            }}
          >
            <Box
              sx={{
                width: 176,
                height: 176,
                borderRadius: "50%",
                border: "12px solid rgba(39,39,42,0.8)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {genres.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={getOptimalChartHeight(genres.length)}>
                    <PieChart>
                      <Pie
                        data={genres}
                        dataKey="percentage"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={80}
                        paddingAngle={1}
                        label={({ name, percent }) => (
                          <text
                            x={0}
                            y={0}
                            fill="#e2e8f0"
                            fontSize="11"
                            fontWeight={500}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {name}
                          </text>
                        )}
                      >
                        {genres.map((_: any, idx: number) => (
                          <Cell key={idx} fill={getGenreColor(idx)} stroke="#18181b" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0.5rem', color: '#e2e8f0' }}
                        formatter={(value: number | undefined, name?: string) => [`${value ?? 0}%`, name ?? '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <Box
                  sx={{
                    position: "absolute",
                    inset: -12,
                    borderRadius: "50%",
                    border: "12px solid transparent",
                    borderTopColor: TRAKT_RED,
                    borderRightColor: TRAKT_RED,
                    transform: "rotate(-45deg)",
                    opacity: 0.5,
                  }}
                />
              )}
              <Typography
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: SILVER_LIGHT,
                }}
              >
                {genreCount}
              </Typography>
              <Typography
                sx={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Genres
              </Typography>
            </Box>
          </Box>
          {genres.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.5,
                mt: 3,
              }}
            >
              {genres.slice(0, 4).map((g: any, idx: number) => (
                <Box
                  key={idx}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: getGenreColor(idx),
                    }}
                  />
                  <Typography
                    sx={{ fontSize: "12px", fontWeight: 500, color: "#cbd5e1" }}
                  >
                    {g.name} ({g.percentage}%)
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography
              sx={{
                fontSize: "12px",
                color: "#94a3b8",
                mt: 2,
                textAlign: "center",
              }}
            >
              Genre data not available from Trakt yet.
            </Typography>
          )}
        </Card>
      </Box>

      {/* Quick Insights */}
      <Box>
        <Typography
          sx={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: SILVER_LIGHT,
            mb: 2,
          }}
        >
          Quick Insights
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          <Card
            sx={{
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_SLATE}`,
              p: 2.5,
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              "&:hover": { borderColor: `${TRAKT_RED}80` },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "0.5rem",
                bgcolor: `${TRAKT_RED}1A`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TRAKT_RED,
              }}
            >
              <BoltIcon />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Binge Streak
              </Typography>
              <Typography sx={{ fontWeight: 600, color: SILVER_LIGHT }}>
                {insights.binge_streak ?? "—"}
              </Typography>
            </Box>
          </Card>
          <Card
            sx={{
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_SLATE}`,
              p: 2.5,
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              "&:hover": { borderColor: `${TRAKT_RED}80` },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "0.5rem",
                bgcolor: "rgba(99,102,241,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818cf8",
              }}
            >
              <PersonIcon />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Favorite Director
              </Typography>
              <Typography sx={{ fontWeight: 600, color: SILVER_LIGHT }}>
                {insights.favorite_director ?? "—"}
              </Typography>
            </Box>
          </Card>
          <Card
            sx={{
              bgcolor: CARD_BG,
              border: `1px solid ${BORDER_SLATE}`,
              p: 2.5,
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              "&:hover": { borderColor: `${TRAKT_RED}80` },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "0.5rem",
                bgcolor: "rgba(96,165,250,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60a5fa",
              }}
            >
              <CastIcon />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Top Studio
              </Typography>
              <Typography sx={{ fontWeight: 600, color: SILVER_LIGHT }}>
                {insights.top_studio ?? "—"}
              </Typography>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default MediaStats;