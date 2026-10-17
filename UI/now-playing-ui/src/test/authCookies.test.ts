import { beforeEach, describe, expect, it, vi } from "vitest";

let auth: typeof import("../utils/auth");

describe("cookie session helpers", () => {
  beforeEach(async () => {
    auth = await vi.importActual<typeof import("../utils/auth")>("../utils/auth");
    document.cookie = "csrftoken=csrf-value; path=/";
    localStorage.setItem("token", "legacy-access");
    localStorage.setItem("refresh_token", "legacy-refresh");
  });

  it("uses same-origin credentials and sends CSRF only for unsafe requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await auth.authenticatedFetch("/api/users/profile/");
    await auth.authenticatedFetch("/api/users/api-keys/", { method: "POST", body: "{}" });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "same-origin" });
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>)["X-CSRFToken"]).toBeUndefined();
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: "same-origin" });
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>)["X-CSRFToken"]).toBe("csrf-value");
  });

  it("does not request a CSRF endpoint when the Django CSRF cookie is present", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(auth.ensureCsrfToken()).resolves.toBe("csrf-value");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes legacy JavaScript-readable tokens instead of migrating them", () => {
    auth.removeLegacyBrowserTokens();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });
});
