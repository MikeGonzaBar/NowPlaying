from rest_framework import serializers
from .models import UserStatistics, GamingStreak


class UserStatisticsSerializer(serializers.ModelSerializer):
    """Serializer for UserStatistics model"""
    
    class Meta:
        model = UserStatistics
        fields = [
            'date', 'games_played', 'games_completed', 'total_gaming_time',
            'achievements_earned', 'gaming_streak_days', 'songs_listened',
            'total_listening_time', 'unique_artists', 'unique_albums',
            'movies_watched', 'episodes_watched', 'total_watch_time',
            'shows_started', 'shows_completed', 'total_engagement_time',
            'active_platforms'
        ]
    
    def to_representation(self, instance):
        """Convert timedelta fields to string representation"""
        data = super().to_representation(instance)
        
        # Convert timedelta fields to string
        if instance.total_gaming_time:
            data['total_gaming_time'] = str(instance.total_gaming_time)
        if instance.total_listening_time:
            data['total_listening_time'] = str(instance.total_listening_time)
        if instance.total_watch_time:
            data['total_watch_time'] = str(instance.total_watch_time)
        if instance.total_engagement_time:
            data['total_engagement_time'] = str(instance.total_engagement_time)
        
        return data


class GamingStreakSerializer(serializers.ModelSerializer):
    """Serializer for GamingStreak model"""
    
    class Meta:
        model = GamingStreak
        fields = [
            'start_date', 'end_date', 'streak_length', 'total_gaming_time',
            'games_played', 'achievements_earned'
        ]
    
    def to_representation(self, instance):
        """Convert timedelta fields to string representation"""
        data = super().to_representation(instance)
        
        if instance.total_gaming_time:
            data['total_gaming_time'] = str(instance.total_gaming_time)
        
        return data 