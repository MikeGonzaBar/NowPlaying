from rest_framework import serializers
from .models import StreamedSong


class StreamedSongSerializer(serializers.ModelSerializer):
    class Meta:
        model = StreamedSong
        fields = ["id", "title", "artist", "album", "played_at"]
