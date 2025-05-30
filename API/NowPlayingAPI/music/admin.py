from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Song


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ('title', 'artist', 'user_username', 'album', 'source', 'loved', 'played_at', 'duration_formatted')
    list_filter = ('user', 'source', 'loved', 'streamable', 'played_at', 'artist', 'album')
    search_fields = ('title', 'artist', 'album', 'user__username', 'track_mbid', 'artist_mbid', 'album_mbid')
    readonly_fields = ('user', 'title', 'artist', 'album', 'played_at', 'album_thumbnail', 
                      'track_url', 'artists_url', 'duration_ms', 'source', 'duration_formatted', 
                      'album_thumbnail_display', 'artist_lastfm_url', 'track_mbid', 'artist_mbid', 
                      'album_mbid', 'loved', 'streamable', 'album_thumbnail_small', 
                      'album_thumbnail_medium', 'album_thumbnail_large', 'album_thumbnail_extralarge',
                      'all_thumbnails_display')
    fields = ('user', 'title', 'artist', 'album', 'source', 'loved', 'streamable',
             'album_thumbnail_display', 'all_thumbnails_display', 'played_at', 
             'duration_formatted', 'track_url', 'artists_url', 'artist_lastfm_url',
             'track_mbid', 'artist_mbid', 'album_mbid')
    ordering = ('-played_at',)
    date_hierarchy = 'played_at'
    
    def user_username(self, obj):
        return obj.user.username if obj.user else "No User"
    user_username.short_description = "User"
    user_username.admin_order_field = 'user__username'
    
    def duration_formatted(self, obj):
        """Convert milliseconds to MM:SS format"""
        if obj.duration_ms:
            total_seconds = obj.duration_ms // 1000
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes}:{seconds:02d}"
        return "0:00"
    duration_formatted.short_description = "Duration"
    
    def album_thumbnail_display(self, obj):
        if obj.album_thumbnail:
            return mark_safe(f'<img src="{obj.album_thumbnail}" width="64" height="64" />')
        return ""
    album_thumbnail_display.short_description = "Album Cover"
    
    def all_thumbnails_display(self, obj):
        """Display all available thumbnail sizes"""
        html = "<div style='display: flex; gap: 10px;'>"
        
        thumbnails = [
            ("Small (34px)", obj.album_thumbnail_small),
            ("Medium (64px)", obj.album_thumbnail_medium),
            ("Large (174px)", obj.album_thumbnail_large),
            ("Extra Large (300px)", obj.album_thumbnail_extralarge),
        ]
        
        for size_name, url in thumbnails:
            if url:
                html += f'<div style="text-align: center;"><div>{size_name}</div><img src="{url}" width="60" height="60" style="border: 1px solid #ddd;" /></div>'
        
        html += "</div>"
        return mark_safe(html) if any(url for _, url in thumbnails) else "No thumbnails available"
    all_thumbnails_display.short_description = "All Thumbnail Sizes"
    
    def has_add_permission(self, request):
        return False  # Prevent manual addition since data comes from API
    
    def has_change_permission(self, request, obj=None):
        return False  # Prevent editing since data should come from API
