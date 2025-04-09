from rest_framework import serializers
from .models import PSNGame, PSNAchievement

class PSNAchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PSNAchievement
        fields = [
            'name', 
            'description', 
            'image', 
            'unlocked', 
            'unlock_time', 
            'trophy_type'
        ]

class PSNGameSerializer(serializers.ModelSerializer):
    achievements = PSNAchievementSerializer(many=True, read_only=True)
    # Computed fields that will return dictionaries
    total_achievements = serializers.SerializerMethodField()
    unlocked_achievements = serializers.SerializerMethodField()

    class Meta:
        model = PSNGame
        fields = [
            'appid',
            'name',
            'platform',
            'total_playtime',
            'first_played',
            'last_played',
            'img_icon_url',
            # Include computed dictionaries instead of raw numeric counts.
            'total_achievements',
            'unlocked_achievements',
            'achievements'
        ]

    def get_total_achievements(self, obj):
        # Initialize counters for each trophy type
        counts = {"platinum": 0, "gold": 0, "silver": 0, "bronze": 0}
        # Iterate over all related achievements to count each type.
        for achievement in obj.achievements.all():
            trophy_type = (achievement.trophy_type or "").lower()
            if trophy_type in counts:
                counts[trophy_type] += 1
        return counts

    def get_unlocked_achievements(self, obj):
        counts = {"platinum": 0, "gold": 0, "silver": 0, "bronze": 0}
        # Iterate over unlocked achievements only.
        for achievement in obj.achievements.filter(unlocked=True):
            trophy_type = (achievement.trophy_type or "").lower()
            if trophy_type in counts:
                counts[trophy_type] += 1
        return counts