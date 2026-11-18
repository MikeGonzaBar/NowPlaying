export const RANKING_PERIOD_OPTIONS = [
  { label: "All time", value: "all" },
  { label: "Last 365 days", value: "365" },
  { label: "Last 90 days", value: "90" },
  { label: "Last 30 days", value: "30" },
] as const;

export const RANKING_SOURCE_OPTIONS = [
  { label: "All sources", value: "all" },
  { label: "Last.fm", value: "lastfm" },
  { label: "Spotify", value: "spotify" },
] as const;

export const getRankingPeriodLabel = (value: string): string =>
  RANKING_PERIOD_OPTIONS.find((option) => option.value === value)?.label ??
  "All time";

export const getRankingSourceLabel = (value: string): string =>
  RANKING_SOURCE_OPTIONS.find((option) => option.value === value)?.label ??
  "All sources";
