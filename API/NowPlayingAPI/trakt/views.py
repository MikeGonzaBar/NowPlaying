from rest_framework.decorators import action
from rest_framework import serializers, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework import status
from typing import cast
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from django.conf import settings
from django.http import HttpResponse
from django.urls import reverse
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
import logging
import threading
import http_client
from urllib.parse import urlencode
from query_params import pagination_params

# Django model attribute access (ForeignKey reverse relations, dynamic attributes)
# is not fully modeled in typeshed stubs.
# pyright: reportAttributeAccessIssue=false
from .models import (
    Episode,
    Season,
    EpisodeWatch,
    MovieWatch,
    fetch_latest_watched_movies,
    fetch_latest_watched_shows,
    fetch_single_show,
    fetch_single_movie,
    refresh_trakt_token,
    TraktToken,
    Show,
    Movie,
    get_trakt_api_credentials,
    get_trakt_headers,
)

logger = logging.getLogger(__name__)


class TraktSchemaSerializer(serializers.Serializer):
    """Placeholder serializer for schema generation on action-only Trakt views."""


def get_trakt_redirect_uri(request: Request) -> str:
    """Return the Trakt OAuth callback URL for the current request."""
    configured_uri = getattr(settings, "TRAKT_REDIRECT_URI", "").strip()
    if configured_uri:
        return configured_uri

    prefix = request.headers.get("X-Forwarded-Prefix", "").strip().rstrip("/")
    callback_path = reverse("trakt-oauth-callback")
    if prefix:
        callback_path = f"{prefix}{callback_path}"
    return request.build_absolute_uri(callback_path)


def invalidate_trakt_caches(user_id: int) -> None:
    """Clear analytics and media caches after Trakt data changes."""
    from analytics.services import AnalyticsService

    deleted_keys = AnalyticsService.invalidate_user_cache(user_id)
    cache.delete_many([
        f"completed_media_{user_id}",
    ])
    logger.info("Invalidated Trakt-dependent caches for user %s (%s analytics keys)", user_id, deleted_keys)


TMDB_PROXY_CACHE_TTL = 600  # 10 minutes


