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
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from django.db.models import Q
from django.core.cache import cache
from django.conf import settings
import logging
import re

from retroachievements import views as retroachievements_views
from steam import views as steam_views
from playstation import views as psn_views
from trakt import views as trakt_views
from music import views as music_views
from xbox import views as xbox_views
from analytics import views as analytics_views

logger = logging.getLogger(__name__)


def _normalize_game_title(value: object) -> str:
    """Normalize common edition and punctuation differences for cross-platform matching."""
    text = str(value or "").strip().lower()
    text = re.sub(r"\s*\([^)]*\)", "", text)
    text = re.sub(r"\s*\[[^]]*\]", "", text)
    text = re.sub(
        r"\b(?:goty|game of the year|definitive|remastered|remake|edition|deluxe|special|international|complete|ultimate)\b",
        "",
        text,
    )
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def _with_recency_rank(data: dict, model, game, user) -> dict:
    """Attach the game's recency rank within its own platform library.

    Detail views use this for the "#N Most Played" badge so they never need
    to download the user's complete game library for every platform.
    """
    try:
        total = model.objects.filter(user=user).count()
        newer = 0
        last_played = getattr(game, "last_played", None)
        if last_played:
            newer = model.objects.filter(
                user=user, last_played__gt=last_played
            ).count()
        if isinstance(data, dict):
            data["recency_rank"] = {"rank": newer + 1, "total": total}
    except Exception as e:
        logger.warning("Recency rank computation failed: %s", e)
    return data


class StaffOnlySchemaView(SpectacularAPIView):
    """Serve the OpenAPI schema only to staff users on the admin API service."""

    authentication_classes = [SessionAuthentication, JWTAuthentication]
    permission_classes = [IsAdminUser]


class StaffOnlySwaggerView(SpectacularSwaggerView):
    """Serve Swagger UI only to staff users on the admin API service."""

    authentication_classes = [SessionAuthentication, JWTAuthentication]
    permission_classes = [IsAdminUser]


class StaffOnlyRedocView(SpectacularRedocView):
    """Serve ReDoc only to staff users on the admin API service."""

    authentication_classes = [SessionAuthentication, JWTAuthentication]
    permission_classes = [IsAdminUser]


