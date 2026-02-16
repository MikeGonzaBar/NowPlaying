from django.db import models
from django.utils import timezone
from django.conf import settings
import requests
import logging
from datetime import datetime, timedelta
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dateutil.parser import isoparse
from django.db.models import Max
from django.contrib.auth.models import User

# Create your models here.

session = requests.Session()
retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retries)
session.mount("https://", adapter)


class TraktToken(models.Model):
    """
    Stores your Trakt access token and refresh token along with the expiry date.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trakt_tokens')
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255)
    expires_at = models.DateTimeField()  # When the token expires
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user',)  # Each user can have only one token

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"TraktToken for {self.user.username} (expiring at {self.expires_at})"


class Movie(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trakt_movies')
    trakt_id = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    year = models.IntegerField(null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)
    plays = models.IntegerField(default=0)  # Number of plays
    last_watched_at = models.DateTimeField(
        null=True, blank=True
    )  # Last watched timestamp
    last_updated_at = models.DateTimeField(
        null=True, blank=True
    )  # Last updated timestamp
    imdb_id = models.CharField(max_length=255, null=True, blank=True)  # IMDb ID
    tmdb_id = models.CharField(max_length=255, null=True, blank=True)  # TMDb ID
    slug = models.CharField(max_length=255, null=True, blank=True)  # Trakt slug

    class Meta:
        unique_together = ('user', 'trakt_id')  # Each user can have their own copy of the same movie

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class MovieWatch(models.Model):
    """
    Records each time a movie is watched.
    """

    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name="watches")
    watched_at = models.DateTimeField(default=timezone.now)
    progress = models.FloatField(
        default=100.0
    )  # Percentage watched (100 means finished)

    def __str__(self):
        return f"{self.movie.title} watched by {self.movie.user.username} at {self.watched_at}"


class Show(models.Model):
    """
    Stores TV show details.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trakt_shows')
    trakt_id = models.CharField(max_length=100)
    slug = models.CharField(max_length=255, null=True, blank=True)  # Trakt slug
    tmdb_id = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255)
    year = models.IntegerField(null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)
    slug = models.CharField(max_length=255, null=True, blank=True)  # Trakt slug
    last_watched_at = models.DateTimeField(
        null=True, blank=True
    )  # Last watched timestamp

    class Meta:
        unique_together = ('user', 'trakt_id')  # Each user can have their own copy of the same show

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class Season(models.Model):
    """
    Stores season details for a TV show.
    """

    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name="seasons")
    season_number = models.IntegerField()
    image_url = models.URLField(null=True, blank=True)
    title = models.CharField(max_length=255, null=True, blank=True)  # Optional title
    air_date = models.DateField(null=True, blank=True)  # Optional air date

    class Meta:
        unique_together = ("show", "season_number")

    def __str__(self):
        return f"{self.show.title} - Season {self.season_number} ({self.show.user.username})"


class Episode(models.Model):
    """
    Stores episode details.
    """

    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name="episodes")
    season = models.ForeignKey(
        Season, on_delete=models.CASCADE, related_name="episodes"
    )
    episode_number = models.IntegerField()
    title = models.CharField(max_length=255, null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)
    air_date = models.DateField(null=True, blank=True)
    plays = models.IntegerField(default=0)  # Number of times the episode was watched
    watched_at = models.DateTimeField(null=True, blank=True)  # Last watched timestamp
    last_updated_at = models.DateTimeField(
        null=True, blank=True
    )  # Last updated timestamp
    overview = models.TextField(null=True, blank=True)  # Episode overview
    rating = models.FloatField(null=True, blank=True)  # Episode rating
    runtime = models.IntegerField(null=True, blank=True)  # Episode runtime in minutes
    episode_type = models.CharField(
        max_length=50, null=True, blank=True
    )  # Episode type (e.g., "series_premiere")
    ids = models.JSONField(
        null=True, blank=True
    )  # Store all IDs (trakt, tvdb, imdb, tmdb, etc.)
    available_translations = models.JSONField(
        null=True, blank=True
    )  # List of available translations

    class Meta:
        unique_together = ("show", "season", "episode_number")

    def __str__(self):
        return f"{self.show.title} S{self.season.season_number}E{self.episode_number} ({self.show.user.username})"


