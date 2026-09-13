import { format, isToday, isYesterday, parseISO } from "date-fns";
import { formatLongDate, formatShortDate } from "../../../utils/dates";

/**
 * Music-specific date helpers. Absolute-date formatting delegates to the
 * shared, locale-aware formatters in `utils/dates.ts` (audit #8 convention:
 * `MMM D, YYYY`); only the relative Today/Yesterday logic lives here since
 * music history is the only area that uses it.
 */

export function formatLastPlayed(playedAt: string | null): string {
  if (!playedAt) return "N/A";
  const date = parseISO(playedAt);
  if (isNaN(date.getTime())) return playedAt;
  return formatShortDate(date);
}

export function formatPlayedAt(playedAt: string): string {
  try {
    const date = parseISO(playedAt);
    if (isToday(date)) {
      return `Today at ${format(date, "h:mm a")}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d, yyyy 'at' h:mm a");
    }
  } catch {
    return playedAt;
  }
}

/** Track length in ms -> `m:ss`. Distinct from runtime "Xh Ym" formatters. */
export function formatDuration(ms: number | null): string {
  if (!ms) return "";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatDateLabel(dateKey: string): string {
  if (dateKey === "unknown") return dateKey;
  try {
    const date = parseISO(dateKey);
    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return formatLongDate(date);
    }
  } catch {
    return dateKey;
  }
}

