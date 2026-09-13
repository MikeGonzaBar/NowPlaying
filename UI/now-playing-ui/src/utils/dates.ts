/**
 * Shared, locale-aware date formatters (audit #8).
 *
 * Before this module, adjacent product areas each called `toLocaleDateString`
 * with different locales/patterns — `07/09/2026` (games), `Oct 28, 2025`
 * (music), `7/21/2026` (episodes), and even an "en-GB" variant in
 * gameDetailsHeader. One unambiguous month-name format (`MMM D, YYYY`) reads
 * identically everywhere.
 */

const short = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const shortNoYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const weekday = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const long = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const digits = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

const valid = (d: Date) => !isNaN(d.getTime());

/** `Oct 28, 2025` — compact, unambiguous, used for chips and rows. */
export function formatShortDate(value: Date | string | number | null | undefined): string {
  const date = new Date(value ?? NaN);
  return valid(date) ? short.format(date) : "Date unavailable";
}

/** `Oct 28` — chart axis labels (no year needed in a 30-day window). */
export function formatShortNoYear(value: Date | string | number | null | undefined): string {
  const date = new Date(value ?? NaN);
  return valid(date) ? shortNoYear.format(date) : "Date unavailable";
}

/** `Tuesday, Oct 28` — rich tooltips. */
export function formatWeekdayShort(value: Date | string | number | null | undefined): string {
  const date = new Date(value ?? NaN);
  return valid(date) ? weekday.format(date) : "Date unavailable";
}

/** `October 28, 2025` — detail headings and episode panels. */
export function formatLongDate(value: Date | string | number | null | undefined): string {
  const date = new Date(value ?? NaN);
  return valid(date) ? long.format(date) : "Date unavailable";
}

/** `10/28/2025 - 11/28/2025` — analytics period control. */
export function formatDateRange(
  start: Date | string | number | null | undefined,
  end: Date | string | number | null | undefined,
): string {
  const startDate = new Date(start ?? NaN);
  const endDate = new Date(end ?? NaN);
  if (!valid(startDate) || !valid(endDate)) {
    return "Date unavailable";
  }
  return `${digits.format(startDate)} - ${digits.format(endDate)}`;
}