import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import LandingPage from "../pages/LandingPage";
import { mockAuthenticatedFetch } from "./setup";
import { expectNoA11yViolations } from "./a11y";

/**
 * Dashboard page contract (audit #1, #3, #6, #7): every activity row is a link
 * to its detail page, the feed is ordered newest-first across pillars, section
 * headings do not skip levels, and a skip link targets the main region.
 */
const feed = {
  activities: [
    {
      type: "game",
      title: "Elden Ring",
      detail: "Steam",
      occurred_at: "2026-09-28T08:00:00Z",
    },
    {
      type: "music",
      title: "Some Track",
      detail: "Artist",
      track_mbid: "mbid-1",
      occurred_at: "2026-09-20T08:00:00Z",
    },
    {
      type: "movie",
      title: "Inception",
      detail: "Movie",
      tmdb_id: "27205",
      occurred_at: "2025-04-01T08:00:00Z",
    },
  ],
};

const routes = {
  "/users/api-keys/": {
    results: [
      {
        id: 1,
        service_name: "steam",
        service_user_id: "7656119",
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
  },
  "/trakt/auth-status/": { authenticated: true, token_expired: false },
  "/analytics/recent-activity/": feed,
};

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LandingPage />
      </ThemeProvider>
    </MemoryRouter>,
  );

const rowTitles = () =>
  screen
    .getAllByRole("link")
    .map((link) => link.textContent ?? "")
    .flatMap((text) => {
      const match = text.match(/Elden Ring|Some Track|Inception/);
      return match ? [match[0]] : [];
    });

describe("dashboard page (audit #1/#3/#6/#7)", () => {
  it("links every activity row, including movies and games", async () => {
    mockAuthenticatedFetch(routes);
    renderDashboard();

    expect(
      await screen.findByRole("link", { name: /Inception/ }),
    ).toHaveAttribute("href", "/movies/27205");
    expect(screen.getByRole("link", { name: /Elden Ring/ })).toHaveAttribute(
      "href",
      "/games/title/Elden%20Ring",
    );
    expect(screen.getByRole("link", { name: /Some Track/ })).toHaveAttribute(
      "href",
      "/music/tracks/Some%20Track?recording_id=mbid-1",
    );
  });

  it("lists the newest activity first across media types", async () => {
    mockAuthenticatedFetch(routes);
    renderDashboard();

    await screen.findByRole("link", { name: /Inception/ });
    expect(rowTitles()).toEqual(["Elden Ring", "Some Track", "Inception"]);
  });

  it("does not skip heading levels", async () => {
    mockAuthenticatedFetch(routes);
    renderDashboard();

    await screen.findByText(/Everything you have been playing/);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent(
      /recent activity/i,
    );
    expect(screen.queryAllByRole("heading", { level: 6 })).toHaveLength(0);
  });

  it("offers a skip link whose target exists", async () => {
    mockAuthenticatedFetch(routes);
    const rendered = renderDashboard();

    await screen.findByText(/Everything you have been playing/);
    expect(
      screen.getByRole("link", { name: /skip to main content/i }),
    ).toHaveAttribute("href", "#main");
    expect(rendered.container.querySelector("#main")).not.toBeNull();
  });

  it("has no serious/critical axe violations", async () => {
    mockAuthenticatedFetch(routes);
    const rendered = renderDashboard();

    await screen.findByText(/Everything you have been playing/);
    const main = rendered.container.querySelector("main") ?? rendered.container;
    await expectNoA11yViolations({ container: main } as never, {
      impactThreshold: "serious",
    });
  });
});
