import logging
from datetime import datetime, timedelta, timezone as datetime_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import transaction
from django.utils import timezone

from django.contrib.auth.models import User
from users.credentials import InvalidServiceCredentials, MissingServiceCredentials, get_service_credentials
from users.models import SyncJob

logger = logging.getLogger(__name__)

PROVIDER_INTERVALS = {
    "steam": timedelta(hours=6),
    "epic": timedelta(hours=6),
    "psn": timedelta(hours=6),
    "xbox": timedelta(hours=6),
    "retroachievements": timedelta(hours=6),
    "spotify": timedelta(minutes=30),
    "lastfm": timedelta(minutes=30),
    "trakt_movies": timedelta(hours=2),
    "trakt_shows": timedelta(hours=2),
}

# Providers whose upstream session dies too quickly for a once-a-day sync.
# Epic's refresh token lives ~8h, so a daily run would fail every time.
INTERVAL_ONLY_PROVIDERS = frozenset({"epic"})
MAX_RETRIES = 3
RETRY_DELAYS = (timedelta(minutes=1), timedelta(minutes=5), timedelta(minutes=15))
STALE_AFTER = timedelta(minutes=30)


def _providers_for_service(service_name):
    if service_name == "trakt":
        return ("trakt_movies", "trakt_shows")
    return (service_name,)


def clear_queued_jobs(connection):
    """Drop pending work so a changed or disabled schedule takes effect immediately."""
    SyncJob.objects.filter(
        user=connection.user,
        provider__in=_providers_for_service(connection.service_name),
        status=SyncJob.QUEUED,
    ).delete()


def _connection(user, provider):
    service_name = "trakt" if provider.startswith("trakt") else provider
    connection = user.api_keys.filter(service_name=service_name).first()
    if not connection or not connection.sync_enabled:
        return None
    if provider.startswith("trakt"):
        from trakt.models import TraktToken
        if not TraktToken.objects.filter(user=user).exists():
            return None
    return connection


def _next_daily_run(connection, latest, now):
    try:
        zone = ZoneInfo(connection.sync_timezone)
    except ZoneInfoNotFoundError:
        zone = ZoneInfo("UTC")
    local_now = now.astimezone(zone)
    run_at = datetime.combine(local_now.date(), connection.sync_time, tzinfo=zone)
    if latest and latest.finished_at and latest.finished_at.astimezone(zone).date() >= local_now.date():
        run_at += timedelta(days=1)
    return run_at.astimezone(datetime_timezone.utc)


def connection_sync_state(connection, now=None):
    """Return the latest and next automatic sync state for one connection."""
    now = now or timezone.now()
    providers = _providers_for_service(connection.service_name)
    latest = (SyncJob.objects.filter(user=connection.user, provider__in=providers)
              .order_by("-created_at").first())
    next_sync_at = None
    if connection.sync_enabled:
        if latest and latest.status in (SyncJob.QUEUED, SyncJob.RUNNING):
            next_sync_at = latest.scheduled_for
        elif connection.sync_time and providers[0] not in INTERVAL_ONLY_PROVIDERS:
            next_sync_at = _next_daily_run(connection, latest, now)
        elif latest and latest.status == SyncJob.SUCCEEDED and latest.finished_at:
            next_sync_at = latest.finished_at + PROVIDER_INTERVALS[providers[0]]
        elif not latest:
            next_sync_at = now
    return {
        "status": latest.status if latest else "never",
        "last_sync_at": latest.finished_at if latest else None,
        "next_sync_at": next_sync_at,
        "error": latest.error if latest and latest.status == SyncJob.FAILED else "",
    }


def enqueue_due_jobs(now=None):
    now = now or timezone.now()
    SyncJob.objects.filter(
        status=SyncJob.RUNNING,
        started_at__lt=now - STALE_AFTER,
    ).update(
        status=SyncJob.QUEUED,
        scheduled_for=now,
        next_retry_at=None,
        error="Worker stopped while this job was running; it was reclaimed.",
    )
    created = 0
    for user in User.objects.filter(is_active=True).iterator():
        for provider, interval in PROVIDER_INTERVALS.items():
            connection = _connection(user, provider)
            if not connection:
                continue
            latest = SyncJob.objects.filter(user=user, provider=provider).order_by("-created_at").first()
            if latest and latest.status in (SyncJob.QUEUED, SyncJob.RUNNING):
                continue
            if connection.sync_time and provider not in INTERVAL_ONLY_PROVIDERS:
                if _next_daily_run(connection, latest, now) > now:
                    continue
            else:
                if latest and latest.status == SyncJob.SUCCEEDED and latest.finished_at and latest.finished_at + interval > now:
                    continue
                if latest and latest.status == SyncJob.FAILED and latest.next_retry_at and latest.next_retry_at > now:
                    continue
                if latest and latest.status == SyncJob.FAILED and latest.next_retry_at is None:
                    continue
            try:
                SyncJob.objects.create(user=user, provider=provider, scheduled_for=now)
                created += 1
            except Exception:
                # The conditional unique constraint makes concurrent schedulers harmless.
                logger.debug("Sync job already queued for user %s/%s", user.pk, provider, exc_info=True)
    return created


