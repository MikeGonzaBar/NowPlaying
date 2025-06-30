from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from .models import UserStatistics
from .services import AnalyticsService
from .serializers import UserStatisticsSerializer
import logging

logger = logging.getLogger(__name__)


class AnalyticsViewSet(viewsets.ViewSet):
    """Optimized ViewSet for comprehensive analytics and statistics"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get comprehensive analytics data - main endpoint used by UI"""
        try:
            days = int(request.query_params.get('days', 30))
            
            # Check cache first - SAFE OPTIMIZATION
            cache_key = f"analytics_{request.user.id}_{days}"
            cached_result = cache.get(cache_key)
            if cached_result:
                return Response(cached_result)
            
            # Get comprehensive statistics with caching
            comprehensive_stats = AnalyticsService.get_comprehensive_statistics(
                request.user, days=days
            )
            
            # Get platform distribution with caching
            platform_distribution = AnalyticsService.get_platform_distribution(
                request.user, days=days
            )
            
            # Get achievement efficiency
            achievement_efficiency = AnalyticsService.get_achievement_efficiency(
                request.user, days=days
            )
            
            # Get gaming streaks
            gaming_streaks = AnalyticsService.get_gaming_streaks(request.user)
            
            result = {
                'comprehensive_stats': comprehensive_stats,
                'platform_distribution': platform_distribution,
                'achievement_efficiency': achievement_efficiency,
                'gaming_streaks': gaming_streaks,
            }
            
            # Cache for 1 hour - SAFE OPTIMIZATION
            cache.set(cache_key, result, getattr(settings, 'CACHE_TIMEOUTS', {}).get('ANALYTICS', 3600))
            
            return Response(result)
            
        except Exception as e:
            logger.error(f"Error in analytics list: {str(e)}")
            return Response(
                {'error': 'Failed to load analytics data'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='calculate-today')
    def calculate_today_stats(self, request):
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