class EpisodeWatch(models.Model):
    """
    Records each time an episode is watched, including progress.
    """

    episode = models.ForeignKey(
        Episode, on_delete=models.CASCADE, related_name="watches"
    )
    watched_at = models.DateTimeField(default=timezone.now)
    progress = models.FloatField(
        default=100.0
    )  # Percentage progress (100 means finished)

    def __str__(self):
        return f"{self.episode} watched at {self.watched_at}"


def get_trakt_api_credentials(user):
    """
    Get Trakt API credentials for a specific user from UserApiKey model.
    """
    from users.models import UserApiKey
    
    try:
        api_key_obj = UserApiKey.objects.get(user=user, service_name='trakt')
        client_id = api_key_obj.service_user_id  # client_id is stored in service_user_id
        client_secret = api_key_obj.get_key()    # client_secret is stored in api_key
        
        if not client_id or not client_secret:
            raise Exception(f"Trakt API credentials incomplete for user {user.username}. Please update your Trakt API settings.")
        
        return client_id, client_secret
        
    except UserApiKey.DoesNotExist:
        raise Exception(f"Trakt API credentials not found for user {user.username}. Please add your Trakt API credentials.")


def refresh_trakt_token(token_instance):
    """
    Refreshes the Trakt access token using the stored refresh token.
    """
    client_id, client_secret = get_trakt_api_credentials(token_instance.user)
    
    url = "https://api.trakt.tv/oauth/token"
    data = {
        "refresh_token": token_instance.refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": settings.TRAKT_REDIRECT_URI,  # This can stay in settings as it's app-level config
        "grant_type": "refresh_token",
    }
    response = requests.post(url, json=data)
    token_data = response.json()
    if "access_token" in token_data:
        token_instance.access_token = token_data.get("access_token")
        token_instance.refresh_token = token_data.get("refresh_token")
        token_instance.expires_at = timezone.now() + timedelta(
            seconds=token_data.get("expires_in", 0)
        )
        token_instance.save()
    return token_instance


def get_trakt_headers(user):
    """
    Retrieves the latest token for a specific user and returns headers for Trakt API requests.
    Refreshes the token if it is expired.
    """
    try:
        token = TraktToken.objects.filter(user=user).latest("updated_at")
    except TraktToken.DoesNotExist:
        raise Exception(f"Trakt token not found for user {user.username}. Please authenticate first.")
    
    if token.is_expired():
        token = refresh_trakt_token(token)
    
    client_id, _ = get_trakt_api_credentials(user)
    
    return {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": client_id,
        "Authorization": f"Bearer {token.access_token}",
    }


def fetch_tmdb_poster_for_movie(tmdb_id):
    """
    Fetches poster image URL from TMDB API for a movie.
    Returns the full image URL or None if not found.
    """
    if not tmdb_id or not hasattr(settings, 'TMDB_API_KEY') or not settings.TMDB_API_KEY:
        return None
    
    try:
        tmdb_response = session.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}",
            params={
                'api_key': settings.TMDB_API_KEY,
                'language': 'en-US'
            }
        )
        if tmdb_response.status_code == 200:
            tmdb_data = tmdb_response.json()
            if tmdb_data.get('poster_path'):
                return f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"Error fetching TMDB poster for movie {tmdb_id}: {e}")
    return None


def fetch_tmdb_poster_for_show(tmdb_id):
    """
    Fetches poster image URL from TMDB API for a TV show.
    Returns the full image URL or None if not found.
    """
    if not tmdb_id or not hasattr(settings, 'TMDB_API_KEY') or not settings.TMDB_API_KEY:
        return None
    
    try:
        tmdb_response = session.get(
            f"https://api.themoviedb.org/3/tv/{tmdb_id}",
            params={
                'api_key': settings.TMDB_API_KEY,
                'language': 'en-US'
            }
        )
        if tmdb_response.status_code == 200:
            tmdb_data = tmdb_response.json()
            if tmdb_data.get('poster_path'):
                return f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}"
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"Error fetching TMDB poster for show {tmdb_id}: {e}")
    return None


