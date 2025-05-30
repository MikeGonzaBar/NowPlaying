from datetime import datetime
from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Game, SteamAPI  # Using the new Game model instead of a JSON-field-based model.
from .serializers import SteamSerializer
from rest_framework import status
from users.models import UserApiKey  # Import UserApiKey from the correct location
# This is our helper that wraps fetching/updating logic.

class SteamViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = SteamSerializer

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        try:
            # Get the user's Steam ID from their stored API keys
            api_key = UserApiKey.objects.get(user=request.user, service_name='steam')
            steam_id = api_key.service_user_id
            print(f"DEBUG: Steam ID: {steam_id}")
            steam_api_key = api_key.get_key()
            print(f"DEBUG: Steam API Key: {steam_api_key}")
            
            if not steam_id:
                return Response(
                    {"error": "No Steam ID found. Please update your Steam API key with your Steam ID."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Call the helper method to fetch/update games and achievements.
            result = SteamAPI.get_games(steam_id, steam_api_key, user=request.user)
            
            # Ensure that every game dictionary now includes locked achievements.
            if "games" in result:
                for game in result["games"]:
                    total = game.get("total_achievements", 0)
                    unlocked = game.get("unlocked_achievements", 0)
                    game["locked_achievements"] = total - unlocked
            
            return Response({"result": result})
            
        except UserApiKey.DoesNotExist:
            return Response(
                {"error": "No Steam API key found. Please add your Steam API key in profile settings."},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request):
        # Retrieve stored games and sort by last played (most recent first).
        games = Game.objects.all().order_by("-last_played")
        serializer = SteamSerializer(games, many=True)
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlaytimeForever(self, request):
        # Sorting stored games based on playtime_forever.
        games = Game.objects.all().order_by("-playtime_forever")
        serializer = SteamSerializer(games, many=True)
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request):
        # Retrieve all games with their related achievements for processing.
        games = list(Game.objects.all().prefetch_related("achievements"))

        # Helper function: Calculate unlocked achievement percentage.
        def achievement_percentage(game):
            total = game.achievements.count()
            if total == 0:
                return 0
            unlocked = game.achievements.filter(unlocked=True).count()
            return (unlocked / total) * 100

        # Sort games by the percentage of unlocked achievements (highest first).
        sorted_games = sorted(games, key=achievement_percentage, reverse=True)
        serializer = SteamSerializer(sorted_games, many=True)
        return Response({"result": serializer.data})
