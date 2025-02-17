from rest_framework import viewsets
from rest_framework.decorators import action
from .models import Steam
from rest_framework.response import Response
from .serializers import SteamSerializer


class SteamViewSet(viewsets.ModelViewSet):
    queryset = Steam.objects.all()
    serializer_class = SteamSerializer

    @action(detail=False, methods=["get"], url_path="perform-operations")
    def perform_operations(self, request):
        # Call the model's method
        result = Steam.perform_operations(self)
        return Response({"result": result})

    @action(detail=False, methods=["get"], url_path="get-game-list")
    def getGameList(self, request):
        # Extract user_id from request query parameters
        user_id = request.query_params.get("user_id")
        # Call the model's method
        result = Steam.get_games(user_id)
        return Response({"result": result})

    @action(detail=False, methods=["get"], url_path="get-game-list-stored")
    def getGameListStored(self, request):
        # Call the model's method
        result = Steam.get_games_stored()
        return Response({"result": result})
