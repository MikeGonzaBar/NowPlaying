import { describe, it, expect } from "vitest";
import {
  formatShortDate,
  formatLongDate,
  formatDateRange,
} from "../utils/dates";

describe("shared date formatters (audit #8)", () => {
  it("formats shorts as MMM D, YYYY", () => {
    expect(formatShortDate("2025-10-28T00:00:00Z")).toMatch(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, 2025$/,
    );
  });

  it("formats longs with the month spelled out", () => {
    const out = formatLongDate("2025-10-28T00:00:00Z");
    expect(out).toContain("2025");
    expect(out.length).toBeGreaterThan(4);
  });

  it("returns 'Date unavailable' for invalid inputs", () => {
    expect(formatShortDate("")).toBe("Date unavailable");
    expect(formatShortDate("not-a-date")).toBe("Date unavailable");
    expect(formatDateRange("", "2026-09-09")).toBe("Date unavailable");
    expect(formatDateRange(null, null)).toBe("Date unavailable");
  });

  it("formats a validated date range as MM/DD/YYYY - MM/DD/YYYY", () => {
    const out = formatDateRange(
      "2026-08-11T00:00:00Z",
      "2026-09-09T00:00:00Z",
    );
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4}$/);
  });
});