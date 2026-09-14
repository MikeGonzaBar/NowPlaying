import { describe, expect, it } from "vitest";
import { authenticatedFetch } from "../utils/auth";
import { mockAuthenticatedFetch } from "./setup";

describe("shared authenticatedFetch mock", () => {
  it.each([
    ["services array", ["steam", "psn"]],
    ["empty array", []],
    ["object", { result: [{ appid: 1 }], count: 0 }],
    ["null", null],
    ["string", "connected"],
    ["number", 0],
    ["boolean", false],
  ])("preserves a %s JSON payload", async (_name, payload) => {
    const api = mockAuthenticatedFetch({ "/fixture/": payload });

    const response = await authenticatedFetch("https://example.test/fixture/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual(payload);
    expect(api.calls).toEqual(["/fixture/"]);
    expect(api.notFound()).toEqual([]);
  });

  it("preserves existing status overrides without mutating the fixture", async () => {
    const payload = { __status: 503, error: "temporarily unavailable" };
    mockAuthenticatedFetch({ "/fixture/": payload });

    const response = await authenticatedFetch("/fixture/");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "temporarily unavailable" });
    expect(payload).toEqual({
      __status: 503,
      error: "temporarily unavailable",
    });
  });

  it("preserves array responses from route callbacks and passes query strings", async () => {
    mockAuthenticatedFetch({ "/fixture/": (url: string) => [url] });

    const response = await authenticatedFetch("/fixture/?page=2");

    expect(await response.json()).toEqual(["/fixture/?page=2"]);
  });

  it("records missing routes and returns the existing 404 response", async () => {
    const api = mockAuthenticatedFetch({});

    const response = await authenticatedFetch("/missing/");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "No mock for /missing/" });
    expect(api.notFound()).toEqual(["/missing/"]);
  });
});
