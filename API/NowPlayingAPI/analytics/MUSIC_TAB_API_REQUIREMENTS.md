# Music Tab API – Implemented & Optional

This document describes what the Music Analytics tab uses from the API and what is left as placeholder for future work.

## Implemented (in analytics response)

All of the following are returned by `GET /analytics/?days=30` and used by the Music tab UI.

| Field | Type | Description |
|-------|------|-------------|
| `top_artist` | `object \| null` | `{ name, scrobbles, top_album? }` – top artist in period by scrobble count |
| `top_track` | `object \| null` | `{ title, artist, plays, recently_played? }` – top track in period |
| `new_discoveries` | `object` | `{ new_artists_count, change_percentage? }` – artists first seen in period; optional % vs previous period |
| `music_listening_insights` | `object \| null` | `{ morning_vs_evening, evening_percentage, scrobble_milestone: { current, target, percentage } }` |
| `music_genre_distribution` | `object` | `{ genres: [], total_count: 0 }` – structure ready; genres empty until source has tags |
| `music_weekly_scrobbles` | `array` | Last 7 days: `{ date, day_name, scrobbles }` for the “Scrobbles per Day” chart |
| `genre_of_the_week` | `string \| null` | Placeholder; currently always `null` (no genre data) |

Existing analytics fields used by the Music tab:

- `comprehensive_stats.totals.total_songs_listened`, `total_listening_time`
- `comprehensive_stats.averages.avg_listening_time_per_day`
- `comprehensive_stats.period.days`
- `comprehensive_stats.daily_stats` (fallback for scrobbles per day if `music_weekly_scrobbles` missing)
- `last_played_time`
- `platform_distribution.spotify` / `platform_distribution.lastfm` (available for future use)

## Service methods (analytics)

- `get_top_artist(user, days)` – from `Song` in period.
- `get_top_track(user, days)` – from `Song` in period; `recently_played` via `_format_time_ago`.
- `get_new_discoveries(user, days)` – artists in period that were not played before period start; optional % change vs previous period.
- `get_music_listening_insights(user, days)` – morning (05–12) vs evening (18–24) from `played_at`; all-time scrobble milestone (next 50k).
- `get_music_genre_distribution(user, days)` – returns `{ genres: [], total_count: 0 }` (no genre on `Song`).
- `get_music_weekly_scrobbles(user, days)` – last 7 days scrobble counts.
- `get_genre_of_the_week(user, days=7)` – returns `None` (placeholder).

## Not available / placeholders

1. **Music genres**  
   `Song` has no genre/tag field. Options for later:
   - Last.fm: use track/artist tags from Last.fm API and aggregate.
   - Store genre/tags on `Song` (or related model) and populate from provider (e.g. Last.fm, Spotify) when syncing.

2. **Genre of the week**  
   Depends on genre/tag data; once genres are available, can be implemented as “most listened genre in last 7 days”.

3. **Average duration per day (for chart)**  
   The design mentions “Listening volume vs average duration”. Current chart uses only scrobble counts. If desired, the API could add an `avg_listening_minutes_per_day` (or similar) per day in `music_weekly_scrobbles` using `Song.duration_ms` and `played_at` in the analytics service.

## Component status

- **MusicStats.tsx** uses all implemented fields and falls back safely when data is missing (e.g. “—”, “Not available”, or period totals).
- Genres section shows a message when `music_genre_distribution.genres` is empty.
- Genre of the week shows “Not available” when `genre_of_the_week` is null.

## Files touched

- `analytics/services.py` – music helpers and their use of `music.models.Song`.
- `analytics/views.py` – added music fields to the analytics response and cache key list.
- `UI/.../MusicStats.tsx` – new layout and wiring to the above fields.
- `UI/.../AnalyticsPage.tsx` – `AnalyticsData` interface extended with the new music fields.
