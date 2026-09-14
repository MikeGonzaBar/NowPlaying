import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../theme";
import LegacyGameIdRedirect from "../pages/games/pages/LegacyGameIdRedirect";
import { mockAuthenticatedFetch } from "./setup";

const TitleProbe = () => {
  const { title } = useParams<{ title: string }>();
  return <div data-testid="canonical">{decodeURIComponent(title || "")}</div>;
};

const renderLegacy = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/game/${id}`]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route path="/game/:id" element={<LegacyGameIdRedirect />} />
          <Route path="/games/title/:title" element={<TitleProbe />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("LegacyGameIdRedirect (audit #4)", () => {
  it("redirects a resolvable Steam numeric id to the canonical title route", async () => {
    mockAuthenticatedFetch({
      "/games/detail-by-id/": {
        title: "Hades",
        platforms: [{ platform: "steam", data: { appid: 1145360 } }],
        platform_count: 1,
      },
    });

    renderLegacy("1145360");

    const canonical = await screen.findByTestId("canonical");
    expect(canonical).toHaveTextContent("Hades");
  });

  it("renders a deliberate not-found state for an unknown PSN concept id", async () => {
    mockAuthenticatedFetch({
      "/games/detail-by-id/": { error: "Game not found.", __status: 404 },
    });

    renderLegacy("PPSA01649_00");

    expect(
      await screen.findByText("This game link is outdated"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /browse all games/i }),
    ).toBeInTheDocument();
  });

  it("renders the not-found state for an unknown numeric id", async () => {
    mockAuthenticatedFetch({
      "/games/detail-by-id/": { error: "Game not found.", __status: 404 },
    });

    renderLegacy("209000");

    expect(
      await screen.findByText("This game link is outdated"),
    ).toBeInTheDocument();
  });

  it("never forwards a malformed platform fragment into any request", async () => {
    const api = mockAuthenticatedFetch({
      "/games/detail-by-id/": { error: "Game not found.", __status: 404 },
    });

    renderLegacy("1145360");

    await screen.findByText("This game link is outdated");
    const all = api.calls;
    expect(all.every((c) => !c.includes("[object"))).toBe(true);
  });
});