def _process_single_movie(user, item):
    """
    Helper function to process a single movie item from Trakt API.
    Updates/creates records for movie and watch events.
    """
    movie_data = item.get("movie", {})
    if not movie_data:
        return None
        
    trakt_id = str(movie_data.get("ids", {}).get("trakt"))
    if not trakt_id or trakt_id == "None":
        return None
    
    # Handle last_updated_at - it might not exist in the item
    api_last_updated = None
    if item.get("last_updated_at"):
        try:
            api_last_updated = isoparse(item["last_updated_at"])
        except (ValueError, TypeError):
            api_last_updated = None
    
    try:
        movie_obj = Movie.objects.get(trakt_id=trakt_id, user=user)
    except Movie.DoesNotExist:
        movie_obj = None
    
    # Skip if movie hasn't been updated on Trakt, unless we need to backfill image
    needs_image_backfill = movie_obj and not movie_obj.image_url
    if movie_obj and movie_obj.last_updated_at and api_last_updated and api_last_updated <= movie_obj.last_updated_at and not needs_image_backfill:
        return {"skipped": True, "reason": "No updates needed"}

    plays = item.get("plays", 0)  # Number of times the movie was watched
    last_updated_at = item.get("last_updated_at")
    watched_at = item.get("last_watched_at")
    title = movie_data.get("title")
    year = movie_data.get("year")
    slug = movie_data.get("ids", {}).get("slug")
    imdb_id = movie_data.get("ids", {}).get("imdb")
    tmdb_id = movie_data.get("ids", {}).get("tmdb")
    
    # Handle images safely - Trakt API may not return images or may return them in different formats
    poster = None
    images = movie_data.get("images")
    if images and isinstance(images, dict):
        poster_data = images.get("poster", {})
        if isinstance(poster_data, dict):
            poster = poster_data.get("full")
    
    # If Trakt didn't provide an image, try fetching from TMDB
    if not poster and tmdb_id:
        poster = fetch_tmdb_poster_for_movie(tmdb_id)
    
    # If we're backfilling and still don't have a poster, keep existing if it exists
    if needs_image_backfill and not poster and movie_obj and movie_obj.image_url:
        poster = movie_obj.image_url

    # Update or create the movie record
    movie_obj, _ = Movie.objects.update_or_create(
        trakt_id=trakt_id,
        user=user,
        defaults={
            "title": title,
            "year": year,
            "image_url": poster,
            "plays": plays,
            "last_watched_at": watched_at,
            "last_updated_at": last_updated_at,
            "slug": slug,
            "imdb_id": imdb_id,
            "tmdb_id": tmdb_id,
        },
    )

    # Create a watch record for this movie
    MovieWatch.objects.create(
        movie=movie_obj, watched_at=watched_at, progress=100.0
    )
    
    return {"success": True, "title": title, "trakt_id": trakt_id}


def fetch_latest_watched_movies(user):
    """
    Fetches the latest watched movies from Trakt and updates/creates records in the database for a specific user.
    """
    url = "https://api.trakt.tv/users/me/watched/movies"
    headers = get_trakt_headers(user)
    response = requests.get(url, headers=headers)
    data = response.json()
    sorted_data = sorted(data, key=lambda x: x.get("last_updated_at"), reverse=True)

    for item in sorted_data:
        # Use the helper function to process this movie
        _process_single_movie(user, item)

    return sorted_data


