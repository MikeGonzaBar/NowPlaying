# NowPlaying → Supabase Migration Plan

Detailed, phase-gated migration from the current **Django + DRF + Postgres + Redis** stack to **Supabase**. Uses a phased **A → B** split:

- **Mode A** (Phases 1–5, recommended baseline): move the data layer to Supabase Postgres while keeping the Django/DRF service layer and Redis.
- **Mode B** (Phase 6, optional, explicit go/no-go): adopt the native Supabase stack (RLS + Supabase Auth + PostgREST/Edge Functions), retiring Django and Redis.

Every phase ends with a hard **GATE** (acceptance criteria + rollback anchor).

---

## Target architecture (two horizons)

```
NOW (Django + DRF + Postgres + Redis)
  │  PHASE 1–5  (Mode A: managed Postgres)
  ▼
Supabase Postgres (PgBouncer/Supavisor)  +  Django/DRF service layer  +  Redis (keep)  +  optional materialized views
  │  PHASE 6 (Mode B, optional, go/no-go)
  ▼
Supabase Postgres + RLS + Supabase Auth + PostgREST/Edge Functions (Django retired, Redis retired, syncs/encryption in a service/edge layer)
```

---

## Credentials & environment variables (Supabase)

The project uses four Supabase connection values referenced throughout this plan. Store them in a **git-ignored** env file (`API/.env` / `.env.supabase`; `.gitignore` already excludes `.env` and `.env.*`), and mirror them into the appropriate runtime/secret store when deployed.

| Variable | Example / source | Used for |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Base URL for PostgREST (`/rest/v1`), Auth (`/auth/v1`), and origin for deriving the Postgres DB host |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Publishable / anon key — safe in browsers & clients; used for unauthenticated / RLS-gated PostgREST calls |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | Secret / service key — server-only, bypasses RLS; never ship to a client or commit |
| `SUPABASE_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` | JWKS endpoint to verify Supabase Auth JWTs (Mode B / Phase 2) |

Derived from `SUPABASE_URL`:
- **Postgres direct host** → `db.<ref>.supabase.co:5432`
- **Postgres session pooler host** → `<ref>.pooler.supabase.co:5432` — Django uses direct or session pooler, **never** the transaction pooler (see Phase 1)

> Mode A connects with a **Postgres role password** (database credentials), not `SUPABASE_SECRET_KEY`. The four `SUPABASE_*` values govern the Supabase platform/API layer (PostgREST, Auth, Edge Functions) and are exercised mainly in Phases 2 and 6.

---

## Phase 0 — Baseline, freeze, and tooling

Objective: a forensic snapshot and reproducible local/prod parity so every later step is reversible.

1. **Freeze the schema & code truth.**
   - Commit/tag current `main` (e.g. `git tag pre-supabase-$(date +%Y%m%d)`).
   - Record `python manage.py makemigrations --check --dry-run` → expect "No changes detected". If it reports drift, resolve it now.
2. **Capture backups of all live systems.**
   - Postgres logical dump: `pg_dump -h $OLD_HOST -U nowplaying_user -d nowplaying -Fc -f backup/nowplaying-$(date +%F).dump`.
   - Verify the dump restores into a scratch local DB (`createdb scratch && pg_restore -d scratch ...`) before trusting it.
   - Redis: `redis-cli SAVE` / `BGSAVE`, copy the `.rdb`, and hold the versioned-cache generation value (`utils.versioned_cache_invalidate`) so caches can be reset deterministically.
3. **Stand up Supabase projects.**
   - Create a **staging** Supabase project and a **prod** Supabase project (separate). Record the four env values — `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL` — plus `PGRST_DB_SCHEMAS`, region, `Project Ref`, Postgres DB host (`db.<ref>.supabase.co`), and the Supavisor/pooler host. Store everything in a secrets manager / git-ignored env file, **never in the repo**.
   - Install `supabase` CLI, `supabase login`, `supabase link --project-ref $REF` for each.
