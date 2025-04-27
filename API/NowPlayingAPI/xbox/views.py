from django.shortcuts import render
from django.db.models import IntegerField
from django.db.models.functions import Cast
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
        qs = XboxGame.objects.annotate(
            total_playtime_int=Cast("total_playtime", IntegerField())
        ).order_by("-total_playtime_int")

        serializer = XboxGameSerializer(qs, many=True)
        return Response({"result": serializer.data})
    
    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request):
        # Retrieve stored games
        games = list(XboxGame.objects.all().prefetch_related("achievements"))

        # Helper function to calculate the weighted score for unlocked achievements.
        # (Adjust the weights based on your business logic.)
        def calculate_weighted_score(game):
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
        serializer = XboxGameSerializer(sorted_games, many=True)
        return Response({"result": serializer.data})