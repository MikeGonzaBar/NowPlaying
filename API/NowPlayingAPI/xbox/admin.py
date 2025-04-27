from django.contrib import admin
from .models import XboxGame, XboxAchievement

@admin.register(XboxGame)
class XboxGameAdmin(admin.ModelAdmin):
    list_display = ("name", "platform", "total_playtime")
    search_fields=("name", "platform", "total_playtime")
    list_filter=("name", "platform", "total_playtime")
@admin.register(XboxAchievement)
class XboxAchievementAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'unlocked', 'unlock_time', 'achievement_value')
    list_filter = ('unlocked', 'game')
    search_fields = ('name', 'description')
    ordering = ('game', 'name')