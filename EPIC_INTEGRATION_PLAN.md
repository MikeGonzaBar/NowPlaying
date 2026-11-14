# Epic Games Integration Plan

Adding **Epic Games Store** as a game provider in NowPlaying: owned library, store
metadata, Epic achievements, and cumulative launcher playtime.

Epic has no public user API. This plan is built on the same undocumented launcher
endpoints that **legendary**, **Heroic** and **Playnite** use. Every endpoint in
[Appendix A](#appendix-a--verified-api-surface) was read from
[`legendary-gl/legendary`](https://github.com/legendary-gl/legendary)
(`legendary/api/egs.py`, `legendary/models/gql.py`) on **2026-11-10**, not from
model memory.

---

## Verdict

| Capability | Verdict | Confidence | Basis |
|---|---|---|---|
| Owned library / entitlements | ✅ Yes | ~90% | Three independent OSS projects, stable for years |
| Store metadata (title, description, art, dev/publisher) | ✅ Yes | ~95% | Public catalog service, no auth required |
| Achievement **definitions** (incl. locked) | ✅ Yes | ~90% | `Achievement.productAchievementsRecordBySandbox` |
| Per-user achievement state + unlock timestamps | ✅ Yes | ~80% | `PlayerAchievement.playerAchievementGameRecordsBySandbox` |
| Achievement **coverage across a library** | ⚠️ Partial | ~40–60% of titles | Only games that shipped Epic achievements |
| Total playtime | ✅ Yes, cumulative | ~90% | Launcher library-service `playtime/account/{id}/all` endpoint (see Phase 3) |
| Last played / session timestamps | ❌ No | ~95% | Playtime payload has only `artifactId` + `totalTime` |
| Login + long-lived session | ⚠️ Yes, fragile | ~80% | Refresh window ≈ 8h; see [Token lifecycle](#token-lifecycle) |

**Bottom line:** Epic now reaches Steam parity for library, metadata, achievements
and total playtime. It does not expose last-played or per-session timestamps, so
recent activity is derived from achievement unlock dates.

### Non-goals

EOS Connect (game-scoped OAuth), in-game overlays/presence, wishlists, free-game
claiming, install/launch/patching, cloud saves. None of these are needed to track
habits, and each one multiplies the maintenance surface.

---

## What the earlier research got wrong

These corrections drive the design, so they are recorded here rather than
discovered mid-implementation.

| Claim | Reality |
|---|---|
| Token endpoint is `api.epicgames.dev/epic/oauth/v2/token` | That is **EOS Connect** (per-game, developer-portal client). The account flow uses `account-public-service-prod03.ol.epicgames.com/account/api/oauth/token` with **HTTP Basic** auth and `token_type=eg1`. |
| Launcher client ID is `35847230417d4022a0692ba464506f34` | Unverified. Legendary uses `34a02cf8f4414e29b15921876da36f9a`. Use the verified pair, or read the current one from `legendary/api/egs.py`. |
| Refresh token lasts "days/weeks" | Reported as `refresh_expires: 28800` (**8h**) with a 2h access token. Confirm in Phase 0 — it decides the scheduler design. |
| Achievements are read via EOS | They are read via **Store GraphQL** at `launcher.store.epicgames.com/graphql`, keyed by product `namespace`. EOS is the in-game writer, not the reader. |
| Playtime is queryable from the backend | Corrected 2026-11-14: the launcher publishes playtime to `library-service.live.use1a.on.epicgames.com` and `GET /library/api/public/playtime/account/{account_id}/all` returns `[{accountId, artifactId, totalTime}]` in seconds. It is cumulative only — no last-played or session history. |

> The client ID/secret above are constants baked into Epic's public launcher. They
> are not your credentials, but they are Epic's and can change at any time.

---

## Architecture fit

The app already has everything this needs. Epic is a **new provider app**, not a
new subsystem.

```
API/NowPlayingAPI/
├── epic/                     # NEW — mirrors steam/
│   ├── auth.py               # token payload parse/serialize (copy playstation/auth.py pattern)
│   ├── models.py             # EpicGame, EpicAchievement, EpicAPI adapter
│   ├── serializers.py
│   ├── views.py              # EpicViewSet
│   ├── admin.py
│   ├── migrations/
│   └── tests.py + fixtures/
├── users/
│   ├── credentials.py        # SERVICE_LABELS += "epic"
│   └── sync_service.py       # PROVIDER_INTERVALS / _run_provider / _save_key
├── NowPlayingAPI/
│   ├── settings.py           # INSTALLED_APPS
│   └── urls.py               # router + cross-platform endpoints
└── analytics/                # platform aggregation
```

Reuse, don't reinvent:

- **Token storage:** `UserApiKey` + `users/crypto.py` (Fernet) already holds an
  encrypted blob. PlayStation stores a JSON token payload there
  (`playstation/auth.py:11-62`) and rotates it through a callback
  (`users/sync_service.py:157`, `:182`). Epic uses the same pattern — **no new
  token model**.
- **HTTP:** `http_client.py` (retry/backoff on 429/5xx) for every Epic call.
- **Scheduling:** `SyncJob` + `users/management/commands/run_sync.py`.
- **Models:** `steam/models.py:10-67` is the shape to mirror so the existing UI
  percentage/type-guard code has minimal new branches.

### Token lifecycle

This is the one genuinely new constraint.

| Token | Lifetime | Consequence |
|---|---|---|
| Access | ~7200s (2h) | Any long-running sync must handle a mid-run 401 and refresh once |
| Refresh | ~28800s (8h) | **A daily-only sync will never succeed twice.** |

`PROVIDER_INTERVALS` already runs games every 6h (`sync_service.py:14-23`), which
is inside the 8h window and keeps the chain alive indefinitely **provided the
worker stays up**. The hazard is the optional per-connection daily `sync_time`
path (`sync_service.py:112-121`): a user who picks "sync at 03:00" gets an Epic
job once every 24h, and the refresh token is dead by then.

Mitigations (pick one, both are cheap):

1. **Interval-only for Epic** — ignore `sync_time` for provider `epic`.
2. **Re-auth signal** — catch refresh `400/401`, set `needs_reauth`, surface a
   "Reconnect Epic" state in the UI. Needed regardless as a fallback.

Recommended: both. (1) for the normal path, (2) for password changes and revocations.

Also persist the **rotated** refresh token on every successful refresh, or the
session dies at the 8h mark even while the worker is up.

---

## Phase 0 — Spike (1–2 days, throwaway)

Objective: replace assumptions with measurements before writing Django code.

1. Script in `scratch/epic_spike.py` (git-ignored), no Django imports.
2. Complete one login, then call in order: entitlements → library items →
   catalog bulk items → both GraphQL queries for 15 games.
3. Save **raw** responses to `API/NowPlayingAPI/epic/tests/fixtures/`
   (`token.json` redacted, `library.json`, `catalog_<ns>.json`,
   `achievements_defs_<ns>.json`, `achievements_user_<ns>.json`).
4. Record: real `expires_in`, `expires_at`, `refresh_expires`,
   `refresh_expires_at`; library page/cursor count; which catalog fields are
   useful (`title`, `description`, `developerDisplayName`, `publisherDisplayName`,
   `keyImages`).
5. Fetch the launcher playtime totals (`/api/public/playtime/account/{id}/all`)
   and map `artifactId` → library `appName`. Record that the payload carries no
   last-played or per-session timestamps.

**GATE 0**
- [ ] Token lifetimes recorded from a real response (not the assumed 7200/28800).
- [ ] Two consecutive refreshes work and rotate `refresh_token`; old token is rejected.
- [ ] Library syncs fully via cursor (`responseMetadata.nextCursor`).
- [ ] ≥ 5 of 15 games return `totalAchievements > 0`, with at least one locked
      achievement carrying description + icon.
- [ ] Unlock timestamps parse to UTC correctly (`unlockDate`).
- [ ] **Go/no-go:** if achievement coverage is ~0 for the target library, descope
      achievements and ship library-only.

---

## Phase 1 — Backend app `epic/`

Objective: a working, tested provider behind the existing sync machinery.

1. **`epic/auth.py`** — `parse_epic_auth_payload` / `serialize_epic_auth_payload`
   (versioned JSON: `access_token`, `refresh_token`, `account_id`, `expires_at`,
   `refresh_expires_at`), plus `ensure_fresh_token()` that refreshes when
   `expires_at - 5min < now`.
2. **`epic/models.py`**
   - `EpicGame`: `user`, `appid` (catalog item id, **string** — not an integer),
     `namespace`, `app_name`, `name`, `description`, `developer`, `publisher`,
     `cover_image`, `last_played`, `playtime_minutes` (default 0 = unknown),
     `playtime_source` (`none|epic|manual|agent`), `metadata` JSON.
     `unique_together = ("user", "appid")`.
   - `EpicAchievement`: `game`, `achievement_name`, `display_name`, `description`,
     `icon`, `unlocked`, `unlock_time`, `progress`, `xp`, `rarity_percent`,
     `hidden`, `is_base`. `UniqueConstraint(game, achievement_name)`.
   - `EpicAPI`: `fetch_entitlements` → `fetch_library` → `fetch_catalog` →
     `fetch_achievement_defs` → `fetch_player_achievements` → `sync`.
     Use `bulk_create(..., update_conflicts=True)` like `steam/models.py:195-201`.
3. **`epic/views.py`** — `EpicViewSet` with `auth-status/`, `authenticate/`
   (accepts pasted redirect URL **or** exchange code), `get-game-list/`,
   `get-game-list-stored/`, `refresh-token/`.
4. **Registration:** `INSTALLED_APPS` (`settings.py:91`), router
   (`urls.py:596-603`), `SERVICE_LABELS` (`users/credentials.py:11-19`),
   `PROVIDER_INTERVALS["epic"] = timedelta(hours=6)`, `_run_provider` branch
   (`sync_service.py:146-179`).
5. **Tests:** recorded fixtures only — no network in CI. Cover token refresh,
   rotation persistence, cursor pagination, achievement upsert idempotency, and
   the "dead refresh token" path.

**GATE 1**
- [ ] Connect → sync → `get-game-list-stored` returns games with achievements.
- [ ] Re-running sync is idempotent (no duplicate games or achievements).
- [ ] Deleting the access token in the DB triggers a transparent refresh; the new
      refresh token is persisted (not just held in memory).
- [ ] Revoking the refresh token produces a typed `needs_reauth`, not a 500.
- [ ] No token material in logs; `key_hash` is ciphertext.
- [ ] `python manage.py test` green.
- [ ] **Rollback anchor:** delete the `epic` app + migration; no other tables touched.

---

## Phase 2 — Cross-platform surface

Objective: Epic behaves like a first-class platform instead of a side page.

1. **API:** add `epic` to the platform sets in `urls.py` — `games_search` (`:145`),
   `games_detail_by_title` (`:265`), `games_detail_by_id` (`:412`) and
   `games_detail` (`:528`). Epic `appid` is a **string**, so it must bypass the
   `_is_positive_int` guard used for Steam/RetroAchievements.
2. **Analytics:** include Epic in platform distribution, time investment and
   "Most Achieved". Epic games with zero achievements must not skew percentages.
3. **UI:**
   - service card in `UI/now-playing-ui/src/pages/profile/utils/serviceConfig.ts`
     (recommended: `requiresOAuth: true`-style connect flow with a paste step,
     mirroring the PSN entry at `:15-25`),
   - platform metadata in `UI/now-playing-ui/src/pages/games/utils/types.ts:179-204`,
   - `isEpicGame()` type guard + a branch in `calculateAchievementPercentage`
     (unlocked/total, no trophies/points).
4. **Copy:** playtime is a cumulative launcher total, so label it "lifetime" in
   analytics; games never launched through Epic remain "unknown", not "0
   minutes".

**GATE 2**
- [x] Epic appears in search, detail-by-title, detail-by-id and analytics.
- [ ] Cross-platform title matching works for a game owned on both Steam and Epic.
- [ ] Achievement percentage correct for 0 / partial / full completion.
- [ ] A 9h soak with the worker running leaves the session alive (proves the
      6h interval beats the 8h refresh window).
- [ ] **Rollback anchor:** hide the UI card behind a flag; backend stays live.

---

## Phase 3 — Playtime (resolved 2026-11-14)

Earlier research concluded the backend could not read Epic playtime. That was
wrong: the launcher publishes it to the same library service used for the owned
library.

```
GET https://library-service.live.use1a.on.epicgames.com
    /library/api/public/playtime/account/{account_id}/all
Authorization: bearer <access_token>

[{ "accountId": "...", "artifactId": "<appName>", "totalTime": 139001 }]
```

- `totalTime` is **seconds**, cumulative across all machines for the account.
- `artifactId` matches the library record's `appName`, not `catalogItemId` or
  `namespace`.
- A product may have several app builds. Reports for the same namespace describe
  the same sessions, so the **maximum** total wins; summing would double-count.
- There is no `lastPlayed`, session list, or date range. Playtime is therefore a
  lifetime figure (`playtime_scope: "lifetime"` in analytics), and recent
  activity still comes from achievement `unlockDate`.
- Games never launched through the Epic launcher return no artifact: they stay
  `playtime_source="none"` (unknown), never zero.
- Manual/agent totals are authoritative and are not overwritten by a sync.

**GATE 3**
- [x] Endpoint verified against a live account (51 artifacts, 51/51 appName
      matches, 49 namespaces).
- [x] Analytics and "time played" sorting treat `playtime_source="none"` as
      unknown, not zero hours.
- [x] Duplicate artifacts deduped by namespace using the maximum total.

---

## Phase 4 — Hardening & maintenance

1. **Failure taxonomy:** `needs_reauth` (fatal, stop retries) vs transient
   (5xx/429, existing retry/backoff). Do not burn 3 retries on a dead token —
   `sync_service.py:197-201` already distinguishes credential errors; Epic must
   map into `InvalidServiceCredentials`.
2. **Rate limits:** catalog calls are per-namespace; batch and cache metadata
   (Redis, `CACHE_TIMEOUTS`) instead of refetching every 6h.
3. **Observability:** log endpoint + status + duration, never headers or tokens;
   alert when Epic syncs fail for >24h across users (likely an upstream change).
4. **Upstream watch:** subscribe to `legendary-gl/legendary` commits. They patch
   breakage within days; you want to know before your users do.
5. **Re-run Phase 0 quarterly** against a real account to catch schema drift.

**GATE 4**
- [ ] Dead-token path verified with retries suppressed.
- [ ] Metadata cache hit rate measured; catalog calls per sync bounded.
- [ ] Runbook entry: "Epic sync broken → check legendary → update endpoints → re-run fixture tests."

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Epic changes an endpoint | Medium (ongoing) | Sync breaks | Fixtures + one adapter class + watch legendary |
| 8h refresh window vs daily scheduling | High if unaddressed | Silent daily failures | Force interval sync; persist rotation; `needs_reauth` UI |
| Low achievement coverage | High | Sparse dashboard | Descope-ready; label coverage in UI |
| Login friction (captcha/2FA) | Medium | Abandoned connects | Paste-the-redirect flow with clear instructions |
| Token leakage | Low | Account compromise | Fernet at rest, no logging, minimize retention |
| ToS/account risk | Low (personal use) | Account action | Personal-use framing; no automation of login credentials |
| GPL contamination | Medium | Licensing limits | Use legendary as a **spec**, not copy-paste (see below) |

---

## Appendix A — Verified API surface

Read from `legendary` `master` on 2026-11-10. All authenticated calls use
`Authorization: bearer <access_token>`.

**OAuth**

```
POST https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token
Authorization: Basic base64(<client_id>:<client_secret>)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code | exchange_code | refresh_token | client_credentials
code=<authorization_code>            # with authorization_code
exchange_code=<code>                 # with exchange_code
refresh_token=<token>                # with refresh_token
token_type=eg1
```

```
GET  /account/api/oauth/verify        # validate session, refresh local expiry data
GET  /account/api/oauth/exchange      # short-lived exchange code (handoff to other clients)
```

Login URL (what the user opens):

```
https://www.epicgames.com/id/login?redirectUrl=<urlencoded redirect>
# redirect = https://www.epicgames.com/id/api/redirect?clientId=<client_id>&responseType=code
```

**Library & ownership**

```
GET https://entitlement-public-service-prod08.ol.epicgames.com
      /entitlement/api/account/{accountId}/entitlements?start=0&count=1000

GET https://library-service.live.use1a.on.epicgames.com
      /library/api/public/items?includeMetadata=true[&cursor=<nextCursor>]
    → { records: [...], responseMetadata: { nextCursor } }
```

**Metadata (no user auth needed)**

```
GET https://catalog-public-service-prod06.ol.epicgames.com
      /catalog/api/shared/namespace/{namespace}/bulk/items
      ?id={catalogItemId}&includeDLCDetails=true&includeMainGameDetails=true
      &country={CC}&locale={lang}
```

**Achievements (Store GraphQL)**

```
POST https://launcher.store.epicgames.com/graphql
Content-Type: application/json
User-Agent: EpicGamesLauncher/<version>

# definitions
{ "query": "query Achievement($sandboxId: String!, $locale: String!) { ... }",
  "variables": { "sandboxId": "<namespace>", "locale": "en" } }

# per-user state
{ "query": "query PlayerAchievement($epicAccountId: String!, $sandboxId: String!) { ... }",
  "variables": { "epicAccountId": "<account_id>", "sandboxId": "<namespace>" } }
```

Fields available: `name`, `hidden`, `isBase`, `unlockedDisplayName`,
`lockedDisplayName`, `unlockedDescription`, `lockedDescription`,
`unlockedIconLink`, `lockedIconLink`, `XP`, `rarity.percent`, `tier`;
per user: `unlocked`, `progress`, `unlockDate`, `achievementName`,
`totalUnlocked`, `totalXP`.

`totalAchievements === 0` means the product has no Epic achievements — treat as
"not tracked", not as an error.

**Playtime**

```
GET https://library-service.live.use1a.on.epicgames.com
    /library/api/public/playtime/account/{account_id}/all
Authorization: bearer <access_token>

[ { "accountId": "<account_id>",
    "artifactId": "<appName>",
    "totalTime": 139001 } ]          # seconds, cumulative
```

**Absent:** last-played, per-session history, playtime by date.

## Appendix B — References

| Project | Language | Use it for | Licence |
|---|---|---|---|
| [`legendary-gl/legendary`](https://github.com/legendary-gl/legendary) | Python | **Primary spec** — `api/egs.py` (endpoints, auth, pagination), `models/gql.py` (achievement queries) | GPL-3.0 |
| [`HeroicGamesLauncher/heroic`](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher) | TS/Rust | Second opinion on auth + library flows | GPL-3.0 |
| [`JosefNemec/Playnite`](https://github.com/JosefNemec/Playnite) | C# | Interactive login/session UX; local playtime approach | See repo `LICENSE.md` |
| [`egdata.app`](https://egdata.app) | API | Pre-parsed catalog + achievement **definitions** (no user progress) | Check terms |
| Epic EOS docs | — | Achievement semantics (sets, XP, hidden) — **not** library access | Epic ToS |

> NowPlaying has no root `LICENSE` today. Keep GPL-3.0 sources as documentation
> only; if the repo is ever licensed, copied GPL code would force GPL on the
> whole project.

## Appendix C — Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-10 | Use account OAuth (`account-public-service-prod03`), not EOS Connect | EOS is per-game and requires a developer client; account OAuth is what launcher flows use |
| 2026-11-10 | Achievements via Store GraphQL | Verified: returns locked + unlocked + timestamps with a plain account token |
| 2026-11-10 | Reuse `UserApiKey` JSON payload; no new token table | Same proven pattern as PSN; rotation callback already exists |
| 2026-11-10 | Playtime = Phase 3, default "omit" | No server-side source; agent is a separate product |
| 2026-11-14 | Playtime now synced from launcher library-service, cumulative only | Endpoint verified live: 51 artifacts, 49 namespaces, seconds; no session timestamps |

---

## Implementation status (2026-11-14)

Implemented, uncommitted, in this worktree:

| Area | Status |
|---|---|
| `epic/` Django app (`auth.py`, `api.py`, `views.py`, serializers, admin, migration) | Done |
| Account OAuth + Fernet token persistence + rotation | Done |
| Library sync (entitlements → library items → catalog metadata) | Done |
| Achievements via Store GraphQL (`Achievement` + `PlayerAchievement`) | Done, verified against a live account (257 games with sets) |
| Playtime via library-service (`playtime/account/{id}/all`) | Done, cumulative seconds mapped by `appName`, max per namespace |
| Entries in `settings.py`, `users/credentials.py`, `users/sync_service.py`, `users/serializers.py`, `NowPlayingAPI/urls.py` | Done |
| Analytics distribution + completed-games count | Done (`playtime_scope: "lifetime"`) |
| Games UI (cards, achievements, platform filters, detail view, comparison) | Done |
| Profile connect flow (`useEpicAuth`, `ServiceCard`, `ServiceSection`) | Done |
| `public/Platforms/epic.svg` | Done (recreated badge + wordmark) |
| Epic-only Django tests | 33 pass |
| Full Django suite | 150 run, 1 error — pre-existing and unrelated (`users.tests.BrowserSessionTests.test_user_login`: `self.user_data` never set in `setUp`) |
| UI `tsc -b` | Clean |

**Live-account validation (2026-11-13, Docker stack):**

The connect flow and a full sync were completed against a real account, which
surfaced and fixed three issues that synthetic fixtures had hidden:

- **Library records are `recordType: APPLICATION`, not `entitlementType:
  EXECUTABLE`.** The original filter dropped every library record, so only
  entitlement-only titles synced (1 game out of 533). Fixed; the filter now
  accepts application records and entitlement merge only supplements them.
- **catalog-public-service requires a bearer token.** The metadata lookup was
  unauthenticated, so every item answered 401 and games fell back to internal
  codenames. The user's access token is now sent (cached for a week).
- **One product, several applications.** The library lists builds/content packs
  per namespace (533 namespaces from 618 records), so products are deduped by
  namespace and the best record is used; catalog ids are kept as metadata
  fallbacks.

Result on a 533-game library: 533 games stored, all with cover art and real
titles, 257 with achievement sets. The sync runs catalog and achievement calls
in a 6-worker pool with cached definitions, taking ~3.5 min warm and ~4 min
cold; the first-connect manual sync fits inside the raised 600s proxy/gunicorn
timeouts. Two Store GraphQL calls per game still dominate the time (no bulk
endpoint), so scheduled syncs (worker path) remain the recommended route.

**Playtime validation (2026-11-14):** the launcher playtime endpoint returned
51 artifacts for the same account. All 51 matched a library `appName`, collapsing
to 49 namespaces; Brotato reported `totalTime=139001` (38.61h). Guardians of the
Galaxy and Tropico 5 each had two build artifacts with identical totals, which
is why mapping takes the maximum per namespace instead of summing.

**Still needs a real account (Phase 0 gate):**

- Run `API/scripts/epic_spike.py` to confirm token lifetimes (assumed 2h
  access / 8h refresh) and record a captured fixture set for `testdata.py`.
  Real library/achievement shapes are now validated, but the fixtures remain
  hand-written approximations.
- `epic.svg` is a vector recreation of the Epic Games mark (dark badge,
  "EPIC GAMES" wordmark, chevron), not the official brand asset — swap in the
  real logo if brand fidelity matters.

**Known limitations (by design):**

- Playtime is cumulative lifetime only. Games never launched through the Epic
  launcher have no artifact, so `playtime_known=false` and the UI shows "—";
  this means unknown, not zero. Analytics labels the figure "(lifetime)".
- Epic is interval-only (6h) because the refresh window is shorter than 24h.
- Epic has no last-played timestamp or per-session history. The list is ordered
  by `acquired_at` so the library is visible; that date is never shown as a play
  date. Recent activity uses achievement unlock dates.
- Achievement sync costs two Store GraphQL calls per owned product (definitions
  are cached for a week, but the per-account state must be re-read), so a
  500-game library takes a few minutes per sync; there is no bulk endpoint.
  Metadata is cached in `EpicGame.metadata`. A large library also makes Epic's
  GraphQL answer 429, which is why syncs are capped at six concurrent requests
  with extra retries.
- Only launcher-compatible OAuth clients work. Epic Dev Portal clients created
  under "Epic Online Services" (`xyza...` IDs, e.g. a `TrustedServer` client with
  the Achievements/Connect/Stats scopes) are **EOS** clients: they authenticate
  a game build against EOS, not an Epic account against the Store. Using one
  fails at login with
  `errors.com.epicgames.accountportal.client_has_no_application`
  ("the client has no application associated"). No product setting on the Dev
  Portal changes this, so `EPIC_CLIENT_ID`/`EPIC_CLIENT_SECRET` must stay on the
  public launcher defaults. EOS Connect would be a separate integration and does
  not expose owned Store library or Store achievements.

