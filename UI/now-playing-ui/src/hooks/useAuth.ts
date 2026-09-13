import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  isAuthenticated,
  refreshAuthToken,
  removeAuthToken,
  getAuthToken,
  setAuthToken,
  setRefreshToken,
} from "../utils/auth";

export const useAuth = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    const isOnAuthPage =
      location.pathname === "/auth" || location.pathname.startsWith("/auth");

    if (isAuthenticated()) {
      setAuthenticated(true);
    } else if (!isOnAuthPage) {
      const refreshed = await refreshAuthToken();
      setAuthenticated(refreshed);
    } else {
      setAuthenticated(false);
    }
    setIsLoading(false);
  }, [location.pathname]);

  const logout = () => {
    removeAuthToken();
    setAuthenticated(false);
    navigate("/auth");
  };

  const login = (token: string, refreshToken: string) => {
    setAuthToken(token);
    setRefreshToken(refreshToken);
    setAuthenticated(true);
  };

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    authenticated,
    isLoading,
    logout,
    login,
    checkAuthStatus,
    token: getAuthToken(),
  };
};
