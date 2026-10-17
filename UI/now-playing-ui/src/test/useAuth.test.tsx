import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Stands in for `AppRoutes`, which gates every section on `authenticated`.
 * It is a *separate* `useAuth()` call from the one `AuthPage` makes.
 */
const RouterConsumer = () => {
  const { authenticated } = useAuth();
  return (
    <span data-testid="router-state">
      {authenticated ? "signed-in" : "signed-out"}
    </span>
  );
};

/** Stands in for `AuthPage`, which calls `login()` once sign-in succeeds. */
const AuthPageConsumer = () => {
  const { login, logout } = useAuth();
  return (
    <>
      <button onClick={login}>sign in</button>
      <button onClick={() => void logout()}>sign out</button>
    </>
  );
};

describe("useAuth shared session state", () => {
  beforeEach(() => {
    // No session in this test: every request is unauthenticated.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
  });

  it("propagates login and logout to every other useAuth() consumer", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RouterConsumer />
        <AuthPageConsumer />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("router-state")).toHaveTextContent(
        "signed-out",
      ),
    );

    await user.click(screen.getByRole("button", { name: "sign in" }));

    // Regression: the router's copy used to stay "signed-out" after a login,
    // so every guarded route redirected back to /auth until a page reload.
    await waitFor(() =>
      expect(screen.getByTestId("router-state")).toHaveTextContent("signed-in"),
    );

    await user.click(screen.getByRole("button", { name: "sign out" }));

    await waitFor(() =>
      expect(screen.getByTestId("router-state")).toHaveTextContent(
        "signed-out",
      ),
    );
  });
});
