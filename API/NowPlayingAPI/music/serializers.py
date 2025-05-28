from rest_framework import serializers
from .models import Song


class StreamedSongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        fields = ['id', 'title', 'artist', 'album', 'played_at', 'album_thumbnail', 
                 'track_url', 'artists_url', 'duration_ms', 'source',
                 'artist_lastfm_url', 'track_mbid', 'artist_mbid', 'album_mbid', 
                 'loved', 'streamable', 'album_thumbnail_small', 'album_thumbnail_medium',
                 'album_thumbnail_large', 'album_thumbnail_extralarge']
        read_only_fields = ['id', 'user']