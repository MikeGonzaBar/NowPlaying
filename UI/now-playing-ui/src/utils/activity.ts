import { formatDistanceToNow } from "date-fns";
import { categoryColors } from "../theme";

/**
 * Dashboard activity feed (dashboard audit #1/#3).
 *
 * The page used to concatenate a music block above a movie block and only made
 * music rows clickable. Every row here carries one real timestamp (from
 * `GET /analytics/recent-activity/`), one href, and the colour/label for its
 * type — so the feed can be ordered across pillars and every row is a link.
 */

const ACTIVITY_TYPES = ["game", "music", "movie", "show"] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Raw item as returned by `GET /analytics/recent-activity/`. */
export interface ActivityApiItem {
  type: string;
  title: string;
  detail?: string | null;
  occurred_at: string;
  tmdb_id?: string | null;
  trakt_id?: string | null;
  track_mbid?: string | null;
}

/** One renderable feed row. */
export interface ActivityItem {
  type: ActivityType;
  title: string;
  detail?: string;
  /** Epoch ms — the only sort key. 0 means "no timestamp available". */
  occurredAt: number;
  /** Always present: every row is a link. */
  href: string;
}

export const ACTIVITY_TYPE_META: Record<
  ActivityType,
  { label: string; color: string; fallbackHref: string }
> = {
  game: {
    label: "Game",
    color: categoryColors.games,
    fallbackHref: "/games",
  },
  music: {
    label: "Music",
    color: categoryColors.music,
    fallbackHref: "/music",
  },
  movie: {
    label: "Movie",
    color: categoryColors.movies,
    fallbackHref: "/movies",
  },
  show: {
    label: "TV",
    color: categoryColors.movies,
    fallbackHref: "/movies",
  },
};

export const RECENT_ACTIVITY_LIMIT = 6;

const isActivityType = (value: string): value is ActivityType =>
  (ACTIVITY_TYPES as readonly string[]).includes(value);

/** Detail-page route for one row, falling back to the pillar when ids are missing. */
function activityHref(item: ActivityApiItem, type: ActivityType): string {
  const fallback = ACTIVITY_TYPE_META[type].fallbackHref;
  if (type === "game") {
    return item.title
      ? `/games/title/${encodeURIComponent(item.title)}`
      : fallback;
  }
  if (type === "music") {
    if (!item.title) return fallback;
    const recordingId = item.track_mbid
      ? `?recording_id=${encodeURIComponent(item.track_mbid)}`
      : "";
    return `/music/tracks/${encodeURIComponent(item.title)}${recordingId}`;
  }
  if (type === "show") {
    return item.trakt_id
      ? `/shows/${encodeURIComponent(item.trakt_id)}`
      : ACTIVITY_TYPE_META.show.fallbackHref;
  }
  return item.tmdb_id
    ? `/movies/${encodeURIComponent(item.tmdb_id)}`
    : ACTIVITY_TYPE_META.movie.fallbackHref;
}

/**
 * Normalise the feed payload: drop unusable rows (an unknown `type` is never
 * relabelled as "Movie"), parse the single sort key, order newest first.
 */
export function buildRecentActivity(
  raw: unknown,
  limit: number = RECENT_ACTIVITY_LIMIT,
): ActivityItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ActivityItem[] = [];

  for (const entry of raw as ActivityApiItem[]) {
    const type = String(entry?.type ?? "");
    if (!entry?.title || !isActivityType(type)) continue;
    const parsed = Date.parse(String(entry.occurred_at ?? ""));
    items.push({
      type,
      title: entry.title,
      detail: entry.detail ?? undefined,
      occurredAt: Number.isNaN(parsed) ? 0 : parsed,
      href: activityHref(entry, type),
    });
  }

  return items.sort((a, b) => b.occurredAt - a.occurredAt).slice(0, limit);
}

/** Relative-time label for a feed row. Unknown timestamps say so, not "just now". */
export function formatActivityWhen(occurredAt: number): string {
  if (!occurredAt) return "Unknown";
  return formatDistanceToNow(occurredAt, { addSuffix: true });
}
