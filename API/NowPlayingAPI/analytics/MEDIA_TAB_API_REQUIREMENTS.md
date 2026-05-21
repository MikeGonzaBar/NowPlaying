# Movies & TV Tab API

This document describes the API fields used by the Movies & TV Analytics tab.

## Implemented

All fields below are returned by `GET /analytics/?days=30` and used by `MediaStats.tsx`.

| Field | Type | Description |
|-------|------|-------------|
| `media_movies_change` | `object` | `{ change, current, previous }` for movies this period vs previous period |
| `media_weekly_watch` | `array` | Last 7 days: `{ date, day_name, movies, episodes, watch_time_hours }` |
| `media_watch_breakdown` | `object` | `{ movies_percentage, tv_percentage }` from estimated movie/episode watch time |
| `media_series_count` | `number` | Distinct shows with at least one episode watched in the period |
| `media_genre_distribution` | `object` | `{ genres, total_count, total_items }` from stored `Movie.genres` and `Show.genres` |
| `media_completion_rate` | `number \| null` | `null` when a reliable full episode catalog is unavailable |
| `media_insights` | `object` | `{ binge_streak, favorite_director, top_studio }` from stored watch metadata |

Existing analytics fields used by the Media tab:

- `comprehensive_stats.totals.total_movies_watched`
- `comprehensive_stats.totals.total_episodes_watched`
- `comprehensive_stats.totals.total_watch_time`
- `comprehensive_stats.averages.avg_watch_time_per_day`
- `comprehensive_stats.period.days`
- `platform_distribution.trakt`

## Metadata Source

Trakt sync stores additional TMDB metadata on media records:

- `Movie.genres`, `directors`, `studios`, `runtime`, and `rating`
- `Show.genres`, `network`, `status`, `runtime`, and `rating`

Existing records can be enriched with:

```bash
python manage.py backfill_media_metadata --user-id <id> --limit 200
```

## Remaining Optional Work

- Distinguish re-watches vs premieres if that data is added to the sync pipeline.
- Compute completion percentage only after storing or fetching the complete episode catalog for a show.

## Files

- `trakt/models.py` – stored metadata fields and TMDB metadata fetchers.
- `trakt/management/commands/backfill_media_metadata.py` – metadata backfill command.
- `analytics/services.py` – media genre distribution, completion status, and insights.
- `analytics/views.py` – analytics response wiring.
- `UI/.../MediaStats.tsx` – Movies & TV tab display.
