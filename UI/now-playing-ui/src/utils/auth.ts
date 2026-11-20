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

const AUTH_TIMEOUT_MS = 20_000;

const fetchWithTimeout = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const ensureCsrfToken = async (): Promise<string | null> => {
  const existing = getCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;
  const response = await fetchWithTimeout(getApiUrl("/auth/browser/csrf/"), {
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
  const response = await fetchWithTimeout(getApiUrl("/auth/browser/refresh/"), {
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
    await fetchWithTimeout(getApiUrl("/auth/browser/logout/"), {
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

const REQUEST_TIMEOUT_MS = 20_000;

export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
) => {
  const method = (options.method || "GET").toUpperCase();
  trackDuplicateGet(url, method);

  const request = async (): Promise<Response> => {
    const controller = new AbortController();
    const externalSignal = options.signal;
    const abortFromOutside = () => controller.abort();

    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", abortFromOutside, { once: true });
    }

    // A hung request must not leave the UI spinning forever.
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...options,
        credentials: "same-origin",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(await csrfHeaders(method)),
          ...options.headers,
        },
      });
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromOutside);
    }
  };

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
