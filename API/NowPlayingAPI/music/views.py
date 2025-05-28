from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .models import Song
from .serializers import StreamedSongSerializer  # Import the serializer
from users.models import UserApiKey  # Import UserApiKey from the correct location


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
        Fetches recent tracks from Last.fm for the authenticated user,
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

            # Get limit parameter (default 50, max 200 as per Last.fm API)
            # Allow override via query parameter if needed
            limit = min(int(request.query_params.get('limit', 50)), 200)

            result = Song.fetch_lastfm_recent_tracks(request.user, lastfm_api_key, lastfm_username, limit)
            return Response(
                {
                    "message": f"Last.fm recent tracks fetched and stored successfully for user '{lastfm_username}'.",
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
        Retrieves all stored songs from the database for the authenticated user,
        sorted by played_at in descending order.
        """
        # Optional filter by source (spotify, lastfm, or all)
        source = request.query_params.get('source')
        songs = Song.objects.filter(user=request.user)
        
        if source and source in ['spotify', 'lastfm']:
            songs = songs.filter(source=source)
            
        songs = songs.order_by("-played_at")
        serializer = StreamedSongSerializer(songs, many=True)
        return Response({"results": serializer.data})
