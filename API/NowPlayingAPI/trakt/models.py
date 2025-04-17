from django.db import models
from django.utils import timezone
from django.conf import settings
import requests
from datetime import datetime, timedelta
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dateutil.parser import isoparse
from django.db.models import Max

# Create your models here.

session = requests.Session()
retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retries)
session.mount("https://", adapter)


class TraktToken(models.Model):
    """
    Stores your Trakt access token and refresh token along with the expiry date.
    """

    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255)
    expires_at = models.DateTimeField()  # When the token expires
    updated_at = models.DateTimeField(auto_now=True)

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"TraktToken(expiring at {self.expires_at})"


class Movie(models.Model):
    trakt_id = models.CharField(max_length=255, unique=True)
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

    def __str__(self):
        return self.title


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
        return f"{self.movie.title} watched at {self.watched_at}"


class Show(models.Model):
    """
    Stores TV show details.
    """

    trakt_id = models.CharField(max_length=100, unique=True)
    slug = models.CharField(max_length=255, null=True, blank=True)  # Trakt slug
    tmdb_id = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255)
    year = models.IntegerField(null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)
    slug = models.CharField(max_length=255, null=True, blank=True)  # Trakt slug
    last_watched_at = models.DateTimeField(
        null=True, blank=True
    )  # Last watched timestamp

    def __str__(self):
        return self.title


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
        return f"{self.show.title} - Season {self.season_number}"


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
        return f"{self.show.title} S{self.season.season_number}E{self.episode_number}"


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


def refresh_trakt_token(token_instance):
    """
    Refreshes the Trakt access token using the stored refresh token.
    """
    url = "https://api.trakt.tv/oauth/token"
    data = {
        "refresh_token": token_instance.refresh_token,
        "client_id": settings.TRAKT_CLIENT_ID,
        "client_secret": settings.TRAKT_CLIENT_SECRET,
        "redirect_uri": settings.TRAKT_REDIRECT_URI,
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


def get_trakt_headers():
    """
    Retrieves the latest token and returns headers for Trakt API requests.
    Refreshes the token if it is expired.
    """
    try:
        token = TraktToken.objects.latest("updated_at")

    except TraktToken.DoesNotExist:
        raise Exception("Trakt token not found. Please authenticate first.")
    if token.is_expired():
        token = refresh_trakt_token(token)
    return {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": settings.TRAKT_CLIENT_ID,
        "Authorization": f"Bearer {token.access_token}",
    }


def fetch_latest_watched_movies():
    """
    Fetches the latest watched movies from Trakt and updates/creates records in the database.
    """
    url = "https://api.trakt.tv/users/me/watched/movies"
    headers = get_trakt_headers()
    response = requests.get(url, headers=headers)
    data = response.json()
    sorted_data = sorted(data, key=lambda x: x.get("last_updated_at"), reverse=True)

    for item in sorted_data:
        movie_data = item.get("movie", {})
        trakt_id = str(movie_data.get("ids", {}).get("trakt"))
        api_last_updated = isoparse(item["last_updated_at"])
        try:
            movie_obj = Movie.objects.get(trakt_id=trakt_id)
        except Movie.DoesNotExist:
            movie_obj = None
        if movie_obj and movie_obj.last_updated_at and api_last_updated <= movie_obj.last_updated_at:
            continue

        plays = item.get("plays", 0)  # Number of times the movie was watched
        last_updated_at = item.get("last_updated_at")
        watched_at = item.get("last_watched_at")
        title = movie_data.get("title")
        year = movie_data.get("year")
        slug = movie_data.get("ids", {}).get("slug")
        imdb_id = movie_data.get("ids", {}).get("imdb")
        tmdb_id = movie_data.get("ids", {}).get("tmdb")
        images = movie_data.get("images", {})
        poster = images.get("poster", {}).get("full")

        # Update or create the movie record
        movie_obj, _ = Movie.objects.update_or_create(
            trakt_id=trakt_id,
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

    return sorted_data


def fetch_latest_watched_shows():
    """
    Fetches the latest watched TV shows from Trakt and updates/creates records for shows,
    seasons, episodes, and watch events.
    """
    url = "https://api.trakt.tv/users/me/watched/shows"
    headers = get_trakt_headers()
    response = requests.get(url, headers=headers)
    data = response.json()
    sorted_data = sorted(data, key=lambda x: x.get("last_watched_at"), reverse=True)
    for item in sorted_data:
        show_data = item.get("show", {})
        trakt_id = str(show_data.get("ids", {}).get("trakt"))
        try:
            existing = Show.objects.get(trakt_id=trakt_id)
        except Show.DoesNotExist:
            existing = None
        title = show_data.get("title")
        tmdb_id = show_data.get("ids", {}).get("tmdb")
        api_last = isoparse(item["last_watched_at"])
        if existing:
            last_db = existing.last_watched_at
        else:
            last_db = None
        print(f"Recieved Show: {title}\tAPI Last: {api_last}\tDB Last: {last_db}")
        if ((last_db is not None) and (api_last <= last_db)):
            continue
        year = show_data.get("year")
        slug = show_data.get("ids", {}).get("slug")
        # Extract the TMDb ID from the response
        images = show_data.get("images", {})
        poster = images.get("poster", {}).get("full")
        # Update or create the show record
        show_obj, _ = Show.objects.update_or_create(
            trakt_id=trakt_id,
            defaults={
                "title": title,
                "year": year,
                "image_url": poster,
                "slug": slug,
                "tmdb_id": tmdb_id,
            },
        )

        # Initialize the latest watched timestamp for the show
        latest_watched_at = None

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
                        watched_at_dt = timezone.datetime.fromisoformat(
                            watched_at.replace("Z", "+00:00")
                        )
                        if not latest_watched_at or watched_at_dt > latest_watched_at:
                            latest_watched_at = watched_at_dt

                    # Record the watch event
                    progress = 100.0  # Adjust if you receive partial progress
                    EpisodeWatch.objects.create(
                        episode=episode_obj, watched_at=watched_at, progress=progress
                    )

        # Update the show's last_watched_at field
        if latest_watched_at:
            show_obj.last_watched_at = latest_watched_at
            show_obj.save()

    return sorted_data
