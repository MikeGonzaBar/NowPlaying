import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import { filterBySections } from "../preferences/filterSections";
import {
  normalizePreferences,
  SECTION_KEYS,
  type SectionKey,
} from "../preferences/types";
import SideBar from "../components/sideBar";
import AnalyticsPage from "../pages/analytics/AnalyticsPage";
import { mockAuthenticatedFetch } from "./setup";

/**
 * Section visibility feature: account-level preferences must hide a pillar
 * everywhere, and the analytics tabs must stay keyed rather than positional
 * (hiding a tab used to shift indices and render the wrong component).
 */
const sectionsState = vi.hoisted(() => ({ hidden: [] as SectionKey[] }));

vi.mock("../preferences/SectionsContext", () => ({
  useSections: () => ({
    hidden: sectionsState.hidden,
    visibleCount: 3 - sectionsState.hidden.length,
    ready: true,
    error: null,
    isVisible: (section: SectionKey) => !sectionsState.hidden.includes(section),
    setSectionHidden: async () => {},
  }),
}));

const analyticsPayload = {
  comprehensive_stats: {
    period: { start_date: "2026-08-11", end_date: "2026-09-09", days: 30 },
    totals: {
      total_games_played: 12,
      total_achievements_earned: 340,
      total_gaming_time: "2 days",
      total_songs_listened: 900,
      total_listening_time: "1 day",
      total_movies_watched: 4,
      total_episodes_watched: 22,
      total_watch_time: "11 hours",
      total_engagement_time: "3 days",
    },
    platform_distribution: {},
  },
};

const renderAnalytics = () =>
  render(
    <MemoryRouter initialEntries={["/analytics"]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AnalyticsPage />
      </ThemeProvider>
    </MemoryRouter>,
  );

const renderSideBar = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SideBar activeItem="Home" />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("section preference document", () => {
  it("drops unknown sections and non-list values", () => {
    expect(normalizePreferences({ hidden_sections: ["games", "podcasts"] }))
      .toEqual({ version: 1, hidden_sections: ["games"] });
    expect(normalizePreferences({ hidden_sections: "games" })).toEqual({
      version: 1,
      hidden_sections: [],
    });
    expect(normalizePreferences(null)).toEqual({ version: 1, hidden_sections: [] });
  });

  it("never allows every section to be hidden", () => {
    expect(
      normalizePreferences({ hidden_sections: [...SECTION_KEYS] }).hidden_sections,
    ).toEqual([]);
  });

  it("filters items by section while keeping aggregate items", () => {
    const items = [
      { label: "Games", section: "games" as SectionKey },
      { label: "Music", section: "music" as SectionKey },
      { label: "Aggregate" },
    ];

    expect(
      filterBySections(items, (section) => section !== "games").map((i) => i.label),
    ).toEqual(["Music", "Aggregate"]);
  });
});

describe("navigation respects hidden sections", () => {
  it("hides a disabled section from both nav variants", () => {
    sectionsState.hidden = ["games"];
    renderSideBar();

    expect(screen.queryAllByRole("link", { name: /^Games$/ })).toHaveLength(0);
    expect(screen.getAllByRole("link", { name: /Music/ }).length).toBeGreaterThan(0);
  });

  it("shows every pillar by default", () => {
    sectionsState.hidden = [];
    renderSideBar();

    expect(screen.getAllByRole("link", { name: /^Games$/ }).length).toBeGreaterThan(0);
  });
});

describe("analytics tabs stay keyed when a section is hidden", () => {
  it("removes the hidden pillar's tab and keeps the others correct", async () => {
    sectionsState.hidden = ["games"];
    mockAuthenticatedFetch({ "/analytics/": analyticsPayload });
    renderAnalytics();

    await screen.findByRole("tab", { name: "Overview" });

    expect(screen.queryByRole("tab", { name: "Gaming" })).toBeNull();

    const musicTab = screen.getByRole("tab", { name: "Music" });
    await userEvent.click(musicTab);

    await waitFor(() => {
      expect(screen.getByText(/Top Artist/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Games Played/i)).toBeNull();
  });

  it("lists all four tabs when nothing is hidden", async () => {
    sectionsState.hidden = [];
    mockAuthenticatedFetch({ "/analytics/": analyticsPayload });
    renderAnalytics();

    await screen.findByRole("tab", { name: "Overview" });

    expect(screen.getByRole("tab", { name: "Gaming" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Music" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Movies & TV" })).toBeInTheDocument();
  });
});
