# Music Tab API

This document describes the API fields used by the Music Analytics tab.

## Implemented

All fields below are returned by `GET /analytics/?days=30` and used by `MusicStats.tsx`.

| Field | Type | Description |
|-------|------|-------------|
| `top_artist` | `object \| null` | `{ name, scrobbles, top_album? }` from songs in the selected period |
| `top_track` | `object \| null` | `{ title, artist, plays, recently_played? }` from songs in the selected period |
| `new_discoveries` | `object` | `{ new_artists_count, change_percentage? }` for artists first seen in the period |
| `music_listening_insights` | `object \| null` | `{ morning_vs_evening, evening_percentage, scrobble_milestone }` |
| `music_genre_distribution` | `object` | `{ genres, total_count, tagged_songs }` aggregated from `Song.genre_tags` |
| `music_weekly_scrobbles` | `array` | Last 7 days: `{ date, day_name, scrobbles }` for the chart |
| `genre_of_the_week` | `string \| null` | Top genre from the recent 7-day listening window |

Existing analytics fields used by the Music tab:

- `comprehensive_stats.totals.total_songs_listened`
- `comprehensive_stats.totals.total_listening_time`
- `comprehensive_stats.averages.avg_listening_time_per_day`
- `comprehensive_stats.period.days`
- `last_played_time`
- `platform_distribution.spotify`
- `platform_distribution.lastfm`

## Genre Tags

Music genres are populated from Last.fm artist top-tags:

- Last.fm sync calls `artist.getTopTags` per artist and stores normalized tags on `Song.genre_tags`.
- `backfill_music_genres` can enrich existing listening history.
- Analytics counts tag occurrences across songs in the selected period and returns the top six genres.
- Non-genre tags such as `seen live` and decade labels are filtered out.

## Remaining Optional Work

- Add per-day average listening duration to `music_weekly_scrobbles` if the chart should compare scrobble volume against average duration.
- Add Spotify-side genre enrichment if Spotify artist metadata is added later.

## Files

- `music/models.py` – `Song.genre_tags`, Last.fm tag lookup, and tag normalization.
- `music/management/commands/backfill_music_genres.py` – backfill command for existing scrobbles.
- `analytics/services.py` – music genre distribution and genre of the week.
- `analytics/views.py` – analytics response wiring.
- `UI/.../MusicStats.tsx` – Music tab display.
