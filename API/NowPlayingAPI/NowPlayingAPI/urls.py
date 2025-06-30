"""
URL configuration for NowPlayingAPI project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
import json
from django.core.cache import cache
from django.conf import settings

from retroachievements import views as retroachievements_views
from steam import views as steam_views
from playstation import views as psn_views
from trakt import views as trakt_views
from music import views as music_views
from xbox import views as xbox_views
from analytics import views as analytics_views

# Optimized Games Search View with caching
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def games_search(request):
    query = request.GET.get('q', '').strip()
    if not query or len(query) < 2:
        return Response({'results': []})
    
    # Check cache first - SAFE OPTIMIZATION
    cache_key = f"search_{request.user.id}_{query.lower()}"
    cached_result = cache.get(cache_key)
    if cached_result:
        return Response({'results': cached_result})
    
    results = []
    
    # Search in Steam games
    try:
        from steam.models import Game as SteamGame
        steam_games = SteamGame.objects.filter(
            Q(user=request.user) & 
            (Q(name__icontains=query) | Q(name__istartswith=query))
        )[:10]
        
        for game in steam_games:
            # Ensure we have a full URL for Steam images
            cover_image = game.img_icon_url or ''
            if cover_image and not cover_image.startswith('http'):
                cover_image = f"https://steamcdn-a.akamaihd.net/steam/apps/{game.appid}/library_600x900_2x.jpg"
            
            results.append({
                'id': game.id,
                'title': game.name,
                'platform': 'steam',
                'cover_image': cover_image,
                'appid': game.appid
            })
    except Exception as e:
        print(f"Steam search error: {e}")
    
    # Search in PSN games
    try:
        from playstation.models import PSNGame
        psn_games = PSNGame.objects.filter(
            Q(user=request.user) & 
            (Q(name__icontains=query) | Q(name__istartswith=query))
        )[:10]
        
        for game in psn_games:
            # PSN images should already be full URLs
            cover_image = game.img_icon_url or ''
            
            results.append({
                'id': game.id,
                'title': game.name,
                'platform': 'psn',
                'cover_image': cover_image,
                'appid': game.appid
            })
    except Exception as e:
        print(f"PSN search error: {e}")
    
    # Search in Xbox games
    try:
        from xbox.models import XboxGame
        xbox_games = XboxGame.objects.filter(
            Q(user=request.user) & 
            (Q(name__icontains=query) | Q(name__istartswith=query))
        )[:10]
        
        for game in xbox_games:
            # Xbox images should already be full URLs
            cover_image = game.img_icon_url or ''
            
            results.append({
                'id': game.id,
                'title': game.name,
                'platform': 'xbox',
                'cover_image': cover_image,
                'appid': game.appid
            })
    except Exception as e:
        print(f"Xbox search error: {e}")
    
    # Search in RetroAchievements games
    try:
        from retroachievements.models import RetroAchievementsGame
        retro_games = RetroAchievementsGame.objects.filter(
            Q(user=request.user) & 
            (Q(title__icontains=query) | Q(title__istartswith=query))
        )[:10]
        
        for game in retro_games:
            # RetroAchievements images need to be converted to full URLs
            cover_image = game.image_icon or ''
            if cover_image and not cover_image.startswith('http'):
                cover_image = f"https://retroachievements.org{cover_image}"
            
            results.append({
                'id': game.id,
                'title': game.title,
                'platform': 'retroachievements',
                'cover_image': cover_image,
                'appid': game.game_id
            })
    except Exception as e:
        print(f"RetroAchievements search error: {e}")
    
    # Sort results by title and limit to 20 total
    results.sort(key=lambda x: x['title'].lower())
    results = results[:20]
    
    # Cache results for 5 minutes - SAFE OPTIMIZATION
    cache.set(cache_key, results, getattr(settings, 'CACHE_TIMEOUTS', {}).get('SEARCH_RESULTS', 300))
    
    return Response({'results': results})

admin.autodiscover()

router = routers.DefaultRouter()
router.register(r"steam", steam_views.SteamViewSet, basename="steam")
router.register(r"psn", psn_views.PSNViewSet, basename="psn")
router.register(r"trakt", trakt_views.TraktViewSet, basename="trakt")
router.register(r"music", music_views.StreamedSongViewSet, basename="music")
router.register(r'retroachievements', retroachievements_views.RetroAchievementsViewSet, basename='retroachievements')
router.register(r'xbox', xbox_views.XBOXViewSet, basename='xbox')
router.register(r'analytics', analytics_views.AnalyticsViewSet, basename='analytics')


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include(router.urls)),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path("auth/", include("users.urls")),
    path("users/", include("users.urls")),
    path("games/search/", games_search, name="games_search"),
]
