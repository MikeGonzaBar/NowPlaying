from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .models import Song
from .serializers import StreamedSongSerializer  # Import the serializer
from users.models import UserApiKey  # Import UserApiKey from the correct location
from django.core.cache import cache
from django.conf import settings


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

            # Fetch ALL tracks (no limit)
            result = Song.fetch_lastfm_recent_tracks(request.user, lastfm_api_key, lastfm_username, limit=None)
            return Response(
                {
                    "message": f"Last.fm ALL recent tracks fetched and stored successfully for user '{lastfm_username}'.",
                    "data": result,
                    "count": len(result)
                }
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
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
