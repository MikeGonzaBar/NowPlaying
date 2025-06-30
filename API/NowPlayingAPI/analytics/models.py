from django.db import models
from django.contrib.auth.models import User
from datetime import datetime, timedelta


class UserStatistics(models.Model):
    """Main statistics model for tracking user activity across all platforms"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='statistics')
    date = models.DateField()
    
    # Gaming Statistics
    games_played = models.IntegerField(default=0)
    games_completed = models.IntegerField(default=0)
    total_gaming_time = models.DurationField(default=timedelta())
    achievements_earned = models.IntegerField(default=0)
    gaming_streak_days = models.IntegerField(default=0)
    
    # Music Statistics
    songs_listened = models.IntegerField(default=0)
    total_listening_time = models.DurationField(default=timedelta())
    unique_artists = models.IntegerField(default=0)
    unique_albums = models.IntegerField(default=0)
    
    # Movie/Series Statistics
    movies_watched = models.IntegerField(default=0)
    episodes_watched = models.IntegerField(default=0)
    total_watch_time = models.DurationField(default=timedelta())
    shows_started = models.IntegerField(default=0)
    shows_completed = models.IntegerField(default=0)
    
    # Overall Engagement
    total_engagement_time = models.DurationField(default=timedelta())
    active_platforms = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ('user', 'date')
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['date']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.date}"


class GamingStreak(models.Model):
    """Track consecutive days of gaming activity"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gaming_streaks')
    start_date = models.DateField()
    end_date = models.DateField()
    streak_length = models.IntegerField()
    total_gaming_time = models.DurationField(default=timedelta())
    games_played = models.IntegerField(default=0)
    achievements_earned = models.IntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', '-streak_length']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.streak_length} days ({self.start_date} to {self.end_date})" 