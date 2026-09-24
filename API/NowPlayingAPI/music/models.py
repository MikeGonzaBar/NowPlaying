from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from typing import cast
import time
import logging
import re
import unicodedata
from utils import parse_datetime_aware
import http_client

# pyright: reportAttributeAccessIssue=false

logger = logging.getLogger(__name__)


def normalize_music_text(value) -> str:
    """Aggressively fold text for canonical music identity matching.

    Casefolds, applies Unicode NFKD folding, strips accents and
    non-alphanumeric characters so that "Judas (80s Ver.)" and
    "judas 80s ver" collapse to the same key while different
    recordings ("Judas" vs "Judas - Live") stay distinct.
    """
    if not value:
        return ""
    text = str(value).casefold()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()


def recording_identity_key(artist, title) -> str:
    """Canonical identity for a recording: artist + exact title."""
    return f"{normalize_music_text(artist)}::{normalize_music_text(title)}"


MUSIC_TAG_STOPWORDS = {
    "00s",
    "10s",
    "20s",
    "60s",
    "70s",
    "80s",
    "90s",
    "albums i own",
    "awesome",
    "best",
    "favorite",
    "favorites",
    "favourite",
    "favourites",
    "lastfm",
    "last fm",
    "male vocalists",
    "female vocalists",
    "seen live",
    "spotify",
    "under 2000 listeners",
    "usa",
}

MUSIC_TAG_LABELS = {
    "alt rock": "Alt Rock",
    "alternative rock": "Alternative Rock",
    "blues rock": "Blues Rock",
    "classic rock": "Classic Rock",
    "dance pop": "Dance Pop",
    "electronic": "Electronic",
    "hard rock": "Hard Rock",
    "heavy metal": "Heavy Metal",
    "hip hop": "Hip Hop",
    "hip-hop": "Hip Hop",
    "indie pop": "Indie Pop",
    "indie rock": "Indie Rock",
    "new wave": "New Wave",
    "pop punk": "Pop Punk",
    "pop rock": "Pop Rock",
    "post hardcore": "Post Hardcore",
    "post-hardcore": "Post Hardcore",
    "punk rock": "Punk Rock",
    "r&b": "R&B",
    "rhythm and blues": "R&B",
    "rock and roll": "Rock and Roll",
    "singer songwriter": "Singer Songwriter",
    "singer-songwriter": "Singer Songwriter",
    "soul": "Soul",
    "soundtrack": "Soundtrack",
}


