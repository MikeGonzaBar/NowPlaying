# Cache Policy

This document defines every server-side cache the NowPlaying API uses, its
time-to-live (TTL), and exactly when it is invalidated. It also covers the
client-side caches and the rules new cache entries must follow.

## Backend cache infrastructure

| Setting | Value |
|---|---|
| Backend | Redis (`django.core.cache.backends.redis.RedisCache`) |
| Location | `redis://$REDIS_HOST:$REDIS_PORT/1` |
| Key prefix | `nowplaying` (all keys are namespaced; no collision with other apps) |
| Default TTL | 3600 s (`CACHES["default"]["TIMEOUT"]`) |

Named TTLs live in `NowPlayingAPI/settings.py` under `CACHE_TIMEOUTS`:

| Name | TTL | Used by |
|---|---|---|
| `MUSIC` | 900 s (15 min) | Music stored-songs pages |
| `STEAM_GAMES` | 1800 s (30 min) | Steam library fetch |
| `SEARCH_RESULTS` | 300 s (5 min) | Cross-platform game search |
| `ANALYTICS` | 3600 s (1 h) | Analytics dashboard |
| `USER_PROFILE` | 1800 s (30 min) | Profile endpoints |

## Cache keys, TTLs, and invalidation

### Analytics (`analytics/views.py`, `analytics/services.py`)

| Key pattern | TTL | Notes |
|---|---|---|
| `analytics_{user}_{days}[_{date}]` | 3600 s | Main dashboard payload. `?nocache=1` on `GET /api/analytics/` deletes it before reading. |
| `platform_dist_{user}_{days}_{date}` | 3600 s | Platform distribution aggregation. |
| Internal service caches | 3600 s | `AnalyticsService` sub-results (`services.py`). |

**Invalidation:** `AnalyticsService.invalidate_user_cache(user_id)` deletes
`analytics_{user}_{days}`, `analytics_{user}_{days}_{today}`, and
`platform_dist_{user}_{days}_{today}` for `days` 1–365. It is called by:
- `invalidate_music_caches` (music sync in `music/views.py`)
- `invalidate_trakt_caches` (Trakt sync in `trakt/views.py`)

### Music (`music/views.py`)

| Key pattern | TTL | Notes |
|---|---|---|
| `music_dashboard_stats_{user}_{days}` | 300 s | Music dashboard stats endpoint. |
| `stored_songs_{user}_{source}_{page}_{page_size}` | 900 s | Paginated stored-song lists. |

**Invalidation:** `invalidate_music_caches(user_id)` deletes
`music_dashboard_stats_{user}_{days}` for `days` 1–365 plus the analytics
entries above. Runs after any Last.fm/Spotify sync.

### Steam (`steam/views.py`)

| Key pattern | TTL | Notes |
|---|---|---|
| `steam_games_{user}_{steam_id}` | 1800 s | Raw Steam Web API library fetch. |
| `steam_stored_{user}` | 900 s | Stored Steam game list. |
| `steam_playtime_{user}` | 900 s | Aggregated playtime. |
| `steam_achievements_{user}` | 900 s | Achievement summaries. |

### Trakt / TMDB (`trakt/views.py`)

| Key pattern | TTL | Notes |
|---|---|---|
| `completed_media_{user}` | 300 s | Completed movies/shows payload. |
| `tmdb_proxy_detail_{type}_{tmdb_id}_{append}` | 600 s | Server-side TMDB proxy (key never leaves the backend). |
| `tmdb_proxy_providers_{type}_{tmdb_id}` | 600 s | TMDB watch providers. |
| `tmdb_proxy_videos_{type}_{tmdb_id}` | 600 s | TMDB trailers. |

**Invalidation:** `invalidate_trakt_caches(user_id)` deletes
`completed_media_{user}` plus the analytics entries above after Trakt data
changes.

### Games search (`NowPlayingAPI/urls.py`)

| Key pattern | TTL | Notes |
|---|---|---|
| `search_{user}_{query}` | 300 s | Cross-platform `games/search/` results. |

