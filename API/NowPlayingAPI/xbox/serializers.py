from rest_framework import serializers
from .models import XboxGame, XboxAchievement

class XboxAchievementSerializer(serializers.ModelSerializer):
    """
    Serializer for the XboxAchievement model.
    """
    class Meta:
        model = XboxAchievement
        # Explicitly list fields or use '__all__'
        fields = [
            'id',
            'name',
            'description',
            'image',
            'unlocked',
            'unlock_time',
            'achievement_value',
        ]
        read_only_fields = ['id']

class XboxGameSerializer(serializers.ModelSerializer):
    """
    Serializer for the XboxGame model, including nested achievements and summary counts.
    """
    achievements = XboxAchievementSerializer(many=True, read_only=True)
    total_achievements = serializers.SerializerMethodField()
    unlocked_achievements = serializers.SerializerMethodField()
    locked_achievements = serializers.SerializerMethodField()

    class Meta:
        model = XboxGame
        fields = [
            'id',
            'appid',
            'name',
            'platform',
            'total_playtime',
            'first_played',
            'last_played',
            'img_icon_url',
            'achievements',
            'total_achievements',
            'unlocked_achievements',
            'locked_achievements',
        ]
        read_only_fields = ['id']

    def get_total_achievements(self, obj):
        """
        Return the total number of achievements for this game.
        """
        return obj.achievements.count()

    def get_unlocked_achievements(self, obj):
        """
        Return the count of achievements that have been unlocked.
        """
        return obj.achievements.filter(unlocked=True).count()

    def get_locked_achievements(self, obj):
        """
        Return the count of achievements that remain locked.
        """
        total = self.get_total_achievements(obj)
        unlocked = self.get_unlocked_achievements(obj)
        return total - unlocked
