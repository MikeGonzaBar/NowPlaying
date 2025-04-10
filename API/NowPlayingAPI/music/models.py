import requests
from django.db import models
from datetime import datetime
from django.conf import settings


class Song(models.Model):
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255, blank=True, null=True)
    played_at = models.DateTimeField()
    album_thumbnail = models.URLField(blank=True, null=True)
    track_url = models.URLField(blank=True, null=True)
    artists_url = models.URLField(blank=True, null=True)
    duration_ms = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-played_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["title", "artist", "played_at"], name="unique_song"
            )
        ]

    def __str__(self):
        return f"{self.title} by {self.artist}"

    @staticmethod
    def fetch_recently_played_songs():
        """
        Fetches the latest 50 recently played songs from Spotify using the API,
        stores them in the database, and returns the data.
        """
        url = "https://api.spotify.com/v1/me/player/recently-played?limit=50"
        token = settings.SPOTIFY_ACCESS_TOKEN  # Ensure this is set in your settings or .env file
        headers = {"Authorization": f"Bearer {token}"}

        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch recently played songs: {response.json()}")

        data = response.json()
        result = []  # To store the fetched data for returning

        for item in data.get("items", []):
            track = item.get("track", {})
            played_at = datetime.strptime(item.get("played_at"), "%Y-%m-%dT%H:%M:%S.%fZ")
            title = track.get("name")
            artist = ", ".join([artist.get("name") for artist in track.get("artists", [])])
            album_data = track.get("album", {})
            album_name = album_data.get("name")
            images = album_data.get("images", [])

            # Choose the smallest image as a thumbnail (usually the first in the list)
            album_thumbnail = images[0].get("url") if images else None

            # Get URLs for the track and artists
            track_url = track.get("external_urls", {}).get("spotify")
            artists_url = ", ".join([artist.get("external_urls", {}).get("spotify") for artist in track.get("artists", [])])

            # Duration of the track in milliseconds
            duration_ms = track.get("duration_ms")

            # Save (or update) the song record in the database
            Song.objects.update_or_create(
                title=title,
                artist=artist,
                played_at=played_at,
                defaults={
                    "album": album_name,
                    "album_thumbnail": album_thumbnail,
                    "track_url": track_url,
                    "artists_url": artists_url,
                    "duration_ms": duration_ms,
                },
            )

            # Append the song data to the result list
            result.append(
                {
                    "title": title,
                    "artist": artist,
                    "album": album_name,
                    "album_thumbnail": album_thumbnail,
                    "track_url": track_url,
                    "artists_url": artists_url,
                    "duration_ms": duration_ms,
                    "played_at": played_at.isoformat(),
                }
            )

        return result
