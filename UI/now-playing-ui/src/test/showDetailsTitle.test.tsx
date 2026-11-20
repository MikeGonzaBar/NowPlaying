import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import ShowDetails from "../pages/movies/pages/showDetails";
import { mockAuthenticatedFetch } from "./setup";

/**
 * A direct episode link carries no router state, so the show title has to be
 * read from the fetched season/episode rows (acceptance: no empty hero
 * heading). This also covers the degraded database-only response, which the
 * page still treats as "statistics unavailable" while keeping the title.
 */
const episode = {
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

const renderEpisodeRoute = () =>
  render(
    <MemoryRouter
      initialEntries={["/shows/42/seasons/1/episodes/1"]}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route
            path="/shows/:id/seasons/:season/episodes/:episode"
            element={<ShowDetails />}
          />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("ShowDetails heading on a direct episode link", () => {
  it("takes the show title from episode rows when seasons are empty", async () => {
    mockAuthenticatedFetch({
      "/trakt/get-watched-seasons-episodes/": {
        seasons: [],
        episodes: [episode],
        show_metadata: {},
      },
    });

    renderEpisodeRoute();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Test Show" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Pilot" }),
    ).toBeInTheDocument();
  });

  it("keeps the title when the response is degraded and stats are withheld", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuthenticatedFetch({
      "/trakt/get-watched-seasons-episodes/": {
        seasons: [],
        episodes: [episode],
        show_metadata: {},
        stats_unavailable: true,
        warning: "Live Trakt data is unavailable.",
      },
    });

    renderEpisodeRoute();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Test Show" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/live trakt data is unavailable/i),
    ).toBeInTheDocument();
  });
});
