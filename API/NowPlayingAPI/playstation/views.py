from datetime import datetime, timedelta
import re
from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from .models import PSNGame
from .serializers import PSNGameSerializer
from .models import PSN  # Import the utility class that contains get_games() and get_games_stored()

class PSNViewSet(viewsets.ModelViewSet):
    # Use the normalized model for queryset and serializer.
    queryset = PSNGame.objects.all()
    serializer_class = PSNGameSerializer

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        # Call the utility class’s method that fetches and stores games.
        result = PSN.get_games()
        return Response({"result": result})

    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request):
        # Use the stored PSNGame records
        games = PSNGame.objects.all().order_by("-last_played")
        serializer = PSNGameSerializer(games, many=True)
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlayitime(self, request):
        # Retrieve stored games sorted by playtime
        # (Assuming total_playtime is stored as a string
        def parse_playtime(playtime):
            match = re.match(r"(?:(\d+) days?, )?(\d+):(\d+):(\d+)", playtime)
            if match:
                days = int(match.group(1)) if match.group(1) else 0
                hours = int(match.group(2))
                minutes = int(match.group(3))
                seconds = int(match.group(4))
                return timedelta(
                    days=days, hours=hours, minutes=minutes, seconds=seconds
                ).total_seconds()
            return 0

        games = list(PSNGame.objects.all())
        # Sort using the helper function:
        sorted_games = sorted(games, key=lambda g: parse_playtime(g.total_playtime), reverse=True)
        serializer = PSNGameSerializer(sorted_games, many=True)
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request):
        # Retrieve stored games
        games = list(PSNGame.objects.all().prefetch_related("achievements"))

        # Helper function to calculate the weighted score for unlocked achievements.
        # (Adjust the weights based on your business logic.)
        def calculate_weighted_score(game):
            # Assuming achievements is a related name on PSNAchievement
            unlocked = game.achievements.filter(unlocked=True)
            score = 0
            for trophy in unlocked:
                if trophy.trophy_type.lower() == "platinum":
                    score += 20
                elif trophy.trophy_type.lower() == "gold":
                    score += 3
                elif trophy.trophy_type.lower() == "silver":
                    score += 2
                elif trophy.trophy_type.lower() == "bronze":
                    score += 1
            return score

        sorted_games = sorted(games, key=calculate_weighted_score, reverse=True)
        serializer = PSNGameSerializer(sorted_games, many=True)
        return Response({"result": serializer.data})
