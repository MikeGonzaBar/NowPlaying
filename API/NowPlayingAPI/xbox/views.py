from django.db.models import IntegerField
from django.db.models import QuerySet
from django.db.models.functions import Cast
from .serializers import XboxGameSerializer
from .models import XboxGame
from .models import XboxAPI
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import viewsets, status
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from users.credentials import get_service_credentials


@extend_schema_view(
    getGameList=extend_schema(summary="Fetch and sync the authenticated user's Xbox library", responses={200: OpenApiTypes.OBJECT}),
    getGameListStored=extend_schema(summary="List stored Xbox games", responses={200: OpenApiTypes.OBJECT}),
    getGameListPlaytime=extend_schema(summary="List stored Xbox games sorted by total playtime", responses={200: XboxGameSerializer(many=True)}),
    getGameListMostAchieved=extend_schema(summary="List stored Xbox games sorted by earned gamerscore", responses={200: XboxGameSerializer(many=True)}),
)
class XBOXViewSet(viewsets.ModelViewSet):
    """Expose Xbox library sync and stored game views for the current user."""

    queryset = XboxGame.objects.none()
    serializer_class = XboxGameSerializer
    
    def get_queryset(self) -> QuerySet[XboxGame]:
        """Return only Xbox games owned by the authenticated user."""
        # Filter games by the authenticated user
        return XboxGame.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request: Request) -> Response:
        """Fetch Xbox games from OpenXBL and update stored records."""
        api_key = get_service_credentials(request.user, "xbox", require_user_id=True)

        try:
            # Call the API method to fetch/update games and achievements
            result = XboxAPI.fetch_games(
                user=request.user,
                xbox_api_key=api_key.api_key,
                xuid=api_key.service_user_id,
            )
            
            return Response({"result": result})
            
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request: Request) -> Response:
        """Return stored Xbox games for the authenticated user."""
        try:
            result = XboxAPI.get_games_stored(user=request.user)
            return Response({"result": result})
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlaytime(self, request: Request) -> Response:
        """Return stored Xbox games ordered by total playtime."""
        try:
            qs = self.get_queryset().annotate(
                total_playtime_int=Cast("total_playtime", IntegerField())
            ).order_by("-total_playtime_int")

            serializer = self.serializer_class(qs, many=True)
            return Response({"result": serializer.data})
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request: Request) -> Response:
        """Return stored Xbox games ordered by unlocked gamerscore."""
        try:
            # Retrieve stored games filtered by the current user
            games = list(self.get_queryset().prefetch_related("achievements"))

            # Helper function to calculate the weighted score for unlocked achievements
            def calculate_weighted_score(game: XboxGame) -> int:
                """Return unlocked gamerscore for sorting."""
                unlocked = game.achievements.filter(unlocked=True)
                score = 0
                for ach in unlocked:
                    # turn the stored string into an int (default to 0 on bad data)
                    try:
                        val = int(ach.achievement_value)
                    except (TypeError, ValueError):
                        val = 0
                    score += val
                return score

            sorted_games = sorted(games, key=calculate_weighted_score, reverse=True)
            serializer = self.serializer_class(sorted_games, many=True)
            return Response({"result": serializer.data})
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
