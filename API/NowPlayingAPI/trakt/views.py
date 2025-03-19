from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from .models import (
    fetch_latest_watched_movies,
    fetch_latest_watched_shows,
    refresh_trakt_token,
    TraktToken,
)


class TraktViewSet(viewsets.ViewSet):
    """
    A viewset that provides actions to fetch the latest watched movies,
    shows, and refresh the Trakt token.
    """

    def list(self, request):
        """
        Default endpoint for /trakt/ that returns a list of available actions.
        """
        return Response(
            {
                "available_endpoints": {
                    "fetch_latest_movies": request.build_absolute_uri(
                        "fetch-latest-movies/"
                    ),
                    "fetch_latest_shows": request.build_absolute_uri(
                        "fetch-latest-shows/"
                    ),
                    "refresh_token": request.build_absolute_uri("refresh-token/"),
                }
            }
        )

    @action(detail=False, methods=["get"], url_path="fetch-latest-movies")
    def fetch_latest_movies(self, request):
        """
        Fetches the latest watched movies from Trakt and updates the database.
        """
        result = fetch_latest_watched_movies()
        return Response({"result": result})

    @action(detail=False, methods=["get"], url_path="fetch-latest-shows")
    def fetch_latest_shows(self, request):
        """
        Fetches the latest watched TV shows (including episode details) from Trakt and updates the database.
        """
        result = fetch_latest_watched_shows()
        return Response({"result": result})

    @action(detail=False, methods=["get"], url_path="refresh-token")
    def refresh_token(self, request):
        """
        Manually refreshes the Trakt access token.
        """
        try:
            token_instance = TraktToken.objects.latest("updated_at")
        except TraktToken.DoesNotExist:
            return Response({"error": "Trakt token not found."}, status=400)
        refreshed = refresh_trakt_token(token_instance)
        return Response(
            {"access_token": refreshed.access_token, "expires_at": refreshed.expires_at}
        )
