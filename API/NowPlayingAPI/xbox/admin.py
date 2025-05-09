from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import XboxGame, XboxAchievement

class XboxAchievementInline(admin.TabularInline):
    model = XboxAchievement
    extra = 0
    readonly_fields = ['name', 'description', 'image', 'unlocked', 'unlock_time', 'achievement_value', 'image_display']
    fields = ['name', 'description', 'image_display', 'unlocked', 'unlock_time', 'achievement_value']
    can_delete = False
    max_num = 0
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def image_display(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image}" width="64" height="64" />')
        return ""
    image_display.short_description = "Achievement Image"

@admin.register(XboxGame)
class XboxGameAdmin(admin.ModelAdmin):
    list_display = ["name", "platform", "total_playtime", "last_played", "achievement_progress"]
    list_filter = ["platform", "last_played"]
    search_fields = ["name", "appid"]
    readonly_fields = ['appid', 'name', 'platform', 'total_playtime', 'first_played', 
                      'last_played', 'img_icon_url', 'achievement_progress', 'game_image_display']
    fields = ['appid', 'name', 'platform', 'game_image_display', 'total_playtime', 
             'first_played', 'last_played', 'achievement_progress']
    inlines = [XboxAchievementInline]
    
    def achievement_progress(self, obj):
        total = obj.achievements.count()
        unlocked = obj.achievements.filter(unlocked=True).count()
        if total:
            percentage = (unlocked / total) * 100
            return f"{unlocked}/{total} ({percentage:.1f}%)"
        return "0/0 (0%)"
    achievement_progress.short_description = "Achievement Progress"
    
    def game_image_display(self, obj):
        if obj.img_icon_url:
            return mark_safe(f'<img src="{obj.img_icon_url}" width="200" />')
        return ""
    game_image_display.short_description = "Game Image"

@admin.register(XboxAchievement)
class XboxAchievementAdmin(admin.ModelAdmin):
    list_display = ['name', 'game_name', 'unlocked', 'unlock_time', 'achievement_value']
    list_filter = ['unlocked', 'game']
    search_fields = ['name', 'description', 'game__name']
    readonly_fields = ['game', 'name', 'description', 'image', 'unlocked', 'unlock_time', 
                      'achievement_value', 'image_display']
    fields = ['game', 'name', 'description', 'image_display', 'unlocked', 'unlock_time', 'achievement_value']
    
    def game_name(self, obj):
        return obj.game.name
    game_name.short_description = "Game"
    game_name.admin_order_field = 'game__name'
    
    def image_display(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image}" width="64" height="64" />')
        return ""
    image_display.short_description = "Achievement Image"