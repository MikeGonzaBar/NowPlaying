import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import { EpicAuthStatus } from "../types";

/**
 * Epic connection flow: the user signs in on epicgames.com, pastes the
 * redirect URL back, and the API exchanges the code for tokens.
 *
 * The token itself never reaches this hook; the API stores it encrypted and
 * only reports connection state.
 */
export const useEpicAuth = () => {
  const [epicStatus, setEpicStatus] = useState<EpicAuthStatus | null>(null);
  const [epicLoginUrl, setEpicLoginUrl] = useState("");
  const [epicConnecting, setEpicConnecting] = useState(false);
  const [epicCode, setEpicCode] = useState("");

  const refetchEpicStatus = useCallback(async () => {
    try {
      const response = await authenticatedFetch(
        getApiUrl(`${API_CONFIG.EPIC_ENDPOINT}/auth-status/`),
      );
      if (!response.ok) return;
      const data: EpicAuthStatus = await response.json();
      setEpicStatus(data);
    } catch (error) {
      console.error("Error fetching Epic auth status:", error);
    }
  }, []);

  const fetchLoginUrl = useCallback(async () => {
    try {
      const response = await authenticatedFetch(
        getApiUrl(`${API_CONFIG.EPIC_ENDPOINT}/login-url/`),
      );
      if (!response.ok) return;
      const data = await response.json();
      if (data?.login_url) setEpicLoginUrl(data.login_url);
    } catch (error) {
      console.error("Error fetching Epic login URL:", error);
    }
  }, []);

  useEffect(() => {
    void fetchLoginUrl();
  }, [fetchLoginUrl]);

  const openEpicLogin = useCallback(async (): Promise<void> => {
    if (epicLoginUrl) {
      window.open(epicLoginUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const response = await authenticatedFetch(
      getApiUrl(`${API_CONFIG.EPIC_ENDPOINT}/login-url/`),
    );
    if (!response.ok) {
      throw new Error("Failed to get the Epic login URL");
    }
    const data = await response.json();
    if (data?.login_url) {
      setEpicLoginUrl(data.login_url);
      window.open(data.login_url, "_blank", "noopener,noreferrer");
    }
  }, [epicLoginUrl]);

  const connectEpic = useCallback(async (): Promise<string> => {
    const code = epicCode.trim();
    if (!code) {
      throw new Error("Paste the Epic redirect URL or authorization code");
    }

    setEpicConnecting(true);
    try {
      const response = await authenticatedFetch(
        getApiUrl(`${API_CONFIG.EPIC_ENDPOINT}/authenticate/`),
        {
          method: "POST",
          body: JSON.stringify({ redirect_url: code }),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.error || data?.detail || "Failed to connect Epic Games",
        );
      }

      setEpicCode("");
      await refetchEpicStatus();
      return `Epic Games connected${data.display_name ? ` as ${data.display_name}` : ""}.`;
    } finally {
      setEpicConnecting(false);
    }
  }, [epicCode, refetchEpicStatus]);

  return {
    epicStatus,
    epicLoginUrl,
    epicConnecting,
    epicCode,
    setEpicCode,
    refetchEpicStatus,
    openEpicLogin,
    connectEpic,
  };
};
