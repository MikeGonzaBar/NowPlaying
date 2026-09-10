import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Shared mock for `utils/auth#authenticatedFetch` — every API call in the app
 * flows through it, so one stub covers all page tests.
 *
 * vi.mock is hoisted per test file from the global setup, so the factory below
 * intercepts `authenticatedFetch` for every page module. Routes are matched by
 * substring against the requested pathname+search.
 */
export interface ApiMockState {
  routes: Record<string, unknown>;
  calls: string[];
  notFound: string[];
}

export const apiState: ApiMockState = { routes: {}, calls: [], notFound: [] };

vi.mock("../utils/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/auth")>();
  return {
    ...actual,
    authenticatedFetch: vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const raw =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const target = stripOrigin(raw);
      apiState.calls.push(target);
      const matchKey = Object.keys(apiState.routes).find((key) =>
        target.includes(key),
      );
      if (matchKey === undefined) {
        apiState.notFound.push(target);
        return new Response(
          JSON.stringify({ error: `No mock for ${target}` }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }
      const route = apiState.routes[matchKey];
      const payload =
        typeof route === "function" ? (route as (url: string) => unknown)(target) : route;
      // Payloads may opt into a non-200 status with `__status` (stripped from
      // the body), e.g. { __status: 503, error: "..." }.
      const { __status, ...body } = (payload ?? {}) as Record<string, unknown> & { __status?: number };
      return new Response(JSON.stringify(body), {
        status: __status ?? 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  };
});

/**
 * Install route responses before rendering. Returns a tracker for assertions:
 *   const api = mockAuthenticatedFetch({ '/analytics/': {...} });
 *   api.callCount(); api.urlsMatching('movie-stats');
 */
export function mockAuthenticatedFetch(routes: Record<string, unknown>) {
  apiState.routes = routes;
  apiState.calls = [];
  apiState.notFound = [];
  return {
    calls: apiState.calls,
    callCount: () => apiState.calls.length,
    lastUrl: () => apiState.calls[apiState.calls.length - 1],
    urlsMatching: (fragment: string) =>
      apiState.calls.filter((c) => c.includes(fragment)),
    notFound: () => apiState.notFound,
  };
}

export function stripOrigin(raw: string): string {
  try {
    const parsed = new URL(raw, "http://localhost");
    return parsed.pathname + parsed.search;
  } catch {
    return raw;
  }
}
