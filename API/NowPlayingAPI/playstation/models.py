from django.db import models
from django.conf import settings
from psnawp_api import PSNAWP
from psnawp_api.models import Client
from psnawp_api.models.trophies import PlatformType
from psnawp_api.models.title_stats import PlatformCategory
from datetime import datetime, timezone, timedelta

# Model for PSN games (titles)
class PSNGame(models.Model):
    appid = models.CharField(max_length=100, unique=True)  # title_id from PSN
    name = models.CharField(max_length=255)
    platform = models.CharField(max_length=50)
    total_playtime = models.CharField(max_length=50, blank=True)  # We'll store a string format of the timedelta.
    first_played = models.DateTimeField(null=True, blank=True)
    last_played = models.DateTimeField(null=True, blank=True)
    img_icon_url = models.URLField(max_length=500, blank=True)

    def __str__(self):
        return self.name

# Model for PSN achievements (trophies)
class PSNAchievement(models.Model):
    game = models.ForeignKey(PSNGame, related_name="achievements", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.URLField(max_length=500, blank=True)
    unlocked = models.BooleanField(default=False)
    unlock_time = models.DateTimeField(null=True, blank=True)
    trophy_type = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"{self.name} ({'Unlocked' if self.unlocked else 'Locked'})"
# Create your models here.
class PSN:
    @staticmethod
    def timedelta_to_str(td):
        return str(td) if isinstance(td, timedelta) else td

    @staticmethod
    def datetime_to_str(dt):
        return dt.isoformat() if isinstance(dt, datetime) else dt

    @classmethod
    def fetch_achievements(cls, client: Client, title_id, title_category):
        try:
            TrophyTitleForTitle = list(client.trophy_titles_for_title([title_id]))[0]
            if not TrophyTitleForTitle:
                return {"achievements": [], "total": {}, "unlocked": {}}
            trophies = list(
                client.trophies(
                    np_communication_id=TrophyTitleForTitle.np_communication_id,
                    platform=(PlatformType.PS5 if title_category == PlatformCategory.PS5 else PlatformType.PS4),
                    include_progress=True,
                )
            )
            if not trophies:
                return {"achievements": [], "total": {}, "unlocked": {}}
            achievements = []
            # Counters as dictionaries if needed by your business logic
            trophy_counts = {"platinum": 0, "gold": 0, "silver": 0, "bronze": 0}
            unlocked_counts = {"platinum": 0, "gold": 0, "silver": 0, "bronze": 0}
            for trophy in trophies:
                trophy_type = trophy.trophy_type.name.lower()
                trophy_counts[trophy_type] += 1
                unlocked = trophy.earned
                if unlocked:
                    unlocked_counts[trophy_type] += 1
                achievements.append(
                    {
                        "name": trophy.trophy_name,
                        "description": trophy.trophy_detail,
                        "image": trophy.trophy_icon_url,
                        "unlocked": unlocked,
                        "unlock_time": (
                            cls.datetime_to_str(trophy.earned_date_time)
                            if unlocked and trophy.earned_date_time
                            else None
                        ),
                        "type": trophy_type,
                    }
                )
            return {
                "achievements": achievements,
                "total": trophy_counts,
                "unlocked": unlocked_counts,
            }
        except Exception as e:
            print(f"Error fetching trophies for {title_id}: {e}")
            return {"achievements": [], "total": {}, "unlocked": {}}

    @classmethod
    def get_games(cls):
        psnawp = PSNAWP(settings.PLAY_STATION_NPSSO)
        client = psnawp.me()
        titles = list(client.title_stats())
        
        # Loop through each title and update or create a PSNGame record,
        # then update or create related PSNAchievement records.
        for title in titles:
            achievements_data = cls.fetch_achievements(client, title.title_id, title.category)
            
            # Create or update the game record.
            game, created = PSNGame.objects.update_or_create(
                appid=title.title_id,
                defaults={
                    "name": title.name,
                    "platform": title.category.name,
                    "total_playtime": cls.timedelta_to_str(title.play_duration),
                    "first_played": title.first_played_date_time,
                    "last_played": title.last_played_date_time,
                    "img_icon_url": title.image_url,
                },
            )
            
            # Now, update or create each achievement for this game.
            for ach in achievements_data["achievements"]:
                # We assume the combination of game and achievement name uniquely identifies a trophy.
                PSNAchievement.objects.update_or_create(
                    game=game,
                    name=ach["name"],
                    defaults={
                        "description": ach["description"],
                        "image": ach["image"],
                        "unlocked": ach["unlocked"],
                        # Convert the ISO string to a datetime object if necessary.
                        "unlock_time": (
                            datetime.fromisoformat(ach["unlock_time"]) if ach["unlock_time"] else None
                        ),
                        "trophy_type": ach["type"],
                    },
                )
        
        games_info = []
        for game in PSNGame.objects.all():
            achievements_qs = game.achievements.all()
            achievements_list = list(
                achievements_qs.values("name", "description", "image", "unlocked", "unlock_time", "trophy_type")
            )
            games_info.append({
                "appid": game.appid,
                "name": game.name,
                "platform": game.platform,
                "total_playtime": game.total_playtime,
                "first_played": cls.datetime_to_str(game.first_played) if game.first_played else None,
                "last_played": cls.datetime_to_str(game.last_played) if game.last_played else None,
                "img_icon_url": game.img_icon_url,
                "total_achievements": achievements_qs.count(),
                "unlocked_achievements": achievements_qs.filter(unlocked=True).count(),
                "achievements": achievements_list,
            })
        return games_info

    @classmethod
    def get_games_stored(cls):
        games_info = {}
        for game in PSNGame.objects.all():
            achievements_qs = game.achievements.all()
            games_info[game.appid] = {
                "appid": game.appid,
                "name": game.name,
                "platform": game.platform,
                "total_playtime": game.total_playtime,
                "first_played": cls.datetime_to_str(game.first_played) if game.first_played else None,
                "last_played": cls.datetime_to_str(game.last_played) if game.last_played else None,
                "img_icon_url": game.img_icon_url,
                "total_achievements": achievements_qs.count(),
                "unlocked_achievements": achievements_qs.filter(unlocked=True).count(),
                "achievements": list(
                    achievements_qs.values("name", "description", "image", "unlocked", "unlock_time", "trophy_type")
                ),
            }
        return games_info