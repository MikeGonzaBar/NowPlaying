import React from "react";
import { Box, Typography, Card } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import ExploreIcon from "@mui/icons-material/Explore";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const MUSIC_TEAL = "#40b3a2";
const MUSIC_BLUE = "#3b82f6";
const CARD_DARK = "#18181b";
const BORDER_SLATE = "#27272a";
const TEXT_WHITE = "#fff";
const TEXT_DARK = "#212121";
const TEXT_SECONDARY = "#71717a";
// Dark text for contrast on colored backgrounds
const TEXT_ON_TEAL = "#064e3b";
const TEXT_ON_BLUE = "#1e3a5f";

interface MusicStatsProps {
  data: any;
}

const getOptimalChartHeight = (genreCount: number) => {
  // Base height + 20px per genre, max 300px
  const baseHeight = 160;
  const genreHeight = Math.min(20, Math.max(16, Math.floor(genreCount / 2) * 12));
  return Math.min(baseHeight + genreHeight * genreCount, 300);
};

const getGenreColor = (index: number) => {
  const colors = [MUSIC_TEAL, MUSIC_BLUE, "#94a3b8", "#475569"];
  return colors[index % colors.length];
};

const MusicStats: React.FC<MusicStatsProps> = ({ data }) => {
  const {
    comprehensive_stats,
    last_played_time,
    top_artist,
    top_track,
    new_discoveries,
    music_listening_insights,
    music_genre_distribution,
    music_weekly_scrobbles,
    genre_of_the_week,
  } = data;

  const totalSongs = comprehensive_stats?.totals?.total_songs_listened ?? 0;
  const totalListeningTime =
    comprehensive_stats?.totals?.total_listening_time ?? "0 minutes";
  const avgPerDay =
    comprehensive_stats?.averages?.avg_listening_time_per_day ?? "0 minutes";

  const scrobblesPerDay = music_weekly_scrobbles?.length
    ? music_weekly_scrobbles
    : (comprehensive_stats?.daily_stats?.slice(-7) || []).map((d: any) => ({
        day_name: new Date(d.date)
          .toLocaleDateString("en-US", { weekday: "short" })
          .replace(/^(\w)/, (m: string) => m.toUpperCase()),
        scrobbles: d.songs_listened ?? 0,
      }));
  const maxScrobbles = Math.max(
    ...scrobblesPerDay.map((d: any) => d.scrobbles || 0),
    1,
  );

  const genres = music_genre_distribution?.genres ?? [];
  const genreCount = music_genre_distribution?.total_count ?? genres.length;

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
            bgcolor: MUSIC_TEAL,
            p: 3,
            borderRadius: "1rem",
            position: "relative",
            overflow: "hidden",
            boxShadow: 2,
          }}
        >
          <PersonIcon
            sx={{
              position: "absolute",
              right: -16,
              bottom: -16,
              fontSize: "4rem",
              opacity: 0.15,
              color: TEXT_ON_TEAL,
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <PersonIcon sx={{ fontSize: "1.125rem", color: TEXT_ON_TEAL }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: TEXT_ON_TEAL,
              }}
            >
              Top Artist
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: "1.875rem",
              fontWeight: 700,
              mb: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: TEXT_ON_TEAL,
            }}
          >
            {top_artist?.name ?? "—"}
          </Typography>
          <Typography
            sx={{
              color: TEXT_ON_TEAL,
              fontSize: "0.875rem",
              mb: 2,
            }}
          >
            {top_artist
              ? `${top_artist.scrobbles.toLocaleString()} scrobbles`
              : "No data"}
          </Typography>
          <Typography
            sx={{ fontSize: "0.75rem", color: TEXT_ON_TEAL }}
          >
            {top_artist?.top_album ? `Top album: ${top_artist.top_album}` : "—"}
          </Typography>
        </Card>

        {/* Top Track - dark card */}
        <Card
          sx={{
            bgcolor: "#1e293b",
            border: `1px solid ${BORDER_SLATE}`,
            p: 3,
            borderRadius: "1rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <MusicNoteIcon
            sx={{
              position: "absolute",
              right: -16,
              bottom: -16,
              fontSize: "4rem",
              opacity: 0.1,
              color: MUSIC_TEAL,
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              color: MUSIC_TEAL,
            }}
          >
            <MusicNoteIcon sx={{ fontSize: "1.125rem" }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Top Track
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: "1.875rem",
              fontWeight: 700,
              mb: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "#fff",
            }}
          >
            {top_track?.title ?? "—"}
          </Typography>
          <Typography
            sx={{ color: TEXT_WHITE, fontSize: "0.875rem", mb: 2 }}
          >
            {top_track ? `${top_track.plays} plays` : "No data"}
          </Typography>
          <Typography
            sx={{ fontSize: "0.75rem", color: TEXT_WHITE }}
          >
            {top_track?.recently_played
              ? `Recently played: ${top_track.recently_played}`
              : last_played_time
                ? `Last: ${last_played_time}`
                : "—"}
          </Typography>
        </Card>

        {/* New Discoveries - dark card */}
        <Card
          sx={{
            bgcolor: "#1e293b",
            border: `1px solid ${BORDER_SLATE}`,
            p: 3,
            borderRadius: "1rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ExploreIcon
            sx={{
              position: "absolute",
              right: -16,
              bottom: -16,
              fontSize: "4rem",
              opacity: 0.1,
              color: MUSIC_BLUE,
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              color: "#60a5fa",
            }}
          >
            <ExploreIcon sx={{ fontSize: "1.125rem" }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              New Discoveries
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: "2.25rem",
              fontWeight: 700,
              mb: 0.5,
              color: "#fff",
            }}
          >
            {new_discoveries?.new_artists_count ?? 0}
          </Typography>
          <Typography
            sx={{ color: TEXT_WHITE, fontSize: "0.875rem", mb: 2 }}
          >
            New Artists Found
          </Typography>
          <Typography
            sx={{ fontSize: "0.75rem", color: TEXT_WHITE }}
          >
            {new_discoveries?.change_percentage != null
              ? `${new_discoveries.change_percentage >= 0 ? "+" : ""}${new_discoveries.change_percentage}% from last period`
              : "—"}
          </Typography>
        </Card>

        {/* Total Listening Time - gradient: dark text for contrast on teal-to-blue gradient */}
        <Card
          sx={{
            background: `linear-gradient(135deg, ${MUSIC_TEAL}, ${MUSIC_BLUE})`,
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
              opacity: 0.15,
              color: TEXT_ON_TEAL,
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <ScheduleIcon sx={{ fontSize: "1.125rem", color: TEXT_ON_TEAL }} />
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: TEXT_ON_TEAL,
              }}
            >
              Total Listening Time
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: "1.875rem",
              fontWeight: 700,
              mb: 0.5,
              lineHeight: 1.2,
              color: TEXT_ON_TEAL,
            }}
          >
            {totalListeningTime}
          </Typography>
          <Typography
            sx={{
              color: TEXT_ON_TEAL,
              fontSize: "0.875rem",
              mb: 2,
            }}
          >
            {totalSongs.toLocaleString()} scrobbles total
          </Typography>
          <Typography
            sx={{ fontSize: "0.75rem", color: TEXT_ON_TEAL }}
          >
            Avg. {avgPerDay} per day
          </Typography>
          <Typography
            sx={{ fontSize: "0.7rem", color: TEXT_ON_TEAL, mt: 0.5, lineHeight: 1.4 }}
          >
            * Estimated listening time: recorded track durations where available,
            otherwise ~3.5 minutes per scrobble.
          </Typography>
        </Card>
      </Box>

      {/* Scrobbles per day + Music Genres */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 4,
          mb: 4,
        }}
      >
        {/* Scrobbles per Day */}
        <Card
          sx={{
            bgcolor: CARD_DARK,
            border: `1px solid ${BORDER_SLATE}`,
            p: 3,
            borderRadius: "1rem",
            overflow: "hidden",
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
                sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#fff" }}
              >
                Scrobbles per Day
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Listening volume vs average duration
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                fontSize: "0.75rem",
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 4,
                    borderRadius: 1,
                    bgcolor: MUSIC_TEAL,
                  }}
                />
                <Typography component="span" sx={{ color: "#94a3b8" }}>
                  Scrobbles
                </Typography>
              </Box>
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
            {scrobblesPerDay.map((day: any, i: number) => {
              const scrobbles = day.scrobbles ?? 0;
              const pct = maxScrobbles > 0 ? scrobbles / maxScrobbles : 0;
              const barHeightPx = Math.max(pct * 200, scrobbles > 0 ? 12 : 8);
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
                      bgcolor: MUSIC_TEAL,
                      borderRadius: "4px 4px 0 0",
                      opacity: scrobbles > 0 ? 0.85 : 0.35,
                      transition: "opacity 0.2s",
                      "&:hover": { opacity: 1 },
                    }}
                    title={`${scrobbles} scrobbles`}
                  />
                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: "12px",
                      color: "#94a3b8",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      flexShrink: 0,
                    }}
                  >
                    {day.day_name ?? day.dayName ?? "—"}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Card>

        {/* Music Genres */}
        <Card
          sx={{
            bgcolor: CARD_DARK,
            border: `1px solid ${BORDER_SLATE}`,
            p: 3,
            borderRadius: "1rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#fff", mb: 3 }}
          >
            Music Genres
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
                border: "18px solid rgba(39,39,42,0.5)",
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
                    inset: 0,
                    borderRadius: "50%",
                    border: "18px solid transparent",
                    borderTopColor: MUSIC_TEAL,
                    borderRightColor: MUSIC_TEAL,
                    transform: "rotate(-45deg)",
                    opacity: 0.5,
                  }}
                />
              )}
              <Typography
                sx={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}
              >
                {genreCount}
              </Typography>
              <Typography
                sx={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  fontWeight: 600,
                  textTransform: "uppercase",
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
              {genres.slice(0, 4).map((g: any, i: number) => (
                <Box
                  key={i}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: getGenreColor(i),
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
                lineHeight: 1.5,
              }}
            >
              No genre data yet. Connect Last.fm or add genre tags to see
              distribution.
            </Typography>
          )}
        </Card>
      </Box>

      {/* Quick Insights */}
      <Box>
        <Typography
          sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", mb: 2 }}
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
              bgcolor: CARD_DARK,
              border: `1px solid ${BORDER_SLATE}`,
              p: 2.5,
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              "&:hover": { borderColor: `${MUSIC_TEAL}80` },
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
              <DarkModeIcon />
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
                Morning vs. Evening
              </Typography>
              <Typography sx={{ fontWeight: 600, color: "#e2e8f0" }}>
                {music_listening_insights?.morning_vs_evening ?? "—"}
                {music_listening_insights?.evening_percentage != null &&
                  ` (${music_listening_insights.evening_percentage}%)`}
              </Typography>
            </Box>
          </Card>

          <Card
            sx={{
              bgcolor: CARD_DARK,
              border: `1px solid ${BORDER_SLATE}`,
              p: 2.5,
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              "&:hover": { borderColor: `${MUSIC_TEAL}80` },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "0.5rem",
                bgcolor: `${MUSIC_TEAL}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: MUSIC_TEAL,
              }}
            >
              <TrendingUpIcon />
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
                Genre of the Week
              </Typography>
              <Typography sx={{ fontWeight: 600, color: "#e2e8f0" }}>
                {genre_of_the_week?.name ?? "—"}
                {genre_of_the_week?.percentage != null &&
                  ` (${genre_of_the_week.percentage}%)`}
              </Typography>
            </Box>
          </Card>

          <Card
            sx={{
              bgcolor: CARD_DARK,
              border: `1px solid ${BORDER_SLATE}`,
              p: 2.5,
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              "&:hover": { borderColor: `${MUSIC_TEAL}80` },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "0.5rem",
                bgcolor: "rgba(239,68,68,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f43f5e",
              }}
            >
              <MilitaryTechIcon />
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
                Top Listening Source
              </Typography>
              <Typography sx={{ fontWeight: 600, color: "#e2e8f0" }}>
                {music_listening_insights?.top_source ?? "—"}
              </Typography>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default MusicStats;