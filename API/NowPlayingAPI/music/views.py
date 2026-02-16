from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .models import Song
from .serializers import StreamedSongSerializer  # Import the serializer
from users.models import UserApiKey  # Import UserApiKey from the correct location
from django.core.cache import cache
from django.conf import settings
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta, datetime
import logging
import threading


logger = logging.getLogger(__name__)


class StreamedSongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.all()
    serializer_class = StreamedSongSerializer

    def get_queryset(self):
        """
        Filter queryset to return only songs for the authenticated user.
        """
        if self.request.user.is_authenticated:
            return Song.objects.filter(user=self.request.user)
        return Song.objects.none()

    @action(detail=False, methods=["get"], url_path="fetch-recently-played")
    def fetchRecentlyPlayed(self, request):
        """
        Fetches the latest 50 recently played songs from Spotify for the authenticated user,
        stores them in the database, and returns the fetched data.
        """
        try:
            # Get the user's Spotify access token from their stored API keys
            try:
                api_key = UserApiKey.objects.get(user=request.user, service_name='spotify')
                spotify_token = api_key.get_key()
                
                if not spotify_token:
                    return Response(
                        {"error": "No Spotify access token found. Please update your Spotify API key."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except UserApiKey.DoesNotExist:
                return Response(
                    {"error": "No Spotify API key found. Please add your Spotify API key in profile settings."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = Song.fetch_recently_played_songs(request.user, spotify_token)
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
        try:
            # Get the user's Last.fm API key and username from their stored API keys
            try:
                api_key_obj = UserApiKey.objects.get(user=request.user, service_name='lastfm')
                lastfm_api_key = api_key_obj.get_key()
                lastfm_username = api_key_obj.service_user_id
                
                if not lastfm_api_key:
                    return Response(
                        {"error": "No Last.fm API key found. Please update your Last.fm API key."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                if not lastfm_username:
                    return Response(
                        {"error": "No Last.fm username found. Please update your Last.fm API key with your username in the service_user_id field."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            except UserApiKey.DoesNotExist:
                return Response(
                    {"error": "No Last.fm API key found. Please add your Last.fm API key in profile settings."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if async mode is requested
            async_mode = request.query_params.get('async', 'false').lower() == 'true'
            
            if async_mode:
                # Run in background thread to avoid timeout
                def sync_tracks():
                    try:
                        Song.fetch_lastfm_recent_tracks(request.user, lastfm_api_key, lastfm_username, limit=None)
                        logger.info(f"Background Last.fm sync completed for user {request.user.id}")
                    except Exception as e:
                        logger.error(f"Error in background Last.fm sync for user {request.user.id}: {e}", exc_info=True)
                
                thread = threading.Thread(target=sync_tracks, daemon=True)
                thread.start()
                
                return Response({
                    "message": "Last.fm sync started in background. This may take several minutes.",
                    "status": "processing"
                })
            else:
                # Fetch ALL tracks (no limit) - synchronous mode
                result = Song.fetch_lastfm_recent_tracks(request.user, lastfm_api_key, lastfm_username, limit=None)
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
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        
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
        try:
            user = request.user
            days = int(request.query_params.get('days', 30))
            
            # Check cache
            cache_key = f"music_dashboard_stats_{user.id}_{days}"
            cached_result = cache.get(cache_key)
            if cached_result:
                return Response(cached_result)
            
            # Date range
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            # Base queryset
            songs = Song.objects.filter(user=user)
            songs_in_range = songs.filter(played_at__gte=start_date, played_at__lte=end_date)
            
            # Total scrobbles (all time)
            total_scrobbles = songs.count()
            
            # Artist count (all time, unique)
            artist_count = songs.values('artist').distinct().count()
            
            # Top Artists (all time, limit 10)
            top_artists = songs.values('artist').annotate(
                count=Count('id')
            ).order_by('-count')[:10]
            top_artists_list = []
            max_count = top_artists[0]['count'] if top_artists else 1
            for artist_data in top_artists:
                artist_songs = songs.filter(artist=artist_data['artist'])
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
            top_albums = songs.exclude(album__isnull=True).exclude(album='').values(
                'album', 'artist'
            ).annotate(
                count=Count('id')
            ).order_by('-count')[:10]
            top_albums_list = []
            for album_data in top_albums:
                album_songs = songs.filter(album=album_data['album'], artist=album_data['artist'])
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
            top_tracks = songs.values('title', 'artist').annotate(
                count=Count('id')
            ).order_by('-count')[:10]
            top_tracks_list = []
            for track_data in top_tracks:
                track_songs = songs.filter(title=track_data['title'], artist=track_data['artist'])
                latest_song = track_songs.order_by('-played_at').first()
                top_tracks_list.append({
                    'title': track_data['title'],
                    'artist': track_data['artist'],
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
                    played_at = datetime.fromisoformat(played_at.replace('Z', '+00:00'))
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
            loved_tracks = songs.filter(loved=True).order_by('-played_at')[:1]
            loved_highlight = None
            if loved_tracks.exists():
                track = loved_tracks.first()
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
        try:
            user = request.user
            limit = int(request.query_params.get('limit', 100))
            
            songs = Song.objects.filter(user=user)
            top_tracks = songs.values('title', 'artist').annotate(
                count=Count('id')
            ).order_by('-count')[:limit]
            
            tracks_list = []
            for track_data in top_tracks:
                track_songs = songs.filter(title=track_data['title'], artist=track_data['artist'])
                latest_song = track_songs.order_by('-played_at').first()
                if latest_song:
                    tracks_list.append({
                        'title': track_data['title'],
                        'artist': track_data['artist'],
                        'album': latest_song.album or '',
                        'count': track_data['count'],
                        'thumbnail': latest_song.album_thumbnail,
                        'track_url': latest_song.track_url,
                        'artist_lastfm_url': latest_song.artist_lastfm_url,
                        'loved': latest_song.loved,
                        'streamable': latest_song.streamable,
                        'played_at': latest_song.played_at.isoformat() if latest_song.played_at else None,
                        'source': latest_song.source,
                    })
            
            return Response({'tracks': tracks_list})
        except Exception as e:
            logger.error(f"Error fetching top tracks: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="top-artists")
    def topArtists(self, request):
        """Returns all top artists with their top 3 tracks for the View All page"""
        try:
            user = request.user
            limit = int(request.query_params.get('limit', 100))
            
            songs = Song.objects.filter(user=user)
            top_artists = songs.values('artist').annotate(
                count=Count('id')
            ).order_by('-count')[:limit]
            
            artists_list = []
            for artist_data in top_artists:
                artist_songs = songs.filter(artist=artist_data['artist'])
                latest_song = artist_songs.order_by('-played_at').first()
                
                # Get top 3 tracks for this artist
                top_tracks_for_artist = artist_songs.values('title').annotate(
                    count=Count('id')
                ).order_by('-count')[:3]
                
                top_tracks = []
                for track_data in top_tracks_for_artist:
                    track_songs = artist_songs.filter(title=track_data['title'])
                    top_tracks.append({
                        'title': track_data['title'],
                        'count': track_data['count']
                    })
                
                artists_list.append({
                    'name': artist_data['artist'],
                    'count': artist_data['count'],
                    'thumbnail': latest_song.album_thumbnail if latest_song else None,
                    'artist_lastfm_url': latest_song.artist_lastfm_url if latest_song else None,
                    'top_tracks': top_tracks
                })
            
            return Response({'artists': artists_list})
        except Exception as e:
            logger.error(f"Error fetching top artists: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="top-albums")
    def topAlbums(self, request):
        """Returns all top albums with their top 3 tracks for the View All page"""
        try:
            user = request.user
            limit = int(request.query_params.get('limit', 100))
            
            songs = Song.objects.filter(user=user)
            top_albums = songs.exclude(album__isnull=True).exclude(album='').values(
                'album', 'artist'
            ).annotate(
                count=Count('id')
            ).order_by('-count')[:limit]
            
            albums_list = []
            for album_data in top_albums:
                album_songs = songs.filter(album=album_data['album'], artist=album_data['artist'])
                latest_song = album_songs.order_by('-played_at').first()
                
                # Get top 3 tracks for this album
                top_tracks_for_album = album_songs.values('title').annotate(
                    count=Count('id')
                ).order_by('-count')[:3]
                
                top_tracks = []
                for track_data in top_tracks_for_album:
                    track_songs = album_songs.filter(title=track_data['title'])
                    top_tracks.append({
                        'title': track_data['title'],
                        'count': track_data['count']
                    })
                
                albums_list.append({
                    'name': album_data['album'],
                    'artist': album_data['artist'],
                    'count': album_data['count'],
                    'thumbnail': latest_song.album_thumbnail if latest_song else None,
                    'track_url': latest_song.track_url if latest_song else None,
                    'top_tracks': top_tracks
                })
            
            return Response({'albums': albums_list})
        except Exception as e:
            logger.error(f"Error fetching top albums: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
