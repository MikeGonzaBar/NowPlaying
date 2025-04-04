from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import models
from .models import (
    Episode,
    Season,
    fetch_latest_watched_movies,
    fetch_latest_watched_shows,
    refresh_trakt_token,
    TraktToken,
    Show,
    Movie,
)
from django.core.serializers import serialize  # For serializing data


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
                    "get_stored_movies": request.build_absolute_uri(
                        "get-stored-movies/"
                    ),
                    "get-stored-shows": request.build_absolute_uri("get-stored-shows/"),
                    "get-watched-seasons-episode": request.build_absolute_uri(
                        "get-watched-seasons-episode/"
                    ),
                }
            }
        )

    @action(detail=False, methods=["get"], url_path="get-stored-movies")
    def get_stored_movies(self, request):
        """
        Returns the stored values from the Movie model, sorted by last_watched_at,
        and formatted like the fetch_latest_movies endpoint.
        """
        # Query movies and order by last_watched_at in descending order
        movies = (
            Movie.objects.all()
            .order_by("-last_watched_at")
            .values(
                "title",
                "year",
                "plays",
                "last_watched_at",
                "last_updated_at",
                "trakt_id",
                "slug",
                "imdb_id",
                "tmdb_id",
            )
        )

        # Format the response to match the desired structure
        formatted_movies = [
            {
                "plays": movie["plays"],
                "last_watched_at": movie["last_watched_at"],
                "last_updated_at": movie["last_updated_at"],
                "movie": {
                    "title": movie["title"],
                    "year": movie["year"],
                    "ids": {
                        "trakt": movie["trakt_id"],
                        "slug": movie["slug"],
                        "imdb": movie["imdb_id"],
                        "tmdb": movie["tmdb_id"],
                    },
                },
            }
            for movie in movies
        ]

        return Response({"movies": formatted_movies})

    @action(detail=False, methods=["get"], url_path="get-stored-shows")
    def get_stored_shows(self, request):
        """
        Returns the stored values from the Show model, sorted by last_watched_at,
        and formatted like the fetch_latest_shows endpoint.
        """
        # Query shows and order by last_watched_at in descending order
        shows = (
            Show.objects.all()
            .order_by("-last_watched_at")
            .values(
                "id",
                "trakt_id",
                "tmdb_id",
                "title",
                "year",
                "image_url",
                "last_watched_at",
            )
        )

        # Format the response to match the desired structure
        formatted_shows = [
            {
                "last_watched_at": show["last_watched_at"],
                "show": {
                    "id": show["id"],
                    "title": show["title"],
                    "year": show["year"],
                    "image_url": show["image_url"],
                    "ids": {
                        "trakt": show["trakt_id"],
                        "tmdb": show["tmdb_id"],
                    },
                },
            }
            for show in shows
        ]

        return Response({"shows": formatted_shows})

    @action(detail=False, methods=["get"], url_path="get-watched-seasons-episodes")
    def get_watched_seasons_episodes(self, request):
        """
        Returns the details of watched seasons and episodes, including their shows.
        Allows filtering by trakt_id.
        """
        trakt_id = request.query_params.get(
            "trakt_id"
        )  # Get trakt_id from query params

        # Validate that trakt_id is provided
        if not trakt_id:
            raise ValidationError({"detail": "The 'trakt_id' parameter is required."})

        # Filter seasons and episodes by trakt_id
        seasons = Season.objects.filter(show__trakt_id=trakt_id).values(
            "id", "season_number", "show__id", "show__title", "show__trakt_id"
        )

        # Use distinct to avoid duplicate episodes caused by multiple EpisodeWatch records
        episodes = (
            Episode.objects.filter(show__trakt_id=trakt_id)
            .values(
                "id",
                "episode_number",
                "title",
                "season__id",
                "season__season_number",
                "show__id",
                "show__title",
                "show__trakt_id",
            )
            .annotate(
                last_watched_at=models.Max(
                    "watches__watched_at"
                ),  # Get the latest watch time
                progress=models.Max("watches__progress"),  # Get the highest progress
            )
        )

        return Response(
            {
                "seasons": list(seasons),
                "episodes": list(episodes),
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