class Song(models.Model):
    """Stored music play from Spotify or Last.fm."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='music_songs')
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255, blank=True, null=True)
    played_at = models.DateTimeField()
    album_thumbnail = models.URLField(max_length=2048, blank=True, null=True)
    track_url = models.URLField(max_length=2048, blank=True, null=True)
    artists_url = models.URLField(max_length=2048, blank=True, null=True)
    duration_ms = models.PositiveIntegerField(default=0)
    source = models.CharField(max_length=20, default='spotify', choices=[('spotify', 'Spotify'), ('lastfm', 'Last.fm')])
    
    artist_lastfm_url = models.URLField(max_length=2048, blank=True, null=True, help_text="Artist's Last.fm page URL")
    track_mbid = models.CharField(max_length=36, blank=True, null=True, help_text="MusicBrainz track ID")
    artist_mbid = models.CharField(max_length=36, blank=True, null=True, help_text="MusicBrainz artist ID")
    album_mbid = models.CharField(max_length=36, blank=True, null=True, help_text="MusicBrainz album ID")
    loved = models.BooleanField(default=False, help_text="Whether user has loved this track on Last.fm")
    streamable = models.BooleanField(default=False, help_text="Whether track is streamable on Last.fm")
    
    album_thumbnail_small = models.URLField(max_length=2048, blank=True, null=True, help_text="Album art 34x34px")
    album_thumbnail_medium = models.URLField(max_length=2048, blank=True, null=True, help_text="Album art 64x64px")
    album_thumbnail_large = models.URLField(max_length=2048, blank=True, null=True, help_text="Album art 174x174px")
    album_thumbnail_extralarge = models.URLField(max_length=2048, blank=True, null=True, help_text="Album art 300x300px")
    genre_tags = models.JSONField(default=list, blank=True, help_text="Normalized Last.fm genre tags for analytics")

    class Meta:
        ordering = ["-played_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "title", "artist", "played_at"], name="unique_song_per_user"
            )
        ]
        unique_together = ('user', 'title', 'artist', 'played_at')

    def __str__(self) -> str:
        """Return the song label with artist and owner."""
        return f"{self.title} by {self.artist} ({self.user.username})"

    @staticmethod
    def normalize_match_key(value: object) -> str:
        """Return a stable key for matching title/artist variants such as editions and extras."""
        if value is None:
            return ""

        text = str(value).strip()
        if not text:
            return ""

        text = re.sub(r"\s*\([^)]*\)", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*\[[^\]]*\]", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*[-–—:]\s*(?:feat|ft|featuring|with)\b.*$", "", text, flags=re.IGNORECASE)
        text = re.sub(
            r"\s*[-–—:]\s*(?:deluxe|special|collector|anniversary|ultimate|complete|expanded|international|bonus|radio|live|remaster(?:ed)?|edition|version|explicit|single|remix)\b.*$",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(
            r"\b(?:deluxe|special|collector|anniversary|ultimate|complete|expanded|international|bonus|radio|live|remaster(?:ed)?|edition|version|explicit|single|remix)\b",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(r"[\u2018\u2019\u201c\u201d]", "'", text)
        text = re.sub(r"[^\w\s&]", " ", text, flags=re.UNICODE)
        text = re.sub(r"\s+", " ", text).strip().lower()
        return text

    @staticmethod
    def _format_music_tag_name(raw_name: object) -> str | None:
        """Normalize one raw Last.fm tag into a display label."""
        if not raw_name:
            return None

        key = re.sub(r"\s+", " ", str(raw_name).replace("_", " ").strip().lower())
        if (
            not key
            or key in MUSIC_TAG_STOPWORDS
            or re.fullmatch(r"\d{2,4}s?", key)
            or "seen live" in key
        ):
            return None

        if key in MUSIC_TAG_LABELS:
            return MUSIC_TAG_LABELS[key]

        return " ".join(
            word.upper() if word in {"edm", "emo", "idm", "ost", "rnb"} else word.capitalize()
            for word in key.replace("-", " ").split()
        )

    @staticmethod
    def normalize_lastfm_tags(tags: object, limit: int = 5) -> list[str]:
        """Convert Last.fm tag payloads into a small, display-ready genre list."""
        normalized = []
        seen = set()

        if isinstance(tags, dict):
            tags = [tags]

        for tag in cast(list, tags or []):
            if isinstance(tag, dict):
                raw_name = tag.get("name")
                raw_count = tag.get("count", 0)
            else:
                raw_name = str(tag)
                raw_count = 0

            name = Song._format_music_tag_name(raw_name)
            if not name or name.lower() in seen:
                continue

            try:
                count = int(raw_count)
            except (TypeError, ValueError):
                count = 0

            normalized.append((name, count))
            seen.add(name.lower())

        normalized.sort(key=lambda item: item[1], reverse=True)
        return [name for name, _ in normalized[:limit]]

    @staticmethod
    def fetch_lastfm_artist_tags(
        lastfm_api_key: str,
        artist: str,
        artist_mbid: str = "",
        limit: int = 5,
    ) -> list[str]:
        """Fetch normalized top tags for a Last.fm artist."""
        if not lastfm_api_key or not (artist or artist_mbid):
            return []

        params = {
            "method": "artist.getTopTags",
            "api_key": lastfm_api_key,
            "format": "json",
            "autocorrect": 1,
        }
        if artist_mbid:
            params["mbid"] = artist_mbid
        else:
            params["artist"] = artist

        try:
            response = http_client.get(
                "http://ws.audioscrobbler.com/2.0/",
                params=params,
                timeout=15,
                retries=1,
                logger_name="music",
            )
            if response.status_code != 200:
                logger.warning(
                    "Last.fm artist tag lookup failed for %s with status %s",
                    artist or artist_mbid,
                    response.status_code,
                )
                return []

            data = response.json()
            if "error" in data:
                logger.warning(
                    "Last.fm artist tag lookup failed for %s: %s",
                    artist or artist_mbid,
                    data.get("message", "Unknown error"),
                )
                return []

            tags = data.get("toptags", {}).get("tag", [])
            return Song.normalize_lastfm_tags(tags, limit=limit)
        except Exception as exc:
            logger.warning("Error fetching Last.fm artist tags for %s: %s", artist or artist_mbid, exc)
            return []

    @staticmethod
    def fetch_recently_played_songs(user: User, spotify_token: str) -> list[dict[str, object]]:
        """
        Fetches the latest 50 recently played songs from Spotify using the API,
        stores them in the database for a specific user, and returns the data.
        """
        url = "https://api.spotify.com/v1/me/player/recently-played?limit=50"
        headers = {"Authorization": f"Bearer {spotify_token}"}

        response = http_client.get(url, headers=headers, logger_name="music")
        if response.status_code != 200:
            raise Exception(f"Failed to fetch recently played songs: {response.json()}")

        data = response.json()
        result = []
        song_objs: dict[tuple, Song] = {}

        for item in data.get("items", []):
            track = item.get("track", {})
            played_at = parse_datetime_aware(item.get("played_at"), "%Y-%m-%dT%H:%M:%S.%fZ")
            title = track.get("name")
            artist = ", ".join([artist.get("name") for artist in track.get("artists", [])])
            album_data = track.get("album", {})
            album_name = album_data.get("name")
            images = album_data.get("images", [])

            album_thumbnail = images[0].get("url") if images else None

            track_url = track.get("external_urls", {}).get("spotify")
            artists_url = ", ".join([artist.get("external_urls", {}).get("spotify") for artist in track.get("artists", [])])

            duration_ms = track.get("duration_ms")

            key = (user.id, title, artist, played_at)
            song_objs[key] = Song(
                user=user,
                title=title,
                artist=artist,
                played_at=played_at,
                album=album_name,
                album_thumbnail=album_thumbnail,
                track_url=track_url,
                artists_url=artists_url,
                duration_ms=duration_ms,
                source="spotify",
            )

            result.append(
                {
                    "title": title,
                    "artist": artist,
                    "album": album_name,
                    "album_thumbnail": album_thumbnail,
                    "track_url": track_url,
                    "artists_url": artists_url,
                    "duration_ms": duration_ms,
                    "played_at": played_at.isoformat() if played_at else None,
                    "source": "spotify",
                }
            )

        # Single bulk upsert instead of one update_or_create per scrobble
        # (unique constraint: user + title + artist + played_at).
        if song_objs:
            Song.objects.bulk_create(
                list(song_objs.values()),
                update_conflicts=True,
                unique_fields=["user", "title", "artist", "played_at"],
                update_fields=[
                    "album", "album_thumbnail", "track_url", "artists_url",
                    "duration_ms", "source",
                ],
                batch_size=500,
            )

        return result

    @staticmethod
    def fetch_lastfm_recent_tracks(
        user: User,
        lastfm_api_key: str,
        lastfm_username: str,
        limit: int | None = None,
        max_tag_lookups: int = 300,
    ) -> list[dict[str, object]]:
        """
        Fetches ALL recent tracks from Last.fm using the user.getRecentTracks API method,
        stores them in the database for a specific user, and returns the data.
        If limit is specified, only fetches that many tracks. If None, fetches ALL tracks.
        """
        url = "http://ws.audioscrobbler.com/2.0/"
        page = 1
        total_fetched = 0
        all_tracks = []
        
        if limit is None:
            tracks_per_page = 1000
        else:
            tracks_per_page = min(limit, 1000)
        
        max_retries = 3
        retry_delay = 2
        
        while True:
            params = {
                "method": "user.getRecentTracks",
                "user": lastfm_username,
                "api_key": lastfm_api_key,
                "format": "json",
                "limit": tracks_per_page,
                "page": page,
                "extended": 1
            }

            retry_count = 0
            data = None
            while retry_count < max_retries:
                try:
                    response = http_client.get(
                        url,
                        params=params,
                        timeout=30,
                        retries=0,
                        logger_name="music",
                    )
                    
                    if response.status_code != 200:
                        if response.status_code == 500 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count
                            logger.warning(f"Last.fm HTTP 500 error (retry {retry_count}/{max_retries}). Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        else:
                            error_text = response.text[:500] if response.text else "No response body"
                            raise Exception(f"HTTP {response.status_code}: {error_text}")
                    
                    try:
                        data = response.json()
                    except ValueError:
                        error_text = response.text[:500] if response.text else "No response body"
                        raise Exception(f"Invalid JSON response (status {response.status_code}): {error_text}")
                    
                    if "error" in data:
                        error_code = data.get("error", "Unknown")
                        error_message = data.get("message", "Unknown error")
                        
                        if error_code == 8 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count
                            logger.warning(f"Last.fm API error {error_code} (retry {retry_count}/{max_retries}): {error_message}. Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        elif error_code == 29 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count * 2
                            logger.warning(f"Last.fm API rate limit exceeded (retry {retry_count}/{max_retries}). Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        elif error_code == 11 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count
                            logger.warning(f"Last.fm API service offline (retry {retry_count}/{max_retries}). Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        elif error_code == 16 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count
                            logger.warning(f"Last.fm API temporarily unavailable (retry {retry_count}/{max_retries}). Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        else:
                            raise Exception(f"Last.fm API error ({error_code}): {error_message}")
                    
                    break
                    
                except http_client.ExternalRequestError as e:
                    retry_count += 1
                    if retry_count < max_retries:
                        wait_time = retry_delay * retry_count
                        logger.warning(f"Last.fm API request error (retry {retry_count}/{max_retries}): {str(e)}. Waiting {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise Exception(f"Last.fm API request failed after retries: {str(e)}")
            
            if data is None:
                raise Exception("Failed to fetch data from Last.fm API after retries")

            recenttracks = data.get("recenttracks", {})
            tracks = recenttracks.get("track", [])
            
            if not isinstance(tracks, list):
                tracks = [tracks]

            if not tracks:
                break

            all_tracks.extend(tracks)
            total_fetched += len(tracks)
            
            if limit and total_fetched >= limit:
                all_tracks = all_tracks[:limit]
                break
            
            if len(tracks) < tracks_per_page:
                break
                
            page += 1
            
            if page <= 100:
                time.sleep(0.3)
            
            if page > 100:
                break

        song_objs: dict[tuple, Song] = {}
        result = []
        artist_tag_cache = {}

        for track in all_tracks:
            if "@attr" in track and track["@attr"].get("nowplaying") == "true":
                continue

            title = track.get("name", "")
            artist_info = track.get("artist", {})
            if isinstance(artist_info, dict):
                artist = artist_info.get("#text", "") or artist_info.get("name", "")
                artist_mbid = artist_info.get("mbid", "")
                artist_lastfm_url = artist_info.get("url", "")
            else:
                artist = str(artist_info)
                artist_mbid = ""
                artist_lastfm_url = ""
            
            album_info = track.get("album", {})
            if isinstance(album_info, dict):
                album_name = album_info.get("#text", "")
                album_mbid = album_info.get("mbid", "")
            else:
                album_name = str(album_info) if album_info else ""
                album_mbid = ""

            date_info = track.get("date", {})
            if isinstance(date_info, dict):
                date_text = date_info.get("#text", "")
                played_at = parse_datetime_aware(date_text, "%d %b %Y, %H:%M")
                if played_at is None:
                    played_at = timezone.now()
            else:
                played_at = timezone.now()

            images = track.get("image", [])
            album_thumbnail_small = ""
            album_thumbnail_medium = ""
            album_thumbnail_large = ""
            album_thumbnail_extralarge = ""
            
            for img in images:
                if img.get("size") == "small":
                    album_thumbnail_small = img.get("#text", "")
                elif img.get("size") == "medium":
                    album_thumbnail_medium = img.get("#text", "")
                elif img.get("size") == "large":
                    album_thumbnail_large = img.get("#text", "")
                elif img.get("size") == "extralarge":
                    album_thumbnail_extralarge = img.get("#text", "")

            album_thumbnail = (album_thumbnail_extralarge or album_thumbnail_large or 
                             album_thumbnail_medium or album_thumbnail_small)

            track_url = track.get("url", "")
            track_mbid = track.get("mbid", "")
            loved = track.get("loved", "0") == "1"
            streamable = track.get("streamable", "0") == "1"
            artist_cache_key = (artist_mbid or artist or "").strip().lower()
            genre_tags = []
            if artist_cache_key:
                if artist_cache_key not in artist_tag_cache:
                    if len(artist_tag_cache) < max_tag_lookups:
                        artist_tag_cache[artist_cache_key] = Song.fetch_lastfm_artist_tags(
                            lastfm_api_key,
                            artist,
                            artist_mbid=artist_mbid,
                        )
                    else:
                        artist_tag_cache[artist_cache_key] = []
                genre_tags = artist_tag_cache[artist_cache_key]

            defaults = {
                "album": album_name,
                "album_thumbnail": album_thumbnail,
                "track_url": track_url,
                "artists_url": "",
                "duration_ms": 0,
                "source": "lastfm",
                "artist_lastfm_url": artist_lastfm_url,
                "track_mbid": track_mbid,
                "artist_mbid": artist_mbid,
                "album_mbid": album_mbid,
                "loved": loved,
                "streamable": streamable,
                "album_thumbnail_small": album_thumbnail_small,
                "album_thumbnail_medium": album_thumbnail_medium,
                "album_thumbnail_large": album_thumbnail_large,
                "album_thumbnail_extralarge": album_thumbnail_extralarge,
            }
            if genre_tags:
                defaults["genre_tags"] = genre_tags

            key = (user.id, title, artist, played_at)
            song_objs[key] = Song(
                user=user,
                title=title,
                artist=artist,
                played_at=played_at,
                **defaults,
            )

            result.append(
                {
                    "title": title,
                    "artist": artist,
                    "album": album_name,
                    "album_thumbnail": album_thumbnail,
                    "track_url": track_url,
                    "artists_url": "",
                    "duration_ms": 0,
                    "played_at": played_at.isoformat(),
                    "source": "lastfm",
                    "artist_lastfm_url": artist_lastfm_url,
                    "track_mbid": track_mbid,
                    "artist_mbid": artist_mbid,
                    "album_mbid": album_mbid,
                    "loved": loved,
                    "streamable": streamable,
                    "genre_tags": genre_tags,
                    "album_thumbnails": {
                        "small": album_thumbnail_small,
                        "medium": album_thumbnail_medium,
                        "large": album_thumbnail_large,
                        "extralarge": album_thumbnail_extralarge,
                    }
                }
            )

        # Single bulk upsert instead of one update_or_create per scrobble
        # (unique constraint: user + title + artist + played_at).
        if song_objs:
            Song.objects.bulk_create(
                list(song_objs.values()),
                update_conflicts=True,
                unique_fields=["user", "title", "artist", "played_at"],
                update_fields=[
                    "album", "album_thumbnail", "track_url", "artists_url",
                    "duration_ms", "source", "artist_lastfm_url", "track_mbid",
                    "artist_mbid", "album_mbid", "loved", "streamable",
                    "album_thumbnail_small", "album_thumbnail_medium",
                    "album_thumbnail_large", "album_thumbnail_extralarge",
                    # genre_tags intentionally excluded: the old update_or_create
                    # only set it when tags were resolved, and never wiped
                    # existing tags on resync when the tag cache missed.
                ],
                batch_size=500,
            )

        return result