def fetch_single_movie(user, trakt_id):
    """
    Fetches and updates a specific movie by trakt_id from Trakt API.
    Updates/creates records for movie and watch events.
    """
    headers = get_trakt_headers(user)

    # Trakt does NOT support GET /movies/{id}/watched (405). For per-user watched info,
    # reuse the same endpoint as the bulk sync and filter down to the requested movie.
    url = "https://api.trakt.tv/users/me/watched/movies"
    response = session.get(url, headers=headers)

    if response.status_code != 200:
        error_msg = f"Trakt API returned status {response.status_code}: {response.text}"
        logger = logging.getLogger(__name__)
        logger.error(error_msg)
        raise Exception(error_msg)

    data = response.json()
    if not isinstance(data, list):
        error_msg = f"Unexpected response format from Trakt API: {type(data)}"
        logger = logging.getLogger(__name__)
        logger.warning(error_msg)
        raise Exception(error_msg)

    wanted_id = str(trakt_id)
    item = None
    for candidate in data:
        movie_data = (candidate or {}).get("movie", {})
        cand_id = str((movie_data.get("ids", {}) or {}).get("trakt"))
        if cand_id == wanted_id:
            item = candidate
            break

    if not item:
        # Not in watched list; still refresh base movie metadata so we can backfill poster/etc.
        movie_url = f"https://api.trakt.tv/movies/{trakt_id}?extended=full"
        movie_response = session.get(movie_url, headers=headers)
        if movie_response.status_code != 200:
            error_msg = f"Trakt API returned status {movie_response.status_code}: {movie_response.text}"
            logger = logging.getLogger(__name__)
            logger.error(error_msg)
            raise Exception(error_msg)

        movie_data = movie_response.json()
        item = {
            "movie": movie_data,
            "plays": 0,
            "last_watched_at": None,
            "last_updated_at": None,
        }
    
    # Process the movie using the helper function
    result = _process_single_movie(user, item)
    
    if result and result.get("skipped"):
        return {"message": f"Movie {result.get('title', trakt_id)} skipped - no updates needed"}
    
    return {"message": f"Movie {result.get('title', trakt_id)} updated successfully", "trakt_id": trakt_id}


