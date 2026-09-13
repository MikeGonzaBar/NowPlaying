from datetime import datetime
from django.utils import timezone
from django.core.cache import cache


def versioned_cache_key(namespace: str, user_id: int, suffix: str) -> str:
    """Return a versioned cache key for a user-scoped cache family.

    Each ``(namespace, user)`` pair has an integer generation stored in the
    cache. Keys embed that generation so ``versioned_cache_invalidate()`` can
    retire every cached entry for a user with a single O(1) increment instead
    of enumerating and deleting many day-bucketed keys.
    """
    return f"{namespace}:{user_id}:v{_cache_generation(namespace, user_id)}:{suffix}"


def versioned_cache_invalidate(namespace: str, user_id: int) -> int:
    """Bump the generation for a ``(namespace, user)`` pair.

    Old keys (built with a lower generation) are orphaned and expire via their
    natural TTL; the next read misses and recomputes. Returns the new
    generation.
    """
    gen_key = f"{namespace}:ver:{user_id}"
    if cache.get(gen_key) is None:
        cache.set(gen_key, 1)
    return cache.incr(gen_key)


def _cache_generation(namespace: str, user_id: int) -> int:
    """Return the current cache generation, initialising it on first use."""
    gen_key = f"{namespace}:ver:{user_id}"
    generation = cache.get(gen_key)
    if generation is None:
        generation = 1
        cache.set(gen_key, generation)
    return generation


def make_timezone_aware(dt: datetime | None) -> datetime | None:
    """
    Convert a naive datetime to timezone-aware datetime.
    If the datetime is already timezone-aware, return it as is.
    """
    if dt is None:
        return None
    if timezone.is_aware(dt):
        return dt
    return timezone.make_aware(dt)


def parse_datetime_aware(
    datetime_str: str | None,
    format_str: str = "%Y-%m-%dT%H:%M:%S.%fZ",
) -> datetime | None:
    """
    Parse a datetime string and return a timezone-aware datetime object.
    """
    if not datetime_str:
        return None
    try:
        naive_datetime = datetime.strptime(datetime_str, format_str)
        return make_timezone_aware(naive_datetime)
    except ValueError:
        return None



