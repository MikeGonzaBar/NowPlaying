from django.db import models
from django.conf import settings
from datetime import datetime, timedelta
from django.utils.dateparse import parse_datetime
import requests
from django.contrib.auth.models import User
import logging

# Set up logging
logger = logging.getLogger("xbox")

class XboxGame(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='xbox_games')
    appid = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    platform = models.CharField(max_length=255)
    total_playtime = models.CharField(max_length=255, blank=True)
    first_played = models.DateTimeField(null=True, blank=True)
    last_played = models.DateTimeField(null=True, blank=True)
    img_icon_url = models.URLField(max_length=500, blank=True)
    
    class Meta:
        unique_together = ('user', 'appid')  # A game can appear multiple times, but only once per user
    
    def __str__(self):
        return self.name
    
class XboxAchievement(models.Model):
    game = models.ForeignKey(XboxGame, related_name="achievements", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.URLField(max_length=500, blank=True)
    unlocked = models.BooleanField(default=False)
    unlock_time = models.DateTimeField(null=True, blank=True)
    achievement_value = models.CharField(max_length=255, blank=True)
    
    def __str__(self):
        return f"{self.name} ({'Unlocked' if self.unlocked else 'Locked'})"
    
class XboxAPI:
    @staticmethod
    def make_request(url, api_key):
        headers = {
            "x-authorization": api_key
        }
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                try:
                    return response.json()
                except ValueError:
                    logger.error(f"Error parsing JSON from URL: {url}")
                    return {}
            else:
                logger.error(f"Bad response from URL {url}: {response.status_code} {response.reason}")
                return {}
        except Exception as e:
            logger.error(f"Request error: {str(e)}")
            return {}
    
    @staticmethod
    def needs_update(game: dict, user) -> bool:
        """
        Returns True if the game should be created or updated (based on last_played),
        otherwise returns False.
        """

        appid = game["titleId"]
        title_history = game.get("titleHistory", {})
        last_played_str = title_history.get("lastTimePlayed")

        if not last_played_str:
            return True  # or False depending on your app logic

        last_played = datetime.fromisoformat(last_played_str.replace("Z", "+00:00"))

        try:
            existing = XboxGame.objects.get(appid=appid, user=user)
        except XboxGame.DoesNotExist:
            return True  # Not in DB → needs to be created

        # If last_played from API is newer than in DB → needs update
        if last_played > existing.last_played:
            return True

        return False
    
    @classmethod
    def fetch_games(cls, user, xbox_api_key, xuid):
        """Fetch Xbox games for a specific user."""
        if not xbox_api_key or not xuid:
            logger.error(f"Missing Xbox credentials for user {user.username}")
            return {"error": "No Xbox API key or XUID provided."}
        
        try:
            url = f"https://xbl.io/api/v2/player/titleHistory"
            logger.info(f"Making request to URL: {url}")
            response = cls.make_request(url, xbox_api_key)
            
            if not response:
                return {"error": "Failed to fetch Xbox games."}
                
            titles_count = len(response.get("titles", []))
            logger.info(f"Titles obtained: {titles_count}")
            
            desired_devices = {"PC", "XboxOne", "XboxSeries", "Xbox360"}
            xbox_games = [
                game for game in response.get("titles", [])
                if desired_devices.intersection(set(game.get("devices", [])))
            ]
            logger.info(f"Titles after filtering: {len(xbox_games)}")
            
            games_info = []
            
            for game in xbox_games:
                try:
                    appid = game["titleId"]
                    last_played = datetime.fromisoformat(game["titleHistory"]["lastTimePlayed"].replace("Z", "+00:00"))
                    
                    if cls.needs_update(game, user):
                        logger.info(f"Updating {game['name']}")
                        url = f"https://xbl.io/api/v2/achievements/stats/{appid}/"
                        response = cls.make_request(url, xbox_api_key)
                        total_playtime = next(
                            (
                                int(stat["value"])
                                for group in response.get("statlistscollection", [])
                                for stat in group.get("stats", [])
                                if stat.get("name") == "MinutesPlayed" and stat.get("value") is not None
                            ),
                            "0"
                        )
                        if total_playtime != "0":
                            first_played = last_played - timedelta(minutes=int(total_playtime))
                        else:
                            first_played = None
                            
                        game_instance, _ = XboxGame.objects.update_or_create(
                            appid=game["titleId"],
                            user=user,
                            defaults={
                                "name": game["name"],
                                "platform": ", ".join(game.get("devices", [])),
                                "total_playtime": total_playtime,
                                "first_played": first_played,
                                "last_played": last_played,
                                "img_icon_url": game["displayImage"]
                            }
                        )
                        
                        url = f"https://xbl.io/api/v2/achievements/player/{xuid}/{appid}/" 
                        logger.info(f"Fetching achievements for {game['name']}")
                        response = cls.make_request(url, xbox_api_key)
                        achievement_list = response.get("achievements", [])
                        logger.info(f"Achievements found: {len(achievement_list)}")
                        
                        unlocked_count = 0
                        for ach in achievement_list:
                            icon_asset = next(
                                (asset.get("url") for asset in ach.get("mediaAssets", []) if asset.get("type") == "Icon"),
                                None
                            )                       
                            time_unlocked = ach.get("progression", {}).get("timeUnlocked", "")
                            raw_rewards = ach.get("rewards", [])
                            first_reward = raw_rewards[0] if raw_rewards else {}  
                            achievement_value = first_reward.get("value", "")
                            
                            is_unlocked = False if time_unlocked == "0001-01-01T00:00:00.0000000Z" else True
                            if is_unlocked:
                                unlocked_count += 1
                                
                            try:
                                XboxAchievement.objects.update_or_create(
                                    game=game_instance,
                                    name=ach["name"],
                                    defaults={
                                        "description": ach.get("lockedDescription", "") + ". " + ach.get("description", ""),
                                        "image": icon_asset,
                                        "unlocked": is_unlocked,
                                        "unlock_time": None if time_unlocked == "0001-01-01T00:00:00.0000000Z" else datetime.fromisoformat(time_unlocked.replace("Z", "+00:00")),
                                        "achievement_value": achievement_value
                                    }
                                )
                            except Exception as e:
                                logger.error(f"Error updating Xbox achievement {ach.get('name', 'Unknown')}: {str(e)}")
                                continue
                        
                        # Get fresh data from database
                        achievements = game_instance.achievements.all()
                        
                        games_info.append({
                            "appid": game_instance.appid,
                            "name": game_instance.name,
                            "platform": game_instance.platform,
                            "total_playtime": game_instance.total_playtime,
                            "first_played": game_instance.first_played,
                            "last_played": game_instance.last_played,
                            "img_icon_url": game_instance.img_icon_url,
                            "total_achievements": achievements.count(),
                            "unlocked_achievements": unlocked_count,
                            "locked_achievements": achievements.count() - unlocked_count,
                            "achievements": list(
                                achievements.values("name", "description", "image", "unlocked", "unlock_time", "achievement_value")
                            )
                        })
                    else:
                        logger.info(f"Skipping {game['name']} - No update needed")
                        
                        # Add to games_info even if not updated
                        game_instance = XboxGame.objects.get(appid=game["titleId"], user=user)
                        achievements = game_instance.achievements.all()
                        unlocked_count = achievements.filter(unlocked=True).count()
                        
                        games_info.append({
                            "appid": game_instance.appid,
                            "name": game_instance.name,
                            "platform": game_instance.platform,
                            "total_playtime": game_instance.total_playtime,
                            "first_played": game_instance.first_played,
                            "last_played": game_instance.last_played,
                            "img_icon_url": game_instance.img_icon_url,
                            "total_achievements": achievements.count(),
                            "unlocked_achievements": unlocked_count,
                            "locked_achievements": achievements.count() - unlocked_count,
                            "achievements": list(
                                achievements.values("name", "description", "image", "unlocked", "unlock_time", "achievement_value")
                            )
                        })
                except Exception as e:
                    logger.error(f"Error processing game {game.get('name', 'Unknown')}: {str(e)}")
                    continue
                
            return {"games": games_info}
        except Exception as e:
            logger.error(f"Error fetching Xbox games: {str(e)}")
            return {"error": f"Error fetching Xbox data: {str(e)}"}
    
    @classmethod
    def get_games_stored(cls, user):
        """Get stored Xbox games for a specific user."""
        if user is None:
            raise ValueError("User must be provided to retrieve their games.")
            
        games_info = []
        for game in XboxGame.objects.filter(user=user).order_by("-last_played"):
            achievements = game.achievements.all()
            unlocked_count = achievements.filter(unlocked=True).count()
            games_info.append({
                "appid": game.appid,
                "name": game.name,
                "platform": game.platform,
                "total_playtime": game.total_playtime,
                "first_played": game.first_played,
                "last_played": game.last_played,
                "img_icon_url": game.img_icon_url,
                "total_achievements": achievements.count(),
                "unlocked_achievements": unlocked_count,
                "locked_achievements": achievements.count() - unlocked_count,
                "achievements": list(
                    achievements.values("name", "description", "image", "unlocked", "unlock_time", "achievement_value")
                ),
            })
        return {"games": games_info}
