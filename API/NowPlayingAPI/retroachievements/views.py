from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import RetroAchievementsAPI
from users.models import UserApiKey


class RetroAchievementsViewSet(viewsets.ViewSet):
    """
    A viewset that provides actions to fetch recently played games,
    achievements, and game details.
    """

    def list(self, request):
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
    def fetch_recently_played_games(self, request):
        """
        Fetches and populates the latest 50 recently played games for the authenticated user.
        """
        try:
            # Get the user's RetroAchievements credentials from their stored API keys
            api_key = UserApiKey.objects.get(user=request.user, service_name='retroachievements')
            ra_username = api_key.service_user_id
            ra_api_key = api_key.get_key()
            
            if not ra_username:
                return Response(
                    {"error": "No RetroAchievements username found. Please update your RetroAchievements API key with your username."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Call the new API method to fetch/update games and achievements
            result = RetroAchievementsAPI.populate_recently_played_games(
                user=request.user,
                ra_username=ra_username, 
                ra_api_key=ra_api_key
            )
            
            return Response({"result": result})
            
        except UserApiKey.DoesNotExist:
            return Response(
                {"error": "No RetroAchievements API key found. Please add your RetroAchievements API key in profile settings."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="get-most-achieved-games")
    def get_most_achieved_games(self, request):
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
    def fetch_games(self, request):
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
    def fetch_game_details(self, request):
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