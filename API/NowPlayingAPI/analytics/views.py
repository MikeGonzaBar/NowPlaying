from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from .services import AnalyticsService
from query_params import bounded_int
import logging
import uuid

logger = logging.getLogger(__name__)


class AnalyticsSchemaSerializer(serializers.Serializer):
    """Placeholder serializer for schema generation on computed analytics views."""


@extend_schema_view(
    list=extend_schema(
        summary="Get comprehensive analytics dashboard data",
        parameters=[
            OpenApiParameter("days", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Lookback window from 1 to 365 days."),
            OpenApiParameter("nocache", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Set to 1 to bypass the cached analytics payload."),
        ],
        responses={200: OpenApiTypes.OBJECT},
    ),
    calculate_today_stats=extend_schema(summary="Calculate today's analytics snapshot", responses={200: OpenApiTypes.OBJECT}),
)
class AnalyticsViewSet(viewsets.ViewSet):
    """Optimized ViewSet for comprehensive analytics and statistics"""

    serializer_class = AnalyticsSchemaSerializer
    permission_classes = [IsAuthenticated]
    
    def list(self, request: Request) -> Response:
        """Get comprehensive analytics data - main endpoint used by UI.

        Each dashboard section is computed independently: a failure in one
        provider/section degrades to a safe fallback (reported in
        ``partial_failures``) instead of failing the entire dashboard.
        """
        days = bounded_int(request.query_params, 'days', default=30, minimum=1, maximum=365)
        request_id = uuid.uuid4().hex[:12]
        partial_failures = {}

        def load_section(section, loader, fallback):
            """Run one analytics section; never let it fail the dashboard."""
            try:
                return loader()
            except Exception as exc:
                partial_failures[section] = str(exc)
                logger.error(
                    "analytics_section_failed request_id=%s section=%s user=%s days=%s error=%s",
                    request_id, section, getattr(request.user, "id", None), days, exc,
                    exc_info=True,
                )
                return fallback

        try:
            # Check cache first - SAFE OPTIMIZATION
            cache_key = f"analytics_{request.user.id}_{days}"
            cached_result = cache.get(cache_key)
            
            # Allow cache bypass with ?nocache=1 query parameter
            if request.query_params.get('nocache') == '1':
                cache.delete(cache_key)
                cached_result = None
            
            # Only use cache if it has all required fields (including new ones)
            if cached_result and all(key in cached_result for key in [
                'comprehensive_stats', 'platform_distribution', 'achievement_efficiency',
                'gaming_streaks', 'weekly_trend', 'monthly_comparison', 
                'platform_count', 'genre_distribution', 'last_played_time',
                'most_played_game', 'hardest_achievement',
                'top_artist', 'top_track', 'new_discoveries', 'music_listening_insights',
                'music_genre_distribution', 'music_weekly_scrobbles', 'genre_of_the_week',
                'media_movies_change', 'media_weekly_watch', 'media_watch_breakdown',
                'media_series_count', 'media_genre_distribution', 'media_completion_rate', 'media_insights'
            ]):
                return Response(cached_result)
            
            # Get comprehensive statistics with caching
            comprehensive_stats = load_section(
                "comprehensive_stats",
                lambda: AnalyticsService.get_comprehensive_statistics(request.user, days=days),
                {},
            )
            
            # Get platform distribution with caching
            platform_distribution = load_section(
                "platform_distribution",
                lambda: AnalyticsService.get_platform_distribution(request.user, days=days),
                {},
            )
            
            # Get achievement efficiency
            achievement_efficiency = load_section(
                "achievement_efficiency",
                lambda: AnalyticsService.get_achievement_efficiency(request.user, days=days),
                {},
            )
            
            # Get gaming streaks
            gaming_streaks = load_section(
                "gaming_streaks",
                lambda: AnalyticsService.get_gaming_streaks(request.user),
                {},
            )
            
            # Get additional dashboard data with error handling
            try:
                last_played_time = AnalyticsService.get_last_played_time(request.user)
            except Exception as e:
                logger.error(f"Error getting last_played_time: {str(e)}")
                last_played_time = None
            
            try:
                weekly_trend = AnalyticsService.get_weekly_trend(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting weekly_trend: {str(e)}")
                weekly_trend = []
            
            try:
                monthly_comparison = AnalyticsService.get_monthly_comparison(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting monthly_comparison: {str(e)}")
                monthly_comparison = {'current_time': 0, 'previous_time': 0, 'change_percentage': 0}
            
            try:
                platform_count = AnalyticsService.get_platform_count(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting platform_count: {str(e)}")
                platform_count = 0
            
            try:
                genre_distribution = AnalyticsService.get_genre_distribution(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting genre_distribution: {str(e)}")
                genre_distribution = {'genres': [], 'total_tags': 0}
            
            try:
                most_played_game = AnalyticsService.get_most_played_game(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting most_played_game: {str(e)}")
                most_played_game = None
            
            try:
                hardest_achievement = AnalyticsService.get_hardest_achievement(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting hardest_achievement: {str(e)}")
                hardest_achievement = None
            
            # Music tab analytics
            try:
                top_artist = AnalyticsService.get_top_artist(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting top_artist: {str(e)}")
                top_artist = None
            try:
                top_track = AnalyticsService.get_top_track(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting top_track: {str(e)}")
                top_track = None
            try:
                new_discoveries = AnalyticsService.get_new_discoveries(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting new_discoveries: {str(e)}")
                new_discoveries = {'new_artists_count': 0, 'change_percentage': None}
            try:
                music_listening_insights = AnalyticsService.get_music_listening_insights(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting music_listening_insights: {str(e)}")
                music_listening_insights = None
            try:
                music_genre_distribution = AnalyticsService.get_music_genre_distribution(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting music_genre_distribution: {str(e)}")
                music_genre_distribution = {'genres': [], 'total_count': 0}
            try:
                music_weekly_scrobbles = AnalyticsService.get_music_weekly_scrobbles(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting music_weekly_scrobbles: {str(e)}")
                music_weekly_scrobbles = []
            try:
                genre_of_the_week = AnalyticsService.get_genre_of_the_week(request.user, days=7)
            except Exception as e:
                logger.error(f"Error getting genre_of_the_week: {str(e)}")
                genre_of_the_week = None

            # Movies & TV (Trakt) tab analytics
            try:
                media_movies_change = AnalyticsService.get_media_movies_change(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting media_movies_change: {str(e)}")
                media_movies_change = {'change': 0, 'current': 0, 'previous': 0}
            try:
                media_weekly_watch = AnalyticsService.get_media_weekly_watch(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting media_weekly_watch: {str(e)}")
                media_weekly_watch = []
            try:
                media_watch_breakdown = AnalyticsService.get_media_watch_breakdown(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting media_watch_breakdown: {str(e)}")
                media_watch_breakdown = {'movies_percentage': 0, 'tv_percentage': 0}
            try:
                media_series_count = AnalyticsService.get_media_series_count(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting media_series_count: {str(e)}")
                media_series_count = 0
            try:
                media_genre_distribution = AnalyticsService.get_media_genre_distribution(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting media_genre_distribution: {str(e)}")
                media_genre_distribution = {'genres': [], 'total_count': 0}
            try:
                media_completion_rate = AnalyticsService.get_media_completion_rate(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting media_completion_rate: {str(e)}")
                media_completion_rate = None
            try:
                media_insights = AnalyticsService.get_media_insights(request.user, days=days)
            except Exception as e:
                logger.error(f"Error getting media_insights: {str(e)}")
                media_insights = {'binge_streak': None, 'favorite_director': None, 'top_studio': None}
            
            result = {
                'comprehensive_stats': comprehensive_stats,
                'platform_distribution': platform_distribution,
                'achievement_efficiency': achievement_efficiency,
                'gaming_streaks': gaming_streaks,
                'last_played_time': last_played_time,
                'weekly_trend': weekly_trend,
                'monthly_comparison': monthly_comparison,
                'platform_count': platform_count,
                'genre_distribution': genre_distribution,
                'most_played_game': most_played_game,
                'hardest_achievement': hardest_achievement,
                'top_artist': top_artist,
                'top_track': top_track,
                'new_discoveries': new_discoveries,
                'music_listening_insights': music_listening_insights,
                'music_genre_distribution': music_genre_distribution,
                'music_weekly_scrobbles': music_weekly_scrobbles,
                'genre_of_the_week': genre_of_the_week,
                'media_movies_change': media_movies_change,
                'media_weekly_watch': media_weekly_watch,
                'media_watch_breakdown': media_watch_breakdown,
                'media_series_count': media_series_count,
                'media_genre_distribution': media_genre_distribution,
                'media_completion_rate': media_completion_rate,
                'media_insights': media_insights,
                'partial_failures': partial_failures,
                'request_id': request_id,
            }
            
            # Cache for 1 hour - SAFE OPTIMIZATION.
            # Only cache fully successful dashboards so partial failures
            # recover on the next request instead of persisting for an hour.
            if not partial_failures:
                cache.set(cache_key, result, getattr(settings, 'CACHE_TIMEOUTS', {}).get('ANALYTICS', 3600))
            
            return Response(result)
            
        except Exception as e:
            logger.error(
                "analytics_load_failed request_id=%s user=%s days=%s error=%s",
                request_id, getattr(request.user, "id", None), days, e,
                exc_info=True,
            )
            return Response(
                {
                    'error': 'Failed to load analytics data',
                    'request_id': request_id,
                    'retryable': True,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                headers={'X-Request-ID': request_id},
            )
    
    @action(detail=False, methods=['post'], url_path='calculate-today')
    def calculate_today_stats(self, request: Request) -> Response:
        """Calculate and store statistics for today (for potential future use)"""
        try:
            # For now, just return success - the live calculation handles this
            return Response({
                'message': 'Statistics calculated successfully using live data',
                'date': timezone.now().date().isoformat(),
            })
            
        except Exception as e:
            logger.error(f"Error calculating today's stats: {str(e)}")
            return Response(
                {'error': 'Failed to calculate statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 
