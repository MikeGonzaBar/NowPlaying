from datetime import datetime
from django.utils import timezone


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


def create_datetime_aware(
    year: int,
    month: int,
    day: int,
    hour: int = 0,
    minute: int = 0,
    second: int = 0,
    microsecond: int = 0,
) -> datetime | None:
    """
    Create a timezone-aware datetime object from components.
    """
    naive_datetime = datetime(year, month, day, hour, minute, second, microsecond)
    return make_timezone_aware(naive_datetime)
