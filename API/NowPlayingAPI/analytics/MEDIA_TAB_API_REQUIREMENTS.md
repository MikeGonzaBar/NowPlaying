# Movies & TV (Trakt) Tab – Implemented & Optional

This document describes what the Movies & TV Analytics tab uses from the API and what is left as placeholder for future work.

## Implemented (in analytics response)

All of the following are returned by `GET /analytics/?days=30` and used by the Media tab UI.

| Field | Type | Description |
|-------|------|-------------|
| `media_movies_change` | `object` | `{ change, current, previous }` – movies this period vs previous (for “+X from last period”) |
| `media_weekly_watch` | `array` | Last 7 days: `{ date, day_name, movies, episodes, watch_time_hours }` for Daily Watch Time chart |
| `media_watch_breakdown` | `object` | `{ movies_percentage, tv_percentage }` – from 2h/movie, 45m/episode |
| `media_series_count` | `number` | Distinct shows with at least one episode watch in period |
| `media_genre_distribution` | `object` | `{ genres: [], total_count: 0 }` – structure ready; genres empty until Trakt/genre source exists |
| `media_completion_rate` | `number \| null` | Placeholder; “started series finished” would require started/finished state |
| `media_insights` | `object` | `{ binge_streak, favorite_director, top_studio }` – all `null` placeholders for future API |

Existing analytics fields used by the Media tab:

- `comprehensive_stats.totals`: `total_movies_watched`, `total_episodes_watched`, `total_watch_time`
- `comprehensive_stats.averages`: `avg_watch_time_per_day`
- `comprehensive_stats.period.days`
- `comprehensive_stats.daily_stats` (fallback for daily chart when `media_weekly_watch` missing)
- `platform_distribution.trakt`: `movies`, `episodes`, `watch_time`

## Service methods (analytics)

- `get_media_movies_change(user, days)` – current vs previous period movie count; `change = current - previous`.
- `get_media_weekly_watch(user, days)` – last 7 days: movies count, episodes count, watch_time_hours (2h per movie, 45m per episode).
- `get_media_watch_breakdown(user, days)` – movies_percentage and tv_percentage of total estimated watch time.
- `get_media_series_count(user, days)` – distinct shows with ≥1 episode watch in period.
- `get_media_genre_distribution(user, days)` – returns `{ genres: [], total_count: 0 }` (no genre on Trakt watch models).
- `get_media_completion_rate(user, days)` – returns `None`; would need “started” vs “finished” series.
- `get_media_insights(user, days)` – returns `{ binge_streak: None, favorite_director: None, top_studio: None }` for future use.

## Not available / placeholders

1. **Movies: Re-watched vs Premieres**  
   Not distinguished in current Trakt sync; would require extra metadata or Trakt API support.

2. **Completion Progress**  
   “Started series finished” would require defining and storing “started” and “finished” (e.g. all episodes watched) per show.

3. **Recurring Genres**  
   No genre on `MovieWatch`/`EpisodeWatch` (or Movie/Show). Would need Trakt genre/tag data or another source and storage.

4. **Binge Streak**  
   Would need “max episodes in one day” or similar; can be computed later from `EpisodeWatch` + date grouping.

5. **Favorite Director / Top Studio or Network**  
   Would require director/studio/network on Movie or Show and aggregation.

## Component status

- **MediaStats.tsx** uses all implemented fields and falls back when data is missing (“—”, “not tracked yet”, “not available from Trakt yet”).
- Recurring Genres shows a single teal arc and message when `media_genre_distribution.genres` is empty.
- Completion Progress shows “—” when `media_completion_rate` is null; when it’s a number, the bar is shown.

## Files touched

- `analytics/services.py` – media helpers and their use of `trakt.models` (MovieWatch, EpisodeWatch).
- `analytics/views.py` – added media fields to the analytics response and cache key list.
- `UI/.../MediaStats.tsx` – new layout and wiring to the above fields.
- `UI/.../AnalyticsPage.tsx` – `AnalyticsData` interface extended with the new media fields.
