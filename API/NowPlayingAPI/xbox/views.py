from django.shortcuts import render
from django.db.models import IntegerField
from django.db.models.functions import Cast
from .serializers import XboxGameSerializer
from .models import XboxGame
from .models import XboxAPI
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, status
from users.models import UserApiKey

class XBOXViewSet(viewsets.ModelViewSet):
    serializer_class = XboxGameSerializer
    
    def get_queryset(self):
        # Filter games by the authenticated user
        return XboxGame.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        try:
            # Get the user's Xbox credentials from their stored API keys
            api_key = UserApiKey.objects.get(user=request.user, service_name='xbox')
            xuid = api_key.service_user_id
            xbox_api_key = api_key.get_key()
            
            if not xuid:
                return Response(
                    {"error": "No Xbox XUID found. Please update your Xbox API key with your XUID."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Call the API method to fetch/update games and achievements
            result = XboxAPI.fetch_games(
                user=request.user,
                xbox_api_key=xbox_api_key,
                xuid=xuid
            )
            
            return Response({"result": result})
            
        except UserApiKey.DoesNotExist:
            return Response(
                {"error": "No Xbox API key found. Please add your Xbox API key in profile settings."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request):
        try:
            result = XboxAPI.get_games_stored(user=request.user)
            return Response({"result": result})
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlaytime(self, request):
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
    def getGameListMostAchieved(self, request):
        try:
            # Retrieve stored games filtered by the current user
            games = list(self.get_queryset().prefetch_related("achievements"))

            # Helper function to calculate the weighted score for unlocked achievements
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
            serializer = self.serializer_class(sorted_games, many=True)
            return Response({"result": serializer.data})
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )