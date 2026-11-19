import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authenticatedFetch } from "../utils/auth";
import { getApiUrl, API_CONFIG } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import {
  DEFAULT_PREFERENCES,
  SECTION_KEYS,
  normalizePreferences,
  type SectionKey,
  type UserPreferences,
} from "./types";

const STORAGE_KEY = "np.sections.v1";

interface SectionsContextValue {
  hidden: SectionKey[];
  visibleCount: number;
  ready: boolean;
  error: string | null;
  isVisible: (section: SectionKey) => boolean;
  setSectionHidden: (section: SectionKey, hidden: boolean) => Promise<void>;
}

const SectionsContext = createContext<SectionsContextValue | null>(null);

function readCache(): UserPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function writeCache(preferences: UserPreferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Private mode / quota failures must not block the UI.
  }
}

export function SectionsProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const [hidden, setHidden] = useState<SectionKey[]>(() => readCache().hidden_sections);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the account-level preferences once the session is known. A cached
  // copy paints the navigation immediately, then the server document wins.
  useEffect(() => {
    if (!authenticated) {
      setHidden(DEFAULT_PREFERENCES.hidden_sections);
      // The cache is only a paint hint for the signed-in account; dropping it
      // on sign-out keeps a second account on this browser from flashing it.
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage can be unavailable in private mode; nothing to clear.
      }
      setReady(true);
      return;
    }

    let active = true;
    setReady(false);

    (async () => {
      try {
        const response = await authenticatedFetch(
          getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/preferences/`),
        );
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = await response.json();
        if (!active) return;
        const preferences = normalizePreferences(payload?.data ?? payload);
        setHidden(preferences.hidden_sections);
        writeCache(preferences);
        setError(null);
      } catch {
        if (!active) return;
        // Fail open: unknown preferences must never hide a section.
        setError("Could not load your section preferences.");
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [authenticated]);

  const persist = useCallback(async (next: SectionKey[], previous: SectionKey[]) => {
    setHidden(next);
    writeCache({ version: 1, hidden_sections: next });

    try {
      const response = await authenticatedFetch(
        getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/preferences/`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { version: 1, hidden_sections: next } }),
        },
      );

      if (!response.ok) throw new Error(`status ${response.status}`);
      setError(null);
    } catch {
      // Roll back so the UI never claims a preference it did not save.
      setHidden(previous);
      writeCache({ version: 1, hidden_sections: previous });
      setError("Could not save your section preferences. Please try again.");
    }
  }, []);

  const setSectionHidden = useCallback(
    async (section: SectionKey, shouldHide: boolean) => {
      if (shouldHide && hidden.includes(section)) return;
      if (!shouldHide && !hidden.includes(section)) return;

      const next = shouldHide
        ? SECTION_KEYS.filter((key) => key === section || hidden.includes(key))
        : hidden.filter((key) => key !== section);

      // Mirror the server rule: at least one section stays visible.
      if (next.length >= SECTION_KEYS.length) return;

      await persist(next, hidden);
    },
    [hidden, persist],
  );

  const value = useMemo<SectionsContextValue>(
    () => ({
      hidden,
      visibleCount: SECTION_KEYS.length - hidden.length,
      ready,
      error,
      isVisible: (section: SectionKey) => !hidden.includes(section),
      setSectionHidden,
    }),
    [hidden, ready, error, setSectionHidden],
  );

  return <SectionsContext.Provider value={value}>{children}</SectionsContext.Provider>;
}

const DEFAULT_CONTEXT: SectionsContextValue = {
  hidden: [],
  visibleCount: SECTION_KEYS.length,
  ready: true,
  error: null,
  isVisible: () => true,
  setSectionHidden: async () => {},
};

export function useSections(): SectionsContextValue {
  // Fall back to "everything visible" outside the provider so isolated page
  // renders (tests, storybook-style previews) never break on a context miss.
  return useContext(SectionsContext) ?? DEFAULT_CONTEXT;
}
