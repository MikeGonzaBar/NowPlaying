"""Project-wide signal handlers that keep stored datetimes timezone-aware.

`USE_TZ` is enabled in ``settings.py``. Any naive ``datetime`` written to a
``DateTimeField`` triggers a ``RuntimeWarning`` from Django and is a latent
bug. Rather than rely on every caller to remember to call
``make_timezone_aware`` we coerce naive values at the persistence boundary.
"""

from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from music.models import Song
from playstation.models import PSNAchievement, PSNGame
from retroachievements.models import GameAchievement, RetroAchievementsGame
from steam.models import Achievement, Game
from trakt.models import EpisodeWatch, MovieWatch
from xbox.models import XboxAchievement, XboxGame


DATETIME_FIELDS = {
    Achievement: ("unlock_time",),
    Game: ("last_played",),
    PSNAchievement: ("unlock_time",),
    PSNGame: ("first_played", "last_played"),
    XboxAchievement: ("unlock_time",),
    XboxGame: ("first_played", "last_played"),
    RetroAchievementsGame: ("last_played",),
    GameAchievement: ("date_created", "date_modified", "date_earned"),
    Song: ("played_at",),
    MovieWatch: ("watched_at",),
    EpisodeWatch: ("watched_at",),
}


def _make_signals_ready():
    """Wire one ``pre_save`` handler per model the first time it is called."""
    for model, fields in DATETIME_FIELDS.items():
        _connect(model, fields)
    _make_signals_ready._wired = True


def _connect(model, fields):
    field_set = set(fields)

    @receiver(pre_save, sender=model)
    def _coerce_naive_datetimes(sender, instance, **_kwargs):
        for field_name in field_set:
            value = getattr(instance, field_name, None)
            if value is None:
                continue
            if not hasattr(value, "tzinfo"):
                continue
            if value.tzinfo is None:
                setattr(instance, field_name, timezone.make_aware(value))
