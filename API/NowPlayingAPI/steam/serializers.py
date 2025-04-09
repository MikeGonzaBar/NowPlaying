
from rest_framework import serializers
from .models import Achievement, Game

class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['name', 'description', 'image', 'unlocked', 'unlock_time']

class SteamSerializer(serializers.ModelSerializer):
    total_achievements = serializers.SerializerMethodField()
    unlocked_achievements_count = serializers.SerializerMethodField()
    locked_achievements_count = serializers.SerializerMethodField()
    achievements = AchievementSerializer(many=True, read_only=True) 

    class Meta:
        model = Game
        # Include all the game fields; adjust this list as needed.
        fields = [
            "appid", "name", "playtime_forever", "playtime_formatted",
            "img_icon_url", "has_community_visible_stats", "last_played",
            "content_descriptorids", "total_achievements", 
            "unlocked_achievements_count", "locked_achievements_count",
            "achievements"
        ]

    def get_total_achievements(self, obj):
        return obj.achievements.count()

    def get_unlocked_achievements_count(self, obj):
        return obj.achievements.filter(unlocked=True).count()

    def get_locked_achievements_count(self, obj):
        total = self.get_total_achievements(obj)
        unlocked = self.get_unlocked_achievements_count(obj)
        return total - unlocked