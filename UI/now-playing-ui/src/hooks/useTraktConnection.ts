import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "../utils/auth";
import { getApiUrl, API_CONFIG } from "../config/api";

export interface TraktAuthStatusPayload {
  authenticated: boolean;
  token_expired?: boolean;
  expires_at?: string;
  auth_url?: string;
}

export interface TraktConnectionState {
  status: TraktAuthStatusPayload | null;
  loading: boolean;
  /** True when a Trakt token row exists at all (even if stale). */
  authenticated: boolean;
  /** True only when Trakt is authenticated AND the token is not expired. */
  connected: boolean;
  /** True only when an existing Trakt token has expired. */
  expired: boolean;
  refetch: () => Promise<void>;
}

/**
 * Single source of truth for Trakt connection health. Every screen that shows
 * a Trakt sync/status surface must consume this so the product can never
 * display "Connected" on one page while Profile reports "Token Expired".
 */
export function useTraktConnection(): TraktConnectionState {
  const [status, setStatus] = useState<TraktAuthStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const response = await authenticatedFetch(
        getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/auth-status/`),
      );
      if (response.ok) {
        const data: TraktAuthStatusPayload = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Error fetching Trakt connection status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const authenticated = !!status?.authenticated;
  const expired = authenticated && !!status?.token_expired;
  const connected = authenticated && !expired;

  return { status, loading, authenticated, connected, expired, refetch };
}
