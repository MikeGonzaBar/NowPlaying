from django.shortcuts import render

from .serializers import XboxGameSerializer
from .models import XboxGame
from .models import XboxAPI
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets

class XBOXViewSet(viewsets.ModelViewSet):
    
    queryset = XboxGame.objects.all()
    serializer_class=XboxGameSerializer
    
    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        XboxAPI.fetch_games()
        result = XboxGame.objects.all().order_by("-last_played")
        serializer = XboxGameSerializer(result, many=True)
        return Response({"result": serializer.data})
    
    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request):
        result = XboxGame.objects.all().order_by("-last_played")
        serializer = XboxGameSerializer(result, many=True)
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlaytime(self, request):
        result = XboxGame.objects.all().order_by("-total_playtime")
        serializer = XboxGameSerializer(result, many=True)
        return Response({"result": serializer.data})
    
    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request):
        # Retrieve stored games
        games = list(XboxGame.objects.all().prefetch_related("achievements"))

        # Helper function to calculate the weighted score for unlocked achievements.
        # (Adjust the weights based on your business logic.)
        def calculate_weighted_score(game):
            # Assuming achievements is a related name on PSNAchievement
            unlocked = game.achievements.filter(unlocked=True)
            score = 0
            for ach in unlocked:
                score+=ach.achievement_value
            return score

        sorted_games = sorted(games, key=calculate_weighted_score, reverse=True)
        serializer = XboxGameSerializer(sorted_games, many=True)
        return Response({"result": serializer.data})