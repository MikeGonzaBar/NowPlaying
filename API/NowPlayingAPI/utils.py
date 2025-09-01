from datetime import datetime
from django.utils import timezone


def make_timezone_aware(dt):
    """
    Convert a naive datetime to timezone-aware datetime.
    If the datetime is already timezone-aware, return it as is.
    """
    if dt is None:
        return None
    if timezone.is_aware(dt):
        return dt
    return timezone.make_aware(dt)


def parse_datetime_aware(datetime_str, format_str="%Y-%m-%dT%H:%M:%S.%fZ"):
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


def create_datetime_aware(year, month, day, hour=0, minute=0, second=0, microsecond=0):
    """
    Create a timezone-aware datetime object from components.
    """
    naive_datetime = datetime(year, month, day, hour, minute, second, microsecond)
    return make_timezone_aware(naive_datetime) 