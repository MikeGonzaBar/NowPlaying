export type SectionKey = "games" | "movies" | "music";

export const SECTION_KEYS: readonly SectionKey[] = ["games", "movies", "music"];

export interface UserPreferences {
  version: number;
  hidden_sections: SectionKey[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  version: 1,
  hidden_sections: [],
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  games: "Games",
  movies: "Movies & TV",
  music: "Music",
};

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === "string" && SECTION_KEYS.includes(value as SectionKey);
}

/** Coerce an arbitrary server document into a valid preference object. */
export function normalizePreferences(value: unknown): UserPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_PREFERENCES };

  const raw = (value as { hidden_sections?: unknown }).hidden_sections;
  const hidden = Array.isArray(raw) ? raw.filter(isSectionKey) : [];

  // Never let a bad document hide every section.
  const unique = Array.from(new Set(hidden));
  return {
    version: 1,
    hidden_sections: unique.length >= SECTION_KEYS.length ? [] : unique,
  };
}
