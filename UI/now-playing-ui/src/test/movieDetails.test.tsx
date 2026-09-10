import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import MovieDetails from "../pages/movies/pages/movieDetails";
import { mockAuthenticatedFetch } from "./setup";

const renderPage = (tmdbId = "423108") =>
  render(
    <MemoryRouter initialEntries={[`/movies/${tmdbId}`]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/movies/:id" element={<MovieDetails />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );

const detailPayload = {
  result: {
    plays: 3,
    last_watched_at: "2026-08-01T00:00:00Z",
    movie: {
      title: "Test Movie",
      year: 2026,
      ids: { trakt: 268642, tmdb: 423108 },
    },
  },
};

const tmdbPayload = {
  title: "Test Movie",
  release_date: "2026-01-01",
  runtime: 120,
  genres: [],
};

describe("MovieDetails Trakt stats section (audit #6)", () => {
  it("issues exactly one movie-stats request per load and renders values", async () => {
    const api = mockAuthenticatedFetch({
      "/trakt/detail/": { result: detailPayload.result },
      "/trakt/tmdb-detail/": tmdbPayload,
      "/trakt/tmdb-watch-providers/": { results: {} },
      "/trakt/auth-status/": { authenticated: true },
      "/trakt/movie-stats/": { watchers: 1200, plays: 3400, collectors: 800 },
    });

    renderPage();

    expect(await screen.findByText("3,400")).toBeInTheDocument();
    expect(api.urlsMatching("movie-stats")).toHaveLength(1);
    expect(api.urlsMatching("/trakt/detail/")).toHaveLength(1);
  });

  it("renders 'Stats temporarily unavailable' with Retry on a 503, and recovers on retry", async () => {
    let fail = true;
    const api = mockAuthenticatedFetch({
      "/trakt/detail/": { result: detailPayload.result },
      "/trakt/tmdb-detail/": tmdbPayload,
      "/trakt/tmdb-watch-providers/": { results: {} },
      "/trakt/auth-status/": { authenticated: true },
      "/trakt/movie-stats/": () =>
        fail
          ? { __status: 503, error: "temporarily unavailable" }
          : { watchers: 1, plays: 2, collectors: 3 },
    });

    renderPage();

    expect(
      await screen.findByText("Stats temporarily unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();

    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.queryByText("Stats temporarily unavailable")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });
    expect(api.urlsMatching("movie-stats")).toHaveLength(2);
  });

  it("renders N/A (not an error) when stats are confirmed absent (404)", async () => {
    mockAuthenticatedFetch({
      "/trakt/detail/": { result: detailPayload.result },
      "/trakt/tmdb-detail/": tmdbPayload,
      "/trakt/tmdb-watch-providers/": { results: {} },
      "/trakt/auth-status/": { authenticated: true },
      "/trakt/movie-stats/": { error: "Movie not found on Trakt.", __status: 404 },
    });

    renderPage();

    await waitFor(async () => {
      expect(await screen.findAllByText("N/A").then((els) => els.length)).toBeGreaterThanOrEqual(3);
    });
    expect(screen.queryByText("Stats temporarily unavailable")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });
});
