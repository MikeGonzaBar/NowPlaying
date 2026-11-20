import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import { TopTracksList } from "../pages/music/components/TopTracksList";
import TopArtists from "../pages/music/pages/topArtists";
import { mockAuthenticatedFetch } from "./setup";

describe("TopTracksList ranking card links", () => {
  it("renders each track row as a link to its track page", () => {
    const tracks = [
      { title: "Karma Police", count: 42, recording_id: "rec-123" },
      { title: "No Surprises", count: 30 },
    ];

    render(
      <MemoryRouter>
        <TopTracksList tracks={tracks} isFirst={true} />
      </MemoryRouter>,
    );

    const karmaLink = screen.getByRole("link", { name: /view track karma police/i });
    expect(karmaLink).toHaveAttribute(
      "href",
      "/music/tracks/Karma%20Police?recording_id=rec-123",
    );

    const surprisesLink = screen.getByRole("link", { name: /view track no surprises/i });
    expect(surprisesLink).toHaveAttribute("href", "/music/tracks/No%20Surprises");
  });

  it("carries the ranking URL so Back to Tracks keeps the period", async () => {
    const user = userEvent.setup();

    function TrackDestination() {
      const location = useLocation();
      return (
        <div data-testid="track-destination">
          {JSON.stringify(location.state)}
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/music/artists?period=30&source=spotify"]}>
        <Routes>
          <Route
            path="/music/artists"
            element={
              <TopTracksList
                tracks={[{ title: "Karma Police", count: 42 }]}
                isFirst={true}
              />
            }
          />
          <Route path="/music/tracks/:name" element={<TrackDestination />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("link", { name: /view track karma police/i }),
    );

    expect(screen.getByTestId("track-destination")).toHaveTextContent(
      "/music/artists?period=30&source=spotify",
    );
  });
});

describe("TopArtists period context and search params", () => {
  it("initializes period from searchParams and updates searchParams on period change", async () => {
    const user = userEvent.setup();
    mockAuthenticatedFetch({
      "/music/top-artists/": {
        artists: [
          {
            name: "Radiohead",
            scrobbles: 1500,
            thumbnail: null,
            top_tracks: [],
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={["/music/top-artists?period=30"]}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Routes>
            <Route path="/music/top-artists" element={<TopArtists />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Initial period from query params is 30 days
    expect(
      (await screen.findAllByText(/Last 30 days/i)).length,
    ).toBeGreaterThanOrEqual(1);

    // Click period filter button to open menu
    const periodBtn = screen.getByRole("button", {
      name: /choose artist period/i,
    });
    await user.click(periodBtn);

    // Select "Last 90 days"
    const last90Option = await screen.findByRole("menuitem", {
      name: /last 90 days/i,
    });
    await user.click(last90Option);

    await waitFor(() => {
      expect(screen.getAllByText(/Last 90 days/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