def _tmdb_proxy_get(path: str, params: dict | None = None) -> Response:
    """Forward a request to TMDB server-side so the API key never reaches the browser."""
    api_key = getattr(settings, "TMDB_API_KEY", "")
    if not api_key:
        return Response(
            {"error": "TMDB API key is not configured on the server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    query = dict(params or {})
    query["api_key"] = api_key
    url = f"https://api.themoviedb.org/3/{path}?{urlencode(query)}"

    try:
        response = http_client.get(url, logger_name="trakt")
    except Exception as exc:
        logger.warning("TMDB proxy request failed for %s: %s", path, exc)
        return Response(
            {"error": "Upstream TMDB request failed."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if response.status_code != 200:
        logger.warning("TMDB proxy received HTTP %s for %s", response.status_code, path)
        return Response(
            {"error": "TMDB request failed."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    return Response(response.json())


def _tmdb_episode_still(show_obj, season_number: int, episode_number: int) -> str | None:
    """Return a w780 episode still from TMDB, or None on any failure."""
    tmdb_api_key = getattr(settings, "TMDB_API_KEY", "")
    if not tmdb_api_key:
        return None
    url = (
        f"https://api.themoviedb.org/3/tv/{show_obj.tmdb_id}"
        f"/season/{season_number}/episode/{episode_number}"
        f"?api_key={tmdb_api_key}&language=en-US"
    )
    try:
        response = http_client.get(url, logger_name="trakt")
        if response.status_code == 200:
            still_path = response.json().get("still_path")
            if still_path:
                return f"https://image.tmdb.org/t/p/w780{still_path}"
    except Exception as e:
        logger.warning(
            "Error fetching TMDB episode image for S%sE%s: %s",
            season_number,
            episode_number,
            e,
        )
    return None


@extend_schema_view(
    list=extend_schema(summary="List Trakt endpoints", responses={200: OpenApiTypes.OBJECT}),
    get_stored_movies=extend_schema(summary="List stored Trakt movies", parameters=[OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY), OpenApiParameter("page_size", OpenApiTypes.INT, OpenApiParameter.QUERY)], responses={200: OpenApiTypes.OBJECT}),
    get_stored_shows=extend_schema(summary="List stored Trakt shows", parameters=[OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY), OpenApiParameter("page_size", OpenApiTypes.INT, OpenApiParameter.QUERY)], responses={200: OpenApiTypes.OBJECT}),
    media_detail=extend_schema(summary="Get movie or show detail", responses={200: OpenApiTypes.OBJECT}),
    get_watched_seasons_episodes=extend_schema(summary="List watched seasons and episodes for a show", responses={200: OpenApiTypes.OBJECT}),
    fetch_latest_movies=extend_schema(summary="Fetch and sync latest watched movies", responses={200: OpenApiTypes.OBJECT}),
    fetch_latest_shows=extend_schema(summary="Fetch and sync latest watched shows", responses={200: OpenApiTypes.OBJECT}),
    update_show=extend_schema(summary="Sync one Trakt show", responses={200: OpenApiTypes.OBJECT}),
    watch_history=extend_schema(summary="List Trakt watch history", responses={200: OpenApiTypes.OBJECT}),
    activity_heatmap=extend_schema(summary="Get Trakt activity heatmap", responses={200: OpenApiTypes.OBJECT}),
    top_genres=extend_schema(summary="Get top Trakt genres", responses={200: OpenApiTypes.OBJECT}),
    movie_stats=extend_schema(summary="Get Trakt movie statistics", responses={200: OpenApiTypes.OBJECT}),
    update_movie=extend_schema(summary="Sync one Trakt movie", responses={200: OpenApiTypes.OBJECT}),
    refresh_token=extend_schema(summary="Refresh the stored Trakt OAuth token", responses={200: OpenApiTypes.OBJECT}),
    auth_status=extend_schema(summary="Return Trakt OAuth connection status", responses={200: OpenApiTypes.OBJECT}),
    authenticate=extend_schema(summary="Start the Trakt OAuth flow", responses={200: OpenApiTypes.OBJECT}),
    oauth_callback=extend_schema(summary="Handle Trakt OAuth callback", responses={200: OpenApiTypes.OBJECT}),
    search=extend_schema(summary="Search Trakt movies and shows", parameters=[OpenApiParameter("query", OpenApiTypes.STR, OpenApiParameter.QUERY), OpenApiParameter("type", OpenApiTypes.STR, OpenApiParameter.QUERY)], responses={200: OpenApiTypes.OBJECT}),
    recent_activity=extend_schema(summary="List recent Trakt activity", responses={200: OpenApiTypes.OBJECT}),
    completed_media=extend_schema(summary="List completed movies and shows", responses={200: OpenApiTypes.OBJECT}),
    profile_stats=extend_schema(summary="Get Trakt profile statistics", responses={200: OpenApiTypes.OBJECT}),
    trending=extend_schema(summary="List trending Trakt media", responses={200: OpenApiTypes.OBJECT}),
    tmdb_detail=extend_schema(
        summary="Proxy TMDB movie or show detail (keeps the TMDB key server-side)",
        parameters=[
            OpenApiParameter("tmdb_id", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("type", OpenApiTypes.STR, OpenApiParameter.QUERY, description="movie or tv"),
            OpenApiParameter("append_to_response", OpenApiTypes.STR, OpenApiParameter.QUERY),
        ],
        responses={200: OpenApiTypes.OBJECT},
    ),
    tmdb_watch_providers=extend_schema(
        summary="Proxy TMDB watch providers (keeps the TMDB key server-side)",
        parameters=[
            OpenApiParameter("tmdb_id", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("type", OpenApiTypes.STR, OpenApiParameter.QUERY, description="movie or tv"),
        ],
        responses={200: OpenApiTypes.OBJECT},
    ),
    tmdb_videos=extend_schema(
        summary="Proxy TMDB videos/trailers (keeps the TMDB key server-side)",
        parameters=[
            OpenApiParameter("tmdb_id", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("type", OpenApiTypes.STR, OpenApiParameter.QUERY, description="movie or tv"),
        ],
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class TraktViewSet(viewsets.ViewSet):
    """
    A viewset that provides actions to fetch the latest watched movies,
    shows, and refresh the Trakt token.
    """

    serializer_class = TraktSchemaSerializer

    def list(self, request: Request) -> Response:
        """
        Default endpoint for /trakt/ that returns a list of available actions.
        """
        return Response(
            {
                "available_endpoints": {
                    "auth_status": request.build_absolute_uri("auth-status/"),
                    "authenticate": request.build_absolute_uri("authenticate/"),
                    "oauth_callback": request.build_absolute_uri("oauth-callback/"),
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
                    "get-watched-seasons-episodes": request.build_absolute_uri(
                        "get-watched-seasons-episodes/"
                    ),
                    "update-show": request.build_absolute_uri("update-show/"),
                    "update-movie": request.build_absolute_uri("update-movie/"),
                    "movie-stats": request.build_absolute_uri("movie-stats/"),
                    "watch-history": request.build_absolute_uri("watch-history/"),
                    "detail": request.build_absolute_uri("detail/"),
                    "activity-heatmap": request.build_absolute_uri("activity-heatmap/"),
                    "top-genres": request.build_absolute_uri("top-genres/"),
                    "completed-media": request.build_absolute_uri("completed-media/"),
                    "tmdb-detail": request.build_absolute_uri("tmdb-detail/"),
                    "tmdb-watch-providers": request.build_absolute_uri("tmdb-watch-providers/"),
                    "tmdb-videos": request.build_absolute_uri("tmdb-videos/"),
                }
            }
        )

    @action(detail=False, methods=["get"], url_path="get-stored-movies")
    def get_stored_movies(self, request: Request) -> Response:
        """
        Returns the stored values from the Movie model for the authenticated user, 
        sorted by last_watched_at, and formatted like the fetch_latest_movies endpoint.
        """
        page, page_size = pagination_params(request.query_params, default_page_size=5, max_page_size=100)
        offset = (page - 1) * page_size
        limit = offset + page_size
        
        # Query movies for the authenticated user and order by last_watched_at in descending order
        movies_qs = Movie.objects.filter(user=request.user).order_by("-last_watched_at")
        total = movies_qs.count()

        movies = movies_qs[offset:limit].values(
            "title",
            "year",
            "plays",
            "last_watched_at",
            "last_updated_at",
            "trakt_id",
            "slug",
            "imdb_id",
            "tmdb_id",
            "image_url",
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
                    "image_url": movie["image_url"],
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

        return Response({
        "page": page,
        "page_size": page_size,
        "total_items": total,
        "total_pages": (total + page_size - 1) // page_size,
        "movies": formatted_movies
        })

    @action(detail=False, methods=["get"], url_path="get-stored-shows")
    def get_stored_shows(self, request: Request) -> Response:
        """
        Returns paginated stored values from the Show model for the authenticated user, 
        sorted by last_watched_at.
        """
        page, page_size = pagination_params(request.query_params, default_page_size=5, max_page_size=100)
        offset = (page - 1) * page_size
        limit = offset + page_size

        shows_qs = Show.objects.filter(user=request.user).order_by("-last_watched_at")
        total = shows_qs.count()

        shows = shows_qs[offset:limit].values(
            "id",
            "trakt_id",
            "tmdb_id",
            "title",
            "year",
            "image_url",
            "last_watched_at",
        )

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

        return Response({
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": (total + page_size - 1) // page_size,
            "shows": formatted_shows
        })

    @action(detail=False, methods=["get"], url_path="detail")
    def media_detail(self, request: Request) -> Response:
        """Return enriched movie or show detail from stored and TMDB data."""
        media_type = request.query_params.get("type", "").strip().lower()
        tmdb_id = request.query_params.get("tmdb_id", "").strip()

        if media_type not in ["movie", "show"]:
            raise ValidationError({"type": "Must be 'movie' or 'show'."})
        if not tmdb_id:
            raise ValidationError({"tmdb_id": "This query parameter is required."})

        if media_type == "movie":
            movie = Movie.objects.filter(user=request.user, tmdb_id=tmdb_id).first()
            if not movie:
                return Response({"error": "Movie not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response({
                "result": {
                    "plays": movie.plays,
                    "last_watched_at": movie.last_watched_at,
                    "last_updated_at": movie.last_updated_at,
                    "movie": {
                        "title": movie.title,
                        "year": movie.year,
                        "image_url": movie.image_url,
                        "ids": {
                            "trakt": movie.trakt_id,
                            "slug": movie.slug,
                            "imdb": movie.imdb_id,
                            "tmdb": movie.tmdb_id,
                        },
                    },
                }
            })

        show = Show.objects.filter(user=request.user, tmdb_id=tmdb_id).first()
        if not show:
            return Response({"error": "Show not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "result": {
                "last_watched_at": show.last_watched_at,
                "show": {
                    "id": show.id,
                    "title": show.title,
                    "year": show.year,
                    "image_url": show.image_url,
                    "ids": {
                        "trakt": show.trakt_id,
                        "tmdb": show.tmdb_id,
                    },
                },
            }
        })

    @action(detail=False, methods=["get"], url_path="get-watched-seasons-episodes")
    def get_watched_seasons_episodes(self, request: Request) -> Response:
        """
        Returns all seasons and episodes for a show, including watched status.
        Fetches all episodes from Trakt API and merges with watched data from database.
        """
        trakt_id = request.query_params.get("trakt_id")

        # Validate that trakt_id is provided
        if not trakt_id:
            raise ValidationError({"detail": "The 'trakt_id' parameter is required."})

        trakt_id = cast(str, trakt_id)

        try:
            # Get the show from database to check if user has access
            show_obj = Show.objects.filter(trakt_id=trakt_id, user=request.user).first()
            if not show_obj:
                return Response(
                    {"error": "Show not found or you don't have access to it."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Fetch all seasons and episodes from Trakt API
            headers = get_trakt_headers(request.user)
            
            # Fetch full show details from Trakt API for metadata
            show_url = f"https://api.trakt.tv/shows/{trakt_id}?extended=full"
            show_response = http_client.get(show_url, headers=headers, logger_name="trakt")
            show_metadata = {}
            
            if show_response.status_code == 200:
                show_data = show_response.json()
                # Extract show metadata
                show_metadata = {
                    "genres": show_data.get("genres", []),
                    "status": show_data.get("status", ""),  # "returning series", "ended", "canceled", "in production"
                    "network": show_data.get("network", ""),
                    "certification": show_data.get("certification", ""),
                    "country": show_data.get("country", ""),
                    "overview": show_data.get("overview", ""),
                    "rating": show_data.get("rating"),
                    "runtime": show_data.get("runtime"),
                    "first_aired": show_data.get("first_aired"),
                    "air_day": show_data.get("airs", {}).get("day", ""),  # Day of the week
                    "air_time": show_data.get("airs", {}).get("time", ""),
                    "air_timezone": show_data.get("airs", {}).get("timezone", ""),
                }
            
            # Fetch all seasons for the show (this includes all episodes)
            seasons_url = f"https://api.trakt.tv/shows/{trakt_id}/seasons?extended=episodes"
            seasons_response = http_client.get(seasons_url, headers=headers, logger_name="trakt")
            
            if seasons_response.status_code != 200:
                logger.warning(f"Failed to fetch seasons from Trakt: {seasons_response.status_code}")
                return self._get_database_only_episodes(trakt_id, request.user, show_metadata)

            trakt_seasons_data = seasons_response.json()
            
            # Handle case where response might be empty or not a list
            if not isinstance(trakt_seasons_data, list):
                logger.warning(f"Unexpected seasons response format: {type(trakt_seasons_data)}")
                return self._get_database_only_episodes(trakt_id, request.user, show_metadata)

            # Get watched episodes from database
            watched_episodes_qs = (
                Episode.objects.filter(
                    show__trakt_id=trakt_id,
                    show__user=request.user
                )
                .select_related('season')
                .annotate(
                    last_watched_at=models.Max("watches__watched_at"),
                    progress=models.Max("watches__progress"),
                )
            )

            # Create a map of watched episodes: (season_number, episode_number) -> episode_data
            watched_episodes_map = {}
            for ep in watched_episodes_qs:
                key = (ep.season.season_number, ep.episode_number)
                watched_episodes_map[key] = {
                    "id": ep.id,
                    "last_watched_at": ep.last_watched_at.isoformat() if ep.last_watched_at else None,
                    "progress": ep.progress,
                    "plays": ep.plays,
                    "watched_at": ep.watched_at.isoformat() if ep.watched_at else None,
                }

            # Build seasons and episodes list from Trakt data, merging with watched data
            seasons_list = []
            episodes_list = []

            for season_data in trakt_seasons_data:
                season_number = season_data.get("number", 0)
                
                # Skip specials (season 0) if you want, or include them
                # if season_number == 0:
                #     continue

                # Get or create season in database
                season_obj, _ = Season.objects.get_or_create(
                    show=show_obj,
                    season_number=season_number
                )

                seasons_list.append({
                    "id": season_obj.id,
                    "season_number": season_number,
                    "show__id": show_obj.id,
                    "show__title": show_obj.title,
                    "show__trakt_id": trakt_id,
                    "episode_count": len(season_data.get("episodes", [])),
                })

                # Process each episode in the season, deferring any TMDB still fallback so
                # missing posters are batched into one concurrent fan-out instead of a
                # blocking HTTP round trip per episode.
                missing_indexes = []  # (list index, episode_number)
                season_episodes = []
                
                for ep_data in season_data.get("episodes", []):
                    episode_number = ep_data.get("number", 0)
                    key = (season_number, episode_number)
                    # Get watched data if exists
                    watched_data = watched_episodes_map.get(key, {})
                
                    # Preferred poster: Trakt screenshot, then stored DB image.
                    poster = None
                    images = ep_data.get("images", {})
                    if images and isinstance(images, dict):
                        screenshot = images.get("screenshot", {})
                        if isinstance(screenshot, dict):
                            poster = screenshot.get("full")
                    if not poster and watched_data.get("image_url"):
                        poster = watched_data.get("image_url")
                
                    if not poster and show_obj.tmdb_id and episode_number:
                        missing_indexes.append((len(season_episodes), episode_number))
                
                    # Format air_date if present
                    air_date = ep_data.get("first_aired")
                    if air_date:
                        try:
                            from dateutil.parser import isoparse
                            air_date = isoparse(air_date).date().isoformat()
                        except:
                            air_date = None
                
                    season_episodes.append({
                        "episode_number": episode_number,
                        "poster": poster,
                        "watched_data": watched_data,
                        "ep_data": ep_data,
                        "air_date": air_date,
                    })
                
                # Batch-fetch TMDB stills for episodes that still have no poster.
                if missing_indexes:
                    from concurrent.futures import ThreadPoolExecutor
                
                    def load_still(index: int, episode_number: int) -> None:
                        still = _tmdb_episode_still(show_obj, season_number, episode_number)
                        if still:
                            season_episodes[index]["poster"] = still
                
                    with ThreadPoolExecutor(max_workers=8) as executor:
                        list(executor.map(lambda item: load_still(*item), missing_indexes))
                
                for ep in season_episodes:
                    observed = ep["watched_data"]
                    source = ep["ep_data"]
                    episodes_list.append({
                        "id": observed.get("id"),
                        "episode_number": ep["episode_number"],
                        "title": source.get("title"),
                        "image_url": ep["poster"] or observed.get("image_url"),
                        "rating": source.get("rating"),
                        "overview": source.get("overview"),
                        "air_date": ep["air_date"],
                        "runtime": source.get("runtime"),
                        "season__id": season_obj.id,
                        "season__season_number": season_number,
                        "show__id": show_obj.id,
                        "show__title": show_obj.title,
                        "show__trakt_id": trakt_id,
                        "last_watched_at": observed.get("last_watched_at"),
                        "progress": observed.get("progress"),
                        "plays": observed.get("plays", 0),
                        "watched_at": observed.get("watched_at"),
                    })

            return Response({
                "seasons": seasons_list,
                "episodes": episodes_list,
                "show_metadata": show_metadata,
            })

        except Exception as e:
            logger.error(f"Error fetching seasons/episodes: {str(e)}", exc_info=True)
            return Response(
                {"error": f"Failed to fetch episodes: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_database_only_episodes(
        self,
        trakt_id: str,
        user: User,
        show_metadata: dict[str, object] | None = None,
    ) -> Response:
        """Fallback method to return only database episodes if Trakt API fails."""
        seasons = Season.objects.filter(
            show__trakt_id=trakt_id, 
            show__user=user
        ).values(
            "id", "season_number", "show__id", "show__title", "show__trakt_id"
        )

        episodes = (
            Episode.objects.filter(
                show__trakt_id=trakt_id,
                show__user=user
            )
            .values(
                "id",
                "episode_number",
                "title",
                "image_url",
                "rating",
                "overview",
                "season__id",
                "season__season_number",
                "show__id",
                "show__title",
                "show__trakt_id",
            )
            .annotate(
                last_watched_at=models.Max("watches__watched_at"),
                progress=models.Max("watches__progress"),
            )
        )

        return Response({
            "seasons": list(seasons),
            "episodes": list(episodes),
            "show_metadata": show_metadata or {},
        })

    @action(detail=False, methods=["get"], url_path="fetch-latest-movies")
    def fetch_latest_movies(self, request: Request) -> Response:
        """
        Fetches the latest watched movies from Trakt and updates the database for the authenticated user.
        Returns immediately while processing continues in the background.
        """
        try:
            # Check if user has a Trakt token
            if not TraktToken.objects.filter(user=request.user).exists():
                error_msg = "No Trakt token found. Please authenticate with Trakt first."
                logger.warning(f"Bad Request: /trakt/fetch-latest-movies/ - {error_msg} for user {request.user.id}")
                auth_url = request.build_absolute_uri("authenticate/")
                return Response(
                    {
                        "error": error_msg,
                        "auth_url": auth_url,
                        "message": f"Visit {auth_url} to start the authentication process"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Run the sync in a background thread to avoid timeout
            user = request.user
            user_id = request.user.id

            def sync_movies() -> None:
                """Run the movie sync outside the request thread."""
                try:
                    fetch_latest_watched_movies(user)
                    invalidate_trakt_caches(user_id)
                    logger.info(f"Background movie sync completed for user {user_id}")
                except Exception as e:
                    logger.error(f"Error in background movie sync for user {user_id}: {e}", exc_info=True)
            
            thread = threading.Thread(target=sync_movies, daemon=True)
            thread.start()
            
            # Return immediately with a success message
            return Response({
                "message": "Movie sync started in background",
                "status": "processing"
            })
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error starting movie sync: /trakt/fetch-latest-movies/ - {error_msg} for user {request.user.id}", exc_info=True)
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="fetch-latest-shows")
    def fetch_latest_shows(self, request: Request) -> Response:
        """
        Fetches the latest watched TV shows (including episode details) from Trakt 
        and updates the database for the authenticated user.
        Returns immediately while processing continues in the background.
        """
        try:
            # Check if user has a Trakt token
            if not TraktToken.objects.filter(user=request.user).exists():
                error_msg = "No Trakt token found. Please authenticate with Trakt first."
                logger.warning(f"Bad Request: /trakt/fetch-latest-shows/ - {error_msg} for user {request.user.id}")
                auth_url = request.build_absolute_uri("authenticate/")
                return Response(
                    {
                        "error": error_msg,
                        "auth_url": auth_url,
                        "message": f"Visit {auth_url} to start the authentication process"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Run the sync in a background thread to avoid timeout
            user = request.user
            user_id = request.user.id

            def sync_shows() -> None:
                """Run the show sync outside the request thread."""
                try:
                    fetch_latest_watched_shows(user)
                    invalidate_trakt_caches(user_id)
                    logger.info(f"Background sync completed for user {user_id}")
                except Exception as e:
                    logger.error(f"Error in background sync for user {user_id}: {e}", exc_info=True)
            
            thread = threading.Thread(target=sync_shows, daemon=True)
            thread.start()
            
            # Return immediately with a success message
            return Response({
                "message": "Show sync started in background",
                "status": "processing"
            })
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error starting sync: /trakt/fetch-latest-shows/ - {error_msg} for user {request.user.id}", exc_info=True)
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="update-show")
    def update_show(self, request: Request) -> Response:
        """
        Updates a specific show by trakt_id from Trakt API.
        Fetches latest data for the show, seasons, and episodes.
        """
        trakt_id = request.query_params.get("trakt_id")
        
        if not trakt_id:
            return Response(
                {"error": "trakt_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trakt_id = cast(str, trakt_id)
        
        try:
            # Check if user has a Trakt token
            if not TraktToken.objects.filter(user=request.user).exists():
                error_msg = "No Trakt token found. Please authenticate with Trakt first."
                logger.warning(f"Bad Request: /trakt/update-show/ - {error_msg} for user {request.user.id}")
                auth_url = request.build_absolute_uri("authenticate/")
                return Response(
                    {
                        "error": error_msg,
                        "auth_url": auth_url,
                        "message": f"Visit {auth_url} to start the authentication process"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Run the sync in a background thread to avoid timeout
            # Note: fetch_single_show will create the show if it doesn't exist in the database
            user = request.user
            user_id = request.user.id

            def sync_show() -> None:
                """Run one show sync outside the request thread."""
                try:
                    result = fetch_single_show(user, trakt_id)
                    invalidate_trakt_caches(user_id)
                    logger.info(f"Show {trakt_id} sync completed for user {user_id}: {result}")
                except Exception as e:
                    logger.error(f"Error syncing show {trakt_id} for user {user_id}: {e}", exc_info=True)
            
            thread = threading.Thread(target=sync_show, daemon=True)
            thread.start()
            
            # Return immediately with a success message
            return Response({
                "message": f"Show sync started in background for trakt_id: {trakt_id}",
                "status": "processing"
            })
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error starting show sync: /trakt/update-show/ - {error_msg} for user {request.user.id}", exc_info=True)
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="watch-history")
    def watch_history(self, request: Request) -> Response:
        """
        Returns combined watch history for movies and episodes, sorted by watched_at.
        Includes pagination and filtering options.
        """
        from django.db.models import Q, Count, F
        from django.utils import timezone
        from datetime import timedelta
        
        page, page_size = pagination_params(request.query_params, default_page_size=20, max_page_size=100)
        media_type = request.query_params.get("type", "all")  # all, movies, shows, episodes
        if media_type not in ["all", "movies", "shows", "episodes"]:
            raise ValidationError({"type": "Must be one of: all, movies, shows, episodes."})
        days_param = request.query_params.get("days", "all")
        since = None
        if days_param not in (None, "", "all"):
            try:
                days = int(cast(str, days_param))
            except (TypeError, ValueError):
                raise ValidationError({"days": "Must be an integer from 1 to 365 or 'all'."})
            if days < 1 or days > 365:
                raise ValidationError({"days": "Must be between 1 and 365."})
            since = timezone.now() - timedelta(days=days)

        sort = request.query_params.get("sort", "newest")
        if sort not in ["newest", "oldest"]:
            raise ValidationError({"sort": "Must be one of: newest, oldest."})
        sort_descending = sort == "newest"
        order_by = "-watched_at" if sort_descending else "watched_at"
        offset = (page - 1) * page_size
        limit = offset + page_size
        
        history_items = []
        
        # Fetch movie watches
        if media_type in ["all", "movies"]:
            movie_watches = MovieWatch.objects.filter(
                movie__user=request.user
            )
            if since:
                movie_watches = movie_watches.filter(watched_at__gte=since)
            movie_watches = movie_watches.select_related("movie").order_by(order_by)
            
            
            for watch in movie_watches:
                movie = watch.movie
                # Get runtime and rating from Movie model if available
                runtime = getattr(movie, 'runtime', None)
                rating = getattr(movie, 'rating', None)
                
                history_items.append({
                    "type": "movie",
                    "id": watch.id,
                    "watched_at": watch.watched_at.isoformat() if watch.watched_at else None,
                    "title": movie.title,
                    "image_url": movie.image_url,
                    "year": movie.year,
                    "runtime": runtime,
                    "rating": rating,  # Movie rating from Trakt/TMDB (not user's personal rating)
                    "trakt_id": movie.trakt_id,
                    "tmdb_id": movie.tmdb_id,
                    "genres": getattr(movie, 'genres', []) if hasattr(movie, 'genres') else [],  # Genres if stored
                    "episode_info": None,
                })
        
        # Fetch episode watches
        if media_type in ["all", "shows", "episodes"]:
            episode_watches = EpisodeWatch.objects.filter(
                episode__show__user=request.user
            )
            if since:
                episode_watches = episode_watches.filter(watched_at__gte=since)
            episode_watches = episode_watches.select_related("episode", "episode__season", "episode__show").order_by(order_by)
            
            
            for watch in episode_watches:
                episode = watch.episode
                show = episode.show
                season = episode.season
                
                history_items.append({
                    "type": "episode",
                    "id": watch.id,
                    "watched_at": watch.watched_at.isoformat() if watch.watched_at else None,
                    "title": show.title,
                    "image_url": episode.image_url or show.image_url,
                    "year": show.year,
                    "runtime": episode.runtime,
                    "rating": episode.rating,  # Episode rating from Trakt/TMDB
                    "trakt_id": show.trakt_id,
                    "tmdb_id": show.tmdb_id,
                    "episode_info": {
                        "season_number": season.season_number,
                        "episode_number": episode.episode_number,
                        "episode_title": episode.title,
                    },
                    "genres": [],
                })
            
        
        # Sort all items by watched_at after combining media types.
        history_items.sort(key=lambda x: x["watched_at"] or "", reverse=sort_descending)
        
        # Deduplicate items - if same type, same trakt_id, and same watched_at (within 1 minute), keep only the most recent watch ID
        seen = {}
        duplicates_found = []
        
        for item in history_items:
            # Create a unique key based on type, trakt_id, and watched_at (rounded to nearest minute)
            watched_at_str = item["watched_at"]
            if watched_at_str:
                try:
                    from dateutil.parser import isoparse
                    watched_at_dt = isoparse(watched_at_str)
                    # Round to nearest minute to group watches that happened at roughly the same time
                    watched_at_key = watched_at_dt.replace(second=0, microsecond=0).isoformat()
                except:
                    watched_at_key = watched_at_str
            else:
                watched_at_key = "unknown"
            
            # Create key without watch ID - this groups watches of the same content at the same time
            content_key = f"{item['type']}-{item['trakt_id']}-{watched_at_key}"
            
            # For episodes, also include season/episode number to avoid grouping different episodes
            if item['type'] == 'episode' and item.get('episode_info'):
                episode_key = f"{item['type']}-{item['trakt_id']}-S{item['episode_info']['season_number']}E{item['episode_info']['episode_number']}-{watched_at_key}"
                content_key = episode_key
            
            if content_key not in seen:
                seen[content_key] = item
            else:
                # Keep the one with the higher watch ID (more recent)
                existing_item = seen[content_key]
                if item['id'] > existing_item['id']:
                    # Replace with newer watch
                    duplicates_found.append({
                        "key": content_key,
                        "removed": existing_item,
                        "kept": item,
                        "title": item.get("title", "Unknown"),
                        "watched_at": watched_at_str,
                    })
                    seen[content_key] = item
                else:
                    duplicates_found.append({
                        "key": content_key,
                        "removed": item,
                        "kept": existing_item,
                        "title": item.get("title", "Unknown"),
                        "watched_at": watched_at_str,
                    })
        
        # Build deduplicated list from seen dictionary
        deduplicated_items = list(seen.values())
        
        if duplicates_found:
            logger.warning(f"[WATCH_HISTORY] Duplicate items found: {len(duplicates_found)}. Sample: {duplicates_found[:3]}")
        
        history_items = deduplicated_items
        
        total_items = len(history_items)
        
        # Apply pagination
        paginated_items = history_items[offset:limit]
        
        
        return Response({
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": (total_items + page_size - 1) // page_size,
            "history": paginated_items,
        })

    @action(detail=False, methods=["get"], url_path="activity-heatmap")
    def activity_heatmap(self, request: Request) -> Response:
        """
        Returns daily watch activity counts for the last 6 months for heatmap visualization.
        """
        from django.db.models import Count, Q
        from datetime import timedelta
        from collections import defaultdict
        
        # Get date 6 months ago
        six_months_ago = timezone.now() - timedelta(days=180)
        
        # Get all movie watches in the last 6 months
        movie_watches = MovieWatch.objects.filter(
            movie__user=request.user,
            watched_at__gte=six_months_ago
        ).values_list('watched_at', flat=True)
        
        # Get all episode watches in the last 6 months
        episode_watches = EpisodeWatch.objects.filter(
            episode__show__user=request.user,
            watched_at__gte=six_months_ago
        ).values_list('watched_at', flat=True)
        
        # Count watches per day
        daily_counts = defaultdict(int)
        
        for watched_at in movie_watches:
            if watched_at:
                date_key = watched_at.date().isoformat()
                daily_counts[date_key] += 1
        
        for watched_at in episode_watches:
            if watched_at:
                date_key = watched_at.date().isoformat()
                daily_counts[date_key] += 1
        
        # Convert to list format for frontend
        activity_data = [{"date": date, "count": count} for date, count in daily_counts.items()]
        
        return Response({
            "activity": activity_data,
        })

    @action(detail=False, methods=["get"], url_path="top-genres")
    def top_genres(self, request: Request) -> Response:
        """
        Returns top genres based on watch history from the last 12 months.
        """
        from analytics.services import AnalyticsService

        result = AnalyticsService.get_media_genre_distribution(request.user, days=365)
        return Response({
            "genres": result["genres"][:3],
            "total_items": result.get("total_items", 0),
        })

    @action(detail=False, methods=["get"], url_path="movie-stats")
    def movie_stats(self, request: Request) -> Response:
        """
        Fetches Trakt statistics for a specific movie.
        Returns: watchers, plays, collectors, comments, lists, votes

        Status contract (audit #6): the frontend must distinguish a permanent
        absence (404 → render N/A) from a temporary outage (503 → render
        "temporarily unavailable" + retry). 500 is reserved for unexpected
        server failures.
        """
        trakt_id = request.query_params.get("trakt_id")
        
        if not trakt_id:
            return Response(
                {"error": "trakt_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            headers = get_trakt_headers(request.user)
            
            # Fetch movie stats from Trakt API
            stats_url = f"https://api.trakt.tv/movies/{trakt_id}/stats"
            stats_response = http_client.get(stats_url, headers=headers, logger_name="trakt")
            
            if stats_response.status_code == 404:
                # Confirmed absence: the movie genuinely has no Trakt stats.
                return Response(
                    {"error": "Movie not found on Trakt."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            
            if stats_response.status_code != 200:
                # Upstream outage or rate limit — temporary by definition.
                logger.warning(
                    "Failed to fetch movie stats from Trakt: %s",
                    stats_response.status_code,
                )
                return Response(
                    {
                        "error": (
                            f"Trakt stats temporarily unavailable "
                            f"({stats_response.status_code})"
                        )
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            
            stats_data = stats_response.json()
            
            # Format the response
            return Response({
                "watchers": stats_data.get("watchers", 0),
                "plays": stats_data.get("plays", 0),
                "collectors": stats_data.get("collectors", 0),
                "comments": stats_data.get("comments", 0),
                "lists": stats_data.get("lists", 0),
                "votes": stats_data.get("votes", 0),
            })
            
        except Exception as e:
            # Missing Trakt token is a stable, per-user condition — the stats
            # are genuinely inaccessible, not temporarily broken.
            if "Trakt token not found" in str(e):
                return Response(
                    {"error": "Trakt account not connected."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            # Network-level failures raised by http_client are transient.
            if isinstance(e, http_client.ExternalRequestError):
                logger.warning("Movie stats request failed upstream: %s", e)
                return Response(
                    {"error": "Trakt stats temporarily unavailable."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            logger.error(f"Error fetching movie stats: {str(e)}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="update-movie")
    def update_movie(self, request: Request) -> Response:
        """
        Updates a specific movie by trakt_id from Trakt API.
        Fetches latest data for the movie and watch events.
        """
        trakt_id = request.query_params.get("trakt_id")
        
        if not trakt_id:
            return Response(
                {"error": "trakt_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trakt_id = cast(str, trakt_id)
        
        try:
            # Check if user has a Trakt token
            if not TraktToken.objects.filter(user=request.user).exists():
                error_msg = "No Trakt token found. Please authenticate with Trakt first."
                logger.warning(f"Bad Request: /trakt/update-movie/ - {error_msg} for user {request.user.id}")
                auth_url = request.build_absolute_uri("authenticate/")
                return Response(
                    {
                        "error": error_msg,
                        "auth_url": auth_url,
                        "message": f"Visit {auth_url} to start the authentication process"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user has access to this movie
            movie_obj = Movie.objects.filter(trakt_id=trakt_id, user=request.user).first()
            if not movie_obj:
                return Response(
                    {"error": "Movie not found or you don't have access to it."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Run the sync in a background thread to avoid timeout
            user = request.user
            user_id = request.user.id

            def sync_movie() -> None:
                """Run one movie sync outside the request thread."""
                try:
                    result = fetch_single_movie(user, trakt_id)
                    invalidate_trakt_caches(user_id)
                    logger.info(f"Movie {trakt_id} sync completed for user {user_id}: {result}")
                except Exception as e:
                    logger.error(f"Error syncing movie {trakt_id} for user {user_id}: {e}", exc_info=True)
            
            thread = threading.Thread(target=sync_movie, daemon=True)
            thread.start()
            
            # Return immediately with a success message
            return Response({
                "message": f"Movie sync started in background for trakt_id: {trakt_id}",
                "status": "processing"
            })
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error starting movie sync: /trakt/update-movie/ - {error_msg} for user {request.user.id}", exc_info=True)
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="refresh-token")
    def refresh_token(self, request: Request) -> Response:
        """
        Manually refreshes the Trakt access token for the authenticated user.
        """
        try:
            token_instance = TraktToken.objects.filter(user=request.user).latest("updated_at")
        except TraktToken.DoesNotExist:
            return Response(
                {"error": "Trakt token not found. Please authenticate with Trakt first."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            refreshed = refresh_trakt_token(token_instance)
            return Response(
                {"access_token": refreshed.access_token, "expires_at": refreshed.expires_at}
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to refresh token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"], url_path="auth-status")
    def auth_status(self, request: Request) -> Response:
        """
        Check if the user has a valid Trakt token.
        """
        try:
            token = TraktToken.objects.filter(user=request.user).latest("updated_at")
            is_expired = token.is_expired()
            return Response({
                "authenticated": True,
                "token_expired": is_expired,
                "expires_at": token.expires_at
            })
        except TraktToken.DoesNotExist:
            return Response({
                "authenticated": False,
                "auth_url": request.build_absolute_uri(reverse('trakt-authenticate'))
            })

    @action(detail=False, methods=["get"], url_path="authenticate")
    def authenticate(self, request: Request) -> Response:
        """
        Redirect user to Trakt OAuth authorization page.
        """
        try:
            client_id, _ = get_trakt_api_credentials(request.user)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        redirect_uri = get_trakt_redirect_uri(request)
        auth_params = urlencode({
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": request.user.id,  # Use user ID as state for security
        })
        auth_url = f"https://api.trakt.tv/oauth/authorize?{auth_params}"
        
        return Response({
            "auth_url": auth_url,
            "redirect_uri": redirect_uri,
            "message": "Visit this URL to authorize your Trakt account"
        })

    @action(detail=False, methods=["get", "post"], url_path="oauth-callback", permission_classes=[AllowAny])
    def oauth_callback(self, request: Request) -> Response | HttpResponse:
        """
        Handle the OAuth callback from Trakt.
        GET: Receives redirect from Trakt with authorization code
        POST: Processes the authorization code (requires authentication)
        """
        if request.method == "GET":
            # Handle the redirect from Trakt (no authentication required)
            return self._handle_oauth_redirect(request)
        else:
            if not request.user.is_authenticated:
                return Response(
                    {"error": "Authentication is required to complete Trakt OAuth."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            # Handle the POST request with authorization code (requires authentication)
            return self._handle_oauth_token_exchange(request)

    def _handle_oauth_redirect(self, request: Request) -> HttpResponse:
        """
        Handle the GET redirect from Trakt with authorization code.
        This displays an HTML page that will complete the authentication.
        """
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')
        
        if error:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Trakt OAuth Error</title>
                <style>
                    body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }}
                    .error {{ color: red; }}
                </style>
            </head>
            <body>
                <h1>❌ Authorization Failed</h1>
                <div class="error">
                    <p>Error: {error}</p>
                    <p>Please try the authorization process again.</p>
                </div>
            </body>
            </html>
            """
            return HttpResponse(html_content, content_type='text/html')  # pyright: ignore[reportArgumentType]
        
        if not code:
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Trakt OAuth Error</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    .error { color: red; }
                </style>
            </head>
            <body>
                <h1>❌ Missing Authorization Code</h1>
                <div class="error">
                    <p>No authorization code received from Trakt.</p>
                    <p>Please try the authorization process again.</p>
                </div>
            </body>
            </html>
            """
            return HttpResponse(html_content, content_type='text/html')  # pyright: ignore[reportArgumentType]
        
        # Display success page with instructions
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Trakt OAuth - Complete Authentication</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                    line-height: 1.6;
                }}
                .success {{ color: green; }}
                .info {{ color: blue; }}
                .code-box {{
                    background: #f4f4f4;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 10px 0;
                    font-family: monospace;
                    word-break: break-all;
                }}
                .copy-btn {{
                    background: #007cba;
                    color: white;
                    padding: 5px 10px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    margin-left: 10px;
                }}
            </style>
        </head>
        <body>
            <h1>🎬 Trakt Authorization Received!</h1>
            <div class="success">
                <p>✅ Successfully received authorization code from Trakt!</p>
            </div>
            
            <div class="info">
                <h3>Complete the Authentication</h3>
                <p>You now need to send this authorization code to your backend to complete the authentication.</p>
                
                <h4>Option 1: Use curl (if you have a JWT token)</h4>
                <div class="code-box">
curl -X POST \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;-H "Authorization: Bearer YOUR_JWT_TOKEN" \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;-d '{{"code": "{code}", "state": "{state}"}}' \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;{request.build_absolute_uri()}
                </div>
                
                <h4>Option 2: Copy the authorization details</h4>
                <p><strong>Authorization Code:</strong></p>
                <div class="code-box">
                    {code}
                    <button class="copy-btn" onclick="copyToClipboard('{code}')">Copy</button>
                </div>
                
                <p><strong>State:</strong></p>
                <div class="code-box">
                    {state or 'None'}
                    <button class="copy-btn" onclick="copyToClipboard('{state or ''}')">Copy</button>
                </div>
                
                <h4>Option 3: Use the Python setup script</h4>
                <p>If you used the <code>oauth_setup.py</code> script, paste this full URL back into the script:</p>
                <div class="code-box">
                    {request.build_absolute_uri(request.get_full_path())}
                    <button class="copy-btn" onclick="copyToClipboard('{request.build_absolute_uri(request.get_full_path())}')">Copy</button>
                </div>
            </div>
            
            <script>
                function copyToClipboard(text) {{
                    navigator.clipboard.writeText(text).then(function() {{
                        alert('Copied to clipboard!');
                    }});
                }}
            </script>
        </body>
        </html>
        """
        
        return HttpResponse(html_content, content_type='text/html')  # pyright: ignore[reportArgumentType]

    def _handle_oauth_token_exchange(self, request: Request) -> Response:
        """
        Handle the POST request to exchange authorization code for access token.
        Requires authentication.
        """
        data = cast(dict, request.data)
        code = data.get('code')
        state = data.get('state')
        
        if not code:
            return Response(
                {"error": "Authorization code is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify state matches user ID for security
        if state and str(request.user.id) != str(state):
            return Response(
                {"error": "Invalid state parameter"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            client_id, client_secret = get_trakt_api_credentials(request.user)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Exchange code for access token
        token_url = "https://api.trakt.tv/oauth/token"
        token_data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": get_trakt_redirect_uri(request),
            "grant_type": "authorization_code"
        }
        
        try:
            response = http_client.post(token_url, json=token_data, logger_name="trakt")
            response.raise_for_status()
            token_info = response.json()
            
            # Store the token
            expires_at = timezone.now() + timedelta(seconds=token_info.get('expires_in', 0))
            
            token_obj, created = TraktToken.objects.update_or_create(
                user=request.user,
                defaults={
                    'access_token': token_info['access_token'],
                    'refresh_token': token_info['refresh_token'],
                    'expires_at': expires_at
                }
            )
            
            return Response({
                "success": True,
                "message": "Successfully authenticated with Trakt!",
                "expires_at": expires_at
            })
            
        except (http_client.ExternalRequestError, http_client.requests.RequestException) as e:
            return Response(
                {"error": f"Failed to exchange code for token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request: Request) -> Response:
        """
        Search for movies and shows by title for the authenticated user.
        Only returns items that the user has actually watched.
        """
        query = request.GET.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({'results': []})
        
        results = []
        
        # Search in movies that the user has watched
        try:
            from django.db.models import Q
            movies = Movie.objects.filter(
                Q(user=request.user) & 
                (Q(title__icontains=query) | Q(title__istartswith=query))
            )[:10]
            
            logger.info("Found %s movies matching '%s' for user %s", movies.count(), query, request.user.id)
            
            for movie in movies:
                # Get movie poster from TMDB if available
                cover_image = ''
                if movie.tmdb_id:
                    try:
                        tmdb_response = http_client.get(
                            f"https://api.themoviedb.org/3/movie/{movie.tmdb_id}",
                            params={
                                'api_key': settings.TMDB_API_KEY,
                                'append_to_response': 'images'
                            },
                            logger_name="trakt",
                        )
                        if tmdb_response.ok:
                            tmdb_data = tmdb_response.json()
                            if tmdb_data.get('poster_path'):
                                cover_image = f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
                    except Exception as e:
                        logger.warning("Error fetching TMDB data for movie %s: %s", movie.tmdb_id, e)
                
                results.append({
                    'id': movie.id,
                    'title': movie.title,
                    'type': 'movie',
                    'cover_image': cover_image,
                    'year': movie.year,
                    'tmdb_id': movie.tmdb_id
                })
        except Exception as e:
            logger.warning("Movie search error: %s", e)
        
        # Search in shows that the user has watched
        try:
            shows = Show.objects.filter(
                Q(user=request.user) &  # pyright: ignore[reportPossiblyUnboundVariable]
                (Q(title__icontains=query) | Q(title__istartswith=query))  # pyright: ignore[reportPossiblyUnboundVariable]
            )[:10]
            
            logger.info("Found %s shows matching '%s' for user %s", shows.count(), query, request.user.id)
            
            for show in shows:
                # Use existing image_url or fetch from TMDB
                cover_image = show.image_url or ''
                if not cover_image and show.tmdb_id:
                    try:
                        tmdb_response = http_client.get(
                            f"https://api.themoviedb.org/3/tv/{show.tmdb_id}",
                            params={
                                'api_key': settings.TMDB_API_KEY,
                                'append_to_response': 'images'
                            },
                            logger_name="trakt",
                        )
                        if tmdb_response.ok:
                            tmdb_data = tmdb_response.json()
                            if tmdb_data.get('poster_path'):
                                cover_image = f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
                    except Exception as e:
                        logger.warning("Error fetching TMDB data for show %s: %s", show.tmdb_id, e)
                
                results.append({
                    'id': show.id,
                    'title': show.title,
                    'type': 'show',
                    'cover_image': cover_image,
                    'year': show.year,
                    'tmdb_id': show.tmdb_id
                })
        except Exception as e:
            logger.warning("Show search error: %s", e)
        
        # Search in episodes that the user has watched
        try:
            episodes = Episode.objects.filter(
                Q(show__user=request.user) &  # pyright: ignore[reportPossiblyUnboundVariable]
                (Q(title__icontains=query) | Q(show__title__icontains=query))  # pyright: ignore[reportPossiblyUnboundVariable]
            ).select_related('show', 'season')[:20]
            
            logger.info("Found %s episodes matching '%s' for user %s", episodes.count(), query, request.user.id)
            
            for episode in episodes:
                # Use episode image or show image
                cover_image = episode.image_url or episode.show.image_url or ''
                if not cover_image and episode.show.tmdb_id:
                    try:
                        tmdb_response = http_client.get(
                            f"https://api.themoviedb.org/3/tv/{episode.show.tmdb_id}/season/{episode.season.season_number}/episode/{episode.episode_number}",
                            params={
                                'api_key': settings.TMDB_API_KEY
                            },
                            logger_name="trakt",
                        )
                        if tmdb_response.ok:
                            tmdb_data = tmdb_response.json()
                            if tmdb_data.get('still_path'):
                                cover_image = f"https://image.tmdb.org/t/p/w500{tmdb_data['still_path']}"
                    except Exception as e:
                        logger.warning("Error fetching TMDB data for episode %s: %s", episode.id, e)
                
                results.append({
                    'id': episode.id,
                    'title': episode.title or f"Episode {episode.episode_number}",
                    'type': 'episode',
                    'cover_image': cover_image,
                    'year': episode.show.year,
                    'tmdb_id': episode.show.tmdb_id,
                    'show_title': episode.show.title,
                    'show_id': episode.show.id,
                    'season_number': episode.season.season_number,
                    'episode_number': episode.episode_number,
                    'show_trakt_id': episode.show.trakt_id,
                })
        except Exception as e:
            logger.warning("Episode search error: %s", e)
        
        # Sort results by type (movies, shows, episodes) then by title
        type_order = {'movie': 0, 'show': 1, 'episode': 2}
        results.sort(key=lambda x: (type_order.get(x['type'], 99), x['title'].lower()))
        results = results[:50]  # Increased limit to accommodate episodes
        
        logger.info("Trakt search results for '%s': %s items found", query, len(results))
        return Response({'results': results})

    @action(detail=False, methods=["get"], url_path="recent-activity")
    def recent_activity(self, request: Request) -> Response:
        """
        Returns recent activity including check-ins, ratings, and watchlist additions.
        """
        from django.db.models import Q
        from django.utils import timezone
        from datetime import timedelta
        
        activities = []
        
        # Get recent movie watches (last 7 days)
        recent_movies = Movie.objects.filter(
            user=request.user,
            last_watched_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-last_watched_at')[:10]
        
        for movie in recent_movies:
            activities.append({
                'type': 'check_in',
                'media_type': 'movie',
                'title': movie.title,
                'image_url': movie.image_url,
                'timestamp': movie.last_watched_at,
                'description': f'Check-in: "{movie.title}"',
            })
        
        # Get recent episode watches
        recent_episode_watches = EpisodeWatch.objects.filter(
            episode__show__user=request.user,
            watched_at__gte=timezone.now() - timedelta(days=7)
        ).select_related('episode', 'episode__show', 'episode__season').order_by('-watched_at')[:10]
        
        for watch in recent_episode_watches:
            episode = watch.episode
            activities.append({
                'type': 'check_in',
                'media_type': 'show',
                'title': episode.show.title,
                'episode': f'S{episode.season.season_number}E{episode.episode_number}',
                'episode_title': episode.title,
                'image_url': episode.image_url or episode.show.image_url,
                'timestamp': watch.watched_at,
                'description': f'Check-in: "{episode.title or episode.show.title}"',
            })
        
        # Sort by timestamp and return top 10
        activities.sort(key=lambda x: x['timestamp'] if x['timestamp'] else timezone.now() - timedelta(days=365), reverse=True)
        
        return Response({'activities': activities[:10]})

    @action(detail=False, methods=["get"], url_path="completed-media")
    def completed_media(self, request: Request) -> Response:
        """
        Returns shows and movies that are 100% completed.
        For shows, this means all episodes are watched.
        For movies, this means the movie has been watched.
        """
        from django.core.cache import cache
        
        # Check cache first (cache for 5 minutes)
        cache_key = f"completed_media_{request.user.id}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response(cached_result)
        
        completed_movies = Movie.objects.filter(
            user=request.user,
            plays__gt=0
        ).order_by('-last_watched_at').values('id', 'title', 'year', 'image_url', 'trakt_id', 'tmdb_id', 'last_watched_at')[:20]

        completed_movies_list = []
        for movie in completed_movies:
            movie_dict = dict(movie)
            if movie_dict.get('last_watched_at'):
                movie_dict['last_watched_at'] = movie_dict['last_watched_at'].isoformat()
            else:
                movie_dict['last_watched_at'] = None
            completed_movies_list.append(movie_dict)

        completed_shows = []
        trakt_auth_required = False
        auth_error = None
        try:
            # Get Trakt headers for API calls
            headers = get_trakt_headers(request.user)
        except Exception as e:
            trakt_auth_required = True
            auth_error = str(e)
            logger.info(
                "Completed media requested before Trakt OAuth for user %s: %s",
                request.user.id,
                auth_error,
            )
            headers = None
        
        # Limit to recently watched shows (last 100 shows) to avoid checking all shows
        shows = Show.objects.filter(user=request.user).order_by('-last_watched_at')[:100] if headers else []
        
        # First pass: identify shows that might be complete (all DB episodes are watched)
        # Database only contains watched episodes, so if all DB episodes have watches, it's a candidate
        potential_complete_shows = []
        for show in shows:
            # Count episodes in database (only watched ones are stored)
            db_episodes = Episode.objects.filter(show=show).count()
            if db_episodes == 0:
                continue
            
            # Count episodes with watch records
            watched_episodes = Episode.objects.filter(
                show=show,
                watches__isnull=False
            ).distinct().count()
            
            # If all DB episodes are watched, check Trakt for actual total
            if watched_episodes == db_episodes:
                potential_complete_shows.append((show, db_episodes))
        
        # Limit Trakt API calls to top 20 candidates to avoid timeout
        potential_complete_shows = potential_complete_shows[:20]
        
        # Second pass: verify completion by fetching total from Trakt (only for candidates)
        for show, db_episode_count in potential_complete_shows:
            try:
                # Fetch total episodes from Trakt API to verify completion
                seasons_url = f"https://api.trakt.tv/shows/{show.trakt_id}/seasons?extended=episodes"
                seasons_response = http_client.get(seasons_url, headers=headers, logger_name="trakt")
                
                if seasons_response.status_code == 200:
                    trakt_seasons_data = seasons_response.json()
                    if isinstance(trakt_seasons_data, list):
                        # Count all episodes across all seasons
                        total_episodes = 0
                        for season_data in trakt_seasons_data:
                            episodes = season_data.get("episodes", [])
                            total_episodes += len(episodes)
                        
                        # Get unique watched episodes count
                        watched_episodes = Episode.objects.filter(
                            show=show,
                            watches__isnull=False
                        ).distinct().count()
                        
                        # A show is 100% completed if all episodes are watched
                        if total_episodes > 0 and watched_episodes == total_episodes:
                            # Get the most recent watch date for this show
                            last_episode_watch = EpisodeWatch.objects.filter(
                                episode__show=show
                            ).order_by('-watched_at').first()
                            
                            last_watched_at = None
                            if last_episode_watch and last_episode_watch.watched_at:
                                last_watched_at = last_episode_watch.watched_at.isoformat()
                            elif show.last_watched_at:
                                last_watched_at = show.last_watched_at.isoformat()
                            
                            completed_shows.append({
                                'id': show.id,
                                'title': show.title,
                                'year': show.year,
                                'image_url': show.image_url,
                                'trakt_id': show.trakt_id,
                                'tmdb_id': show.tmdb_id,
                                'last_watched_at': last_watched_at,
                            })
            except Exception as e:
                # Skip shows that fail to fetch from Trakt API
                logger.warning(f"Error checking completion for show {show.title} (ID: {show.trakt_id}): {str(e)}")
                continue
        
        # Sort by most recently watched (most recent first)
        # Filter out shows with no last_watched_at and sort properly
        completed_shows = [
            show for show in completed_shows 
            if show.get('last_watched_at')
        ]
        completed_shows.sort(key=lambda x: x['last_watched_at'] or '', reverse=True)
        
        result = {
            'completed_shows': completed_shows,  # Already sorted by most recent first
            'completed_movies': completed_movies_list,
            'trakt_auth_required': trakt_auth_required,
        }
        if auth_error:
            result['message'] = auth_error
        
        # Cache for 5 minutes only when OAuth-dependent show completion was evaluated.
        if not trakt_auth_required:
            cache.set(cache_key, result, 300)
        
        return Response(result)

    @action(detail=False, methods=["get"], url_path="profile-stats")
    def profile_stats(self, request: Request) -> Response:
        """
        Returns user profile statistics for Trakt.
        """
        from django.db.models import Count, Sum
        
        total_movies = Movie.objects.filter(user=request.user).count()
        total_shows = Show.objects.filter(user=request.user).count()
        total_plays = Movie.objects.filter(user=request.user).aggregate(
            total=Sum('plays')
        )['total'] or 0
        
        # Count total episodes watched
        total_episodes = Episode.objects.filter(
            show__user=request.user,
            watches__isnull=False
        ).distinct().count()
        
        total_plays += total_episodes
        
        return Response({
            'total_plays': total_plays,
            'total_movies': total_movies,
            'total_shows': total_shows,
            'username': request.user.username,
        })

    @action(detail=False, methods=["get"], url_path="trending")
    def trending(self, request: Request) -> Response:
        """
        Returns trending movies and shows from Trakt.
        This requires calling the Trakt API directly.
        """
        try:
            headers = get_trakt_headers(request.user)
            
            # Fetch trending movies
            movies_url = "https://api.trakt.tv/movies/trending?limit=10"
            movies_response = http_client.get(movies_url, headers=headers, logger_name="trakt")
            trending_movies = []
            
            if movies_response.status_code == 200:
                movies_data = movies_response.json()
                for item in movies_data[:5]:
                    movie = item.get('movie', {})
                    trending_movies.append({
                        'title': movie.get('title'),
                        'year': movie.get('year'),
                        'trakt_id': movie.get('ids', {}).get('trakt'),
                        'tmdb_id': movie.get('ids', {}).get('tmdb'),
                        'rating': movie.get('rating'),
                        'slug': movie.get('ids', {}).get('slug'),
                    })
            
            # Fetch trending shows
            shows_url = "https://api.trakt.tv/shows/trending?limit=10"
            shows_response = http_client.get(shows_url, headers=headers, logger_name="trakt")
            trending_shows = []
            
            if shows_response.status_code == 200:
                shows_data = shows_response.json()
                for item in shows_data[:5]:
                    show = item.get('show', {})
                    trending_shows.append({
                        'title': show.get('title'),
                        'year': show.get('year'),
                        'trakt_id': show.get('ids', {}).get('trakt'),
                        'tmdb_id': show.get('ids', {}).get('tmdb'),
                        'rating': show.get('rating'),
                        'slug': show.get('ids', {}).get('slug'),
                    })
            
            return Response({
                'trending_movies': trending_movies,
                'trending_shows': trending_shows,
            })
        except Exception as e:
            logger.error(f"Error fetching trending content: {str(e)}")
            return Response(
                {'error': f'Failed to fetch trending content: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @staticmethod
    def _resolve_tmdb_target(request: Request):
        """Validate tmdb_id/type query params for TMDB proxy actions."""
        tmdb_id = str(request.query_params.get("tmdb_id", "")).strip()
        media_type = request.query_params.get("type", "movie").strip()
        if not tmdb_id.isdigit():
            return Response({"error": "tmdb_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if media_type not in ("movie", "tv"):
            media_type = "movie"
        return tmdb_id, media_type

    @action(detail=False, methods=["get"], url_path="tmdb-detail")
    def tmdb_detail(self, request: Request) -> Response:
        """Proxy TMDB detail so the TMDB API key stays server-side."""
        target = self._resolve_tmdb_target(request)
        if isinstance(target, Response):
            return target
        tmdb_id, media_type = target
        append = request.query_params.get("append_to_response", "").strip()
        cache_key = f"tmdb_proxy_detail_{media_type}_{tmdb_id}_{append}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        params = {"append_to_response": append} if append else None
        response = _tmdb_proxy_get(f"{media_type}/{tmdb_id}", params)
        if response.status_code == 200:
            cache.set(cache_key, response.data, TMDB_PROXY_CACHE_TTL)
        return response

    @action(detail=False, methods=["get"], url_path="tmdb-watch-providers")
    def tmdb_watch_providers(self, request: Request) -> Response:
        """Proxy TMDB watch providers so the TMDB API key stays server-side."""
        target = self._resolve_tmdb_target(request)
        if isinstance(target, Response):
            return target
        tmdb_id, media_type = target
        cache_key = f"tmdb_proxy_providers_{media_type}_{tmdb_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = _tmdb_proxy_get(f"{media_type}/{tmdb_id}/watch/providers")
        if response.status_code == 200:
            cache.set(cache_key, response.data, TMDB_PROXY_CACHE_TTL)
        return response

    @action(detail=False, methods=["get"], url_path="tmdb-videos")
    def tmdb_videos(self, request: Request) -> Response:
        """Proxy TMDB videos (trailers) so the TMDB API key stays server-side."""
        target = self._resolve_tmdb_target(request)
        if isinstance(target, Response):
            return target
        tmdb_id, media_type = target
        cache_key = f"tmdb_proxy_videos_{media_type}_{tmdb_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = _tmdb_proxy_get(f"{media_type}/{tmdb_id}/videos")
        if response.status_code == 200:
            cache.set(cache_key, response.data, TMDB_PROXY_CACHE_TTL)
        return response
