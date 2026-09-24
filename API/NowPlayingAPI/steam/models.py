from django.db import models
from datetime import datetime, timezone
import logging
from django.contrib.auth.models import User
import http_client

logger = logging.getLogger("steam")


class Game(models.Model):
    """Stored Steam game owned by a local user."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='steam_games')
    appid = models.PositiveIntegerField()
    name = models.CharField(max_length=255)
    playtime_forever = models.PositiveIntegerField(default=0)
    playtime_formatted = models.CharField(max_length=50, blank=True)
    img_icon_url = models.URLField(max_length=500, blank=True)
    has_community_visible_stats = models.BooleanField(default=False)
    last_played = models.DateTimeField(null=True, blank=True)
    content_descriptorids = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ('user', 'appid')
        indexes = [
            models.Index(fields=['user', '-last_played']),
            models.Index(fields=['user', '-playtime_forever']),
            models.Index(fields=['user', 'appid']),
            models.Index(fields=['last_played']),
            models.Index(fields=['playtime_forever']),
        ]

    def __str__(self) -> str:
        """Return the Steam game name."""
        return self.name

    def convert_playtime(self) -> str:
        """Return total Steam playtime formatted as hours and minutes."""
        playtime_minutes = self.playtime_forever
        hours, minutes = divmod(playtime_minutes, 60)
        return f"{hours}h {minutes}m"
    
    def save(self, *args: object, **kwargs: object) -> None:
        """Update formatted playtime before saving."""
        self.playtime_formatted = self.convert_playtime()
        super().save(*args, **kwargs)

class Achievement(models.Model):
    """Stored Steam achievement for a game."""

    game = models.ForeignKey(Game, related_name="achievements", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.URLField(max_length=500, blank=True)
    unlocked = models.BooleanField(default=False)
    unlock_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["game", "name"], name="unique_steam_game_achievement"
            )
        ]

    def __str__(self) -> str:
        """Return the achievement name and lock state."""
        return f"{self.name} ({'Unlocked' if self.unlocked else 'Locked'})"
    
class SteamAPI:
    """Steam Web API adapter that syncs games and achievements."""

    @staticmethod
    def fetch_global_achievements(appid: int, steam_api_key: str) -> tuple[list[dict[str, object]] | None, str | None]:
        """Fetch the global achievement schema for a Steam app."""
        url = "http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/"
        try:
            response = http_client.get(
                url,
                params={"key": steam_api_key, "appid": appid},
                logger_name="steam",
            )
            data = response.json()
        except (http_client.ExternalRequestError, ValueError) as exc:
            logger.warning("Unable to fetch Steam global achievements for %s: %s", appid, exc)
            return None, "Unable to fetch achievements from Steam."
        if (
            not data.get("game")
            or not data["game"].get("availableGameStats")
            or not data["game"]["availableGameStats"].get("achievements")
        ):
            return None, "No achievements available for this game."
        return data["game"]["availableGameStats"]["achievements"], None

    @staticmethod
    def fetch_player_achievements(appid: int, steam_id: str, steam_api_key: str) -> tuple[dict[str, dict[str, object]] | None, str | None]:
        """Fetch a player's achievement state for a Steam app."""
        url = "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/"
        try:
            response = http_client.get(
                url,
                params={
                    "key": steam_api_key,
                    "steamid": steam_id,
                    "appid": appid,
                },
                logger_name="steam",
            )
            data = response.json()
        except (http_client.ExternalRequestError, ValueError) as e:
            logger.error(f"Failed to decode JSON: {e}")
            return None, "Invalid response from Steam API."

        if not data.get("playerstats") or not data["playerstats"].get("achievements"):
            logger.error(f"Error retrieving player achievements data.")
            return None, "Error retrieving player achievements data."
        return {ach["apiname"]: ach for ach in data["playerstats"]["achievements"]}, None

    @classmethod
    def update_game_and_achievements(
        cls,
        game_data: dict[str, object],
        steam_id: str,
        steam_api_key: str,
        user: User | None = None,
    ) -> dict[str, object]:
        """Update one stored Steam game and its achievements."""
        if user is None:
            raise ValueError("User must be provided to associate games.")
        """
        Accepts a dictionary with game info and updates or creates Game and its related Achievements.
        
        Args:
            game_data (dict): The game data from Steam API
            steam_id (str): The Steam ID of the player
            user (User, optional): The Django User model instance to associate with this game
        """
        logger = logging.getLogger(__name__)
        game_instance,_ = Game.objects.update_or_create(
            appid=game_data["appid"],
            user=user,
            defaults={
                "name": game_data.get("name", ""),
                "playtime_forever": game_data.get("playtime_forever", 0),
                "img_icon_url": f"https://steamcdn-a.akamaihd.net/steam/apps/{game_data.get('appid')}/library_600x900_2x.jpg",
                "has_community_visible_stats": game_data.get("has_community_visible_stats", False),
                "last_played": datetime.fromtimestamp(
                    game_data.get("rtime_last_played", 0), timezone.utc
                ) if game_data.get("rtime_last_played") else None,
                "content_descriptorids": game_data.get("content_descriptorids", []),
                "user": user,
            }
        )
        
        global_achievements, error = cls.fetch_global_achievements(game_data["appid"], steam_api_key)
        if error:
            return {"message": error}

        player_achievements, error = cls.fetch_player_achievements(game_data["appid"], steam_id, steam_api_key)
        if error:
            return {"message": error}

        unlocked_count = 0

        from django.db import transaction
        
        try:
            with transaction.atomic():
                achievement_objs = []
                for achievement in global_achievements:
                    try:
                        apiname = achievement["name"]
                        player_ach = player_achievements.get(apiname)
                        unlocked = bool(player_ach and player_ach.get("achieved", 0))
                        if unlocked:
                            unlocked_count += 1
                        unlock_time = (datetime.fromtimestamp(
                                            player_ach["unlocktime"], timezone.utc)
                                       if unlocked and player_ach.get("unlocktime")
                                       else None)
                        
                        achievement_objs.append(Achievement(
                            game=game_instance,
                            name=achievement.get("displayName"),
                            description=achievement.get("description", ""),
                            image=achievement["icon"] if unlocked else achievement.get("icongray", ""),
                            unlocked=unlocked,
                            unlock_time=unlock_time,
                        ))
                    except Exception as e:
                        logger.error(f"Error preparing achievement {achievement.get('displayName', 'Unknown')}: {str(e)}")
                        continue

                # Single bulk upsert instead of one update_or_create per
                # achievement (requires the (game, name) unique constraint).
                Achievement.objects.bulk_create(
                    achievement_objs,
                    update_conflicts=True,
                    unique_fields=["game", "name"],
                    update_fields=["description", "image", "unlocked", "unlock_time"],
                    batch_size=500,
                )
        except Exception as e:
            logger.error(f"Critical database error during achievement update: {str(e)}")
            return {"message": f"Database error: {str(e)}"}

        return {
            "message": "Game and achievements updated successfully.",
            "game": game_instance,
            "total_achievements": len(global_achievements),
            "unlocked_achievements": unlocked_count,
        }

    @classmethod
    def get_games(cls, steam_id: str, steam_api_key: str, user: User | None = None) -> dict[str, object]:
        """Fetch Steam owned games and sync them into local storage."""
        if user is None:
            raise ValueError("User must be provided to associate games.")
        """
        Fetches games data from the Steam API, updates the database models,
        and returns the formatted list of games.
        
        Args:
            steam_id (str): The Steam ID of the player
            user (User, optional): The Django User model instance to associate with the games
        """
        
        url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
        params = {
            "key": steam_api_key,
            "steamid": steam_id,
            "include_appinfo": True,
            "include_played_free_games": True,
        }
        response = http_client.get(url, params=params, logger_name="steam")
        if response.status_code != 200:
            return {"error": f"Failed to fetch games data: {response.status_code}"}

        try:
            data = response.json()
        except ValueError:
            return {"error": "Invalid response from Steam API."}
        games = data.get("response", {}).get("games", [])

        formatted_games = []
        for game in games:
            update_result = cls.update_game_and_achievements(game, steam_id, steam_api_key, user)
            # Reuse the instance returned by the upsert (falls back to a read
            # only for games whose achievement fetch failed).
            game_instance = update_result.get("game")
            if game_instance is None:
                game_instance = Game.objects.get(appid=game["appid"], user=user)
            achievements = list(game_instance.achievements.all().values(
                "name", "description", "image", "unlocked", "unlock_time"
            ))
            formatted_games.append({
                "appid": game_instance.appid,
                "name": game_instance.name,
                "playtime_forever": game_instance.playtime_forever,
                "playtime_formatted": game_instance.playtime_formatted,
                "img_icon_url": game_instance.img_icon_url,
                "has_community_visible_stats": game_instance.has_community_visible_stats,
                "last_played": game_instance.last_played.strftime("%d/%m/%Y") if game_instance.last_played else None,
                "content_descriptorids": game_instance.content_descriptorids,
                "total_achievements": len(achievements),
                "unlocked_achievements": sum(1 for a in achievements if a["unlocked"]),
                "locked_achievements": len(achievements) - sum(1 for a in achievements if a["unlocked"]),
                "achievements": achievements,
            })
        return {"games": formatted_games}
