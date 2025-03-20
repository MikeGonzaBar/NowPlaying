from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from .models import StreamedSong
from .serializers import StreamedSongSerializer  # Import the serializer


class StreamedSongViewSet(viewsets.ModelViewSet):
    queryset = StreamedSong.objects.all()
    serializer_class = StreamedSongSerializer

    @action(detail=False, methods=["get"], url_path="fetch-recently-played")
    def fetchRecentlyPlayed(self, request):
        """
        Fetches the latest 100 recently played songs from Spotify, stores them in the database,
        and returns the fetched data.
        """
        try:
            result = StreamedSong.fetch_recently_played_songs()
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
        Retrieves all stored songs from the database.
        """
        songs = StreamedSong.objects.all().values(
            "title", "artist", "album", "played_at"
        )
        return Response({"results": list(songs)})
