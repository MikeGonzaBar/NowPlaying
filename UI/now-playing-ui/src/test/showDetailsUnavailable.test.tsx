import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import ShowDetails from "../pages/movies/pages/showDetails";
import { mockAuthenticatedFetch } from "./setup";

const season = {
  id: 1,
  season_number: 1,
  show__id: 1,
  show__title: "Test Show",
  show__trakt_id: "42",
};

const watchedEpisode = {
  id: 10,
  episode_number: 1,
  title: "Pilot",
  image_url: null,
  rating: 8,
  overview: null,
  season__id: 1,
  season__season_number: 1,
  show__id: 1,
  show__title: "Test Show",
  show__trakt_id: "42",
  last_watched_at: "2026-08-01T00:00:00Z",
  progress: 100,
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/shows/42"]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/shows/:id" element={<ShowDetails />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("ShowDetails unavailable statistics", () => {
  it("never reports Not Started or zero progress when the stats request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let fail = true;
    mockAuthenticatedFetch({
      "/trakt/get-watched-seasons-episodes/": () =>
        fail
          ? { __status: 500, error: "Trakt token expired" }
          : {
              seasons: [season],
              episodes: [watchedEpisode],
              show_metadata: { status: "ended", rating: 8.5 },
            },
    });

    renderPage();

    expect(
      await screen.findByText(/show statistics unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Episode progress unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Not started")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/0 of 0 Episodes Watched/i),
    ).not.toBeInTheDocument();

    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/show statistics unavailable/i),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 of 1 Episodes Watched/i)).toBeInTheDocument();
  });

  it("treats a degraded database-only response as unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuthenticatedFetch({
      "/trakt/get-watched-seasons-episodes/": {
        seasons: [],
        episodes: [],
        show_metadata: {},
        stats_unavailable: true,
        warning: "Live Trakt data is unavailable.",
      },
    });

    renderPage();

    expect(
      await screen.findByText(/live trakt data is unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Not started")).not.toBeInTheDocument();
  });
});
