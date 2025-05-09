from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import RetroAchievementsGame, GameAchievement

class GameAchievementInline(admin.TabularInline):
    model = GameAchievement
    extra = 0
    readonly_fields = ['achievement_id', 'title', 'description', 'points', 'true_ratio', 
                      'author', 'date_created', 'date_modified', 'badge_name', 'type', 
                      'date_earned', 'badge_image']
    fields = ['title', 'description', 'points', 'date_earned', 'badge_image', 'author']
    can_delete = False
    max_num = 0
    
    def has_add_permission(self, request, obj=None):
        return False
        
    def badge_image(self, obj):
        if obj.badge_name:
            image_url = f"https://s3-eu-west-1.amazonaws.com/i.retroachievements.org/Badge/{obj.badge_name}.png"
            return mark_safe(f'<img src="{image_url}" width="64" height="64" />')
        return ""
    badge_image.short_description = "Badge"

@admin.register(RetroAchievementsGame)
class RetroAchievementsGameAdmin(admin.ModelAdmin):
    list_display = ['title', 'console_name', 'achievement_progress', 'score_progress', 'last_played']
    list_filter = ['console_name', 'last_played']
    search_fields = ['title', 'game_id']
    readonly_fields = ['game_id', 'console_id', 'console_name', 'title', 'image_icon', 'image_title', 
                      'image_ingame', 'image_box_art', 'last_played', 'achievements_total', 
                      'num_possible_achievements', 'possible_score', 'num_achieved', 'score_achieved', 
                      'num_achieved_hardcore', 'score_achieved_hardcore', 'achievement_progress', 
                      'score_progress', 'box_art_display', 'title_image_display']
    fields = ['game_id', 'title', 'console_name', 'last_played', 'box_art_display', 'title_image_display',
             'achievement_progress', 'score_progress']
    inlines = [GameAchievementInline]

    def achievement_progress(self, obj):
        if obj.achievements_total:
            percentage = (obj.num_achieved / obj.achievements_total) * 100
            return f"{obj.num_achieved}/{obj.achievements_total} ({percentage:.1f}%)"
        return "0/0 (0%)"
    achievement_progress.short_description = "Achievement Progress"

    def score_progress(self, obj):
        if obj.possible_score:
            percentage = (obj.score_achieved / obj.possible_score) * 100
            return f"{obj.score_achieved}/{obj.possible_score} ({percentage:.1f}%)"
        return "0/0 (0%)"
    score_progress.short_description = "Score Progress"

    def box_art_display(self, obj):
        if obj.image_box_art:
            return mark_safe(f'<img src="{obj.image_box_art}" width="150" />')
        return ""
    box_art_display.short_description = "Box Art"

    def title_image_display(self, obj):
        if obj.image_title:
            return mark_safe(f'<img src="{obj.image_title}" width="300" />')
        return ""
    title_image_display.short_description = "Title Screen"

@admin.register(GameAchievement)
class GameAchievementAdmin(admin.ModelAdmin):
    list_display = ['title', 'game_title', 'points', 'author', 'is_earned', 'date_earned']
    list_filter = ['game__console_name', 'date_earned', 'author']
    search_fields = ['title', 'description', 'game__title']
    readonly_fields = ['achievement_id', 'game', 'title', 'description', 'points', 'true_ratio', 
                      'author', 'date_created', 'date_modified', 'badge_name', 'type', 
                      'date_earned', 'badge_image']
    fields = ['game', 'title', 'description', 'points', 'badge_image', 
             'author', 'date_created', 'date_earned']

    def game_title(self, obj):
        return obj.game.title
    game_title.short_description = "Game"
    game_title.admin_order_field = 'game__title'
    
    def is_earned(self, obj):
        return obj.date_earned is not None
    is_earned.boolean = True
    is_earned.short_description = "Earned"
    is_earned.admin_order_field = 'date_earned'
    
    def badge_image(self, obj):
        if obj.badge_name:
            image_url = f"https://s3-eu-west-1.amazonaws.com/i.retroachievements.org/Badge/{obj.badge_name}.png"
            return mark_safe(f'<img src="{image_url}" width="64" height="64" />')
        return ""
    badge_image.short_description = "Badge"