# Optimized Games Search View with caching
@extend_schema(
    summary="Search games across connected platforms",
    parameters=[
        OpenApiParameter(
            name="q",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Search text with at least two characters.",
        ),
    ],
    responses={200: OpenApiTypes.OBJECT},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def games_search(request: Request) -> Response:
    """Return cross-platform game search matches for the authenticated user."""
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
        logger.warning("Steam search error: %s", e)
    
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
        logger.warning("PSN search error: %s", e)
    
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
        logger.warning("Xbox search error: %s", e)
    
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
        logger.warning("RetroAchievements search error: %s", e)
    
    # Sort results by title and limit to 20 total
    results.sort(key=lambda x: x['title'].lower())
    results = results[:20]
    
    # Cache results for 5 minutes - SAFE OPTIMIZATION
    cache.set(cache_key, results, getattr(settings, 'CACHE_TIMEOUTS', {}).get('SEARCH_RESULTS', 300))
    
    return Response({'results': results})
@extend_schema(
    summary="Fetch a game across all platforms by title",
    parameters=[
        OpenApiParameter(
            name="title",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Game title to search for across all platforms.",
        ),
    ],
    responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def games_detail_by_title(request: Request) -> Response:
    """Return game data across all platforms for a given title.
    
    This endpoint searches for a game by title across all connected platforms
    and returns data for each platform where the game is found. This enables
    cross-platform comparison and direct URL navigation.
    """
    title = request.GET.get('title', '').strip()
    if not title:
        return Response({'error': 'title is required.'}, status=status.HTTP_400_BAD_REQUEST)

    normalized_title = _normalize_game_title(title)
    platforms_data = []
    
    # Search in Steam games
    try:
        from steam.models import Game as SteamGame
        from steam.serializers import SteamSerializer
        
        steam_games = [
            game for game in SteamGame.objects.filter(user=request.user).prefetch_related('achievements')
            if _normalize_game_title(game.name) == normalized_title
        ]
        
        for game in steam_games:
            platforms_data.append({
                'platform': 'steam',
                'data': _with_recency_rank(SteamSerializer(game).data, SteamGame, game, request.user)
            })
    except Exception as e:
        logger.warning("Steam detail by title error: %s", e)
    
    # Search in PSN games
    try:
        from playstation.models import PSNGame
        from playstation.serializers import PSNGameSerializer
        
        psn_games = [
            game for game in PSNGame.objects.filter(user=request.user).prefetch_related('achievements')
            if _normalize_game_title(game.name) == normalized_title
        ]
        
        for game in psn_games:
            platforms_data.append({
                'platform': 'psn',
                'data': _with_recency_rank(PSNGameSerializer(game).data, PSNGame, game, request.user)
            })
    except Exception as e:
        logger.warning("PSN detail by title error: %s", e)
    
    # Search in Xbox games
    try:
        from xbox.models import XboxGame
        from xbox.serializers import XboxGameSerializer
        
        xbox_games = [
            game for game in XboxGame.objects.filter(user=request.user).prefetch_related('achievements')
            if _normalize_game_title(game.name) == normalized_title
        ]
        
        for game in xbox_games:
            platforms_data.append({
                'platform': 'xbox',
                'data': _with_recency_rank(XboxGameSerializer(game).data, XboxGame, game, request.user)
            })
    except Exception as e:
        logger.warning("Xbox detail by title error: %s", e)
    
    # Search in RetroAchievements games
    try:
        from retroachievements.models import RetroAchievementsGame
        
        retro_games = [
            game for game in RetroAchievementsGame.objects.filter(user=request.user)
            if _normalize_game_title(game.title) == normalized_title
        ]
        
        for game in retro_games:
            # Fetch full game details for each RetroAchievements game
            from retroachievements.models import RetroAchievementsAPI
            detail = RetroAchievementsAPI.fetch_game_details(user=request.user, game_id=game.game_id)
            if detail:
                platforms_data.append({
                    'platform': 'retroachievements',
                    'data': _with_recency_rank(detail, RetroAchievementsGame, game, request.user)
                })
    except Exception as e:
        logger.warning("RetroAchievements detail by title error: %s", e)
    
    if not platforms_data:
        return Response({'error': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'title': title,
        'platforms': platforms_data,
        'platform_count': len(platforms_data)
    })


def _is_positive_int(value: str) -> bool:
    """Return whether ``value`` is a plain non-negative integer string.

    All platform app ids reach this endpoint as URL query strings. Platforms
    with integer-backed ids (Steam, RetroAchievements) must never feed a
    non-numeric string into a ``PositiveIntegerField`` filter, which raises a
    ``ValidationError`` and turns a user typo into an HTTP 500 (audit #4).
    """
    return value.isdigit() and len(value) <= 15


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def games_detail_by_id(request: Request) -> Response:
    """Return a stored game across platforms by its platform-specific id.

    Legacy bookmarks reach this endpoint with only the id (``/game/1145360``
    or ``/game/PPSA01649_00``). Unknown or provider-mismatched ids must
    resolve to a typed 404/400 — never a 500 from a database validation error.
    """
    appid = request.GET.get('appid', '').strip()
    platform = request.GET.get('platform', '').strip().lower()
    if not appid:
        return Response({'error': 'appid is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if platform and platform not in {'steam', 'psn', 'xbox', 'retroachievements'}:
        return Response(
            {'error': 'Invalid platform. Must be one of: steam, psn, xbox, retroachievements.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from steam.models import Game as SteamGame
    from steam.serializers import SteamSerializer
    from playstation.models import PSNGame
    from playstation.serializers import PSNGameSerializer
    from xbox.models import XboxGame
    from xbox.serializers import XboxGameSerializer

    platform_queries = [
        ('steam', SteamGame, SteamSerializer),
        ('psn', PSNGame, PSNGameSerializer),
        ('xbox', XboxGame, XboxGameSerializer),
    ]

    if platform == 'retroachievements':
        from retroachievements.models import RetroAchievementsAPI, RetroAchievementsGame
        if not _is_positive_int(appid):
            return Response(
                {'error': 'appid must be an integer for RetroAchievements.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            detail = RetroAchievementsAPI.fetch_game_details(user=request.user, game_id=int(appid))
        except ValueError:
            detail = None
        if not detail:
            return Response({'error': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)
        result = detail['game']
        retro_game = RetroAchievementsGame.objects.filter(
            user=request.user, game_id=int(appid)
        ).first()
        if retro_game:
            result = _with_recency_rank(result, RetroAchievementsGame, retro_game, request.user)
        result['achievements'] = detail['achievements']
        return Response({'title': result.get('title', 'Game'), 'platforms': [
            {'platform': 'retroachievements', 'data': result}
        ], 'platform_count': 1})

    if platform:
        platform_queries = [entry for entry in platform_queries if entry[0] == platform]

    platforms_data = []
    for platform_key, model, serializer in platform_queries:
        # Steam-backed ids are positive integers; anything else simply cannot
        # exist in the Steam library and would make the ORM raise (→ 500).
        if platform_key == 'steam' and not _is_positive_int(appid):
            continue
        try:
            game = (
                model.objects.filter(user=request.user, appid=appid)
                .prefetch_related('achievements')
                .first()
            )
        except (ValueError, TypeError) as exc:
            # A provider whose id field cannot represent this appid is treated
            # as "not found" for that provider — never a server failure.
            logger.warning(
                "detail-by-id filter failed platform=%s appid=%r user=%s error=%s",
                platform_key, appid, request.user.id, exc,
            )
            continue
        if game:
            platforms_data.append({
                'platform': platform_key,
                'data': _with_recency_rank(serializer(game).data, model, game, request.user),
            })

    if not platforms_data:
        return Response({'error': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'title': platforms_data[0]['data'].get('name', 'Game'),
        'platforms': platforms_data,
        'platform_count': len(platforms_data),
    })





@extend_schema(
    summary="Fetch one stored game by platform and app id",
    parameters=[
        OpenApiParameter(
            name="platform",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=True,
            enum=["steam", "psn", "xbox", "retroachievements"],
            description="Platform that owns the app id.",
        ),
        OpenApiParameter(
            name="appid",
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Platform-specific app/game id.",
        ),
    ],
    responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def games_detail(request: Request) -> Response:
    """Return one stored game and achievement payload for the authenticated user."""
    platform = request.GET.get('platform', '').strip().lower()
    appid = request.GET.get('appid', '').strip()

    if platform not in {'steam', 'psn', 'xbox', 'retroachievements'}:
        return Response(
            {'error': "platform must be one of: steam, psn, xbox, retroachievements."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not appid:
        return Response({'error': 'appid is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if platform == 'steam':
        from steam.models import Game as SteamGame
        from steam.serializers import SteamSerializer

        if not _is_positive_int(appid):
            return Response({'error': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)

        game = SteamGame.objects.filter(user=request.user, appid=appid).prefetch_related('achievements').first()
        if not game:
            return Response({'error': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'result': _with_recency_rank(SteamSerializer(game).data, SteamGame, game, request.user)})

    if platform == 'psn':
        from playstation.models import PSNGame
        from playstation.serializers import PSNGameSerializer

        game = PSNGame.objects.filter(user=request.user, appid=appid).prefetch_related('achievements').first()
        if not game:
            return Response({'error': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'result': _with_recency_rank(PSNGameSerializer(game).data, PSNGame, game, request.user)})

    if platform == 'xbox':
        from xbox.models import XboxGame
        from xbox.serializers import XboxGameSerializer

        game = XboxGame.objects.filter(user=request.user, appid=appid).prefetch_related('achievements').first()
        if not game:
            return Response({'error': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'result': _with_recency_rank(XboxGameSerializer(game).data, XboxGame, game, request.user)})

    try:
        game_id = int(appid)
    except ValueError:
        return Response({'error': 'appid must be an integer for RetroAchievements.'}, status=status.HTTP_400_BAD_REQUEST)

    from retroachievements.models import RetroAchievementsAPI, RetroAchievementsGame

    detail = RetroAchievementsAPI.fetch_game_details(user=request.user, game_id=game_id)
    if not detail:
        return Response({'error': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Rank against the stored RetroAchievements library so the detail view can
    # show a badge without downloading the whole library. The rank is injected
    # into the game payload (`result`), which is what the frontend reads.
    retro_game = RetroAchievementsGame.objects.filter(
        user=request.user, game_id=game_id
    ).first()
    result = detail['game']
    if retro_game:
        result = _with_recency_rank(result, RetroAchievementsGame, retro_game, request.user)
    result['achievements'] = detail['achievements']
    return Response({'result': result})

if settings.ENABLE_ADMIN_SITE:
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
    path("", include(router.urls)),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path("auth/", include("users.urls")),
    path("users/", include("users.urls")),
    path("games/search/", games_search, name="games_search"),
    path("games/detail/", games_detail, name="games_detail"),
    path("games/detail-by-title/", games_detail_by_title, name="games_detail_by_title"),
    path("games/detail-by-id/", games_detail_by_id, name="games_detail_by_id"),
]

if settings.ENABLE_ADMIN_SITE:
    urlpatterns.append(path("admin/", admin.site.urls))

if settings.ENABLE_API_DOCS:
    urlpatterns.extend(
        [
            path("schema/", StaffOnlySchemaView.as_view(), name="schema"),
            path("docs/", StaffOnlySwaggerView.as_view(url_name="schema"), name="swagger-ui"),
            path("redoc/", StaffOnlyRedocView.as_view(url_name="schema"), name="redoc"),
        ]
    )
