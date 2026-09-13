import { getApiUrl, API_CONFIG } from "../config/api";

export const getAuthToken = () => {
  return localStorage.getItem("token") || null;
};

export const getRefreshToken = () => {
  return localStorage.getItem("refresh_token") || null;
};

export const setAuthToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const setRefreshToken = (token: string) => {
  localStorage.setItem("refresh_token", token);
};

export const removeAuthToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch {
    return false;
  }
};

export const refreshAuthToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    sessionStorage.setItem("auth_failure", "true");
    return false;
  }

  try {
    const response = await fetch(
      getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/token/refresh/`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      setAuthToken(data.access);
      sessionStorage.removeItem("auth_failure");
      return true;
    } else {
      sessionStorage.setItem("auth_failure", "true");
      removeAuthToken();
      return false;
    }
  } catch {
    sessionStorage.setItem("auth_failure", "true");
    removeAuthToken();
    return false;
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
  trackDuplicateGet(url, options.method || "GET");

  const isOnAuthPage =
    window.location.pathname === "/auth" ||
    window.location.pathname.startsWith("/auth");

  let token = getAuthToken();

  if (!token || !isAuthenticated()) {
    const refreshed = await refreshAuthToken();
    if (!refreshed) {
      if (!isOnAuthPage) {
        window.location.href = "/auth";
      }
      throw new Error("Your session has expired. Please log in again.");
    }
    token = getAuthToken();
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      const newToken = getAuthToken();
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
        },
      });
      return retryResponse;
    } else {
      removeAuthToken();
      if (!isOnAuthPage) {
        window.location.href = "/auth";
      }
      throw new Error("Your session has expired. Please log in again.");
    }
  }

  return response;
};
