import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import AnalyticsPage from "../pages/analytics/AnalyticsPage";
import { mockAuthenticatedFetch } from "./setup";

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/analytics"]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AnalyticsPage />
      </ThemeProvider>
    </MemoryRouter>,
  );

const healthyPayload = {
  comprehensive_stats: {
    period: { start_date: "2026-08-11", end_date: "2026-09-09", days: 30 },
    totals: {
      total_games_played: 12,
      total_achievements_earned: 340,
      total_gaming_time: "2 days, 3 hours",
      total_songs_listened: 900,
      total_listening_time: "1 day",
      total_movies_watched: 4,
      total_episodes_watched: 22,
      total_watch_time: "11 hours",
      total_engagement_time: "3 days",
    },
    platform_distribution: {
      steam: { games: 10, achievements: 200, playtime: "1 day" },
    },
    weekly_trend: [
      { date: "2026-09-08", day_name: "Tue", gaming_time_hours: 2, music_time_hours: 1, tv_time_hours: 0.5 },
    ],
  },
};

describe("AnalyticsPage (audit #2)", () => {
  it("shows 'Date unavailable' instead of 'Invalid Date' when comprehensive_stats failed", async () => {
    mockAuthenticatedFetch({
      "/analytics/": {
        comprehensive_stats: {},
        partial_failures: {
          comprehensive_stats:
            "type object 'AnalyticsService' has no attribute '_unique_game_count'",
        },
        weekly_trend: [
          { date: "2026-09-08", day_name: "Tue", gaming_time_hours: 2 },
        ],
        platform_distribution: {
          steam: { games: 10, achievements: 200, playtime: "1 day" },
        },
      },
    });

    renderPage();

    expect(await screen.findByText("Date unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it("disables Export with an explanatory tooltip while data is partial", async () => {
    mockAuthenticatedFetch({
      "/analytics/": {
        comprehensive_stats: {},
        partial_failures: { comprehensive_stats: "boom" },
      },
    });

    renderPage();

    const exportButton = await screen.findByRole("button", { name: /export/i });
    await waitFor(() => expect(exportButton).toBeDisabled());
  });

  it("renders the validated date range and enables Export on a healthy payload", async () => {
    mockAuthenticatedFetch({ "/analytics/": healthyPayload });

    renderPage();

    // Date-only ISO inputs parse as UTC midnight; the rendered label follows
    // the machine's local zone, so assert the MM/DD/YYYY range shape, not the
    // exact calendar day.
    expect(
      await screen.findByText(/\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4}/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Date unavailable")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeEnabled();
  });
});