def claim_next_job(now=None):
    now = now or timezone.now()
    with transaction.atomic():
        job = (SyncJob.objects.select_for_update()
               .filter(status=SyncJob.QUEUED, scheduled_for__lte=now)
               .order_by("scheduled_for", "id").first())
        if not job:
            return None
        job.status = SyncJob.RUNNING
        job.started_at = now
        job.error = ""
        job.save(update_fields=["status", "started_at", "error", "updated_at"])
        return job


def _run_provider(job):
    user = User.objects.get(pk=job.user_id)
    provider = job.provider
    if provider == "steam":
        from steam.models import SteamAPI
        c = get_service_credentials(user, "steam", require_user_id=True)
        return SteamAPI.get_games(c.service_user_id, c.api_key, user)
    if provider == "psn":
        from playstation.models import PSN
        c = get_service_credentials(user, "psn", require_user_id=True)
        key = user.api_keys.get(service_name="psn")
        return PSN.get_games(c.api_key, c.service_user_id, user, auth_update_callback=lambda value: _save_key(key, value))
    if provider == "epic":
        from epic.api import sync_library
        from epic.auth import EpicAuthError
        c = get_service_credentials(user, "epic", require_user_id=True)
        key = user.api_keys.get(service_name="epic")
        try:
            return sync_library(
                user, c.api_key, persist=lambda value: _save_key(key, value)
            )
        except EpicAuthError as exc:
            # A dead refresh token is fatal, not transient: stop retrying and
            # surface the connection error so the UI can ask for reconnection.
            if exc.needs_reauth:
                raise InvalidServiceCredentials(str(exc)) from exc
            raise
    if provider == "xbox":
        from xbox.models import XboxAPI
        c = get_service_credentials(user, "xbox", require_user_id=True)
        return XboxAPI.fetch_games(user, c.api_key, c.service_user_id)
    if provider == "retroachievements":
        from retroachievements.models import RetroAchievementsAPI
        c = get_service_credentials(user, "retroachievements", require_user_id=True)
        return RetroAchievementsAPI.populate_recently_played_games(user, c.service_user_id, c.api_key)
    if provider == "spotify":
        from music.models import Song
        c = get_service_credentials(user, "spotify")
        return Song.fetch_recently_played_songs(user, c.api_key)
    if provider == "lastfm":
        from music.models import Song
        c = get_service_credentials(user, "lastfm", require_user_id=True)
        return Song.fetch_lastfm_recent_tracks(user, c.api_key, c.service_user_id, limit=1000)
    from trakt import models as trakt_models
    if provider == "trakt_movies":
        return trakt_models.fetch_latest_watched_movies(user)
    if provider == "trakt_shows":
        return trakt_models.fetch_latest_watched_shows(user)
    raise ValueError(f"Unknown sync provider: {provider}")


def _save_key(key, value):
    key.set_key(value)
    key.save(update_fields=["key_hash", "updated_at"])


def run_job(job):
    try:
        result = _run_provider(job)
        job.status = SyncJob.SUCCEEDED
        job.finished_at = timezone.now()
        job.next_retry_at = None
        if isinstance(result, dict) and "synced" in result:
            item_count = int(result["synced"])
        else:
            item_count = len(result) if isinstance(result, (list, dict)) else 0
        job.summary = {"items": item_count}
        job.save(update_fields=["status", "finished_at", "next_retry_at", "summary", "updated_at"])
        _invalidate_caches(job.provider, job.user_id)
        logger.info(
            "Automatic %s sync succeeded for user %s: %d items",
            job.provider,
            job.user_id,
            item_count,
        )
        return True
    except (MissingServiceCredentials, InvalidServiceCredentials) as exc:
        logger.warning(
            "Automatic %s sync skipped for user %s: %s",
            job.provider,
            job.user_id,
            exc,
        )
        _fail(job, exc, retry=False)
    except Exception as exc:
        logger.exception("Automatic %s sync failed for user %s", job.provider, job.user_id)
        _fail(job, exc, retry=True)
    return False


def _invalidate_caches(provider, user_id):
    if provider in ("spotify", "lastfm"):
        from music.views import invalidate_music_caches
        invalidate_music_caches(user_id)
    elif provider.startswith("trakt"):
        from trakt.views import invalidate_trakt_caches
        invalidate_trakt_caches(user_id)


def _fail(job, exc, retry):
    job.error = str(exc)[:4000]
    job.finished_at = timezone.now()
    if retry and job.retry_count < MAX_RETRIES:
        job.retry_count += 1
        job.status = SyncJob.QUEUED
        job.next_retry_at = timezone.now() + RETRY_DELAYS[job.retry_count - 1]
        job.scheduled_for = job.next_retry_at
    else:
        job.status = SyncJob.FAILED
        job.next_retry_at = None
    job.save(update_fields=["status", "retry_count", "scheduled_for", "next_retry_at", "finished_at", "error", "updated_at"])
