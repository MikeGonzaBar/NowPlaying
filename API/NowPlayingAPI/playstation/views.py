from datetime import datetime, timedelta
import re
from rest_framework.decorators import action
from rest_framework import viewsets
from .models import PSN
from rest_framework.response import Response
from .serializers import PSNSerializer


class PSNViewSet(viewsets.ModelViewSet):
    queryset = PSN.objects.all()
    serializer_class = PSNSerializer

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        # Call the model's method
        result = PSN.get_games()
        return Response({"result": result})

    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request):
        # Call the model's method
        result = PSN.get_games_stored()
        # Convert the result dictionary to a list and sort it by last_played
        sorted_result = sorted(
            result.values(),  # Get the values (list of games)
            key=lambda x: datetime.strptime(
                x["last_played"], "%Y-%m-%dT%H:%M:%S.%f%z"
            ),  # Parse the ISO 8601 date
            reverse=True,  # Sort in descending order (most recent first)
        )

        return Response({"result": sorted_result})

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlayitime(self, request):
        # Call the model's method
        result = PSN.get_games_stored()

        # Convert the result dictionary to a list and sort it by last_played
        # Helper function to convert total_playtime to total seconds
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

        # Convert the result dictionary to a list and sort it by total_playtime
        sorted_result = sorted(
            result.values(),  # Get the values (list of games)
            key=lambda x: parse_playtime(
                x["total_playtime"]
            ),  # Convert playtime to total seconds
            reverse=True,  # Sort in descending order (most playtime first)
        )

        return Response({"result": sorted_result})

    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request):
        # Call the model's method
        result = PSN.get_games_stored()

        # Helper function to calculate the weighted score for unlocked achievements
        def calculate_weighted_score(unlocked_achievements, total_achievements):
            if total_achievements == 0:
                return 0
            platinum = (
                unlocked_achievements.get("platinum", 0) * 20
            )  # Platinum weight = 5
            gold = unlocked_achievements.get("gold", 0) * 3  # Gold weight = 3
            silver = unlocked_achievements.get("silver", 0) * 2  # Silver weight = 2
            bronze = unlocked_achievements.get("bronze", 0) * 1  # Bronze weight = 1
            return platinum + gold + silver + bronze

        # Convert the result dictionary to a list and sort it by the weighted score
        sorted_result = sorted(
            result.values(),  # Get the values (list of games)
            key=lambda x: calculate_weighted_score(
                x["unlocked_achievements"], x["total_achievements"]
            ),  # Calculate weighted score
            reverse=True,  # Sort in descending order (highest score first)
        )

        return Response({"result": sorted_result})
