from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from .models import Song
from .serializers import StreamedSongSerializer  # Import the serializer


class StreamedSongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.all()
    serializer_class = StreamedSongSerializer

    @action(detail=False, methods=["get"], url_path="fetch-recently-played")
    def fetchRecentlyPlayed(self, request):
        """
        Fetches the latest 100 recently played songs from Spotify, stores them in the database,
        and returns the fetched data.
        """
        try:
            result = Song.fetch_recently_played_songs()
            return Response(
                {
                    "message": "Recently played songs fetched and stored successfully.",
                    "data": result,
                }
            )
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=["get"], url_path="get-stored-songs")
    def getStoredSongs(self, request):
        """
        Retrieves all stored songs from the database, sorted by played_at in descending order.
        """
        songs = Song.objects.all().order_by("-played_at")
        serializer = StreamedSongSerializer(songs, many=True)
        return Response({"results": serializer.data})