def _process_single_show(user, item, headers):
    """
    Helper function to process a single show item from Trakt API.
    Updates/creates records for show, seasons, episodes, and watch events.
    """
    show_data = item.get("show", {})
    if not show_data:
        return None
        
    trakt_id = str(show_data.get("ids", {}).get("trakt"))
    if not trakt_id or trakt_id == "None":
        return None
        
    try:
        existing = Show.objects.get(trakt_id=trakt_id, user=user)
    except Show.DoesNotExist:
        existing = None
    title = show_data.get("title")
    tmdb_id = show_data.get("ids", {}).get("tmdb")
    
    # Safely parse last_watched_at, handling None or missing values
    last_watched_at_str = item.get("last_watched_at")
    api_last = None
    if last_watched_at_str:
        try:
            api_last = isoparse(last_watched_at_str)
        except (ValueError, TypeError) as e:
            logger = logging.getLogger(__name__)
            logger.warning(f"Error parsing last_watched_at for show {title}: {e}")
            api_last = None
    
    if existing:
        last_db = existing.last_watched_at
    else:
        last_db = None
    print(f"Received Show: {title}\tAPI Last: {api_last}\tDB Last: {last_db}")
    
    # Skip if show hasn't been updated on Trakt, unless we need to backfill image
    needs_image_backfill = existing and not existing.image_url
    if api_last and last_db and (api_last <= last_db) and not needs_image_backfill:
        return {"skipped": True, "reason": "No updates needed"}
    
    year = show_data.get("year")
    slug = show_data.get("ids", {}).get("slug")
    # Extract the TMDb ID from the response
    # Handle images safely - Trakt API may not return images or may return them in different formats
    poster = None
    images = show_data.get("images")
    if images and isinstance(images, dict):
        poster_data = images.get("poster", {})
        if isinstance(poster_data, dict):
            poster = poster_data.get("full")
    
    # If Trakt didn't provide an image, try fetching from TMDB
    if not poster and tmdb_id:
        poster = fetch_tmdb_poster_for_show(tmdb_id)
    
    # If we're backfilling and still don't have a poster, keep existing if it exists
    if needs_image_backfill and not poster and existing and existing.image_url:
        poster = existing.image_url
    
    # Update or create the show record
    show_defaults = {
        "title": title,
        "year": year,
        "image_url": poster,
        "slug": slug,
        "tmdb_id": tmdb_id,
    }
    # Only update last_watched_at if we have a valid date
    if api_last:
        show_defaults["last_watched_at"] = api_last
    
    show_obj, _ = Show.objects.update_or_create(
        trakt_id=trakt_id,
        user=user,
        defaults=show_defaults,
    )

    # Initialize the latest watched timestamp for the show
    latest_watched_at = api_last if api_last else None

    # Loop through each season in the result
    seasons = item.get("seasons", [])
    for season in seasons:
        season_number = season.get("number")
        season_obj, _ = Season.objects.get_or_create(
            show=show_obj, season_number=season_number
        )

        # Loop through each episode in the season
        episodes = season.get("episodes", [])
        for episode in episodes:
            episode_number = episode.get("number")
            watched_at = episode.get("last_watched_at")
            plays = episode.get("plays", 0)
            print(f"Processing Show {title}\tS: {season_number}\tE: {episode_number}")

            # Make an extra API call to fetch detailed info for the episode
            ep_url = f"https://api.trakt.tv/shows/{trakt_id}/seasons/{season_number}/episodes/{episode_number}?extended=full"
            ep_response = session.get(ep_url, headers=headers)
            if ep_response.status_code == 200:
                ep_details = ep_response.json()
                episode_title = ep_details.get("title")
                overview = ep_details.get("overview")
                rating = ep_details.get("rating")
                runtime = ep_details.get("runtime")
                episode_type = ep_details.get("episode_type")
                trakt_ids = ep_details.get("ids", {})
                air_date = ep_details.get("first_aired")
                updated_at = ep_details.get("updated_at")
                available_translations = ep_details.get(
                    "available_translations", []
                )
                # Parse the air_date to extract only the date
                if air_date:
                    air_date = datetime.fromisoformat(
                        air_date.replace("Z", "+00:00")
                    ).date()

                episode_image_url = None

                if tmdb_id:
                    tmdb_api_key = (
                        settings.TMDB_API_KEY
                    )  # Ensure you have this in your settings
                    tmdb_url = f"https://api.themoviedb.org/3/tv/{tmdb_id}/season/{season_number}/episode/{episode_number}?api_key={tmdb_api_key}&language=en-US"
                    tmdb_response = session.get(tmdb_url)
                    if tmdb_response.status_code == 200:
                        tmdb_data = tmdb_response.json()
                        still_path = tmdb_data.get("still_path")
                        if still_path:
                            episode_image_url = (
                                f"https://image.tmdb.org/t/p/w780{still_path}"
                            )

                # Update or create the episode record
                episode_obj, _ = Episode.objects.update_or_create(
                    show=show_obj,
                    season=season_obj,
                    episode_number=episode_number,
                    defaults={
                        "title": episode_title,
                        "overview": overview,
                        "rating": rating,
                        "runtime": runtime,
                        "episode_type": episode_type,
                        "air_date": air_date,
                        "plays": plays,
                        "watched_at": watched_at,
                        "ids": trakt_ids,
                        "available_translations": available_translations,
                        "last_updated_at": updated_at,
                        "image_url": episode_image_url,
                    },
                )

                # Update the latest watched timestamp for the show
                if watched_at:
                    try:
                        watched_at_dt = timezone.datetime.fromisoformat(
                            watched_at.replace("Z", "+00:00")
                        )
                        if not latest_watched_at or watched_at_dt > latest_watched_at:
                            latest_watched_at = watched_at_dt
                    except (ValueError, TypeError, AttributeError) as e:
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Error parsing watched_at for episode: {e}")

                # Record the watch event
                progress = 100.0  # Adjust if you receive partial progress
                try:
                    EpisodeWatch.objects.create(
                        episode=episode_obj, watched_at=watched_at, progress=progress
                    )
                except Exception as e:
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Error creating EpisodeWatch: {e}")
                    # Continue processing other episodes even if one fails

    # Update the show's last_watched_at field
    if latest_watched_at:
        show_obj.last_watched_at = latest_watched_at
        show_obj.save()
    
    return {"success": True, "title": title, "trakt_id": trakt_id}


