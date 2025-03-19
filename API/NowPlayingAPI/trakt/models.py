from django.db import models
from django.utils import timezone
from django.conf import settings
import requests
from datetime import timedelta

# Create your models here.


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
    """
    Stores movie details fetched from Trakt.
    """

    trakt_id = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    year = models.IntegerField(null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.year})"


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
    title = models.CharField(max_length=255)
    year = models.IntegerField(null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)

    def __str__(self):
        return self.title


class Season(models.Model):
    """
    Stores season details for a TV show.
    """

    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name="seasons")
    season_number = models.IntegerField()
    image_url = models.URLField(null=True, blank=True)

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
    sorted_data = sorted(data, key=lambda x: x.get("last_watched_at"), reverse=True)
    for item in sorted_data:
        movie_data = item.get("movie", {})
        watched_at = item.get("last_watched_at")
        progress = 100.0  # Trakt returns finished movies; adjust if partial progress is provided

        trakt_id = str(movie_data.get("ids", {}).get("trakt"))
        title = movie_data.get("title")
        year = movie_data.get("year")
        images = movie_data.get("images", {})
        poster = images.get("poster", {}).get("full")

        movie_obj, _ = Movie.objects.update_or_create(
            trakt_id=trakt_id,
            defaults={"title": title, "year": year, "image_url": poster},
        )
        # Create a watch record for this movie
        MovieWatch.objects.create(
            movie=movie_obj, watched_at=watched_at, progress=progress
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
        title = show_data.get("title")
        year = show_data.get("year")
        images = show_data.get("images", {})
        poster = images.get("poster", {}).get("full")

        show_obj, _ = Show.objects.update_or_create(
            trakt_id=trakt_id,
            defaults={"title": title, "year": year, "image_url": poster},
        )

        # Process the last watched episode for the show (if available)
        last_episode = item.get("last_episode")
        if last_episode:
            season_number = last_episode.get("season")
            episode_number = last_episode.get("number")
            episode_title = last_episode.get("title")
            episode_images = last_episode.get("images", {})
            episode_poster = episode_images.get("screenshot", {}).get("full")

            season_obj, _ = Season.objects.get_or_create(
                show=show_obj, season_number=season_number
            )
            episode_obj, _ = Episode.objects.update_or_create(
                show=show_obj,
                season=season_obj,
                episode_number=episode_number,
                defaults={"title": episode_title, "image_url": episode_poster},
            )
            watched_at = item.get("last_watched_at")
            progress = 100.0  # Adjust if partial progress is provided
            EpisodeWatch.objects.create(
                episode=episode_obj, watched_at=watched_at, progress=progress
            )
    return sorted_data