`games/detail-by-title/`, `games/detail-by-id/`, and `games/detail/` are
**not cached**: they are per-user, per-game reads (detail includes full
achievements for the selected platform only) and must reflect syncs
immediately.

**Deferred provider loading contract:** these detail endpoints each embed a
`recency_rank: {rank, total}` object in every platform payload (rank of the
game within its own platform library by most-recent play). The game detail
page uses this for the "#N Most Played" badge and therefore never requests
`steam/get-game-list-stored/`, `psn/get-game-list-stored/`,
`retroachievements/fetch-games/`, or `xbox/get-game-list-stored/`. If you add
a new platform to these endpoints, call `_with_recency_rank()` on its payload
(`NowPlayingAPI/urls.py`) so the badge keeps working.

### Not cached

- PSN, Xbox, and RetroAchievements list endpoints (single-user reads;
  add per-user caching only with the rules below if profiling shows a need).
- Auth, token refresh, and API-key endpoints (must never be cached).
- Any response containing credentials, tokens, or third-party API keys.

## Invalidation flow summary

```text
Last.fm / Spotify sync  ──▶ invalidate_music_caches ──▶ music_dashboard_stats_{user}_{1..365}
                                            └──────────▶ AnalyticsService.invalidate_user_cache
Trakt sync              ──▶ invalidate_trakt_caches  ──▶ completed_media_{user}
                                            └──────────▶ AnalyticsService.invalidate_user_cache
Steam sync              ──▶ deletes steam_stored / steam_playtime / steam_achievements
```

Whenever a write path changes data that feeds a cached aggregation, it must
call the matching invalidation helper. New aggregation windows (e.g. a `days`
value > 365) must be added to the invalidation loops.

## Rules for new cache entries

1. **User-scope every key.** All keys embed the user id; never cache a shared
   key across users (data-isolation and privacy requirement).
2. **Pick the tightest correct TTL.** Sync-fed dashboards: 300–900 s.
   Expensive third-party reads: 1800–3600 s. Never an infinite timeout.
3. **Never cache secrets.** No API keys, tokens, or raw third-party payloads
   containing credentials may be stored or logged.
4. **Pair every write with invalidation.** A sync that changes source data
   must invalidate the aggregations derived from it (see flow above).
5. **Sanitize the key.** Keys must never contain credentials or unbounded
   input (bound lengths before building the key).
6. **Provide a bypass** for expensive dashboards (`?nocache=1` pattern) so
   support can force a recompute without a deploy.

## Frontend caches

| Cache | Location | Lifetime | Purpose |
|---|---|---|---|
| `mediaCache` | `src/pages/movies/hooks/useMediaDetails.ts` | SPA session (in-memory `Map`) | Movie/show TMDB details, one entry per `mediaType-id`; prevents re-fetch loops when revisiting a detail page. |
| TMDB proxy responses | Server-side (keys above) | 600 s | The browser never talks to TMDB directly and never sees the API key. |
| Dev duplicate-GET detector | `src/utils/auth.ts` | Dev builds only | Warns after 5 identical GETs within 2 s (`duplicate_request_detected`); stripped from production bundles. |

There is no service worker or persistent HTTP cache policy for API responses;
all freshness is owned by the server-side TTLs above.

## Frontend resilience

| Guard | File | Purpose |
|---|---|---|
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | Catches render-time exceptions so one broken module can never collapse a whole route to blank (used by Analytics). |
| `normalizeAnalyticsData` | `src/pages/analytics/AnalyticsPage.tsx` | Coerces any analytics payload (complete/partial/malformed) to the full schema the dashboard modules expect, so `comprehensive_stats: {}` renders as zeros instead of throwing `.days` TypeErrors. |
| Bounded game-detail timeout | `src/pages/games/hooks/useGameDetail.ts` | Legacy/unknown provider-id routes fail explicitly after 15s (with a useful "could not be resolved" state + Retry) instead of loading forever. |
| Contract tests | `API/NowPlayingAPI/analytics/tests.py` | Lock the API boundary: a failing section returns 200 + `partial_failures` + `request_id`; all dashboard sections exist in the schema. |

