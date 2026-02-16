from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import status
from django.db import models
from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse
import requests
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
import logging
import threading
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
    session,
)
from django.core.serializers import serialize  # For serializing data

logger = logging.getLogger(__name__)


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
                    "activity-heatmap": request.build_absolute_uri("activity-heatmap/"),
                    "top-genres": request.build_absolute_uri("top-genres/"),
                    "completed-media": request.build_absolute_uri("completed-media/"),
                }
            }
        )

    @action(detail=False, methods=["get"], url_path="get-stored-movies")
    def get_stored_movies(self, request):
        """
        Returns the stored values from the Movie model for the authenticated user, 
        sorted by last_watched_at, and formatted like the fetch_latest_movies endpoint.
        """
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 5))
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
    def get_stored_shows(self, request):
        """
        Returns paginated stored values from the Show model for the authenticated user, 
        sorted by last_watched_at.
        """
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 5))
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

    @action(detail=False, methods=["get"], url_path="get-watched-seasons-episodes")
    def get_watched_seasons_episodes(self, request):
        """
        Returns all seasons and episodes for a show, including watched status.
        Fetches all episodes from Trakt API and merges with watched data from database.
        """
        trakt_id = request.query_params.get("trakt_id")

        # Validate that trakt_id is provided
        if not trakt_id:
            raise ValidationError({"detail": "The 'trakt_id' parameter is required."})

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
            show_response = session.get(show_url, headers=headers)
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
            seasons_response = session.get(seasons_url, headers=headers)
            
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

                # Process each episode in the season
                for ep_data in season_data.get("episodes", []):
                    episode_number = ep_data.get("number", 0)
                    key = (season_number, episode_number)
                    
                    # Get watched data if exists
                    watched_data = watched_episodes_map.get(key, {})
                    
                    # Get episode images from Trakt
                    images = ep_data.get("images", {})
                    poster = None
                    if images and isinstance(images, dict):
                        screenshot = images.get("screenshot", {})
                        if isinstance(screenshot, dict):
                            poster = screenshot.get("full")
                    
                    # If no image from Trakt, try fetching from TMDB if we have tmdb_id
                    if not poster and show_obj.tmdb_id and episode_number:
                        try:
                            tmdb_api_key = settings.TMDB_API_KEY
                            tmdb_ep_url = f"https://api.themoviedb.org/3/tv/{show_obj.tmdb_id}/season/{season_number}/episode/{episode_number}?api_key={tmdb_api_key}&language=en-US"
                            tmdb_ep_response = session.get(tmdb_ep_url)
                            if tmdb_ep_response.status_code == 200:
                                tmdb_ep_data = tmdb_ep_response.json()
                                still_path = tmdb_ep_data.get("still_path")
                                if still_path:
                                    poster = f"https://image.tmdb.org/t/p/w780{still_path}"
                        except Exception as e:
                            logger.warning(f"Error fetching TMDB episode image for S{season_number}E{episode_number}: {e}")
                    
                    # Use database image if available and we don't have one
                    if not poster and watched_data.get("image_url"):
                        poster = watched_data.get("image_url")

                    # Format air_date if present
                    air_date = ep_data.get("first_aired")
                    if air_date:
                        try:
                            from dateutil.parser import isoparse
                            air_date = isoparse(air_date).date().isoformat()
                        except:
                            air_date = None

                    episode_info = {
                        "id": watched_data.get("id"),
                        "episode_number": episode_number,
                        "title": ep_data.get("title"),
                        "image_url": poster or watched_data.get("image_url"),
                        "rating": ep_data.get("rating"),
                        "overview": ep_data.get("overview"),
                        "air_date": air_date,
                        "runtime": ep_data.get("runtime"),
                        "season__id": season_obj.id,
                        "season__season_number": season_number,
                        "show__id": show_obj.id,
                        "show__title": show_obj.title,
                        "show__trakt_id": trakt_id,
                        "last_watched_at": watched_data.get("last_watched_at"),
                        "progress": watched_data.get("progress"),
                        "plays": watched_data.get("plays", 0),
                        "watched_at": watched_data.get("watched_at"),
                    }
                    
                    episodes_list.append(episode_info)

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

    def _get_database_only_episodes(self, trakt_id, user, show_metadata=None):
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
    def fetch_latest_movies(self, request):
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
            def sync_movies():
                try:
                    fetch_latest_watched_movies(request.user)
                    logger.info(f"Background movie sync completed for user {request.user.id}")
                except Exception as e:
                    logger.error(f"Error in background movie sync for user {request.user.id}: {e}", exc_info=True)
            
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
    def fetch_latest_shows(self, request):
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
            def sync_shows():
                try:
                    fetch_latest_watched_shows(request.user)
                    logger.info(f"Background sync completed for user {request.user.id}")
                except Exception as e:
                    logger.error(f"Error in background sync for user {request.user.id}: {e}", exc_info=True)
            
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
    def update_show(self, request):
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
            def sync_show():
                try:
                    result = fetch_single_show(request.user, trakt_id)
                    logger.info(f"Show {trakt_id} sync completed for user {request.user.id}: {result}")
                except Exception as e:
                    logger.error(f"Error syncing show {trakt_id} for user {request.user.id}: {e}", exc_info=True)
            
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
    def watch_history(self, request):
        """
        Returns combined watch history for movies and episodes, sorted by watched_at.
        Includes pagination and filtering options.
        """
        from django.db.models import Q, Count, F
        from django.utils import timezone
        from datetime import timedelta
        
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        media_type = request.query_params.get("type", "all")  # all, movies, shows, episodes
        offset = (page - 1) * page_size
        limit = offset + page_size
        
        history_items = []
        
        # Fetch movie watches
        if media_type in ["all", "movies"]:
            movie_watches = MovieWatch.objects.filter(
                movie__user=request.user
            ).select_related("movie").order_by("-watched_at")
            
            
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
            ).select_related("episode", "episode__season", "episode__show").order_by("-watched_at")
            
            
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
            
        
        # Sort all items by watched_at (most recent first)
        history_items.sort(key=lambda x: x["watched_at"] or "", reverse=True)
        
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
        
        # Calculate total plays (count all watches, not just unique items)
        total_movie_plays = MovieWatch.objects.filter(movie__user=request.user).count()
        total_episode_plays = EpisodeWatch.objects.filter(episode__show__user=request.user).count()
        total_plays = total_movie_plays + total_episode_plays
        
        # Apply pagination
        paginated_items = history_items[offset:limit]
        
        
        return Response({
            "page": page,
            "page_size": page_size,
            "total_items": total_plays,
            "total_pages": (len(history_items) + page_size - 1) // page_size,
            "history": paginated_items,
        })

    @action(detail=False, methods=["get"], url_path="activity-heatmap")
    def activity_heatmap(self, request):
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
    def top_genres(self, request):
        """
        Returns top genres based on watch history from the last 12 months.
        """
        from django.db.models import Count, Q
        from datetime import timedelta
        from collections import defaultdict
        import requests
        
        # Get date 12 months ago
        twelve_months_ago = timezone.now() - timedelta(days=365)
        
        # Get all movies watched in the last 12 months
        movie_watches = MovieWatch.objects.filter(
            movie__user=request.user,
            watched_at__gte=twelve_months_ago
        ).select_related('movie').values_list('movie__tmdb_id', flat=True).distinct()
        
        # Get all shows watched in the last 12 months (count by show, not episode)
        show_watches = EpisodeWatch.objects.filter(
            episode__show__user=request.user,
            watched_at__gte=twelve_months_ago
        ).select_related('episode__show').values_list('episode__show__tmdb_id', flat=True).distinct()
        
        genre_counts = defaultdict(int)
        total_items = 0
        
        # Fetch genres for movies from TMDB
        from django.conf import settings
        tmdb_api_key = getattr(settings, 'TMDB_API_KEY', None)
        if not tmdb_api_key:
            logger.warning("[TOP_GENRES] TMDB_API_KEY not found in settings")
            return Response({"genres": [], "total_items": 0})
        
        # Process movies - batch process to avoid too many API calls
        movie_ids_list = list(movie_watches)[:100]  # Limit to first 100 to avoid timeout
        for tmdb_id in movie_ids_list:
            if tmdb_id:
                try:
                    response = session.get(
                        f"https://api.themoviedb.org/3/movie/{tmdb_id}",
                        params={"api_key": tmdb_api_key},
                        timeout=5
                    )
                    if response.status_code == 200:
                        movie_data = response.json()
                        genres = movie_data.get('genres', [])
                        for genre in genres:
                            genre_counts[genre['name']] += 1
                            total_items += 1
                except Exception as e:
                    logger.warning(f"[TOP_GENRES] Error fetching movie {tmdb_id}: {e}")
        
        # Process shows - batch process to avoid too many API calls
        show_ids_list = list(show_watches)[:100]  # Limit to first 100 to avoid timeout
        for tmdb_id in show_ids_list:
            if tmdb_id:
                try:
                    response = session.get(
                        f"https://api.themoviedb.org/3/tv/{tmdb_id}",
                        params={"api_key": tmdb_api_key},
                        timeout=5
                    )
                    if response.status_code == 200:
                        show_data = response.json()
                        genres = show_data.get('genres', [])
                        for genre in genres:
                            genre_counts[genre['name']] += 1
                            total_items += 1
                except Exception as e:
                    logger.warning(f"[TOP_GENRES] Error fetching show {tmdb_id}: {e}")
        
        # Calculate percentages and sort
        top_genres = []
        for genre_name, count in genre_counts.items():
            percentage = round((count / total_items * 100)) if total_items > 0 else 0
            top_genres.append({
                "name": genre_name,
                "count": count,
                "percentage": percentage,
            })
        
        # Sort by percentage descending and take top 3
        top_genres.sort(key=lambda x: x['percentage'], reverse=True)
        top_genres = top_genres[:3]
        
        
        return Response({
            "genres": top_genres,
            "total_items": total_items,
        })

    @action(detail=False, methods=["get"], url_path="movie-stats")
    def movie_stats(self, request):
        """
        Fetches Trakt statistics for a specific movie.
        Returns: watchers, plays, collectors, comments, lists, votes
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
            stats_response = session.get(stats_url, headers=headers)
            
            if stats_response.status_code != 200:
                logger.warning(f"Failed to fetch movie stats from Trakt: {stats_response.status_code}")
                return Response(
                    {"error": f"Failed to fetch movie stats: {stats_response.status_code}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
            logger.error(f"Error fetching movie stats: {str(e)}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="update-movie")
    def update_movie(self, request):
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
            def sync_movie():
                try:
                    result = fetch_single_movie(request.user, trakt_id)
                    logger.info(f"Movie {trakt_id} sync completed for user {request.user.id}: {result}")
                except Exception as e:
                    logger.error(f"Error syncing movie {trakt_id} for user {request.user.id}: {e}", exc_info=True)
            
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
    def refresh_token(self, request):
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
    def auth_status(self, request):
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
    def authenticate(self, request):
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
        
        # Build the authorization URL
        auth_url = (
            f"https://api.trakt.tv/oauth/authorize"
            f"?response_type=code"
            f"&client_id={client_id}"
            f"&redirect_uri={settings.TRAKT_REDIRECT_URI}"
            f"&state={request.user.id}"  # Use user ID as state for security
        )
        
        return Response({
            "auth_url": auth_url,
            "message": "Visit this URL to authorize your Trakt account"
        })

    @action(detail=False, methods=["get", "post"], url_path="oauth-callback")
    def oauth_callback(self, request):
        """
        Handle the OAuth callback from Trakt.
        GET: Receives redirect from Trakt with authorization code
        POST: Processes the authorization code (requires authentication)
        """
        if request.method == "GET":
            # Handle the redirect from Trakt (no authentication required)
            return self._handle_oauth_redirect(request)
        else:
            # Handle the POST request with authorization code (requires authentication)
            return self._handle_oauth_token_exchange(request)

    def _handle_oauth_redirect(self, request):
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
            return Response(html_content, content_type='text/html')
        
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
            return Response(html_content, content_type='text/html')
        
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
        
        return Response(html_content, content_type='text/html')

    def _handle_oauth_token_exchange(self, request):
        """
        Handle the POST request to exchange authorization code for access token.
        Requires authentication.
        """
        code = request.data.get('code')
        state = request.data.get('state')
        
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
            "redirect_uri": settings.TRAKT_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        try:
            response = requests.post(token_url, json=token_data)
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
            
        except requests.RequestException as e:
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
    def search(self, request):
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
            
            print(f"Found {movies.count()} movies matching '{query}' for user {request.user.id}")
            
            for movie in movies:
                # Get movie poster from TMDB if available
                cover_image = ''
                if movie.tmdb_id:
                    try:
                        tmdb_response = requests.get(
                            f"https://api.themoviedb.org/3/movie/{movie.tmdb_id}",
                            params={
                                'api_key': settings.TMDB_API_KEY,
                                'append_to_response': 'images'
                            }
                        )
                        if tmdb_response.ok:
                            tmdb_data = tmdb_response.json()
                            if tmdb_data.get('poster_path'):
                                cover_image = f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
                    except Exception as e:
                        print(f"Error fetching TMDB data for movie {movie.tmdb_id}: {e}")
                
                results.append({
                    'id': movie.id,
                    'title': movie.title,
                    'type': 'movie',
                    'cover_image': cover_image,
                    'year': movie.year,
                    'tmdb_id': movie.tmdb_id
                })
        except Exception as e:
            print(f"Movie search error: {e}")
        
        # Search in shows that the user has watched
        try:
            shows = Show.objects.filter(
                Q(user=request.user) & 
                (Q(title__icontains=query) | Q(title__istartswith=query))
            )[:10]
            
            print(f"Found {shows.count()} shows matching '{query}' for user {request.user.id}")
            
            for show in shows:
                # Use existing image_url or fetch from TMDB
                cover_image = show.image_url or ''
                if not cover_image and show.tmdb_id:
                    try:
                        tmdb_response = requests.get(
                            f"https://api.themoviedb.org/3/tv/{show.tmdb_id}",
                            params={
                                'api_key': settings.TMDB_API_KEY,
                                'append_to_response': 'images'
                            }
                        )
                        if tmdb_response.ok:
                            tmdb_data = tmdb_response.json()
                            if tmdb_data.get('poster_path'):
                                cover_image = f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
                    except Exception as e:
                        print(f"Error fetching TMDB data for show {show.tmdb_id}: {e}")
                
                results.append({
                    'id': show.id,
                    'title': show.title,
                    'type': 'show',
                    'cover_image': cover_image,
                    'year': show.year,
                    'tmdb_id': show.tmdb_id
                })
        except Exception as e:
            print(f"Show search error: {e}")
        
        # Search in episodes that the user has watched
        try:
            episodes = Episode.objects.filter(
                Q(show__user=request.user) & 
                (Q(title__icontains=query) | Q(show__title__icontains=query))
            ).select_related('show', 'season')[:20]
            
            print(f"Found {episodes.count()} episodes matching '{query}' for user {request.user.id}")
            
            for episode in episodes:
                # Use episode image or show image
                cover_image = episode.image_url or episode.show.image_url or ''
                if not cover_image and episode.show.tmdb_id:
                    try:
                        tmdb_response = requests.get(
                            f"https://api.themoviedb.org/3/tv/{episode.show.tmdb_id}/season/{episode.season.season_number}/episode/{episode.episode_number}",
                            params={
                                'api_key': settings.TMDB_API_KEY
                            }
                        )
                        if tmdb_response.ok:
                            tmdb_data = tmdb_response.json()
                            if tmdb_data.get('still_path'):
                                cover_image = f"https://image.tmdb.org/t/p/w500{tmdb_data['still_path']}"
                    except Exception as e:
                        print(f"Error fetching TMDB data for episode {episode.id}: {e}")
                
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
            print(f"Episode search error: {e}")
        
        # Sort results by type (movies, shows, episodes) then by title
        type_order = {'movie': 0, 'show': 1, 'episode': 2}
        results.sort(key=lambda x: (type_order.get(x['type'], 99), x['title'].lower()))
        results = results[:50]  # Increased limit to accommodate episodes
        
        print(f"Trakt search results for '{query}': {len(results)} items found")
        return Response({'results': results})

    @action(detail=False, methods=["get"], url_path="recent-activity")
    def recent_activity(self, request):
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
    def completed_media(self, request):
        """
        Returns shows and movies that are 100% completed.
        For shows, this means all episodes are watched.
        For movies, this means the movie has been watched.
        """
        from django.db.models import Count, Q
        from django.core.cache import cache
        
        # Check cache first (cache for 5 minutes)
        cache_key = f"completed_media_{request.user.id}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response(cached_result)
        
        completed_shows = []
        # Limit to recently watched shows (last 100 shows) to avoid checking all shows
        shows = Show.objects.filter(user=request.user).order_by('-last_watched_at')[:100]
        
        # Get Trakt headers for API calls
        headers = get_trakt_headers(request.user)
        
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
                seasons_response = session.get(seasons_url, headers=headers)
                
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
        
        # All movies are considered "completed" if watched
        completed_movies = Movie.objects.filter(
            user=request.user,
            plays__gt=0
        ).order_by('-last_watched_at').values('id', 'title', 'year', 'image_url', 'trakt_id', 'tmdb_id', 'last_watched_at')[:20]
        
        # Convert to list and ensure last_watched_at is ISO format
        completed_movies_list = []
        for movie in completed_movies:
            movie_dict = dict(movie)
            if movie_dict.get('last_watched_at'):
                movie_dict['last_watched_at'] = movie_dict['last_watched_at'].isoformat()
            else:
                movie_dict['last_watched_at'] = None
            completed_movies_list.append(movie_dict)
        
        completed_movies = completed_movies_list
        
        result = {
            'completed_shows': completed_shows,  # Already sorted by most recent first
            'completed_movies': list(completed_movies),
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, result, 300)
        
        return Response(result)

    @action(detail=False, methods=["get"], url_path="profile-stats")
    def profile_stats(self, request):
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

    @action(detail=False, methods=["get"], url_path="rating-comparison")
    def rating_comparison(self, request):
        """
        Returns average rating comparison between user ratings and Trakt global ratings.
        Note: This is a placeholder - actual Trakt global ratings would require API calls.
        """
        from django.db.models import Avg
        
        # Calculate user's average movie ratings (if we had ratings stored)
        # For now, we'll use a placeholder approach
        user_movie_count = Movie.objects.filter(user=request.user).count()
        user_show_count = Show.objects.filter(user=request.user).count()
        
        # Placeholder values - in a real implementation, you'd fetch from Trakt API
        return Response({
            'movies': {
                'user_avg': 8.5,  # Placeholder
                'trakt_avg': 7.2,  # Placeholder
            },
            'shows': {
                'user_avg': 9.2,  # Placeholder
                'trakt_avg': 8.4,  # Placeholder
            },
        })

    @action(detail=False, methods=["get"], url_path="trending")
    def trending(self, request):
        """
        Returns trending movies and shows from Trakt.
        This requires calling the Trakt API directly.
        """
        try:
            headers = get_trakt_headers(request.user)
            
            # Fetch trending movies
            movies_url = "https://api.trakt.tv/movies/trending?limit=10"
            movies_response = requests.get(movies_url, headers=headers)
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
            shows_response = requests.get(shows_url, headers=headers)
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
