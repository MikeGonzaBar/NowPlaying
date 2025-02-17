from django.db import models
from django.conf import settings
import requests
from datetime import datetime, timezone


class Steam(models.Model):
    games_data = models.JSONField(default=dict)  # Field to store games data

    def perform_operations(self):
        # Access the secret key from settings
        secret_key = settings.STEAM_API_KEY
        return f"Operations performed with secret key: {secret_key}"

    def convert_playtime(self, playtime_minutes):
        hours, minutes = divmod(playtime_minutes, 60)
        minutes, seconds = divmod(minutes * 60, 60)
        return f"{hours}h {minutes}m {seconds}s"

    @classmethod
    def fetch_global_achievements(cls, app_id):
        url = "http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/"
        response = requests.get(
            url, params={"key": settings.STEAM_API_KEY, "appid": app_id}
        )
        data = response.json()
        if (
            not data.get("game")
            or not data["game"].get("availableGameStats")
            or not data["game"]["availableGameStats"].get("achievements")
        ):
            return None, "No achievements available for this game."
        return data["game"]["availableGameStats"]["achievements"], None

    @classmethod
    def fetch_player_achievements(cls, app_id, steam_id):
        url = "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/"
        response = requests.get(
            url,
            params={
                "key": settings.STEAM_API_KEY,
                "steamid": steam_id,
                "appid": app_id,
            },
        )
        data = response.json()
        if not data.get("playerstats") or not data["playerstats"].get("achievements"):
            return None, "Error retrieving player achievements data."
        return {
            ach["apiname"]: ach for ach in data["playerstats"]["achievements"]
        }, None

    @classmethod
    def fetch_achievements(cls, app_id, steam_id):
        try:
            global_achievements, error = cls.fetch_global_achievements(app_id)
            if error:
                return {"message": error, "achievements": [], "total": 0, "unlocked": 0}

            player_achievements, error = cls.fetch_player_achievements(app_id, steam_id)
            if error:
                return {"message": error, "achievements": [], "total": 0, "unlocked": 0}

            achievement_list = []
            unlocked_count = 0
            for achievement in global_achievements:
                apiname = achievement["name"]
                player_ach = player_achievements.get(apiname)
                unlocked = bool(player_ach and player_ach["achieved"])
                if unlocked:
                    unlocked_count += 1
                achievement_list.append(
                    {
                        "name": achievement["displayName"],
                        "description": achievement.get("description", ""),
                        "image": (
                            achievement["icon"] if unlocked else achievement["icongray"]
                        ),
                        "unlocked": unlocked,
                        "unlock_time": (
                            datetime.fromtimestamp(
                                player_ach["unlocktime"], timezone.utc
                            ).strftime("%d/%m/%Y %H:%M:%S")
                            if unlocked
                            else None
                        ),
                    }
                )

            return {
                "message": "Achievements retrieved successfully.",
                "achievements": achievement_list,
                "total": len(global_achievements),
                "unlocked": unlocked_count,
            }
        except Exception as e:
            return {
                "message": f"Error retrieving achievements: {str(e)}",
                "achievements": [],
                "total": 0,
                "unlocked": 0,
            }

    @classmethod
    def verify_and_update_data(cls, formatted_games):
        steam_instance = cls.objects.first() or cls.objects.create(games_data={})

        updated_games_data = steam_instance.games_data
        for game in formatted_games:
            appid = game["appid"]
            if appid not in updated_games_data:
                updated_games_data[appid] = game
            else:
                # Update only the new achievements
                stored_achievements = updated_games_data[appid]["achievements"]
                new_achievements = game["achievements"]
                for new_ach in new_achievements:
                    for stored_ach in stored_achievements:
                        if (
                            new_ach["name"] == stored_ach["name"]
                            and new_ach["unlocked"]
                            and not stored_ach["unlocked"]
                        ):
                            stored_ach.update(new_ach)
                updated_games_data[appid].update(game)

        steam_instance.games_data = updated_games_data
        steam_instance.save()

    @classmethod
    def get_games(cls, user_id):
        # Access the secret key from settings
        secret_key = settings.STEAM_API_KEY
        steam_id = user_id or settings.STEAM_ID

        url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
        params = {
            "key": secret_key,
            "steamid": steam_id,
            "include_appinfo": True,
            "include_played_free_games": True,
        }
        response = requests.get(url, params=params)

        if response.status_code != 200:
            return {"error": f"Failed to fetch games data: {response.status_code}"}

        data = response.json()
        # Process the data as needed
        games = data.get("response", {}).get("games", [])
        formatted_games = []
        for game in games:
            achievements_data = cls.fetch_achievements(game.get("appid"), steam_id)
            formatted_games.append(
                {
                    "appid": game.get("appid"),
                    "name": game.get("name"),
                    "playtime_forever": game.get("playtime_forever"),
                    "playtime_formatted": cls().convert_playtime(
                        game.get("playtime_forever")
                    ),
                    "img_icon_url": f"http://media.steampowered.com/steamcommunity/public/images/apps/{game.get('appid')}/{game.get('img_icon_url')}.jpg",
                    "has_community_visible_stats": game.get(
                        "has_community_visible_stats", False
                    ),
                    "rtime_last_played": datetime.fromtimestamp(
                        game.get("rtime_last_played", 0), timezone.utc
                    ).strftime("%d/%m/%Y"),
                    "content_descriptorids": game.get("content_descriptorids", []),
                    "total_achievements": achievements_data["total"],
                    "unlocked_achievements": achievements_data["unlocked"],
                    "achievements": achievements_data["achievements"],
                }
            )
        cls.verify_and_update_data(formatted_games)
        return {"games": formatted_games}

    @classmethod
    def get_games_stored(cls):
        steam_instance = cls.objects.first()
        if steam_instance:
            return steam_instance.games_data
        return {}
