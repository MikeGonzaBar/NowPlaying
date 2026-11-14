from django.contrib import admin
from django.utils.safestring import mark_safe

from .models import EpicAchievement, EpicGame


class EpicAchievementInline(admin.TabularInline):
    """Inline read-only Epic achievements for a game."""

    model = EpicAchievement
    extra = 0
    readonly_fields = [
        "name",
        "display_name",
        "description",
        "image",
        "unlocked",
        "unlock_time",
        "progress",
        "xp",
        "rarity_percent",
    ]
    fields = [
        "display_name",
        "description",
        "unlocked",
        "unlock_time",
        "progress",
        "xp",
        "rarity_percent",
    ]
    can_delete = False
    max_num = 0

    def has_add_permission(self, request: object, obj: object | None = None) -> bool:
        """Prevent manual achievement creation in admin."""
        return False


@admin.register(EpicGame)
class EpicGameAdmin(admin.ModelAdmin):
    """Admin view for stored Epic games."""

    list_display = ["name", "user_username", "playtime_display", "last_played", "achievement_progress"]
    list_filter = ["last_played", "playtime_source", "user"]
    search_fields = ["name", "appid", "namespace", "user__username"]
    readonly_fields = [
        "user",
        "appid",
        "namespace",
        "app_name",
        "name",
        "description",
        "developer",
        "publisher",
        "cover_image",
        "acquired_at",
        "last_played",
        "playtime_minutes",
        "playtime_source",
        "metadata",
        "achievement_progress",
        "game_image_display",
    ]
    fields = [
        "user",
        "appid",
        "namespace",
        "app_name",
        "name",
        "game_image_display",
        "description",
        "developer",
        "publisher",
        "acquired_at",
        "last_played",
        "playtime_display",
        "achievement_progress",
    ]
    inlines = [EpicAchievementInline]

    def user_username(self, obj: EpicGame) -> str:
        """Return the owning username for list display."""
        return obj.user.username if obj.user else "No User"

    user_username.short_description = "User"
    user_username.admin_order_field = "user__username"

    def playtime_display(self, obj: EpicGame) -> str:
        """Return playtime or the explicit 'unknown' state."""
        return obj.convert_playtime() or "Unknown"

    playtime_display.short_description = "Playtime"

    def achievement_progress(self, obj: EpicGame) -> str:
        """Return unlocked and total achievement progress."""
        total = obj.achievements.count()
        unlocked = obj.achievements.filter(unlocked=True).count()
        if total:
            return f"{unlocked}/{total} ({(unlocked / total) * 100:.1f}%)"
        return "0/0 (not tracked)"

    achievement_progress.short_description = "Achievement Progress"

    def game_image_display(self, obj: EpicGame) -> object:
        """Render the game cover in the admin detail page."""
        if obj.cover_image:
            return mark_safe(f'<img src="{obj.cover_image}" width="200" />')
        return ""

    game_image_display.short_description = "Game Image"


@admin.register(EpicAchievement)
class EpicAchievementAdmin(admin.ModelAdmin):
    """Admin view for stored Epic achievements."""

    list_display = ["display_name", "game_name", "game_user", "unlocked", "unlock_time", "progress"]
    list_filter = ["unlocked", "hidden", "game__user"]
    search_fields = ["name", "display_name", "description", "game__name", "game__user__username"]
    readonly_fields = [
        "game",
        "game_user",
        "name",
        "display_name",
        "description",
        "image",
        "unlocked",
        "unlock_time",
        "progress",
        "xp",
        "rarity_percent",
        "hidden",
        "is_base",
    ]
    fields = readonly_fields

    def game_name(self, obj: EpicAchievement) -> str:
        """Return the parent game name."""
        return obj.game.name

    game_name.short_description = "Game"
    game_name.admin_order_field = "game__name"

    def game_user(self, obj: EpicAchievement) -> str:
        """Return the parent game owner."""
        return obj.game.user.username if obj.game and obj.game.user else "No User"

    game_user.short_description = "User"
    game_user.admin_order_field = "game__user__username"
