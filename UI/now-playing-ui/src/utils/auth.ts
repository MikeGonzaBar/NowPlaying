import { getApiUrl, API_CONFIG } from "../config/api";

const CSRF_COOKIE_NAME = "csrftoken";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

const getCookie = (name: string): string | null => {
  const prefix = `${name}=`;
  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
};

export const ensureCsrfToken = async (): Promise<string | null> => {
  const existing = getCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;
  const response = await fetch(getApiUrl("/auth/browser/csrf/"), {
    credentials: "same-origin",
  });
  return response.ok ? getCookie(CSRF_COOKIE_NAME) : null;
};

const csrfHeaders = async (method: string): Promise<Record<string, string>> => {
  if (SAFE_METHODS.has(method)) return {};
  const token = await ensureCsrfToken();
  return token ? { "X-CSRFToken": token } : {};
};

export const refreshAuthSession = async (): Promise<boolean> => {
  const response = await fetch(getApiUrl("/auth/browser/refresh/"), {
    method: "POST",
    credentials: "same-origin",
    headers: await csrfHeaders("POST"),
  });
  if (response.ok) {
    sessionStorage.removeItem("auth_failure");
    return true;
  }
  sessionStorage.setItem("auth_failure", "true");
  return false;
};

export const logoutBrowserSession = async (): Promise<void> => {
  try {
    await fetch(getApiUrl("/auth/browser/logout/"), {
      method: "POST",
      credentials: "same-origin",
      headers: await csrfHeaders("POST"),
    });
  } finally {
    sessionStorage.removeItem("auth_failure");
  }
};

const DUP_WINDOW_MS = 2000;
const DUP_THRESHOLD = 5;
const recentGetTimestamps = import.meta.env.DEV
  ? new Map<string, number[]>()
  : null;

const trackDuplicateGet = (url: string, method: string) => {
  if (!recentGetTimestamps || method.toUpperCase() !== "GET") return;
  const now = Date.now();
  const stamps = (recentGetTimestamps.get(url) || []).filter(
    (t) => now - t < DUP_WINDOW_MS,
  );
  stamps.push(now);
  recentGetTimestamps.set(url, stamps);
  if (stamps.length === DUP_THRESHOLD) {
    console.warn(
      `[DEV] duplicate_request_detected count=${stamps.length} window=${DUP_WINDOW_MS}ms url=${url}`,
    );
  }
};

export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
) => {
  const method = (options.method || "GET").toUpperCase();
  trackDuplicateGet(url, method);

  const request = async (): Promise<Response> =>
    fetch(url, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(await csrfHeaders(method)),
        ...options.headers,
      },
    });

  let response = await request();
  if (response.status !== 401) return response;
  if (await refreshAuthSession()) response = await request();
  return response;
};

export const checkAuthSession = async (): Promise<boolean> => {
  try {
    const response = await authenticatedFetch(
      getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/profile/`),
    );
    return response.ok;
  } catch {
    return false;
  }
};

// Do not exchange old JavaScript-readable JWTs for cookies. A fresh login
// limits the lifetime of credentials that may have been exposed by prior XSS.
export const removeLegacyBrowserTokens = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
};
