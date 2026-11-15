from rest_framework import serializers

from .models import EpicAchievement, EpicGame


class EpicAchievementSerializer(serializers.ModelSerializer):
    """Serialize stored Epic achievements using the shared UI field names."""

    name = serializers.SerializerMethodField()
    achievement_name = serializers.CharField(source="name", read_only=True)

    class Meta:
        model = EpicAchievement
        fields = [
            "name",
            "achievement_name",
            "description",
            "image",
            "unlocked",
            "unlock_time",
            "progress",
            "xp",
            "rarity_percent",
            "hidden",
        ]

    def get_name(self, obj: EpicAchievement) -> str:
        """Return the localized display name, falling back to the API name."""
        return obj.display_name or obj.name


class EpicSerializer(serializers.ModelSerializer):
    """Serialize stored Epic games with achievement summary counts."""

    img_icon_url = serializers.CharField(source="cover_image", read_only=True)
    playtime_formatted = serializers.SerializerMethodField()
    playtime_known = serializers.SerializerMethodField()
    total_achievements = serializers.SerializerMethodField()
    unlocked_achievements_count = serializers.SerializerMethodField()
    locked_achievements_count = serializers.SerializerMethodField()
    achievements = EpicAchievementSerializer(many=True, read_only=True)

    class Meta:
        model = EpicGame
        fields = [
            "appid",
            "namespace",
            "app_name",
            "name",
            "description",
            "developer",
            "publisher",
            "cover_image",
            "img_icon_url",
            "acquired_at",
            "last_played",
            "playtime_minutes",
            "playtime_formatted",
            "playtime_known",
            "playtime_source",
            "playtime_updated_at",
            "total_achievements",
            "unlocked_achievements_count",
            "locked_achievements_count",
            "achievements",
        ]

    def get_playtime_formatted(self, obj: EpicGame) -> str:
        """Return formatted playtime, or empty when Epic does not provide one."""
        return obj.convert_playtime()

    def get_playtime_known(self, obj: EpicGame) -> bool:
        """Return whether the playtime value is a real measurement."""
        return obj.playtime_known

    def get_total_achievements(self, obj: EpicGame) -> int:
        """Return total related achievements."""
        return obj.achievements.count()

    def get_unlocked_achievements_count(self, obj: EpicGame) -> int:
        """Return unlocked achievements, reusing prefetched rows when present."""
        prefetched = getattr(obj, "_prefetched_objects_cache", {})
        if "achievements" in prefetched:
            return sum(achievement.unlocked for achievement in prefetched["achievements"])
        return obj.achievements.filter(unlocked=True).count()

    def get_locked_achievements_count(self, obj: EpicGame) -> int:
        """Return locked achievements."""
        total = self.get_total_achievements(obj)
        unlocked = self.get_unlocked_achievements_count(obj)
        return total - unlocked
