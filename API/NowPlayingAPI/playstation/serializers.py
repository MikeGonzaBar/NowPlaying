from rest_framework import serializers
from .models import PSN


class PSNSerializer(serializers.ModelSerializer):
    class Meta:
        model = PSN
        fields = "__all__"
