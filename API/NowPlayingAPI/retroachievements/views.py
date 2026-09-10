from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from .models import RetroAchievementsAPI
from users.credentials import get_service_credentials


@extend_schema_view(
    list=extend_schema(summary="List RetroAchievements endpoints", responses={200: OpenApiTypes.OBJECT}),
    fetch_recently_played_games=extend_schema(summary="Fetch recently played RetroAchievements games", responses={200: OpenApiTypes.OBJECT}),
    get_most_achieved_games=extend_schema(summary="List RetroAchievements games by achievement completion", responses={200: OpenApiTypes.OBJECT}),
    fetch_games=extend_schema(summary="List stored RetroAchievements games", responses={200: OpenApiTypes.OBJECT}),
    fetch_game_details=extend_schema(
        summary="Fetch one RetroAchievements game with achievements",
        parameters=[
            OpenApiParameter("game_id", OpenApiTypes.INT, OpenApiParameter.QUERY, required=True),
        ],
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
    ),
)
class RetroAchievementsViewSet(viewsets.ViewSet):
    """
    A viewset that provides actions to fetch recently played games,
    achievements, and game details.
    """

    def list(self, request: Request) -> Response:
        """
        Default endpoint for /retroachievements/ that returns a list of available actions.
        """
        return Response(
            {
                "available_endpoints": {
                    "fetch_recently_played_games": request.build_absolute_uri(
                        "fetch-recently-played-games/"
                    ),
                    "get_most_achieved_game": request.build_absolute_uri(
                        "get-most-achieved-games/"
                    ),
                    "fetch_games": request.build_absolute_uri("fetch-games/"),
                    "fetch_game_details": request.build_absolute_uri(
                        "fetch-game-details/"
                    ),
                }
            }
        )

    @action(detail=False, methods=["get"], url_path="fetch-recently-played-games")
    def fetch_recently_played_games(self, request: Request) -> Response:
        """
        Fetches and populates the latest 50 recently played games for the authenticated user.
        """
        api_key = get_service_credentials(request.user, "retroachievements", require_user_id=True)

        try:
            # Call the new API method to fetch/update games and achievements
            result = RetroAchievementsAPI.populate_recently_played_games(
                user=request.user,
                ra_username=api_key.service_user_id,
                ra_api_key=api_key.api_key,
            )
            
            return Response({"result": result})
            
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="get-most-achieved-games")
    def get_most_achieved_games(self, request: Request) -> Response:
        """
        Returns the list of games ordered by the percentage of unlocked achievements.
        """
        try:
            result = RetroAchievementsAPI.get_most_achieved_games(user=request.user)
            return Response({"result": result})
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="fetch-games")
    def fetch_games(self, request: Request) -> Response:
        """
        Fetches all games along with their achievements from the database.
        """
        try:
            result = RetroAchievementsAPI.fetch_games(user=request.user)
            return Response({"result": result})
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="fetch-game-details")
    def fetch_game_details(self, request: Request) -> Response:
        """
        Fetches a game and its achievements by game ID.
        """
        game_id = request.query_params.get("game_id")

        # Validate that game_id is provided
        if not game_id:
            raise ValidationError({"detail": "The 'game_id' parameter is required."})

        try:
            game_id = int(game_id)
        except ValueError:
            raise ValidationError({"detail": "The 'game_id' parameter must be an integer."})

        try:
            result = RetroAchievementsAPI.fetch_game_details(user=request.user, game_id=game_id)
            if result:
                return Response({"result": result})
            return Response({"error": "Game not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
