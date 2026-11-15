"""Stored Epic Games library records for NowPlaying.

The API adapter lives in ``epic/api.py``; this module is limited to persistence
so the models stay small and serializable.
"""

from __future__ import annotations

from django.contrib.auth.models import User
from django.db import models


class EpicGame(models.Model):
    """Stored Epic Games Store product owned by a local user."""

    PLAYTIME_UNKNOWN = "none"
    PLAYTIME_EPIC = "epic"
    PLAYTIME_MANUAL = "manual"
    PLAYTIME_AGENT = "agent"
    PLAYTIME_SOURCES = (
        (PLAYTIME_UNKNOWN, "Not provided by Epic"),
        (PLAYTIME_EPIC, "Reported by Epic"),
        (PLAYTIME_MANUAL, "Entered manually"),
        (PLAYTIME_AGENT, "Reported by local agent"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="epic_games")
    # Epic catalog item ids are opaque strings (32 hex chars), not integers.
    appid = models.CharField(max_length=64)
    namespace = models.CharField(max_length=64)
    app_name = models.CharField(max_length=255, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    developer = models.CharField(max_length=255, blank=True)
    publisher = models.CharField(max_length=255, blank=True)
    cover_image = models.URLField(max_length=500, blank=True)
    acquired_at = models.DateTimeField(null=True, blank=True)
    last_played = models.DateTimeField(null=True, blank=True)
    # The launcher publishes cumulative playtime to the library service, but
    # games never launched through the launcher still report nothing. 0 +
    # source "none" means "unknown", never "zero hours played".
    playtime_minutes = models.PositiveIntegerField(default=0)
    playtime_source = models.CharField(
        max_length=16, choices=PLAYTIME_SOURCES, default=PLAYTIME_UNKNOWN
    )
    # Last sync that observed a new cumulative playtime for this product. Epic
    # has no last-played timestamp, so this is the only recency signal available
    # for "recently played". It changes only when the total actually moves.
    playtime_updated_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("user", "appid")
        indexes = [
            models.Index(fields=["user", "-last_played"], name="epic_game_user_last_idx"),
            models.Index(fields=["user", "appid"], name="epic_game_user_appid_idx"),
        ]

    def __str__(self) -> str:
        """Return the Epic product name."""
        return self.name

    def convert_playtime(self) -> str:
        """Return playtime as hours/minutes, or an empty string when unknown."""
        if self.playtime_source == self.PLAYTIME_UNKNOWN or not self.playtime_minutes:
            return ""
        hours, minutes = divmod(self.playtime_minutes, 60)
        return f"{hours}h {minutes}m"

    @property
    def playtime_known(self) -> bool:
        """Return whether the stored playtime is a real measurement."""
        return self.playtime_source != self.PLAYTIME_UNKNOWN


class EpicAchievement(models.Model):
    """Stored Epic achievement for a game, including locked entries."""

    game = models.ForeignKey(
        EpicGame, related_name="achievements", on_delete=models.CASCADE
    )
    name = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    image = models.URLField(max_length=500, blank=True)
    unlocked = models.BooleanField(default=False)
    unlock_time = models.DateTimeField(null=True, blank=True)
    progress = models.PositiveIntegerField(default=0)
    xp = models.PositiveIntegerField(default=0)
    rarity_percent = models.FloatField(null=True, blank=True)
    hidden = models.BooleanField(default=False)
    is_base = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["game", "name"], name="unique_epic_game_achievement"
            )
        ]

    def __str__(self) -> str:
        """Return the achievement name and lock state."""
        label = self.display_name or self.name
        return f"{label} ({'Unlocked' if self.unlocked else 'Locked'})"
