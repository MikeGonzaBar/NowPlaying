from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import PSNGame, PSNAchievement

class PSNAchievementInline(admin.TabularInline):
    model = PSNAchievement
    extra = 0
    readonly_fields = ['name', 'description', 'trophy_type', 'unlocked', 'unlock_time', 'image']
    fields = ['name', 'description', 'trophy_type', 'unlocked', 'unlock_time']
    can_delete = False
    max_num = 0
    
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(PSNGame)
class PSNGameAdmin(admin.ModelAdmin):
    list_display = ['name', 'platform', 'total_playtime', 'last_played', 'achievement_progress']
    list_filter = ['platform', 'last_played']
    search_fields = ['name', 'appid']
    readonly_fields = ['appid', 'name', 'platform', 'total_playtime', 'first_played', 'last_played', 'img_icon_url', 'achievement_progress', 'image_display']
    fields = ['appid', 'name', 'platform', 'total_playtime', 'first_played', 'last_played', 'image_display']
    inlines = [PSNAchievementInline]

    def achievement_progress(self, obj):
        total = obj.achievements.count()
        unlocked = obj.achievements.filter(unlocked=True).count()
        if total:
            percentage = (unlocked / total) * 100
            return f"{unlocked}/{total} ({percentage:.1f}%)"
        return "0/0 (0%)"
    achievement_progress.short_description = "Achievement Progress"

    def image_display(self, obj):
        if obj.img_icon_url:
            return mark_safe(f'<img src="{obj.img_icon_url}" width="100" />')
        return ""
    image_display.short_description = "Game Image"

@admin.register(PSNAchievement)
class PSNAchievementAdmin(admin.ModelAdmin):
    list_display = ['name', 'game', 'trophy_type', 'unlocked', 'unlock_time']
    list_filter = ['unlocked', 'trophy_type', 'game']
    search_fields = ['name', 'description', 'game__name']
    readonly_fields = ['game', 'name', 'description', 'trophy_type', 'unlocked', 'unlock_time', 'image_display']
    fields = ['game', 'name', 'description', 'trophy_type', 'unlocked', 'unlock_time', 'image_display']

    def image_display(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image}" width="100" />')
        return ""
    image_display.short_description = "Trophy Image"
