from django.contrib import admin
from .models import UserStatistics, GamingStreak


@admin.register(UserStatistics)
class UserStatisticsAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'date', 'games_played', 'achievements_earned',
        'songs_listened', 'movies_watched', 'episodes_watched',
        'total_engagement_time'
    ]
    list_filter = ['date', 'user']
    search_fields = ['user__username']
    date_hierarchy = 'date'
    ordering = ['-date', 'user__username']
    
    fieldsets = (
        ('User & Date', {
            'fields': ('user', 'date')
        }),
        ('Gaming Statistics', {
            'fields': ('games_played', 'games_completed', 'total_gaming_time', 
                      'achievements_earned', 'gaming_streak_days')
        }),
        ('Music Statistics', {
            'fields': ('songs_listened', 'total_listening_time', 'unique_artists', 'unique_albums')
        }),
        ('Media Statistics', {
            'fields': ('movies_watched', 'episodes_watched', 'total_watch_time',
                      'shows_started', 'shows_completed')
        }),
        ('Overall Engagement', {
            'fields': ('total_engagement_time', 'active_platforms')
        }),
    )
    
    readonly_fields = ('total_engagement_time',)


@admin.register(GamingStreak)
class GamingStreakAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'start_date', 'end_date', 'streak_length',
        'total_gaming_time', 'games_played', 'achievements_earned'
    ]
    list_filter = ['start_date', 'end_date', 'user']
    search_fields = ['user__username']
    date_hierarchy = 'start_date'
    ordering = ['-streak_length', 'user__username']
    
    fieldsets = (
        ('User & Dates', {
            'fields': ('user', 'start_date', 'end_date', 'streak_length')
        }),
        ('Streak Statistics', {
            'fields': ('total_gaming_time', 'games_played', 'achievements_earned')
        }),
    ) 