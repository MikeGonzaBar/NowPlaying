import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SeasonProgress from "../pages/movies/components/SeasonProgress";

const seasons = [
  { id: 1, season_number: 1, show__id: 10, show__title: "Devil May Cry", show__trakt_id: "210223" },
  { id: 2, season_number: 2, show__id: 10, show__title: "Devil May Cry", show__trakt_id: "210223" },
];

const episodes = {
  1: [
    {
      id: 101,
      episode_number: 1,
      title: "Pilot",
      image_url: null,
      rating: 8.0,
      overview: "First episode.",
      season__id: 1,
      season__season_number: 1,
      show__id: 10,
      show__title: "Devil May Cry",
      show__trakt_id: "210223",
      last_watched_at: "2026-08-01T00:00:00Z",
      progress: 100,
    },
    {
      id: 102,
      episode_number: 2,
      title: "Second",
      image_url: null,
      rating: 7.5,
      overview: "Second episode.",
      season__id: 1,
      season__season_number: 1,
      show__id: 10,
      show__title: "Devil May Cry",
      show__trakt_id: "210223",
      last_watched_at: null,
      progress: 0,
    },
  ],
};

const renderProgress = (selected: { season?: number | null; episode?: number | null } = {}) =>
  render(
    <MemoryRouter initialEntries={["/shows/210223/seasons/1/episodes/1"]}>
      <SeasonProgress
        seasons={seasons}
        episodesBySeason={episodes}
        expandedSeasons={new Set([1])}
        onToggleSeason={() => {}}
        selectedSeason={"season" in selected ? selected.season : 1}
        selectedEpisode={"episode" in selected ? selected.episode : 1}
      />
    </MemoryRouter>,
  );

describe("SeasonProgress episode deep links (audit #7)", () => {
  it("renders every episode row as a real link to its canonical URL", () => {
    renderProgress();

    const links = screen.getAllByRole("link", { name: /View Episode/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      "href",
      "/shows/210223/seasons/1/episodes/1",
    );
    expect(links[1]).toHaveAttribute(
      "href",
      "/shows/210223/seasons/1/episodes/2",
    );
  });

  it("marks the routed episode with aria-current", () => {
    renderProgress({ season: 1, episode: 1 });

    const current = screen
      .getAllByRole("link", { name: /View Episode/i })
      .find((l) => l.getAttribute("aria-current") === "true");
    expect(current).toBeDefined();
    expect(current).toHaveAttribute("href", "/shows/210223/seasons/1/episodes/1");
  });

  it("leaves no episode marked current when no deep link is active", () => {
    renderProgress({ season: null, episode: null });

    const links = screen.getAllByRole("link", { name: /View Episode/i });
    expect(links.every((l) => l.getAttribute("aria-current") === null)).toBe(true);
  });
});