
from rest_framework import serializers
from .models import Steam

class SteamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Steam
        fields = '__all__'
        
