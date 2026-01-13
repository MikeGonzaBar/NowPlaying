from datetime import datetime, timedelta
import re
from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import PSNGame
from .serializers import PSNGameSerializer
from .models import PSN  # Import the utility class that contains get_games() and get_games_stored()
from users.models import UserApiKey  # Import UserApiKey from users app
from rest_framework.permissions import IsAuthenticated
from psnawp_api import PSNAWP

class PSNViewSet(viewsets.ModelViewSet):
    serializer_class = PSNGameSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter games by the authenticated user
        return PSNGame.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        try:
            # Get the user's PSN NPSSO from their stored API keys
            api_key = UserApiKey.objects.get(user=request.user, service_name='psn')
            psn_user_id = api_key.service_user_id
            psn_npsso = api_key.get_key()
            
            if not psn_npsso:
                return Response(
                    {"error": "No PlayStation NPSSO found. Please update your PlayStation API key."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Call the helper method to fetch/update games and achievements
            result = PSN.get_games(psn_npsso, psn_user_id, user=request.user)
            return Response({"result": result})
            
        except UserApiKey.DoesNotExist:
            return Response(
                {"error": "No PlayStation API key found. Please add your PlayStation NPSSO in profile settings."},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["post"], url_path="exchange-npsso")
    def exchange_npsso(self, request):
        """
        Accepts an NPSSO value and optional PSN user id, validates it by
        initializing PSNAWP, and stores it encrypted in UserApiKey for the
        authenticated user. This enables automatic token handling by PSNAWP
        without requiring repeated logins.
        Body: { "npsso": "...", "psn_user_id": "optional" }
        """
        npsso = request.data.get("npsso")
        psn_user_id = request.data.get("psn_user_id")

        if not npsso or not isinstance(npsso, str) or len(npsso.strip()) < 10:
            return Response({"error": "Invalid or missing NPSSO."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Validate NPSSO by attempting to create a client
            client = PSNAWP(npsso).me()
            validated_online_id = getattr(client, "online_id", None)

            api_key_obj, _created = UserApiKey.objects.get_or_create(
                user=request.user,
                service_name="psn",
                defaults={
                    "service_user_id": psn_user_id or validated_online_id or "",
                },
            )
            api_key_obj.set_key(npsso, service_user_id=psn_user_id or validated_online_id or api_key_obj.service_user_id)
            api_key_obj.save()

            return Response(
                {
                    "message": "NPSSO stored successfully.",
                    "service_user_id": api_key_obj.service_user_id,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request):
        # Use the stored PSNGame records filtered by the current user
        try:
            # Use the serializer to get the proper data structure with trophy breakdowns
            games = self.get_queryset().prefetch_related("achievements")
            serializer = self.serializer_class(games, many=True)
            return Response({"result": serializer.data})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlaytime(self, request):
        # Retrieve stored games sorted by playtime
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

        games = list(self.get_queryset())
        # Sort using the helper function:
        sorted_games = sorted(games, key=lambda g: parse_playtime(g.total_playtime), reverse=True)
        serializer = self.serializer_class(sorted_games, many=True)
        return Response({"result": serializer.data})

    @action(detail=False, methods=["get"], url_path="get-game-list-most-achieved")
    def getGameListMostAchieved(self, request):
        # Retrieve stored games filtered by the current user
        games = list(self.get_queryset().prefetch_related("achievements"))

        # Helper function to calculate the weighted score for unlocked achievements.
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
        serializer = self.serializer_class(sorted_games, many=True)
        return Response({"result": serializer.data})
