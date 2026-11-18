import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "../types";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";

export const useProfile = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(
        getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/profile/`),
      );

      if (response.ok) {
        const userData = await response.json();
        setUserProfile(userData);
      } else {
        throw new Error(
          `Failed to fetch user profile (status ${response.status})`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return { userProfile, loading, error, refetchProfile: fetchUserProfile };
};
