import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import SongHistory from "../pages/music/pages/songHistory";
import { mockAuthenticatedFetch } from "./setup";

const sampleSong = {
  id: 1,
  title: "Paranoid Android",
  artist: "Radiohead",
  album: "OK Computer",
  played_at: "2026-11-19T10:00:00Z",
  album_thumbnail: null,
  track_url: "https://open.spotify.com/track/123",
  artist_lastfm_url: null,
  duration_ms: 387000,
  source: "spotify" as const,
  loved: false,
  streamable: true,
};

const renderSongHistory = () =>
  render(
    <MemoryRouter initialEntries={["/music/history"]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/music/history" element={<SongHistory />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("SongHistory polish (search focus, filters, subtitle, stray zeros)", () => {
  it("keeps search input mounted and focused when typing with debounce", async () => {
    const user = userEvent.setup();
    mockAuthenticatedFetch({
      "/music/get-stored-songs/": {
        results: [sampleSong],
        page: 1,
        page_size: 50,
        total_items: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    });

    renderSongHistory();

    const searchInput = await screen.findByRole("textbox", {
      name: /search songs or artists/i,
    });
    expect(searchInput).toBeInTheDocument();

    await user.click(searchInput);
    expect(searchInput).toHaveFocus();

    await user.type(searchInput, "Radio");

    // After typing, input should retain focus and not unmount
    await waitFor(() => {
      expect(searchInput).toHaveFocus();
      expect(searchInput).toHaveValue("Radio");
    });
  });

  it("updates subtitle when date filter changes and marks button as pressed", async () => {
    const user = userEvent.setup();
    mockAuthenticatedFetch({
      "/music/get-stored-songs/": {
        results: [sampleSong],
        page: 1,
        page_size: 50,
        total_items: 42,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    });

    renderSongHistory();

    expect(await screen.findByText(/42 scrobbles \| All time/i)).toBeInTheDocument();

    const last7DaysBtn = screen.getByRole("button", { name: /last 7 days/i });
    expect(last7DaysBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(last7DaysBtn);

    await waitFor(() => {
      expect(screen.getByText(/42 scrobbles \| Last 7 days/i)).toBeInTheDocument();
      expect(last7DaysBtn).toHaveAttribute("aria-pressed", "true");
    });

    const last30DaysBtn = screen.getByRole("button", { name: /last 30 days/i });
    await user.click(last30DaysBtn);

    await waitFor(() => {
      expect(screen.getByText(/42 scrobbles \| Last 30 days/i)).toBeInTheDocument();
      expect(last30DaysBtn).toHaveAttribute("aria-pressed", "true");
      expect(last7DaysBtn).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("does not render a stray zero when duration_ms is 0", async () => {
    const songWithZeroDuration = {
      ...sampleSong,
      id: 2,
      duration_ms: 0,
    };

    mockAuthenticatedFetch({
      "/music/get-stored-songs/": {
        results: [songWithZeroDuration],
        page: 1,
        page_size: 50,
        total_items: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    });

    renderSongHistory();

    await screen.findByText("Paranoid Android");
    // Ensure no stray element contains only "0"
    const strayZeros = screen.queryAllByText((content) => content === "0");
    expect(strayZeros).toHaveLength(0);
  });
});
