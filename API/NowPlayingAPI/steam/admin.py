from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Game, Achievement

class AchievementInline(admin.TabularInline):
    model = Achievement
    extra = 0
    readonly_fields = ['name', 'description', 'image', 'unlocked', 'unlock_time', 'image_display']
    fields = ['name', 'description', 'image_display', 'unlocked', 'unlock_time']
    can_delete = False
    max_num = 0
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def image_display(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image}" width="64" height="64" />')
        return ""
    image_display.short_description = "Achievement Image"

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ['name', 'user_username', 'playtime_formatted', 'last_played', 'achievement_progress']
    list_filter = ['user', 'last_played', 'has_community_visible_stats']
    search_fields = ['name', 'appid', 'user__username']
    readonly_fields = ['user', 'appid', 'name', 'playtime_forever', 'playtime_formatted', 'img_icon_url', 
                      'has_community_visible_stats', 'last_played', 'content_descriptorids', 
                      'achievement_progress', 'game_image_display']
    fields = ['user', 'appid', 'name', 'game_image_display', 'playtime_formatted', 'last_played', 
             'has_community_visible_stats', 'achievement_progress']
    inlines = [AchievementInline]
    
    def user_username(self, obj):
        return obj.user.username if obj.user else "No User"
    user_username.short_description = "User"
    user_username.admin_order_field = 'user__username'

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

@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['name', 'game_name', 'game_user', 'unlocked', 'unlock_time']
    list_filter = ['unlocked', 'game', 'game__user']
    search_fields = ['name', 'description', 'game__name', 'game__user__username']
    readonly_fields = ['game', 'game_user', 'name', 'description', 'image', 'unlocked', 'unlock_time', 'image_display']
    fields = ['game', 'game_user', 'name', 'description', 'image_display', 'unlocked', 'unlock_time']

    def game_name(self, obj):
        return obj.game.name
    game_name.short_description = "Game"
    game_name.admin_order_field = 'game__name'
    
    def game_user(self, obj):
        return obj.game.user.username if obj.game and obj.game.user else "No User"
    game_user.short_description = "User"
    game_user.admin_order_field = 'game__user__username'
    
    def image_display(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image}" width="64" height="64" />')
        return ""
    image_display.short_description = "Achievement Image"