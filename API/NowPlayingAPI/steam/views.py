from datetime import datetime
from rest_framework import viewsets
from rest_framework.decorators import action
from .models import Steam
from rest_framework.response import Response
from .serializers import SteamSerializer


class SteamViewSet(viewsets.ModelViewSet):
    queryset = Steam.objects.all()
    serializer_class = SteamSerializer

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        # Extract user_id from request query parameters
        user_id = request.query_params.get("user_id")
        # Call the model's method
        result = Steam.get_games(user_id)
        return Response({"result": result})

    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request):
        # Call the model's method to get the games
        result = Steam.get_games_stored()

        # Convert the result dictionary to a list and sort it by rtime_last_played
        sorted_result = sorted(
            result.values(),  # Get the values (list of games)
            key=lambda x: datetime.strptime(
                x["rtime_last_played"], "%d/%m/%Y"
            ),  # Parse the date
            reverse=True,  # Sort in descending order (most recent first)
        )

        return Response({"result": sorted_result})

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlaytimeForever(self, request):
        # Call the model's method to get the games
        result = Steam.get_games_stored()

        # Convert the result dictionary to a list and sort it by rtime_last_played
        sorted_result = sorted(
            result.values(),  # Get the values (list of games)
            key=lambda x: x["playtime_forever"],  # Sort by playtime_forever
            reverse=True,  # Sort in descending order (most recent first)
        )

        return Response({"result": sorted_result})

    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request):
        # Call the model's method to get the games
        result = Steam.get_games_stored()

        # Helper function to calculate the percentage of unlocked achievements
        def calculate_percentage(unlocked_achievements, total_achievements):
            if total_achievements == 0:
                return 0  # Avoid division by zero
            return (unlocked_achievements / total_achievements) * 100

        # Convert the result dictionary to a list and sort it by the percentage of unlocked achievements
        sorted_result = sorted(
            result.values(),  # Get the values (list of games)
            key=lambda x: calculate_percentage(
                x["unlocked_achievements"], x["total_achievements"]
            ),  # Calculate percentage
            reverse=True,  # Sort in descending order (highest percentage first)
        )

        return Response({"result": sorted_result})
