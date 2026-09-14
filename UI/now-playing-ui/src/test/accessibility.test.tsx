import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import AnalyticsPage from "../pages/analytics/AnalyticsPage";
import MusicDashboard from "../pages/music/pages/musicDashboard";
import { mockAuthenticatedFetch } from "./setup";
import { expectNoA11yViolations } from "./a11y";

const healthyAnalytics = {
  comprehensive_stats: {
    period: { start_date: "2026-08-11", end_date: "2026-09-09", days: 30 },
    totals: {
      total_games_played: 1,
      total_achievements_earned: 1,
      total_gaming_time: "1 hour",
      total_songs_listened: 1,
      total_listening_time: "1 hour",
      total_movies_watched: 1,
      total_episodes_watched: 1,
      total_watch_time: "1 hour",
      total_engagement_time: "2 hours",
    },
  },
  weekly_trend: [{ date: "2026-09-08", day_name: "Tue", gaming_time_hours: 1 }],
  platform_distribution: { steam: { games: 1, achievements: 1, playtime: "1 hour" } },
};

describe("accessibility (audit #9)", () => {
  it("Analytics page exposes exactly one H1 (page title)", async () => {
    mockAuthenticatedFetch({ "/analytics/": healthyAnalytics });

    render(
      <MemoryRouter initialEntries={["/analytics"]}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AnalyticsPage />
        </ThemeProvider>
      </MemoryRouter>,
    );

    await screen.findByText(/entertainment statistics/);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
  });

  it("Music dashboard has three distinctly-named See-all buttons", async () => {
    mockAuthenticatedFetch({
      "/music/dashboard-stats/": {
        user_info: { username: "tester", avatar: null, location: null, member_since: null },
        top_artists: [],
        top_albums: [],
        top_tracks: [],
        recent_scrobbles: [],
        recent_activity: [],
        milestones: [],
        loved_highlight: null,
        scope: { days: 30, label: "Last 30 days" },
        total_scrobbles: 0,
        unique_artists: 0,
        unique_tracks: 0,
        unique_albums: 0,
        artist_count: 0,
        track_count: 0,
        album_count: 0,
        listening_time: "0 minutes",
        avg_per_day: 0,
        discovery_count: 0,
        top_genres: [],
        hourly_distribution: [],
        weekly_trend: [],
        listening_trends: { daily_data: [], average_per_day: 0 },
      },
    });

    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MusicDashboard />
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: /see all artists/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /see all albums/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /see all tracks/i }),
    ).toBeInTheDocument();
  });

  it("Analytics page has no serious/critical axe violations in page content", async () => {
    mockAuthenticatedFetch({ "/analytics/": healthyAnalytics });

    const rendered = render(
      <MemoryRouter initialEntries={["/analytics"]}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Routes>
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await screen.findByText(/entertainment statistics/);
    const main = rendered.container.querySelector("main") ?? rendered.container;
    await expectNoA11yViolations(
      { container: main } as never,
      { impactThreshold: "serious" },
    );
  });
});
