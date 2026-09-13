from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .models import Song, recording_identity_key
from .serializers import StreamedSongSerializer  # Import the serializer
from users.models import UserApiKey  # Import UserApiKey from the correct location
from users.credentials import get_service_credentials
from query_params import bounded_int, pagination_params
from django.core.cache import cache
from django.conf import settings
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta, datetime
from utils import versioned_cache_key, versioned_cache_invalidate
import logging
import threading


# Django model attribute access (ForeignKey reverse relations, dynamic attributes)
# is not fully modeled in typeshed stubs.
# pyright: reportAttributeAccessIssue=false


logger = logging.getLogger(__name__)


def invalidate_music_caches(user_id):
    """Invalidate cached music and analytics snapshots after music data changes."""
    from analytics.services import AnalyticsService

    analytics_version = AnalyticsService.invalidate_user_cache(user_id)
    music_version = versioned_cache_invalidate("music", user_id)

    logger.info(
        "Invalidated music-dependent caches for user %s (analytics v%s, music v%s)",
        user_id,
        analytics_version,
        music_version,
    )


class StreamedSongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.all()
    serializer_class = StreamedSongSerializer

    def _grouped_track_counts(self, songs):
        grouped = {}
        for song in songs.order_by('-played_at'):
            key = (Song.normalize_match_key(song.artist), Song.normalize_match_key(song.title))
            entry = grouped.setdefault(key, {
                'title': song.title,
                'artist': song.artist,
                'count': 0,
                'latest_song': song,
            })
            entry['count'] += 1
            if entry['latest_song'].played_at < song.played_at:
                entry['latest_song'] = song
        return grouped

    def _filtered_top_songs(self, request):
        songs = Song.objects.filter(user=request.user)

        days_param = request.query_params.get("days")
        if days_param not in (None, "", "all"):
            try:
                days = int(days_param)
            except (TypeError, ValueError):
                raise ValidationError({"days": "Must be an integer from 1 to 365 or 'all'."})

            if days < 1 or days > 365:
                raise ValidationError({"days": "Must be between 1 and 365."})

            songs = songs.filter(played_at__gte=timezone.now() - timedelta(days=days))

        source = request.query_params.get("source")
        if source:
            source = source.strip().lower()
            if source not in ["spotify", "lastfm"]:
                raise ValidationError({"source": "Must be one of: spotify, lastfm."})
            songs = songs.filter(source=source)

        return songs

    def _recording_songs(self, request, recording_id: str):
        """Return songs belonging to one canonical recording (artist + exact title key)."""
        try:
            artist_key, title_key = recording_id.split("::", 1)
        except ValueError:
            raise ValidationError({"recording_id": "Malformed recording identifier."})

        all_songs = self._filtered_top_songs(request)
        matching_ids = [
            song.id  # pyright: ignore[reportAttributeAccessIssue]
            for song in all_songs.only("id", "title", "artist")
            if Song.normalize_match_key(song.title) == title_key
            and Song.normalize_match_key(song.artist) == artist_key
        ]
        if not matching_ids:
            return all_songs.none()
        return all_songs.filter(id__in=matching_ids)

    def _resolve_track_songs(self, request, name: str, artist: str, recording_id: str):
        """Resolve track songs by canonical recording_id, falling back to
        artist + exact title. Title-only matching is allowed only when the
        title maps to exactly one artist; ambiguous titles are rejected rather
        than merged (remixes, covers, other artists)."""
        if recording_id:
            return self._recording_songs(request, recording_id)
        if artist:
            return self._entity_songs(request, 'track', name, artist)
        songs = self._entity_songs(request, 'track', name)
        distinct_artists = set(
            songs.values_list('artist', flat=True)[:500]
        )
        if len(distinct_artists) == 1:
            return songs
        raise ValidationError(
            {"identity": "recording_id or artist is required to identify a track."}
        )

    def _scope_payload(self, request):
        days_param = request.query_params.get("days")
        source = request.query_params.get("source")
        if days_param in (None, "", "all"):
            days = None
        else:
            days = bounded_int(request.query_params, 'days', default=30, minimum=1, maximum=365)
        return {
            "days": days,
            "source": source.strip().lower() if source else None,
            "label": "All time" if days is None else f"Last {days} days",
        }

    def _entity_songs(self, request, entity, name, artist=None):
        songs = self._filtered_top_songs(request)
        field = {"artist": "artist", "album": "album", "track": "title"}[entity]
        if entity == "track":
            normalized_name = Song.normalize_match_key(name)
            title_matches = [
                song.title for song in songs.only("title") if Song.normalize_match_key(song.title) == normalized_name
            ]
            songs = songs.filter(title__in=title_matches) if title_matches else songs.none()
        else:
            songs = songs.filter(**{f"{field}__iexact": name})
        if entity in {"album", "track"} and artist:
            songs = songs.filter(artist__iexact=artist)
        return songs

    def get_queryset(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        """
        Filter queryset to return only songs for the authenticated user.
        """
        if self.request.user.is_authenticated:
            return Song.objects.filter(user=self.request.user)
        return Song.objects.none()

    def _paginated_plays(self, request, songs, label: str) -> Response:
        """Paginate and serialize a play-history queryset into the shared payload.

        Used by the artist/album/track play-history endpoints, which otherwise
        duplicated the same ~40-line pagination + serialization block.
        """
        try:
            page = bounded_int(request.query_params, "page", default=1, minimum=1, maximum=1000)
            page_size = bounded_int(request.query_params, "page_size", default=50, minimum=1, maximum=100)

            songs = songs.order_by("-played_at")
            total_items = songs.count()
            start = (page - 1) * page_size
            end = start + page_size

            results = [
                {
                    "id": song.id,
                    "title": song.title,
                    "artist": song.artist,
                    "album": song.album,
                    "played_at": song.played_at.isoformat(),
                    "source": song.source,
                    "thumbnail": song.album_thumbnail,
                    "track_url": song.track_url,
                    "artist_lastfm_url": song.artist_lastfm_url,
                }
                for song in songs[start:end]
            ]

            return Response({
                "results": results,
                "has_next": end < total_items,
                "total_items": total_items,
                "page": page,
                "page_size": page_size,
            })
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error fetching {label} plays: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="fetch-recently-played")
    def fetchRecentlyPlayed(self, request):
        """
        Fetches the latest 50 recently played songs from Spotify for the authenticated user,
        stores them in the database, and returns the fetched data.
        """
        api_key = get_service_credentials(request.user, "spotify")

        try:
            result = Song.fetch_recently_played_songs(request.user, api_key.api_key)
            invalidate_music_caches(request.user.id)
            return Response(
                {
                    "message": "Recently played songs fetched and stored successfully.",
                    "data": result,
                }
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"], url_path="fetch-lastfm-recent")
    def fetchLastfmRecent(self, request):
        """
        Fetches ALL recent tracks from Last.fm for the authenticated user,
        stores them in the database, and returns the fetched data.
        If async=True query param is provided, runs in background thread.
        """
        api_key_obj = get_service_credentials(request.user, "lastfm", require_user_id=True)
        lastfm_api_key = api_key_obj.api_key
        lastfm_username = api_key_obj.service_user_id

        if not lastfm_username:
            return Response(
                {"error": "Last.fm username is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Check if async mode is requested
            async_mode = request.query_params.get('async', 'false').lower() == 'true'
            
            if async_mode:
                # Run in background thread to avoid timeout
                user = request.user
                user_id = request.user.id

                def sync_tracks():
                    try:
                        Song.fetch_lastfm_recent_tracks(user, lastfm_api_key, lastfm_username, limit=None)
                        invalidate_music_caches(user_id)
                        logger.info(f"Background Last.fm sync completed for user {user_id}")
                    except Exception as e:
                        logger.error(f"Error in background Last.fm sync for user {user_id}: {e}", exc_info=True)
                
                thread = threading.Thread(target=sync_tracks, daemon=True)
                thread.start()
                
                return Response({
                    "message": "Last.fm sync started in background. This may take several minutes.",
                    "status": "processing"
                })
            else:
                # Fetch ALL tracks (no limit) - synchronous mode
                result = Song.fetch_lastfm_recent_tracks(request.user, lastfm_api_key, lastfm_username, limit=None)
                invalidate_music_caches(request.user.id)
                return Response(
                    {
                        "message": f"Last.fm ALL recent tracks fetched and stored successfully for user '{lastfm_username}'.",
                        "data": result,
                        "count": len(result)
                    }
                )
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Bad Request: /music/fetch-lastfm-recent/ - {error_msg} for user {request.user.id}")
            return Response(
                {"error": error_msg}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"], url_path="get-stored-songs")
    def getStoredSongs(self, request):
        """
        Retrieves stored songs from the database for the authenticated user,
        sorted by played_at in descending order with pagination support.
        """
        # Optional filter by source (spotify, lastfm, or all)
        source = request.query_params.get('source')
        page, page_size = pagination_params(request.query_params, default_page_size=50, max_page_size=100)
        if source and source not in ['spotify', 'lastfm']:
            raise ValidationError({'source': "Must be 'spotify' or 'lastfm'."})
        
        # Check cache first - SAFE OPTIMIZATION
        cache_key = f"stored_songs_{request.user.id}_{source}_{page}_{page_size}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response(cached_result)
        
        songs = Song.objects.filter(user=request.user)
        
        if source and source in ['spotify', 'lastfm']:
            songs = songs.filter(source=source)
            
        songs = songs.order_by("-played_at")
        
        # Calculate offset and limit
        offset = (page - 1) * page_size
        limit = offset + page_size
        
        # Get total count for pagination info
        total_count = songs.count()
        
        # Apply pagination
        paginated_songs = songs[offset:limit]
        
        serializer = StreamedSongSerializer(paginated_songs, many=True)
        
        result = {
            "results": serializer.data,
            "page": page,
            "page_size": page_size,
            "total_items": total_count,
            "total_pages": (total_count + page_size - 1) // page_size,
            "has_next": page * page_size < total_count,
            "has_previous": page > 1
        }
        
        # Cache for 15 minutes - SAFE OPTIMIZATION
        cache.set(cache_key, result, getattr(settings, 'CACHE_TIMEOUTS', {}).get('MUSIC_TRACKS', 900))
        
        return Response(result)

    @action(detail=False, methods=["get"], url_path="dashboard-stats")
    def dashboardStats(self, request):
        """
        Returns comprehensive statistics for the music dashboard including:
        - Total scrobbles, artist count
        - Top artists, albums, tracks
        - Listening trends
        - Recent activity
        - Milestones
        - Loved highlights
        """
        days_param = request.query_params.get('days')
        days = 9999 if days_param == 'all' else bounded_int(request.query_params, 'days', default=30, minimum=1, maximum=365)

        try:
            user = request.user
            
            # Check cache
            cache_key = versioned_cache_key("music", user.id, str(days))
            cached_result = cache.get(cache_key)
            if cached_result:
                return Response(cached_result)
            
            # Date range
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            # Base queryset
            songs = Song.objects.filter(user=user)
            songs_in_range = songs.filter(played_at__gte=start_date, played_at__lte=end_date)
            
            # Use the selected dashboard period consistently for rankings and totals.
            scoped_songs = songs_in_range if days != 9999 else songs

            total_scrobbles = scoped_songs.count()
            
            # Artist count (all time, unique)
            artist_count = scoped_songs.values('artist').distinct().count()
            
            # Top Artists (all time, limit 10)
            top_artists = scoped_songs.values('artist').annotate(
                count=Count('id')
            ).order_by('-count')[:10]
            top_artists_list = []
            max_count = top_artists[0]['count'] if top_artists else 1
            for artist_data in top_artists:
                artist_songs = scoped_songs.filter(artist=artist_data['artist'])
                # Get most recent album thumbnail for this artist
                latest_song = artist_songs.order_by('-played_at').first()
                top_artists_list.append({
                    'name': artist_data['artist'],
                    'count': artist_data['count'],
                    'percentage': int((artist_data['count'] / max_count) * 100),
                    'thumbnail': latest_song.album_thumbnail if latest_song else None,
                    'artist_lastfm_url': latest_song.artist_lastfm_url if latest_song else None
                })
            
            # Top Albums (all time, limit 10)
            top_albums = scoped_songs.exclude(album__isnull=True).exclude(album='').values(
                'album', 'artist'
            ).annotate(
                count=Count('id')
            ).order_by('-count')[:10]
            top_albums_list = []
            for album_data in top_albums:
                album_songs = scoped_songs.filter(album=album_data['album'], artist=album_data['artist'])
                latest_song = album_songs.order_by('-played_at').first()
                top_albums_list.append({
                    'name': album_data['album'],
                    'artist': album_data['artist'],
                    'count': album_data['count'],
                    'thumbnail': latest_song.album_thumbnail if latest_song else None,
                    'track_url': latest_song.track_url if latest_song else None,
                    'artist_lastfm_url': latest_song.artist_lastfm_url if latest_song else None
                })
            
            # Top Tracks (all time, limit 10)
            grouped_tracks = self._grouped_track_counts(scoped_songs)
            top_tracks = sorted(
                grouped_tracks.values(),
                key=lambda item: (-item['count'], -(item['latest_song'].played_at.timestamp() if item['latest_song'].played_at else 0)),
            )[:10]
            top_tracks_list = []
            for track_data in top_tracks:
                latest_song = track_data['latest_song']
                top_tracks_list.append({
                    'title': latest_song.title,
                    'artist': latest_song.artist,
                    'recording_id': recording_identity_key(latest_song.artist, latest_song.title),
                    'count': track_data['count'],
                    'thumbnail': latest_song.album_thumbnail if latest_song else None,
                    'track_url': latest_song.track_url if latest_song else None,
                    'artist_lastfm_url': latest_song.artist_lastfm_url if latest_song else None
                })
            
            # Listening trends (daily scrobbles for the period)
            # Group by date
            from django.db.models.functions import TruncDate
            daily_trends = songs_in_range.annotate(
                date=TruncDate('played_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')
            
            # Calculate average per day
            avg_per_day = songs_in_range.count() / days if days > 0 else 0
            
            # Recent activity (last 10 tracks)
            recent_songs = list(songs.order_by('-played_at')[:10])
            recent_activity_list = []
            for song in recent_songs:
                played_at = song.played_at
                if isinstance(played_at, str):
                    played_at = datetime.fromisoformat(str(played_at).replace('Z', '+00:00'))
                elif played_at.tzinfo is None:
                    played_at = timezone.make_aware(played_at)
                time_diff = timezone.now() - played_at
                minutes_ago = int(time_diff.total_seconds() / 60)
                recent_activity_list.append({
                    'title': song.title,
                    'artist': song.artist,
                    'minutes_ago': minutes_ago
                })
            
            # Milestones
            milestones = []
            # Check for scrobble milestones
            milestone_thresholds = [100000, 150000, 200000]
            for threshold in milestone_thresholds:
                if total_scrobbles >= threshold:
                    # Find when milestone was reached (approximate)
                    try:
                        milestone_index = min(threshold - 1, total_scrobbles - 1)
                        milestone_song = songs.order_by('-played_at')[milestone_index]
                        days_ago = (timezone.now() - milestone_song.played_at).days
                        milestones.append({
                            'title': f"{threshold//1000}k Scrobbles",
                            'description': f"Reached {days_ago} days ago",
                            'completed': True
                        })
                    except (IndexError, AttributeError, TypeError):
                        milestones.append({
                            'title': f"{threshold//1000}k Scrobbles",
                            'description': "Milestone reached",
                            'completed': True
                        })
            
            # Artist century milestone (100 plays for 50 artists)
            artists_with_100_plus = songs.values('artist').annotate(
                count=Count('id')
            ).filter(count__gte=100).count()
            artist_century_progress = min(100, int((artists_with_100_plus / 50) * 100))
            milestones.append({
                'title': 'Artist Century',
                'description': '100 plays for 50 artists',
                'progress': artist_century_progress,
                'completed': artists_with_100_plus >= 50
            })
            
            # Loved highlights (loved tracks)
            loved_tracks = scoped_songs.filter(loved=True).order_by('-played_at')[:1]
            loved_highlight = None
            if loved_tracks.exists():
                track = loved_tracks.first()
                if track is not None:
                    loved_highlight = {
                        'title': track.title,
                        'artist': track.artist,
                        'thumbnail': track.album_thumbnail
                    }
            
            # User info (from Last.fm if available)
            user_info = {
                'username': user.username,
                'avatar': None,  # Could be enhanced with user profile
                'location': None,  # Could be enhanced with user profile
                'member_since': None  # Could be enhanced with user profile
            }
            
            # Try to get Last.fm username for display
            try:
                api_key_obj = UserApiKey.objects.get(user=user, service_name='lastfm')
                if api_key_obj.service_user_id:
                    user_info['username'] = api_key_obj.service_user_id
            except UserApiKey.DoesNotExist:
                pass
            
            result = {
                'user_info': user_info,
                'total_scrobbles': total_scrobbles,
                'scope': {
                    'days': None if days == 9999 else days,
                    'label': 'All time' if days == 9999 else f'Last {days} days',
                },
                'artist_count': artist_count,
                'top_artists': top_artists_list,
                'top_albums': top_albums_list,
                'top_tracks': top_tracks_list,
                'listening_trends': {
                    'daily_data': list(daily_trends),
                    'average_per_day': round(avg_per_day, 1)
                },
                'recent_activity': recent_activity_list,
                'milestones': milestones,
                'loved_highlight': loved_highlight
            }
            
            # Cache for 5 minutes
            cache.set(cache_key, result, 300)
            
            return Response(result)
        except Exception as e:
            logger.error(f"Error fetching music dashboard stats: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="top-tracks")
    def topTracks(self, request):
        """Returns all top tracks with full details for the View All page"""
        limit = bounded_int(request.query_params, 'limit', default=100, minimum=1, maximum=500)

        try:
            songs = self._filtered_top_songs(request)
            grouped = self._grouped_track_counts(songs)
            ordered = sorted(
                grouped.values(),
                key=lambda item: (-item['count'], -(item['latest_song'].played_at.timestamp() if item['latest_song'].played_at else 0)),
            )[:limit]

            tracks_list = []
            for item in ordered:
                latest_song = item['latest_song']
                tracks_list.append({
                    'title': latest_song.title,
                    'artist': latest_song.artist,
                    'album': latest_song.album or '',
                    'recording_id': recording_identity_key(latest_song.artist, latest_song.title),
                    'count': item['count'],
                    'thumbnail': latest_song.album_thumbnail,
                    'track_url': latest_song.track_url,
                    'artist_lastfm_url': latest_song.artist_lastfm_url,
                    'loved': latest_song.loved,
                    'streamable': latest_song.streamable,
                    'played_at': latest_song.played_at.isoformat() if latest_song.played_at else None,
                    'source': latest_song.source,
                })
            
            return Response({'tracks': tracks_list})
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error fetching top tracks: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="top-artists")
    def topArtists(self, request):
        """Returns all top artists with their top 3 tracks for the View All page"""
        limit = bounded_int(request.query_params, 'limit', default=100, minimum=1, maximum=500)

        try:
            songs = self._filtered_top_songs(request).order_by("-played_at")
            songs = songs.only("artist", "title", "album_thumbnail", "artist_lastfm_url")
            
            by_artist = {}
            for song in songs:
                entry = by_artist.setdefault(song.artist, {
                    "name": song.artist,
                    "count": 0,
                    "latest": song,
                    "tracks": {},
                })
                entry["count"] += 1
                entry["tracks"][song.title] = entry["tracks"].get(song.title, 0) + 1
            
            ordered = sorted(by_artist.values(), key=lambda e: -e["count"])[:limit]
            artists_list = []
            for entry in ordered:
                top_tracks = [
                    {"title": title, "recording_id": recording_identity_key(entry["name"], title), "count": count}
                    for title, count in sorted(entry["tracks"].items(), key=lambda kv: -kv[1])[:3]
                ]
                artists_list.append({
                    "name": entry["name"],
                    "count": entry["count"],
                    "thumbnail": entry["latest"].album_thumbnail if entry["latest"] else None,
                    "artist_lastfm_url": entry["latest"].artist_lastfm_url if entry["latest"] else None,
                    "top_tracks": top_tracks,
                })
            
            return Response({'artists': artists_list})
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error fetching top artists: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="top-albums")
    def topAlbums(self, request):
        """Returns all top albums with their top 3 tracks for the View All page"""
        limit = bounded_int(request.query_params, 'limit', default=100, minimum=1, maximum=500)

        try:
            songs = self._filtered_top_songs(request).order_by("-played_at")
            songs = songs.exclude(album__isnull=True).exclude(album='').only(
                "artist", "title", "album", "album_thumbnail", "track_url"
            )
            
            by_album = {}
            for song in songs:
                key = (song.album, song.artist)
                entry = by_album.setdefault(key, {
                    "name": song.album,
                    "artist": song.artist,
                    "count": 0,
                    "latest": song,
                    "tracks": {},
                })
                entry["count"] += 1
                entry["tracks"][song.title] = entry["tracks"].get(song.title, 0) + 1
            
            ordered = sorted(by_album.values(), key=lambda e: -e["count"])[:limit]
            albums_list = []
            for entry in ordered:
                top_tracks = [
                    {"title": title, "recording_id": recording_identity_key(entry["artist"], title), "count": count}
                    for title, count in sorted(entry["tracks"].items(), key=lambda kv: -kv[1])[:3]
                ]
                albums_list.append({
                    "name": entry["name"],
                    "artist": entry["artist"],
                    "count": entry["count"],
                    "thumbnail": entry["latest"].album_thumbnail if entry["latest"] else None,
                    "track_url": entry["latest"].track_url if entry["latest"] else None,
                    "top_tracks": top_tracks,
                })
            
            return Response({'albums': albums_list})
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error fetching top albums: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="artist-detail")
    def artistDetail(self, request: Request) -> Response:
        """Return artist detail with top tracks for the authenticated user."""
        name = request.query_params.get("name", "").strip()
        if not name:
            return Response({"error": "name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            songs = self._entity_songs(request, 'artist', name)
            if not songs.exists():
                return Response({"error": "Artist not found."}, status=status.HTTP_404_NOT_FOUND)

            total_plays = songs.count()
            latest_song = songs.order_by("-played_at").first()
            earliest_song = songs.order_by("played_at").first()

            # Get top tracks for this artist
            top_tracks_qs = (
                songs.values("title")
                .annotate(count=Count("id"))
                .order_by("-count")[:10]
            )
            top_tracks = [
                {"title": t["title"], "recording_id": recording_identity_key(name, t["title"]), "count": t["count"]}
                for t in top_tracks_qs
            ]

            # Get unique albums count
            albums_count = songs.exclude(album__isnull=True).exclude(album="").values("album").distinct().count()

            return Response({
                "name": name,
                "count": total_plays,
                "scope": self._scope_payload(request),
                "first_played": earliest_song.played_at.isoformat() if earliest_song else None,
                "last_played": latest_song.played_at.isoformat() if latest_song else None,
                "thumbnail": latest_song.album_thumbnail if latest_song else None,
                "artist_lastfm_url": latest_song.artist_lastfm_url if latest_song else None,
                "top_tracks": top_tracks,
                "albums_count": albums_count,
                "latest_played": latest_song.played_at.isoformat() if latest_song else None,
            })
        except Exception as e:
            logger.error(f"Error fetching artist detail: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="album-detail")
    def albumDetail(self, request: Request) -> Response:
        """Return album detail with top tracks for the authenticated user."""
        name = request.query_params.get("name", "").strip()
        artist = request.query_params.get("artist", "").strip()
        if not name:
            return Response({"error": "name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            songs = self._entity_songs(request, 'album', name, artist)
            if artist:
                songs = songs.filter(artist__iexact=artist)

            if not songs.exists():
                return Response({"error": "Album not found."}, status=status.HTTP_404_NOT_FOUND)

            total_plays = songs.count()
            latest_song = songs.order_by("-played_at").first()
            earliest_song = songs.order_by("played_at").first()
            actual_artist = latest_song.artist if latest_song else artist

            # Get top tracks for this album
            top_tracks_qs = (
                songs.values("title")
                .annotate(count=Count("id"))
                .order_by("-count")[:10]
            )
            top_tracks = [
                {"title": t["title"], "recording_id": recording_identity_key(actual_artist, t["title"]), "count": t["count"]}
                for t in top_tracks_qs
            ]

            return Response({
                "name": name,
                "artist": actual_artist,
                "count": total_plays,
                "scope": self._scope_payload(request),
                "first_played": earliest_song.played_at.isoformat() if earliest_song else None,
                "last_played": latest_song.played_at.isoformat() if latest_song else None,
                "thumbnail": latest_song.album_thumbnail if latest_song else None,
                "track_url": latest_song.track_url if latest_song else None,
                "top_tracks": top_tracks,
                "latest_played": latest_song.played_at.isoformat() if latest_song else None,
            })
        except Exception as e:
            logger.error(f"Error fetching album detail: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="track-detail")
    def trackDetail(self, request: Request) -> Response:
        """Return track detail for the authenticated user.

        Identity is resolved by ``recording_id`` (artist + exact title) when
        provided; the fallback requires ``artist`` so different recordings
        that share a title can never be merged.
        """
        name = request.query_params.get("name", "").strip()
        artist = request.query_params.get("artist", "").strip()
        recording_id = request.query_params.get("recording_id", "").strip()
        if not name:
            return Response({"error": "name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            songs = self._resolve_track_songs(request, name, artist, recording_id)

            if not songs.exists():
                return Response({"error": "Track not found."}, status=status.HTTP_404_NOT_FOUND)

            total_plays = songs.count()
            latest_song = songs.order_by("-played_at").first()
            earliest_song = songs.order_by("played_at").first()
            actual_artist = latest_song.artist if latest_song else artist
            actual_album = latest_song.album if latest_song else None
            recording_id = recording_identity_key(actual_artist, latest_song.title if latest_song else name)

            return Response({
                "title": latest_song.title if latest_song else name,
                "artist": actual_artist,
                "album": actual_album,
                "recording_id": recording_id,
                "count": total_plays,
                "scope": self._scope_payload(request),
                "first_played": earliest_song.played_at.isoformat() if earliest_song else None,
                "last_played": latest_song.played_at.isoformat() if latest_song else None,
                "thumbnail": latest_song.album_thumbnail if latest_song else None,
                "track_url": latest_song.track_url if latest_song else None,
                "artist_lastfm_url": latest_song.artist_lastfm_url if latest_song else None,
                "loved": latest_song.loved if latest_song else False,
                "streamable": latest_song.streamable if latest_song else False,
                "played_at": latest_song.played_at.isoformat() if latest_song else None,
                "source": latest_song.source if latest_song else None,
            })
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error fetching track detail: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="artist-plays")
    def artistPlays(self, request: Request) -> Response:
        """Return paginated play history for an artist."""
        name = request.query_params.get("name", "").strip()
        if not name:
            return Response({"error": "name is required."}, status=status.HTTP_400_BAD_REQUEST)
        return self._paginated_plays(request, self._entity_songs(request, 'artist', name), "artist")

    @action(detail=False, methods=["get"], url_path="album-plays")
    def albumPlays(self, request: Request) -> Response:
        """Return paginated play history for an album."""
        name = request.query_params.get("name", "").strip()
        artist = request.query_params.get("artist", "").strip()
        if not name:
            return Response({"error": "name is required."}, status=status.HTTP_400_BAD_REQUEST)
        return self._paginated_plays(request, self._entity_songs(request, 'album', name, artist), "album")

    @action(detail=False, methods=["get"], url_path="track-plays")
    def trackPlays(self, request: Request) -> Response:
        """Return paginated play history for a track."""
        name = request.query_params.get("name", "").strip()
        artist = request.query_params.get("artist", "").strip()
        recording_id = request.query_params.get("recording_id", "").strip()
        if not name:
            return Response({"error": "name is required."}, status=status.HTTP_400_BAD_REQUEST)
        return self._paginated_plays(
            request, self._resolve_track_songs(request, name, artist, recording_id), "track"
        )
