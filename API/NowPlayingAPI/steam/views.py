from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Q, QuerySet
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from typing import cast
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Game, SteamAPI
from .serializers import SteamSerializer
from users.credentials import get_service_credentials

# pyright: reportAttributeAccessIssue=false


@extend_schema_view(
    getGameList=extend_schema(summary="Fetch and sync the authenticated user's Steam library", responses={200: OpenApiTypes.OBJECT}),
    getGameListStored=extend_schema(summary="List stored Steam games", responses={200: SteamSerializer(many=True)}),
    getGameListPlaytimeForever=extend_schema(summary="List stored Steam games sorted by total playtime", responses={200: SteamSerializer(many=True)}),
    getGameListMostAchieved=extend_schema(summary="List stored Steam games sorted by achievement completion", responses={200: SteamSerializer(many=True)}),
)
class SteamViewSet(viewsets.ModelViewSet):
    """Expose Steam library sync and stored game views for the current user."""

    queryset = Game.objects.all()
    serializer_class = SteamSerializer

    def get_queryset(self) -> QuerySet[Game]:  # pyright: ignore[reportIncompatibleMethodOverride]
        """Return only Steam games owned by the authenticated user."""
        return Game.objects.filter(user=self.request.user).order_by("id")

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request: Request) -> Response:
        """Fetch Steam games from the external API and update stored records."""
        api_key = get_service_credentials(request.user, "steam", require_user_id=True)
        steam_id = api_key.service_user_id
        steam_api_key = api_key.api_key

        if not steam_id:
            return Response({"error": "Steam ID not configured."}, status=status.HTTP_400_BAD_REQUEST)
        
        steam_id = cast(str, steam_id)

        cache_key = f"steam_games_{request.user.id}_{steam_id}"
        cached_result = cache.get(cache_key)

        if cached_result:
            return Response({"result": cached_result})

        result = SteamAPI.get_games(steam_id, steam_api_key, user=request.user)
        
        result = cast(dict, result)

        if isinstance(result, dict) and result.get("error"):
            return Response({"error": result["error"]}, status=502)

        if isinstance(result, dict) and "games" in result:
            for game in result["games"]:
                total = game.get("total_achievements", 0)
                unlocked = game.get("unlocked_achievements", 0)
                game["locked_achievements"] = total - unlocked

        cache.set(cache_key, result, getattr(settings, 'CACHE_TIMEOUTS', {}).get('STEAM_GAMES', 1800))
        cache.delete(f"steam_stored_{request.user.id}")
        cache.delete(f"steam_playtime_{request.user.id}")
        cache.delete(f"steam_achievements_{request.user.id}")

        return Response({"result": result})
            
    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request: Request) -> Response:
        """Return stored Steam games ordered by most recent play."""
        cache_key = f"steam_stored_{request.user.id}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response({"result": cached_result})
        
        games = (
            self.get_queryset()
            .select_related('user')
            .prefetch_related("achievements")
            .order_by("-last_played")
        )
        serializer = SteamSerializer(games, many=True)
        
        cache.set(cache_key, serializer.data, 900)
        
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlaytimeForever(self, request: Request) -> Response:
        """Return stored Steam games ordered by total playtime."""
        cache_key = f"steam_playtime_{request.user.id}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response({"result": cached_result})
        
        games = (
            self.get_queryset()
            .select_related('user')
            .prefetch_related("achievements")
            .order_by("-playtime_forever")
        )
        serializer = SteamSerializer(games, many=True)
        
        cache.set(cache_key, serializer.data, 900)
        
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request: Request) -> Response:
        """Return stored Steam games ordered by achievement completion."""
        cache_key = f"steam_achievements_{request.user.id}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response({"result": cached_result})
        
        games = (
            self.get_queryset()
            .select_related("user")
            .prefetch_related("achievements")
            .annotate(
                total=Count("achievements"),
                unlocked=Count("achievements", filter=Q(achievements__unlocked=True)),
            )
        )
        ordered = sorted(games, key=lambda g: (g.unlocked / g.total * 100) if g.total else 0, reverse=True)  # pyright: ignore[reportAttributeAccessIssue]
        serializer = SteamSerializer(ordered, many=True)

        cache.set(cache_key, serializer.data, 900)

        return Response({"result": serializer.data})
