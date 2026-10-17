import { expect, test } from "@playwright/test";

const uniqueUser = () => `cookie-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test("browser sessions use httpOnly cookies, survive refresh, and revoke on logout", async ({ page }) => {
  // Sign-out lives behind the account menu in the mobile bottom nav
  // (sideBar.tsx); the desktop drawer has its own entry instead, so pin a
  // phone-sized viewport or this click has no visible target at 1280x720.
  await page.setViewportSize({ width: 390, height: 844 });

  const username = uniqueUser();
  await page.goto("/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(`${username}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("Test1234!");
  await page.getByLabel("Confirm password").fill("Test1234!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();

  await expect(page).not.toHaveURL(/\/auth/);
  await page.reload();
  await expect(page).not.toHaveURL(/\/auth/);

  const browserStorage = await page.evaluate(() => ({
    access: localStorage.getItem("token"),
    refresh: localStorage.getItem("refresh_token"),
    cookies: document.cookie,
  }));
  expect(browserStorage.access).toBeNull();
  expect(browserStorage.refresh).toBeNull();
  expect(browserStorage.cookies).not.toContain("nowplaying_access");
  expect(browserStorage.cookies).not.toContain("nowplaying_refresh");
  expect(browserStorage.cookies).toContain("csrftoken=");

  const refreshStatus = await page.evaluate(async () => {
    const csrf = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1];
    const response = await fetch("/api/auth/browser/refresh/", {
      method: "POST",
      credentials: "same-origin",
      headers: csrf ? { "X-CSRFToken": decodeURIComponent(csrf) } : {},
    });
    return response.status;
  });
  expect(refreshStatus).toBe(204);

  await page.getByLabel("Account menu").click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth/);
  const profileStatus = await page.evaluate(() =>
    fetch("/api/users/profile/", { credentials: "same-origin" }).then((response) => response.status),
  );
  expect(profileStatus).toBe(401);
});
