import requests
from django.db import models
from datetime import datetime
from django.conf import settings


class StreamedSong(models.Model):
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255, blank=True, null=True)
    played_at = models.DateTimeField()

    class Meta:
        ordering = ["-played_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["title", "artist", "played_at"], name="unique_song_play"
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
        token = (
            settings.SPOTIFY_ACCESS_TOKEN
        )  # Ensure this is set in your settings or .env file

        headers = {"Authorization": f"Bearer {token}"}

        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            raise Exception(f"Failed to fetch recently played songs: {response.json()}")

        data = response.json()
        result = []  # To store the fetched data for returning

        for item in data.get("items", []):
            track = item.get("track", {})
            played_at = datetime.strptime(
                item.get("played_at"), "%Y-%m-%dT%H:%M:%S.%fZ"
            )
            title = track.get("name")
            artist = ", ".join(
                [artist.get("name") for artist in track.get("artists", [])]
            )
            album = track.get("album", {}).get("name")

            # Save (or update) the song record in the database
            StreamedSong.objects.update_or_create(
                title=title,
                artist=artist,
                played_at=played_at,
                defaults={"album": album},
            )

            # Append the song data to the result list
            result.append(
                {
                    "title": title,
                    "artist": artist,
                    "album": album,
                    "played_at": played_at.isoformat(),
                }
            )

        return result
