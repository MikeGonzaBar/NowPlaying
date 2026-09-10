from datetime import timedelta
import re
from django.db.models import QuerySet
from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.request import Request
from rest_framework.response import Response
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import PSNGame
from .serializers import PSNGameSerializer
from .models import PSN  # Import the utility class that contains get_games() and get_games_stored()
from users.models import UserApiKey  # Import UserApiKey from users app
from users.credentials import InvalidServiceCredentials, MissingServiceCredentials
from rest_framework.permissions import IsAuthenticated
from psnawp_api import PSNAWP
from .auth import serialize_psn_auth_payload


@extend_schema_view(
    getGameList=extend_schema(summary="Fetch and sync the authenticated user's PlayStation library", responses={200: OpenApiTypes.OBJECT}),
    exchange_npsso=extend_schema(
        summary="Exchange NPSSO for encrypted PlayStation auth tokens",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
    ),
    getGameListStored=extend_schema(summary="List stored PlayStation games", responses={200: PSNGameSerializer(many=True)}),
    getGameListPlaytime=extend_schema(summary="List stored PlayStation games sorted by playtime", responses={200: PSNGameSerializer(many=True)}),
    getGameListMostAchieved=extend_schema(summary="List stored PlayStation games sorted by weighted trophy score", responses={200: PSNGameSerializer(many=True)}),
)
class PSNViewSet(viewsets.ModelViewSet):
    """Expose PlayStation library sync, NPSSO exchange, and stored game views."""

    queryset = PSNGame.objects.none()
    serializer_class = PSNGameSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[PSNGame]:
        """Return only PlayStation games owned by the authenticated user."""
        # Filter games by the authenticated user
        return PSNGame.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request: Request) -> Response:
        """Fetch PlayStation games and persist any refreshed auth payload."""
        try:
            api_key_obj = UserApiKey.objects.get(user=request.user, service_name="psn")
        except UserApiKey.DoesNotExist as exc:
            raise MissingServiceCredentials(
                "No PlayStation connection found. Please connect PlayStation in profile settings."
            ) from exc

        stored_auth = api_key_obj.get_key()
        if not stored_auth:
            raise InvalidServiceCredentials(
                "Could not decrypt the stored PlayStation connection. Please connect PlayStation again."
            )

        def persist_refreshed_auth(refreshed_auth: str) -> None:
            """Persist refreshed PlayStation auth returned by the PSNAWP client."""
            api_key_obj.set_key(refreshed_auth)
            api_key_obj.save(update_fields=["key_hash", "updated_at"])

        api_key_obj.update_last_used()
        result = PSN.get_games(
            stored_auth,
            api_key_obj.service_user_id,
            user=request.user,
            auth_update_callback=persist_refreshed_auth,
        )
        return Response({"result": result})

    @action(detail=False, methods=["post"], url_path="exchange-npsso")
    def exchange_npsso(self, request: Request) -> Response:
        """
        Accepts an NPSSO value and optional PSN user id, validates it by
        initializing PSNAWP, then stores the derived access/refresh token
        payload encrypted in UserApiKey for the authenticated user. Raw NPSSO
        is not retained after this exchange.
        Body: { "npsso": "...", "psn_user_id": "optional" }
        """
        npsso = request.data.get("npsso")
        psn_user_id = request.data.get("psn_user_id")

        if not npsso or not isinstance(npsso, str) or len(npsso.strip()) < 10:
            return Response({"error": "Invalid or missing NPSSO."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            psnawp = PSNAWP(npsso.strip())
            client = psnawp.me()
            validated_online_id = getattr(client, "online_id", None)
            auth_payload = serialize_psn_auth_payload(psnawp)
            if not auth_payload:
                return Response(
                    {"error": "Could not exchange NPSSO for PlayStation auth tokens."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            api_key_obj, _created = UserApiKey.objects.get_or_create(
                user=request.user,
                service_name="psn",
                defaults={
                    "service_user_id": psn_user_id or validated_online_id or "",
                },
            )
            api_key_obj.set_key(
                auth_payload,
                service_user_id=psn_user_id or validated_online_id or api_key_obj.service_user_id,
            )
            api_key_obj.save()

            return Response(
                {
                    "message": "PlayStation connected successfully.",
                    "service_user_id": api_key_obj.service_user_id,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request: Request) -> Response:
        """Return stored PlayStation games with trophy breakdowns."""
        # Use the stored PSNGame records filtered by the current user
        try:
            # Use the serializer to get the proper data structure with trophy breakdowns
            games = self.get_queryset().prefetch_related("achievements")
            serializer = self.serializer_class(games, many=True)
            return Response({"result": serializer.data})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="get-game-list-total-playtime")
    def getGameListPlaytime(self, request: Request) -> Response:
        """Return stored PlayStation games ordered by parsed total playtime."""
        # Retrieve stored games sorted by playtime
        def parse_playtime(playtime: str) -> float:
            """Convert a PSN playtime string into seconds for sorting."""
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
    def getGameListMostAchieved(self, request: Request) -> Response:
        """Return stored PlayStation games ordered by weighted trophy score."""
        # Retrieve stored games filtered by the current user
        games = list(self.get_queryset().prefetch_related("achievements"))

        # Helper function to calculate the weighted score for unlocked achievements.
        def calculate_weighted_score(game: PSNGame) -> int:
            """Return the weighted unlocked trophy score for sorting."""
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
