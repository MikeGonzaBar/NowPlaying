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
        return Response({"result": result})
