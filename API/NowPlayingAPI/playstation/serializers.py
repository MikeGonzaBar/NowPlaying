from collections.abc import Iterable

from rest_framework import serializers
from .models import PSNGame, PSNAchievement

class PSNAchievementSerializer(serializers.ModelSerializer):
    """Serialize stored PlayStation trophies."""

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
    """Serialize stored PlayStation games with trophy summaries."""

    achievements = PSNAchievementSerializer(many=True, read_only=True)
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
            'total_achievements',
            'unlocked_achievements',
            'achievements'
        ]

    def get_total_achievements(self, obj: PSNGame) -> dict[str, int]:
        """Return total trophies grouped by trophy type."""
        counts = {"platinum": 0, "gold": 0, "silver": 0, "bronze": 0}
        for achievement in obj.achievements.all():
            trophy_type = (achievement.trophy_type or "").lower()
            if trophy_type in counts:
                counts[trophy_type] += 1
        return counts

    def get_unlocked_achievements(self, obj: PSNGame) -> dict[str, int]:
        """Return unlocked trophies grouped by trophy type."""
        counts = {"platinum": 0, "gold": 0, "silver": 0, "bronze": 0}
        prefetched = getattr(obj, "_prefetched_objects_cache", {})
        achievements: Iterable[PSNAchievement]
        if "achievements" in prefetched:
            achievements = (
                achievement for achievement in prefetched["achievements"]
                if achievement.unlocked
            )
        else:
            achievements = obj.achievements.filter(unlocked=True)
        for achievement in achievements:
            trophy_type = (achievement.trophy_type or "").lower()
            if trophy_type in counts:
                counts[trophy_type] += 1
        return counts
