from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import hashlib
import time
import logging
import re
from utils import parse_datetime_aware
import http_client

logger = logging.getLogger(__name__)


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
    
    # New fields for enhanced Last.fm data
    artist_lastfm_url = models.URLField(max_length=2048, blank=True, null=True, help_text="Artist's Last.fm page URL")
    track_mbid = models.CharField(max_length=36, blank=True, null=True, help_text="MusicBrainz track ID")
    artist_mbid = models.CharField(max_length=36, blank=True, null=True, help_text="MusicBrainz artist ID")
    album_mbid = models.CharField(max_length=36, blank=True, null=True, help_text="MusicBrainz album ID")
    loved = models.BooleanField(default=False, help_text="Whether user has loved this track on Last.fm")
    streamable = models.BooleanField(default=False, help_text="Whether track is streamable on Last.fm")
    
    # Album artwork in multiple sizes
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

    def __str__(self):
        return f"{self.title} by {self.artist} ({self.user.username})"

    @staticmethod
    def _format_music_tag_name(raw_name):
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
    def normalize_lastfm_tags(tags, limit=5):
        """Convert Last.fm tag payloads into a small, display-ready genre list."""
        normalized = []
        seen = set()

        if isinstance(tags, dict):
            tags = [tags]

        for tag in tags or []:
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
    def fetch_lastfm_artist_tags(lastfm_api_key, artist, artist_mbid="", limit=5):
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
    def fetch_recently_played_songs(user, spotify_token):
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
        result = []  # To store the fetched data for returning

        for item in data.get("items", []):
            track = item.get("track", {})
            # Parse Spotify datetime and make it timezone-aware
            played_at = parse_datetime_aware(item.get("played_at"), "%Y-%m-%dT%H:%M:%S.%fZ")
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

            # Save (or update) the song record in the database for the specific user
            Song.objects.update_or_create(
                user=user,
                title=title,
                artist=artist,
                played_at=played_at,
                defaults={
                    "album": album_name,
                    "album_thumbnail": album_thumbnail,
                    "track_url": track_url,
                    "artists_url": artists_url,
                    "duration_ms": duration_ms,
                    "source": "spotify",
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
                    "source": "spotify",
                }
            )

        return result

    @staticmethod
    def fetch_lastfm_recent_tracks(user, lastfm_api_key, lastfm_username, limit=None, max_tag_lookups=300):
        """
        Fetches ALL recent tracks from Last.fm using the user.getRecentTracks API method,
        stores them in the database for a specific user, and returns the data.
        If limit is specified, only fetches that many tracks. If None, fetches ALL tracks.
        """
        url = "http://ws.audioscrobbler.com/2.0/"
        page = 1
        total_fetched = 0
        all_tracks = []
        
        # If no limit specified, we'll fetch all tracks (Last.fm max is 1000 per page)
        if limit is None:
            tracks_per_page = 1000  # Maximum allowed by Last.fm API
        else:
            tracks_per_page = min(limit, 1000)  # Don't exceed Last.fm's limit
        
        max_retries = 3
        retry_delay = 2  # seconds
        
        while True:
            params = {
                "method": "user.getRecentTracks",
                "user": lastfm_username,
                "api_key": lastfm_api_key,
                "format": "json",
                "limit": tracks_per_page,
                "page": page,
                "extended": 1  # Get additional info like album art and loved status
            }

            # Retry logic for transient errors
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
                    
                    # Check HTTP status code first
                    if response.status_code != 200:
                        # HTTP 500 is often transient - retry
                        if response.status_code == 500 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count
                            logger.warning(f"Last.fm HTTP 500 error (retry {retry_count}/{max_retries}). Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        # Other non-200 status codes
                        else:
                            error_text = response.text[:500] if response.text else "No response body"
                            raise Exception(f"HTTP {response.status_code}: {error_text}")
                    
                    # Try to parse JSON
                    try:
                        data = response.json()
                    except ValueError:
                        # If JSON parsing fails, it might be HTML or other format
                        error_text = response.text[:500] if response.text else "No response body"
                        raise Exception(f"Invalid JSON response (status {response.status_code}): {error_text}")
                    
                    # Check for Last.fm API errors in response
                    if "error" in data:
                        error_code = data.get("error", "Unknown")
                        error_message = data.get("message", "Unknown error")
                        
                        # Error 8 is often transient - retry with exponential backoff
                        if error_code == 8 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count
                            logger.warning(f"Last.fm API error {error_code} (retry {retry_count}/{max_retries}): {error_message}. Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        # Error 29 is rate limit exceeded - retry with longer backoff
                        elif error_code == 29 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count * 2  # Longer wait for rate limits
                            logger.warning(f"Last.fm API rate limit exceeded (retry {retry_count}/{max_retries}). Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        # Error 11 is service offline - retry
                        elif error_code == 11 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count
                            logger.warning(f"Last.fm API service offline (retry {retry_count}/{max_retries}). Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        # Error 16 is temporarily unavailable - retry
                        elif error_code == 16 and retry_count < max_retries - 1:
                            retry_count += 1
                            wait_time = retry_delay * retry_count
                            logger.warning(f"Last.fm API temporarily unavailable (retry {retry_count}/{max_retries}). Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        else:
                            raise Exception(f"Last.fm API error ({error_code}): {error_message}")
                    
                    # Success - break out of retry loop
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
                tracks = [tracks]  # Handle single track response

            # If no tracks returned, we've reached the end
            if not tracks:
                break

            all_tracks.extend(tracks)
            total_fetched += len(tracks)
            
            # Check if we've reached the limit
            if limit and total_fetched >= limit:
                all_tracks = all_tracks[:limit]  # Trim to exact limit
                break
            
            # Check if we've reached the end (Last.fm returns empty page when done)
            if len(tracks) < tracks_per_page:
                break
                
            page += 1
            
            # Small delay between pages to avoid rate limiting
            # Last.fm recommends not exceeding 5 requests per second
            if page <= 100:  # Only delay if we're continuing
                time.sleep(0.3)  # 300ms delay between requests (allows ~3 requests/sec, well under limit)
            
            # Safety check to prevent infinite loops
            if page > 100:  # Maximum 100 pages (100,000 tracks)
                break

        result = []
        artist_tag_cache = {}

        for track in all_tracks:
            # Skip currently playing tracks (they don't have a date)
            if "@attr" in track and track["@attr"].get("nowplaying") == "true":
                continue

            # Extract track information
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

            # Parse the played date
            date_info = track.get("date", {})
            if isinstance(date_info, dict):
                date_text = date_info.get("#text", "")
                # Last.fm date format: "01 Jan 2024, 12:00"
                played_at = parse_datetime_aware(date_text, "%d %b %Y, %H:%M")
                if played_at is None:
                    # Fallback to current time if parsing fails
                    played_at = timezone.now()
            else:
                played_at = timezone.now()

            # Get album artwork in all sizes
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

            # Use the largest available image as the main thumbnail
            album_thumbnail = (album_thumbnail_extralarge or album_thumbnail_large or 
                             album_thumbnail_medium or album_thumbnail_small)

            # Get track URL and other metadata
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

            # Save (or update) the song record in the database for the specific user
            defaults = {
                "album": album_name,
                "album_thumbnail": album_thumbnail,
                "track_url": track_url,
                "artists_url": "",  # Last.fm doesn't provide artist URLs in this endpoint
                "duration_ms": 0,  # Last.fm doesn't provide duration in recent tracks
                "source": "lastfm",
                # New enhanced fields
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

            Song.objects.update_or_create(
                user=user,
                title=title,
                artist=artist,
                played_at=played_at,
                defaults=defaults,
            )

            # Append the song data to the result list
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

        return result