4. **Spin up local Supabase for parity.** `supabase start` under `API/` so local dev runs on the *same Postgres* instead of the committed SQLite. Update `API/.env` / `.env.example` and `settings.py` so `ENGINE` stays `postgresql`, the connection vars read one `DATABASE_URL`, and the four `SUPABASE_*` env values are set (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`), with a `USE_LOCAL_SUPABASE=1` toggle. This kills the `db.sqlite3` schema-drift class of bugs (missing `users_userapikey`, `analytics_*`, lax uniqueness).

**GATE 0 (orchestrator approval)**
- [ ] `makemigrations --check` clean on both a fresh Postgres and local Supabase.
- [ ] Backups restore cleanly to scratch; dump files checksummed and stored off-box.
- [ ] Local app runs identically against `supabase start` Postgres; existing test suite (`python manage.py test`) green.
- [ ] **Rollback anchor:** revert to `pre-supabase` tag; nothing in prod touched yet.

**BETWEEN 0→1:** Refresh access to a secrets manager; add rotation reminders for the Supabase `postgres` password (rotate before go-live). Freeze non-critical feature work; no schema changes without re-running Phase 0 backups. Assign owner for the "Django↔Supabase connection settings" file.

---

## Phase 1 — Point Django at Supabase Postgres (Mode A, staging)

Objective: run the *same* Django/DRF app against Supabase, proving pooling, SSL, extensions, and timing at staging.

1. **Connection config** (`NowPlayingAPI/settings.py`).
   - Use the **direct** or **session pooler** connection string — **never the transaction pooler** for Django's long-lived sessions.
   - `DATABASES['default']` → `HOST=db.<ref>.supabase.co`, `PORT=5432` (direct) or `<ref>.pooler.supabase.co` (session pooler), `NAME=postgres`, `OPTIONS={'sslmode':'require'}` — the `<ref>` is taken from `SUPABASE_URL`.
   - Enable **persistent connections**: `CONN_MAX_AGE = 600` (tunable); `CONN_HEALTH_CHECKS = True`.
   - Keep `ENGINE = django.db.backends.postgresql`. **Do not change auth yet** (SimpleJWT stays through Phase 5).
2. **Roles & secrets.**
   - Use the `postgres` role **only** for migrations / `manage.py migrate`. Create/surface an app role for runtime with `SELECT/INSERT/UPDATE/DELETE` on app tables and no DDL. Store separately in `.env.supabase` alongside the four `SUPABASE_*` env values: `SUPABASE_SECRET_KEY` is the server/service credential (RLS-bypass, used later in Mode B), `SUPABASE_PUBLISHABLE_KEY` is the anon/client key, and `SUPABASE_JWKS_URL` is used for Auth-token verification.
   - API keys are encrypted **app-side** with Fernet (`users/crypto.py`), so no PG-level encryption extension is needed. Verify raw keys are never logged.
3. **Staging schema sync.**
   - `python manage.py migrate` against staging Supabase. Confirm tables create **with** the intended composite uniques + the extra `models.Index` declarations (e.g. `steam_game` has `(user, -last_played)`, `(user, -playtime_forever)`, `(user, appid)`, `(last_played)`, `(playtime_forever)`). This fixes what the committed SQLite lacked.
   - Verify `users_userapikey`, `analytics_userstatistics`, `analytics_gamingstreak` now exist.
4. **Run the full test suite** against staging Supabase, then a **read-only smoke load** of the analytics service via `CaptureQueriesContext` (baseline: same query counts as today; before optimization).
5. **Warm-up data (staging):** restore the Phase 0 dump into staging, then run each platform sync (`steam`, `trakt`, `psn`, `xbox`, `retroachievements`, `music`) end-to-end to observe upsert behavior on Supabase.

**GATE 1**
- [ ] All migrations apply cleanly; schema comparison (`pg_dump --schema-only` old vs new, or `supabase db dump`) shows **no functional diffs** (composite uniques + declared indexes present).
- [ ] Full test suite green against staging Supabase.
- [ ] Syncs complete idempotently (re-run produces no dupes — validates actual, not ORM-claimed, uniqueness).
- [ ] API key encryption/decryption works via `UserApiKey` on staging (no plaintext in DB/logs).
- [ ] **Rollback anchor:** point `DATABASE_URL` back to old Postgres; staging Supabase can be destroyed/recreated.

**BETWEEN 1→2:** Document the connection-budget cheat-sheet (direct vs pooler, `CONN_MAX_AGE`). Add Supabase status page to monitoring; set up alerting on **connection-limit errors** (top new failure mode with pooling).

---

## Phase 2 — Auth & identity anchor (before the big data move)

Objective: settle the `auth_user.id` mapping now so the data migration is a one-time, deterministic operation.

1. **Inventory all FKs to `auth_user`** — referenced from every platform table (`steam_game`, `playstation_psngame`, `xbox_xboxgame`, `retroachievements_retroachievementsgame`, `music_song`, `trakt_*`, `users_userapikey`, `analytics_*`). For *Mode A*, `auth_user` stays Django's — **no change needed**; keep SimpleJWT. Record this in the runbook explicitly so it isn't "fixed" later by accident.
2. **If Mode B is even a possibility**, design the mapping *now*, implement **in Phase 6**:
   - Introduce a `user_uid`/external UUID column on user-bearing tables (nullable), or a `users` shim table mapping `auth_user.id (int) → auth.users.id (uuid)`.
   - Do **not** change the integer FKs yet — the app and all ORM joins depend on them.
   - **Auth token verification (Mode B)** will validate Supabase Access Tokens against `SUPABASE_JWKS_URL`; plan to replace SimpleJWT verification with JWKS-based verification of Supabase tokens at this step.
3. **(Staging) prove multi-user isolation:** create a second test user, confirm isolation in analytics and syncs. Cheap now, de-risks RLS later.

**GATE 2**
- [ ] Authentication still SimpleJWT; identity mapping decision recorded (Mode A no-op / Mode B shim planned).
- [ ] Two-user isolation verified on staging (user A's syncs/analytics can't leak into user B).
- [ ] **Rollback anchor:** no destructive change; integer FKs untouched.

**BETWEEN 2→3:** **Stop the clocks** — schedule the maintenance window. Draft the runbook commands, the rollback script (`pg_dump` from Supabase back to old host), and name a rollback owner. Announce the window.

---

## Phase 3 — Data migration (the big move, maintenance window)

Objective: ship **schema + existing rows** to Supabase prod verifiably and reversibly.

1. **Pre-reqs immediately before the window**
   - Take a final live dump (`pg_dump -Fc`).
   - Put the old API in read-only mode (or briefly disable writes) for a consistent snapshot. The event tables are append-heavy (13k `trakt_episodewatch`, 7.2k `xbox_*_achievement`), so plan to **re-run the latest syncs** after restore rather than chase a perfect point-in-time copy.
2. **Restore into Supabase prod.**
   - Load schema + data: for a managed project, prefer creating migrations via `supabase migration new from_django` then `supabase db push`, **or** stream a logical dump through `psql`/`pg_restore` against the direct connection.
   - **After restore, fix identity anchors:** re-sync **sequences** (`setval`) so `auth_user.id`, `steam_game.id`, etc. never collide on next insert.
3. **Dry-run the restore in staging first.** Do not touch prod Supabase data until the staging dry-run cost is known.
4. **Post-restore verification (automated script):** compare row counts AND sample checksums per table. Target: **exact match** on all app tables.
5. **Re-run the platform syncs** (Phase 1 step 5) so append-heavy tables converge to current truth.

**GATE 3**
- [ ] Row-count parity per table = 100% (report any delta with justification).
- [ ] Sequence counters set; insert a throwaway row and delete it (proves no PK collision).
- [ ] Restore dry-run cost documented (time, connections) to quote the prod window.
- [ ] **Rollback anchor:** full reverse (`pg_dump` from prod Supabase → old host) practiced in staging and timed.

**BETWEEN 3→4:** **Verify backups are restorable from the Supabase side** (manual backup / `pg_dump`), not just old-host. Update health checks to point at Supabase. Brief on-call on the new Connection Error/SSL runbook. Decide whether to keep a read-replica / old host warm for ~1 week (recommended for Mode A).

---

## Phase 4 — Runtime cutover (switch prod traffic to Supabase)

Objective: make Supabase prod the live DB with the least blast radius.

1. **Feature-flag the switch.** Add `DATA_BACKEND=supabase` setting; deploy code that can run on *both* old and new DB and flips on a config value — do **not** edit prod `settings.py` mid-incident.
2. **Sequential traffic ramp over one low-traffic window:**
   - Point the API at Supabase; immediately run smoke tests (login → dashboard → one sync per platform).
   - Watch **connection metrics** (`pg_stat_activity`, pooler client connections) and error rate.
   - Hold for **≥ 24h** before calling it done; if P95 latency or errors degrade, flip the flag back.
3. **Cut over permanently** (remove flag path), update monitoring/dashboards, disable writes to old host.
4. **Post-cutover hygiene:**
   - `VACUUM ANALYZE` on Supabase (or let auto-vacuum settle), then run `EXPLAIN ANALYZE` on the top analytics queries to catch any plan regression from different stats.
   - Leave old host **read-only for 7 days** as cold standby, then take final dump and retire (Phase 7).
5. **Redis stays** (Mode A). Keep the versioned-cache generation; invalidate once right after cutover so the first real dashboard load rebuilds against Supabase.

**GATE 4**
- [ ] Smoke suite green against Supabase in prod.
- [ ] 24h soak: no connection-limit errors, no regressions vs. baseline (capture baseline before).
- [ ] `EXPLAIN` review — no full-table scans on hot analytics; indexes actually used.
- [ ] **Rollback anchor:** flip `DATA_BACKEND` back; old host read-only data re-fire latest syncs to reconcile drift.

**BETWEEN 4→5:** **Performance checkpoint, not a wait.** Repoint `CaptureQueriesContext`; log the ~500-query dashboard and the O(days) loops. Schedule the R1/R3 optimizations *now* (platform-agnostic; if not already in-progress, stop here and do them — they are the whole "amount of operations" fix).

---

## Phase 5 — Postgres-native optimization (recommended, still Mode A)

Objective: remove the query volume problem at its source and eliminate Redis reliance on the hot analytics path.

1. **R1 — collapse the O(days) loops** (`analytics/services.py`, specifically `get_comprehensive_statistics`/`_get_daily_breakdown` and `get_weekly_trend`): replace per-day `count()` loops with single `TruncDate(...).values('day').annotate(...)` grouped queries (or raw `date_trunc`). Re-measure via `CaptureQueriesContext`: target `get_comprehensive_statistics` 360 → ~25–40, `get_weekly_trend` 77 → ~10–15 **at any `days` value**.
2. **R3 — batch the sync writes:** switch `update_or_create` loops to `bulk_create(update_conflicts=True, unique_fields=[...])`, batched (~500–1000/commit), on: Trakt `_process_single_show` (episodes + `EpisodeWatch`), Steam `update_game_and_achievements`, PSN `fetch_achievements`, Xbox sync, Music scrobble dump.
3. **R4 — remaining N+1:** Steam `get_games` and PSN `fetch_achievements` → mirror Xbox's `.prefetch_related("achievements")`.
4. **Materialized views for analytics** (ideal now that we're on Postgres): create MVs for the dashboard aggregates, `REFRESH MATERIALIZED VIEW CONCURRENTLY` **triggered by the existing sync-invalidation hook** (`versioned_cache_invalidate`), turning the ~500-query dashboard into a table read. Redis can then be kept for non-analytics caches / retired for analytics.
5. **R5 — DB-level delete integrity (Mode B prep):** on tables where it's safe, add DB-level `ON DELETE CASCADE` matching ORM behavior (Supabase "implements cascade deletes" pattern). Verify no test depends on orphan behavior. Prerequisite before PostgREST writes directly.

**GATE 5**
- [ ] Query-count checkpoints met (R1 numbers) on staging, then prod.
- [ ] Sync run-time reduced measurably (batch); idempotent re-run still clean.
- [ ] `EXPLAIN` on MV-refreshed dashboard shows index/table reads, no regressions.
- [ ] Analytics cache served from MVs proves Redis-optional on the analytics path.
- [ ] **Rollback anchor:** migrations are additive (new MVs, new indexes); run with `sb_mv=0` flag if any MV breaks. No data-loss path.

**BETWEEN 5→6 — GO/NO-GO for Mode B. Do not skip this review.**
- What Mode B buys this single-user app (raw SQL access, Auth, RLS, Storage) vs. what it costs (rewrite of sync orchestration + encrypted-key handling + analytics into Edge Functions/PostgREST; UUID identity migration; Redis removal; loss of DRF request validation).
- **Recommendation: stop at Mode A** unless you need (a) client-side data access without your API, (b) Supabase-managed auth, or (c) Storage. Proceed to Phase 6 only with explicit sign-off.

---

## Phase 6 — Optional Mode B: Supabase-native stack (only on GO)

Objective: retire Django in favor of Postgres + RLS + Supabase Auth + Edge Functions/PostgREST, with the service layer that can't be proxied kept as Edge Functions.

1. **Row-Level Security rollout (incremental).** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` per table, with policies `user_id = (select auth.uid())` mirroring existing `user_id` columns. Do it table-by-table behind a flag; Django (Mode A) and any server-side tooling use `SUPABASE_SECRET_KEY` (service credential) to bypass RLS until fully cut over.
2. **Auth migration.** Enable Supabase Auth at `SUPABASE_URL/auth/v1`; run the Phase 2 shim (`auth_user.id` int → `auth.users.id` uuid); update FKs **only after** the shim is verified. Move off SimpleJWT to GoTrue; verify tokens against `SUPABASE_JWKS_URL`; regenerate session handling in the frontend.
3. **API layer.** Stand up PostgREST at `SUPABASE_URL/rest/v1` for read-heavy analytics (point at Phase 5 MVs); call it with `SUPABASE_PUBLISHABLE_KEY` (anon / RLS-gated) from clients. Port the business logic that can't be a proxy — **platform syncs and `users/crypto.py` key encryption** — into **Edge Functions** (or a small retained service). Proxy-unsafe: `_process_single_show`, `SteamAPI`, PSN, Xbox, encrypted-key encrypt/decrypt.
4. **Caching handoff.** Remove Redis from the analytics path (already MV-backed); evaluate self-hosted Redis/CDN only if data shows it matters (justify by egress cost/latency, don't assume).
5. **Scheduling.** Replace "hit the API to sync" with `pg_cron`-scheduled `REFRESH MATERIALIZED VIEW CONCURRENTLY` + external cron / Edge Function cron to trigger platform re-syncs.
6. **Migrations.** Migrate Django migration history to **Supabase CLI SQL migrations** (`supabase migration new`, `db push`); stop treating Django as schema-owner.

**GATE 6 (Mode B acceptance)**
- [ ] RLS enforced on all tables; service role bypass documented; row-level isolation tested with two users *at the DB level*.
- [ ] Auth cutover complete; integer→UUID mapping verified via shim; no orphaned FKs.
- [ ] Analytics served via PostgREST+MVs at ≤ Mode A latency; no Redis in analytics path.
- [ ] Sync + encryption Edge Functions pass end-to-end tests (create→encrypt→store→decrypt on the live service).
- [ ] **Rollback anchor:** Mode B is a *new parallel deployment*; Django Mode A is kept until B is proven. No in-place destructive migration of existing tables during B rollout.

---

## Phase 7 — Decommissioning & cleanup

1. Retire old Postgres host after 7-day read-only soak (Phase 4.4); final dump archived off-box.
2. Delete `API/NowPlayingAPI/db.sqlite3` from the repo and add to `.gitignore` (plus `supabase/.temp` etc.).
3. Remove `DATA_BACKEND` flag, `USE_LOCAL_SUPABASE` dead branches, and stale `.env.*` secrets.
4. Update `docker-compose.yml`, `API/Dockerfile`, CI to build against Supabase (no local Postgres/Redis assumptions unless Mode A keeps Redis).
5. Update docs (`API/README.md`, `API/CACHING.md`, `API/README_PLAYSTATION.md` refresh flows) for the new architecture/runbook.
6. Final regression: full `manage.py test` (Mode A) or Mode B equivalence suite; tag `post-supabase`.
7. **Lock down the Supabase `public` schema (Mode A security — do not skip).** Supabase exposes PostgREST over `public` and grants `anon`/`authenticated` full table privileges there, so Django's tables are world-readable *and world-writable* with the publishable key alone unless RLS is enabled. Migration `analytics/0004_lock_down_public_schema` enables RLS on every `public` table, revokes those grants, and removes the default privileges so new tables are not re-exposed automatically. Django is unaffected because it connects as `postgres`, which has `BYPASSRLS`. This is required even on a **No-Go for Mode B** — RLS is a Mode A requirement, not merely a Mode B prerequisite.

**GATE 7 (close-out)**
- [ ] No dashboard/throughput regression vs. the Phase 4 baseline.
- [ ] Old hosts/containers gone; secrets rotated; backups verified restorable off-box.
- [ ] Repo clean of committed local DBs and stale config.
- [ ] `anon`/`authenticated` cannot read any `public` table — verified with the publishable key against `/rest/v1/<table>` (expect `401`, not `200`).

---

## Key gotchas verified in this codebase (bake into the runbook)

- **Integer auth PK everywhere.** `auth_user.id` is the FK root; a Mode B UUID switch is the single riskiest structural change — keep the shim (Phase 2/6) and never race it against the data move (Phase 3).
- **`db.sqlite3` is committed and stale** (missing `users_userapikey`, `analytics_userstatistics`, `analytics_gamingstreak`; lax uniqueness). Delete at Phase 0/7; never trust it as schema-of-record.
- **ORM-only cascades.** All FKs report `NO ACTION` at the DB; Mode B *requires* DB-level `ON DELETE` (Phase 5 step 5) before direct writes exist.
- **Redis is not provided by Supabase.** Mode A keeps it; Mode B replaces it with materialized views (Phase 5). Don't plan on Supabase caching.
- **Django must not use the transaction pooler.** Use direct/session pooler + `CONN_MAX_AGE` (Phase 1).
- **API keys are Fernet-encrypted app-side** (`users/crypto.py`) — no PG encryption extension needed; keep decryption server-side in every mode.
- **RLS is a Mode A requirement, not a Mode B one.** PostgREST is enabled by default on every Supabase project and `anon`/`authenticated` receive grants on *all* `public` tables. With RLS off, `auth_user` (password hashes), `django_session` (live session keys), `users_userapikey` and `trakt_trakttoken` (plaintext OAuth tokens) are readable — and writable — using only the publishable key. Lock it down at Phase 7 step 7.