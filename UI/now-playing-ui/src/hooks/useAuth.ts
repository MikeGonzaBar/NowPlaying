import { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkAuthSession,
  logoutBrowserSession,
  removeLegacyBrowserTokens,
} from "../utils/auth";

interface AuthState {
  authenticated: boolean;
  isLoading: boolean;
}

/**
 * Auth state lives in a module-level store shared by every `useAuth()` caller.
 *
 * `AppRoutes` gates the routes on `authenticated` while `AuthPage` flips it on
 * a successful login. When each call to `useAuth()` owned its own `useState`
 * copy, signing in only updated the page's copy: the router still believed the
 * visitor was signed out, so every guarded route (every section except `/`)
 * bounced straight back to `/auth` until the whole page was reloaded.
 */
let authState: AuthState = { authenticated: false, isLoading: true };
const listeners = new Set<() => void>();

const setAuthState = (patch: Partial<AuthState>) => {
  const next = { ...authState, ...patch };
  if (
    next.authenticated === authState.authenticated &&
    next.isLoading === authState.isLoading
  ) {
    return;
  }
  authState = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => authState;

let pendingCheck: Promise<boolean> | null = null;

const checkAuthStatus = async (): Promise<boolean> => {
  setAuthState({ isLoading: true });
  removeLegacyBrowserTokens();
  pendingCheck ??= checkAuthSession()
    .catch(() => false)
    .finally(() => {
      pendingCheck = null;
    });
  const authenticated = await pendingCheck;
  setAuthState({ authenticated, isLoading: false });
  return authenticated;
};

// Probe the session once per page load rather than once per `useAuth()` mount:
// mounting `AuthPage` must not flash the loading state or refetch the profile.
let sessionProbed = false;

export const useAuth = () => {
  const { authenticated, isLoading } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionProbed) return;
    sessionProbed = true;
    void checkAuthStatus();
  }, []);

  const logout = async () => {
    try {
      await logoutBrowserSession();
    } finally {
      setAuthState({ authenticated: false, isLoading: false });
      navigate("/auth");
    }
  };

  const login = () => {
    setAuthState({ authenticated: true, isLoading: false });
  };

  return {
    authenticated,
    isLoading,
    logout,
    login,
    checkAuthStatus,
  };
};
