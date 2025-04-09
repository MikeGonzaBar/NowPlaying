from datetime import datetime
from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Game, SteamAPI  # Using the new Game model instead of a JSON-field-based model.
from .serializers import SteamSerializer
 # This is our helper that wraps fetching/updating logic.

class SteamViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = SteamSerializer

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        # Extract user_id (steam_id) from request query parameters.
        steam_id = request.query_params.get("user_id") or settings.STEAM_ID
        # Call the helper method to fetch/update games and achievements.
        result = SteamAPI.get_games(steam_id)
        
        # Ensure that every game dictionary now includes locked achievements.
        if "games" in result:
            for game in result["games"]:
                total = game.get("total_achievements", 0)
                unlocked = game.get("unlocked_achievements", 0)
                game["locked_achievements"] = total - unlocked
        
        return Response({"result": result})

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
