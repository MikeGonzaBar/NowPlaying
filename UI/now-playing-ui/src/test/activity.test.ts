import { describe, it, expect } from "vitest";
import { categoryColors } from "../theme";
import {
  ACTIVITY_TYPE_META,
  RECENT_ACTIVITY_LIMIT,
  buildRecentActivity,
  formatActivityWhen,
} from "../utils/activity";

/**
 * Regression guards for the dashboard audit findings:
 *  - #1 every activity row must be clickable (not just music)
 *  - #3 one ordering across pillars, games included, no per-type caps
 *  - #4 chip colours come from the theme token map, not ad-hoc hex values
 */
describe("dashboard activity feed (audit #1/#3/#4)", () => {
  it("orders every pillar by one real timestamp, newest first", () => {
    const feed = buildRecentActivity([
      {
        type: "music",
        title: "Stale Scrobble",
        detail: "Artist",
        occurred_at: "2026-05-20T10:00:00Z",
      },
      {
        type: "movie",
        title: "Stale Movie",
        detail: "Movie",
        occurred_at: "2025-04-01T10:00:00Z",
      },
      {
        type: "game",
        title: "Newer Game",
        detail: "Steam",
        occurred_at: "2026-09-27T10:00:00Z",
      },
      {
        type: "show",
        title: "Newest Show",
        detail: "TV",
        occurred_at: "2026-09-28T09:00:00Z",
      },
    ]);

    expect(feed.map((item) => item.title)).toEqual([
      "Newest Show",
      "Newer Game",
      "Stale Scrobble",
      "Stale Movie",
    ]);
  });

  it("gives every type a detail-page href", () => {
    const feed = buildRecentActivity([
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
        occurred_at: "2026-09-27T08:00:00Z",
      },
      {
        type: "movie",
        title: "Inception",
        detail: "Movie",
        tmdb_id: "27205",
        occurred_at: "2026-09-26T08:00:00Z",
      },
      {
        type: "show",
        title: "The Wire",
        detail: "TV",
        trakt_id: "1396",
        occurred_at: "2026-09-25T08:00:00Z",
      },
    ]);

    expect(feed.map((item) => item.href)).toEqual([
      "/games/title/Elden%20Ring",
      "/music/tracks/Some%20Track?recording_id=mbid-1",
      "/movies/27205",
      "/shows/1396",
    ]);
  });

  it("falls back to the pillar route when an id is missing, instead of rendering an inert row", () => {
    const [movie, music] = buildRecentActivity([
      {
        type: "movie",
        title: "No TMDB Id",
        detail: "Movie",
        occurred_at: "2026-09-28T08:00:00Z",
      },
      {
        type: "music",
        title: "No MBID",
        detail: "Artist",
        occurred_at: "2026-09-27T08:00:00Z",
      },
    ]);

    expect(movie.href).toBe("/movies");
    expect(music.href).toBe("/music/tracks/No%20MBID");
  });

  it("never relabels an unknown type as Movies", () => {
    expect(
      buildRecentActivity([
        {
          type: "podcast",
          title: "Some Podcast",
          occurred_at: "2026-09-28T08:00:00Z",
        },
      ]),
    ).toEqual([]);
  });

  it("keeps the feed capped and drops unusable payloads", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      type: "music",
      title: `Track ${index}`,
      detail: "Artist",
      occurred_at: `2026-09-${String(10 + index).padStart(2, "0")}T08:00:00Z`,
    }));

    const feed = buildRecentActivity(many);

    expect(feed).toHaveLength(RECENT_ACTIVITY_LIMIT);
    expect(feed[0].title).toBe("Track 9");
    expect(buildRecentActivity(null)).toEqual([]);
    expect(
      buildRecentActivity([
        { type: "movie", occurred_at: "2026-01-01T00:00:00Z" },
      ]),
    ).toEqual([]);
  });

  it("sorts undated rows last and labels them Unknown, not 'just now'", () => {
    const feed = buildRecentActivity([
      { type: "movie", title: "No Date", detail: "Movie", occurred_at: "" },
      {
        type: "music",
        title: "Dated",
        detail: "Artist",
        occurred_at: "2026-09-01T00:00:00Z",
      },
    ]);

    expect(feed.map((item) => item.title)).toEqual(["Dated", "No Date"]);
    expect(formatActivityWhen(feed[0].occurredAt)).not.toBe("Unknown");
    expect(formatActivityWhen(feed[1].occurredAt)).toBe("Unknown");
  });

  it("takes every chip colour from the theme token map", () => {
    expect(ACTIVITY_TYPE_META.game.color).toBe(categoryColors.games);
    expect(ACTIVITY_TYPE_META.music.color).toBe(categoryColors.music);
    expect(ACTIVITY_TYPE_META.movie.color).toBe(categoryColors.movies);
    expect(ACTIVITY_TYPE_META.show.color).toBe(categoryColors.movies);
  });
});
