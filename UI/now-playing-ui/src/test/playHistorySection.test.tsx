import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import PlayHistorySection from "../pages/music/components/PlayHistorySection";
import { mockAuthenticatedFetch } from "./setup";

const renderSection = (props: Record<string, unknown> = {}) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <PlayHistorySection type="track" name="Judas" {...(props as any)} />
      </ThemeProvider>
    </MemoryRouter>,
  );

const makePlays = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    id: from + i,
    title: `Song ${from + i}`,
    artist: "Black Sabbath",
    album: "Paranoid",
    played_at: "2026-09-01T10:00:00Z",
    source: "lastfm",
    thumbnail: null,
    track_url: null,
    artist_lastfm_url: null,
  }));

describe("PlayHistorySection (audit #5)", () => {
  it("labels a sampled history and loads the next page", async () => {
    let page = 0;
    const api = mockAuthenticatedFetch({
      "/music/track-plays/": () => {
        page += 1;
        return page === 1
          ? {
              results: makePlays(1, 50),
              total_items: 70,
              page: 1,
              page_size: 50,
              has_next: true,
            }
          : {
              results: makePlays(51, 70),
              total_items: 70,
              page: 2,
              page_size: 50,
              has_next: false,
            };
      },
    });

    renderSection({ detailCount: 70 });

    expect(await screen.findByText("Recent 50 of 70 plays")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /load 50 more/i }));

    expect(await screen.findByText("70 plays")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load 50 more/i })).not.toBeInTheDocument();
    expect(api.urlsMatching("page=2")).toHaveLength(1);
  });

  it("shows the complete count without a load-more control when has_next is false", async () => {
    mockAuthenticatedFetch({
      "/music/track-plays/": {
        results: makePlays(1, 3),
        total_items: 3,
        page: 1,
        page_size: 50,
        has_next: false,
      },
    });

    renderSection({ detailCount: 3 });

    expect(await screen.findByText("3 plays")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load/i })).not.toBeInTheDocument();
  });

  it("falls back to the source-availability message when history is empty but plays exist", async () => {
    mockAuthenticatedFetch({
      "/music/track-plays/": {
        results: [],
        total_items: 0,
        page: 1,
        page_size: 50,
        has_next: false,
      },
    });

    renderSection({ detailCount: 12 });

    expect(
      await screen.findByText(
        "Detailed play history is not available from this source",
      ),
    ).toBeInTheDocument();
  });
});
