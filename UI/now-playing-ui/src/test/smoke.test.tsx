import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import AllGames from "../pages/games/pages/allGames";
import { mockAuthenticatedFetch } from "./setup";

// Minimal smoke test: proves the Vitest + RTL toolchain, the authenticatedFetch
// mock, and the router/theme providers work end to end against a real page.
describe("test infrastructure", () => {
  it("renders All Games with mocked provider library data", async () => {
    const steamLibrary = {
      result: [
        {
          appid: 1,
          name: "Hades",
          playtime_forever: 300,
          img_icon_url: "",
          last_played: "2026-07-09T12:00:00Z",
        },
      ],
    };

    mockAuthenticatedFetch({
      "/steam/get-game-list-stored/": steamLibrary,
      "/psn/get-game-list-stored/": { result: [] },
      "/retroachievements/fetch-games/": { result: [] },
      "/xbox/get-game-list-stored/": { result: [] },
      "/users/api-keys/services/": ["steam", "psn", "xbox", "retroachievements"],
    });

    render(
      <MemoryRouter initialEntries={["/games/all"]}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AllGames />
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Hades")).toBeInTheDocument();
    });
  });
});
