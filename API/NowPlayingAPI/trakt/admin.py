from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import TraktToken, Movie, MovieWatch, Show, Season, Episode, EpisodeWatch


# Register your models here.
@admin.register(TraktToken)
class TraktTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "token_preview", "expires_at", "updated_at", "is_expired_display")
    readonly_fields = ("access_token", "refresh_token", "expires_at", "updated_at")
    fields = ("access_token", "refresh_token", "expires_at", "updated_at")
    
    def token_preview(self, obj):
        return f"{obj.access_token[:10]}..." if obj.access_token else ""
    token_preview.short_description = "Access Token"
    
    def is_expired_display(self, obj):
        return obj.is_expired()
    is_expired_display.boolean = True
    is_expired_display.short_description = "Expired"

class MovieWatchInline(admin.TabularInline):
    model = MovieWatch
    extra = 0
    readonly_fields = ('movie', 'watched_at', 'progress')
    fields = ('watched_at', 'progress')
    can_delete = False
    max_num = 0
    
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('title', 'year', 'plays', 'last_watched_at', 'last_updated_at')
    list_filter = ('year', 'last_watched_at')
    search_fields = ('title', 'trakt_id', 'imdb_id', 'tmdb_id')
    readonly_fields = ('trakt_id', 'title', 'year', 'image_url', 'plays', 'last_watched_at', 
                      'last_updated_at', 'imdb_id', 'tmdb_id', 'slug', 'poster_display')
    fields = ('title', 'year', 'poster_display', 'plays', 'last_watched_at', 'last_updated_at', 
             'trakt_id', 'imdb_id', 'tmdb_id', 'slug')
    inlines = [MovieWatchInline]
    
    def poster_display(self, obj):
        if obj.image_url:
            return mark_safe(f'<img src="{obj.image_url}" width="200" />')
        return ""
    poster_display.short_description = "Poster"

@admin.register(MovieWatch)
class MovieWatchAdmin(admin.ModelAdmin):
    list_display = ('movie_title', 'watched_at', 'progress')
    list_filter = ('watched_at',)
    search_fields = ('movie__title',)
    readonly_fields = ('movie', 'watched_at', 'progress')
    fields = ('movie', 'watched_at', 'progress')
    
    def movie_title(self, obj):
        return obj.movie.title
    movie_title.short_description = "Movie"
    movie_title.admin_order_field = 'movie__title'

class EpisodeInline(admin.TabularInline):
    model = Episode
    extra = 0
    readonly_fields = ('episode_number', 'title', 'watched_at', 'plays')
    fields = ('episode_number', 'title', 'watched_at', 'plays')
    can_delete = False
    max_num = 0
    
    def has_add_permission(self, request, obj=None):
        return False

class SeasonInline(admin.TabularInline):
    model = Season
    extra = 0
    readonly_fields = ('season_number', 'title', 'air_date')
    fields = ('season_number', 'title', 'air_date')
    can_delete = False
    max_num = 0
    
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(Show)
class ShowAdmin(admin.ModelAdmin):
    list_display = ('title', 'year', 'last_watched_at', 'seasons_count', 'episodes_count')
    list_filter = ('year', 'last_watched_at')
    search_fields = ('title', 'trakt_id', 'tmdb_id')
    readonly_fields = ('trakt_id', 'slug', 'tmdb_id', 'title', 'year', 'image_url', 
                      'last_watched_at', 'poster_display', 'seasons_count', 'episodes_count')
    fields = ('title', 'year', 'poster_display', 'last_watched_at', 'trakt_id', 'tmdb_id', 'slug')
    inlines = [SeasonInline]
    
    def poster_display(self, obj):
        if obj.image_url:
            return mark_safe(f'<img src="{obj.image_url}" width="200" />')
        return ""
    poster_display.short_description = "Poster"
    
    def seasons_count(self, obj):
        return obj.seasons.count()
    seasons_count.short_description = "Seasons"
    
    def episodes_count(self, obj):
        return obj.episodes.count()
    episodes_count.short_description = "Episodes"

@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('show_title', 'season_number', 'title', 'air_date', 'episodes_count')
    list_filter = ('show', 'air_date')
    search_fields = ('show__title', 'title')
    readonly_fields = ('show', 'season_number', 'image_url', 'title', 'air_date', 'episodes_count')
    fields = ('show', 'season_number', 'title', 'air_date')
    inlines = [EpisodeInline]
    
    def show_title(self, obj):
        return obj.show.title
    show_title.short_description = "Show"
    show_title.admin_order_field = 'show__title'
    
    def episodes_count(self, obj):
        return obj.episodes.count()
    episodes_count.short_description = "Episodes"

class EpisodeWatchInline(admin.TabularInline):
    model = EpisodeWatch
    extra = 0
    readonly_fields = ('watched_at', 'progress')
    fields = ('watched_at', 'progress')
    can_delete = False
    max_num = 0
    
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'title', 'air_date', 'plays', 'watched_at')
    list_filter = ('show', 'season', 'watched_at', 'air_date')
    search_fields = ('title', 'show__title')
    readonly_fields = ('show', 'season', 'episode_number', 'title', 'image_url', 'air_date',
                      'plays', 'watched_at', 'last_updated_at', 'overview', 'rating', 
                      'runtime', 'episode_type', 'ids', 'available_translations', 'image_display')
    fields = ('show', 'season', 'episode_number', 'title', 'image_display', 'air_date',
             'plays', 'watched_at', 'overview', 'rating', 'runtime')
    inlines = [EpisodeWatchInline]
    
    def image_display(self, obj):
        if obj.image_url:
            return mark_safe(f'<img src="{obj.image_url}" width="300" />')
        return ""
    image_display.short_description = "Image"

@admin.register(EpisodeWatch)
class EpisodeWatchAdmin(admin.ModelAdmin):
    list_display = ('episode_display', 'watched_at', 'progress')
    list_filter = ('watched_at',)
    search_fields = ('episode__title', 'episode__show__title')
    readonly_fields = ('episode', 'watched_at', 'progress')
    fields = ('episode', 'watched_at', 'progress')
    
    def episode_display(self, obj):
        return str(obj.episode)
    episode_display.short_description = "Episode"
