from rest_framework import serializers
from .models import Song


class StreamedSongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        fields = '__all__'