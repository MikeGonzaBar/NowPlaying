from django.db import models
from django.conf import settings
import requests
from datetime import datetime, timezone
import logging
from django.contrib.auth.models import User

logger = logging.getLogger("steam")


class Game(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='steam_games')  # Allow null initially for migration
    appid = models.PositiveIntegerField()
    name = models.CharField(max_length=255)
    playtime_forever = models.PositiveIntegerField(default=0)
    playtime_formatted = models.CharField(max_length=50, blank=True)
    img_icon_url = models.URLField(max_length=500, blank=True)
    has_community_visible_stats = models.BooleanField(default=False)
    last_played = models.DateTimeField(null=True, blank=True)
    content_descriptorids = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ('user', 'appid')  # A game can appear multiple times, but only once per user

    def __str__(self):
        return self.name

    def convert_playtime(self):
        # Convert minutes into a formatted time string: "Xh Ym Zs"
        playtime_minutes = self.playtime_forever
        hours, minutes = divmod(playtime_minutes, 60)
        # Converting minutes (remaining) to seconds is optional;
        # here we keep the minutes part intact.
        return f"{hours}h {minutes}m"
    
    def save(self, *args, **kwargs):
        # Automatically update the formatted playtime
        self.playtime_formatted = self.convert_playtime()
        super().save(*args, **kwargs)

class Achievement(models.Model):
    game = models.ForeignKey(Game, related_name="achievements", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)  # The display name from Steam
    description = models.TextField(blank=True)
    image = models.URLField(max_length=500, blank=True)
    unlocked = models.BooleanField(default=False)
    unlock_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({'Unlocked' if self.unlocked else 'Locked'})"
    
class SteamAPI:

    @staticmethod
    def fetch_global_achievements(appid, steam_api_key):
        url = "http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/"
        response = requests.get(url, params={"key": steam_api_key, "appid": appid})
        data = response.json()
        if (
            not data.get("game")
            or not data["game"].get("availableGameStats")
            or not data["game"]["availableGameStats"].get("achievements")
        ):
            return None, "No achievements available for this game."
        return data["game"]["availableGameStats"]["achievements"], None

    @staticmethod
    def fetch_player_achievements(appid, steam_id, steam_api_key):
        url = "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/"
        response = requests.get(url, params={
            "key": steam_api_key,
            "steamid": steam_id,
            "appid": appid,
        })
        try:
            data = response.json()
        except requests.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON: {e}")
            return None, "Invalid response from Steam API."

        if not data.get("playerstats") or not data["playerstats"].get("achievements"):
            logger.error(f"Error retrieving player achievements data.")
            return None, "Error retrieving player achievements data."
        return {ach["apiname"]: ach for ach in data["playerstats"]["achievements"]}, None

    @classmethod
    def update_game_and_achievements(cls, game_data, steam_id, steam_api_key, user=None):
        if user is None:
            raise ValueError("User must be provided to associate games.")
        """
        Accepts a dictionary with game info and updates or creates Game and its related Achievements.
        
        Args:
            game_data (dict): The game data from Steam API
            steam_id (str): The Steam ID of the player
            user (User, optional): The Django User model instance to associate with this game
        """
        # Create or update the Game instance
        logger = logging.getLogger(__name__)
        game_instance,_ = Game.objects.update_or_create(
            appid=game_data["appid"],
            user=user,  # Add user to query criteria
            defaults={
                "name": game_data.get("name", ""),
                "playtime_forever": game_data.get("playtime_forever", 0),
                "img_icon_url": f"https://steamcdn-a.akamaihd.net/steam/apps/{game_data.get('appid')}/library_600x900_2x.jpg",
                "has_community_visible_stats": game_data.get("has_community_visible_stats", False),
                "last_played": datetime.fromtimestamp(
                    game_data.get("rtime_last_played", 0), timezone.utc
                ) if game_data.get("rtime_last_played") else None,
                "content_descriptorids": game_data.get("content_descriptorids", []),
                "user": user,  # Add user to defaults as well
            }
        )
        
        # Fetch achievements
        global_achievements, error = cls.fetch_global_achievements(game_data["appid"], steam_api_key)
        if error:
            # You might want to log the error or handle it appropriately here.
            return {"message": error}

        player_achievements, error = cls.fetch_player_achievements(game_data["appid"], steam_id, steam_api_key)
        if error:
            return {"message": error}

        unlocked_count = 0

        # Loop through each global achievement and update/create related achievement records
        for achievement in global_achievements:
            apiname = achievement["name"]
            player_ach = player_achievements.get(apiname)
            unlocked = bool(player_ach and player_ach.get("achieved", 0))
            if unlocked:
                unlocked_count += 1
            unlock_time = (datetime.fromtimestamp(
                                player_ach["unlocktime"], timezone.utc)
                           if unlocked and player_ach.get("unlocktime")
                           else None)
            
            Achievement.objects.update_or_create(
                game=game_instance,
                name=achievement.get("displayName"),
                defaults={
                    "description": achievement.get("description", ""),
                    "image": achievement["icon"] if unlocked else achievement.get("icongray", ""),
                    "unlocked": unlocked,
                    "unlock_time": unlock_time,
                }
            )

        return {
            "message": "Game and achievements updated successfully.",
            "total_achievements": len(global_achievements),
            "unlocked_achievements": unlocked_count,
        }

    @classmethod
    def get_games(cls, steam_id, steam_api_key, user=None):
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
        response = requests.get(url, params=params)
        if response.status_code != 200:
            return {"error": f"Failed to fetch games data: {response.status_code}"}

        data = response.json()
        games = data.get("response", {}).get("games", [])

        formatted_games = []
        for game in games:
            update_result = cls.update_game_and_achievements(game, steam_id, steam_api_key, user)
            # Retrieve fresh game data along with achievements from the database
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