def fetch_latest_watched_shows(user):
    """
    Fetches the latest watched TV shows from Trakt and updates/creates records for shows,
    seasons, episodes, and watch events for a specific user.
    """
    url = "https://api.trakt.tv/users/me/watched/shows"
    headers = get_trakt_headers(user)
    response = requests.get(url, headers=headers)
    
    # Check if the response is successful
    if response.status_code != 200:
        error_msg = f"Trakt API returned status {response.status_code}: {response.text}"
        logger = logging.getLogger(__name__)
        logger.error(error_msg)
        raise Exception(error_msg)
    
    data = response.json()
    # Handle case where data might be empty or not a list
    if not isinstance(data, list):
        logger = logging.getLogger(__name__)
        logger.warning(f"Unexpected response format from Trakt API: {type(data)}")
        return []
    
    sorted_data = sorted(
        data, 
        key=lambda x: x.get("last_watched_at") or "", 
        reverse=True
    )
    for item in sorted_data:
        # Use the helper function to process this show
        _process_single_show(user, item, headers)

    # Return a simple success message instead of the full data
    return {"message": "Shows fetched and stored successfully", "count": len(sorted_data)}


def fetch_single_show(user, trakt_id):
    """
    Fetches and updates a specific show by trakt_id from Trakt API.
    Updates/creates records for show, seasons, episodes, and watch events.
    If the show is not in the user's watched list, it will fetch show details and create it.
    """
    headers = get_trakt_headers(user)
    
    # First, try to fetch the show's watched data
    url = f"https://api.trakt.tv/shows/{trakt_id}/watched"
    response = session.get(url, headers=headers)
    
    # If show is not watched (404) or method not allowed (405), fetch show details instead
    if response.status_code in [404, 405]:
        logger = logging.getLogger(__name__)
        logger.info(f"Show {trakt_id} not in watched list, fetching show details instead")
        
        # Fetch show details
        show_url = f"https://api.trakt.tv/shows/{trakt_id}?extended=full"
        show_response = session.get(show_url, headers=headers)
        
        if show_response.status_code == 404:
            # Show doesn't exist in Trakt - log and return gracefully
            logger.warning(f"Show {trakt_id} does not exist in Trakt API")
            return {"message": f"Show {trakt_id} does not exist in Trakt", "trakt_id": trakt_id}
        elif show_response.status_code != 200:
            error_msg = f"Trakt API returned status {show_response.status_code} for show {trakt_id}: {show_response.text}"
            logger.error(error_msg)
            raise Exception(error_msg)
        
        show_data = show_response.json()
        
        # Create a mock watched response structure for _process_single_show
        data = {
            "show": show_data,
            "seasons": [],  # No watched episodes
            "last_watched_at": None
        }
    elif response.status_code != 200:
        error_msg = f"Trakt API returned status {response.status_code}: {response.text}"
        logger = logging.getLogger(__name__)
        logger.error(error_msg)
        raise Exception(error_msg)
    else:
        data = response.json()
        
        # The response should be a single show object with seasons/episodes
        if not isinstance(data, dict) or "show" not in data:
            error_msg = f"Unexpected response format from Trakt API for show {trakt_id}"
            logger = logging.getLogger(__name__)
            logger.warning(error_msg)
            raise Exception(error_msg)
    
    # Process the show using the helper function
    result = _process_single_show(user, data, headers)
    
    if result and result.get("skipped"):
        return {"message": f"Show {result.get('title', trakt_id)} skipped - no updates needed"}
    
    return {"message": f"Show {result.get('title', trakt_id)} updated successfully", "trakt_id": trakt_id}
