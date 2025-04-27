from django.db import models
from django.conf import settings
from datetime import datetime, timedelta
from django.utils.dateparse import parse_datetime
import requests

class XboxGame(models.Model):
    appid = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    platform = models.CharField(max_length=50)
    total_playtime = models.CharField(max_length=50, blank=True)
    first_played = models.DateTimeField(null=True, blank=True)
    last_played = models.DateTimeField(null=True, blank=True)
    img_icon_url = models.URLField(max_length=500, blank=True)
    
    def __str__(self):
        return self.name
    
class XboxAchievement(models.Model):
    game = models.ForeignKey(XboxGame, related_name="achievements", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.URLField(max_length=500, blank=True)
    unlocked = models.BooleanField(default=False)
    unlock_time = models.DateTimeField(null=True, blank=True)
    achievement_value = models.CharField(max_length=50, blank=True)
    
    def __str__(self):
        return f"{self.name} ({'Unlocked' if self.unlocked else 'Locked'})"
    
class XboxAPI:
    @staticmethod
    def make_request(url):
        headers = {
            "x-authorization": settings.OPEN_XBL_API
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            try:
                return response.json()
            except ValueError:
                print(f"Error parsing JSON from URL: {url}")
                return {}  # or None, depending on what you prefer
        else:
            print(f"Bad response from URL {url}: {response.status_code} {response.reason}")
            return {} 
    
    @staticmethod
    def needs_update(game: dict) -> bool:
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
            existing = XboxGame.objects.get(appid=appid)
        except XboxGame.DoesNotExist:
            return True  # Not in DB → needs to be created

        # If last_played from API is newer than in DB → needs update
        if last_played > existing.last_played:
            return True

        return False
    
    @classmethod
    def fetch_games(cls):
        url = "https://xbl.io/api/v2/player/titleHistory"
        print("Making req to url: ", url)
        response = cls.make_request(url)
        print("Title obtained: ",  len(response.get("titles", [])))
        xuid = settings.XUID if settings.XUID != "" else settings.XUID
        desired_devices = {"PC", "XboxOne", "XboxSeries", "Xbox360"}
        xbox_games = [
            game for game in response.get("titles", [])
            if desired_devices.intersection(set(game.get("devices", [])))
        ]
        print("Title after filtered: ", len(xbox_games))
        
        for game in xbox_games:
            appid = game["titleId"]
            last_played = datetime.fromisoformat(game["titleHistory"]["lastTimePlayed"].replace("Z", "+00:00"))
            if(cls.needs_update(game)):
                print("Updating "+game["name"])
                url = f"https://xbl.io/api/v2/achievements/stats/{appid}/"
                response = cls.make_request(url)
                total_playtime = next(
                    (
                        int(stat["value"])
                        for group in response.get("statlistscollection", [])
                        for stat in group.get("stats", [])
                        if stat.get("name") == "MinutesPlayed" and stat.get("value") is not None
                    ),
                    "0"
                )
                if total_playtime is not "0":
                    first_played = last_played - timedelta(minutes=total_playtime)
                else:
                    first_played = None
                game_instance,_ = XboxGame.objects.update_or_create(
                    appid=game["titleId"],
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
                print("\t\tFetching achievements ")
                response = cls.make_request(url)
                achievementList = response.get("achievements")
                print("\t\tAchievements found: ",len(achievementList))
                for ach in achievementList:
                    print("\t\t\t\tAchievement "+ach["name"])
                    icon_asset = next(
                        (asset for asset in ach.get("mediaAssets") if asset.get("type") == "Icon"),
                        None
                    )                       
                    time_unlocked = ach.get("progression").get("timeUnlocked")
                    raw_rewards = ach.get("rewards") or []            # if None or empty, becomes []
                    first_reward = raw_rewards[0] if raw_rewards else {}  
                    achievement_value = first_reward.get("value", "")  # "" if missing

                    XboxAchievement.objects.update_or_create(
                        game=game_instance,
                        name=ach["name"],
                        defaults={
                            "description": ach.get("lockedDescription")+". "+ach.get("description"),
                            "image":icon_asset,
                            "unlocked": False if time_unlocked == "0001-01-01T00:00:00.0000000Z" else True,
                            "unlock_time": time_unlocked,
                            "achievement_value": achievement_value
                        }
                    )
                
            else:
                print("Skipping "+game["name"]+"\tNo update needed")
        
