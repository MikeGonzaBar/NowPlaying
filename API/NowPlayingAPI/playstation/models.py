from django.db import models
from django.conf import settings
from psnawp_api import PSNAWP
from psnawp_api.models import Client
from psnawp_api.models.trophies import PlatformType
from psnawp_api.models.title_stats import PlatformCategory
from datetime import datetime, timezone, timedelta


# Create your models here.
class PSN(models.Model):
    games_data = models.JSONField(default=dict)  # Field to store games data

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
                return []
            trophies = list(
                client.trophies(
                    np_communication_id=TrophyTitleForTitle.np_communication_id,
                    platform=(
                        PlatformType.PS5
                        if title_category == PlatformCategory.PS5
                        else PlatformType.PS4
                    ),
                    include_progress=True,
                )
            )
            if not trophies:
                return {"achievements": [], "total": 0, "unlocked": 0}
            achievements = []
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
            return {"achievements": [], "total": 0, "unlocked": 0}

    @classmethod
    def update_stored_data(cls, games_info):
        stored_data = cls.objects.first() or cls.objects.create(games_data={})
        stored_games_data = stored_data.games_data
        for game_info in games_info:
            appid = game_info["appid"]
            if appid not in stored_games_data:
                stored_games_data[appid] = game_info
            else:
                stored_game_info = stored_games_data[appid]
                if (
                    game_info["unlocked_achievements"]
                    != stored_game_info["unlocked_achievements"]
                ):
                    stored_games_data[appid] = game_info
        stored_data.games_data = stored_games_data
        stored_data.save()

    @classmethod
    def get_games(cls):
        psnawp = PSNAWP(settings.PLAY_STATION_NPSSO)
        client = psnawp.me()
        titles = list(client.title_stats())
        games_info = []
        for title in titles:
            achievements_data = cls.fetch_achievements(
                client, title.title_id, title.category
            )
            game_info = {
                "appid": title.title_id,
                "name": title.name,
                "platform": title.category.name,
                "total_playtime": cls.timedelta_to_str(title.play_duration),
                "first_played": cls.datetime_to_str(title.first_played_date_time),
                "last_played": cls.datetime_to_str(title.last_played_date_time),
                "img_icon_url": title.image_url,
                "total_achievements": achievements_data["total"],
                "unlocked_achievements": achievements_data["unlocked"],
                "achievements": achievements_data["achievements"],
            }
            games_info.append(game_info)

        # Update the stored data in the database
        cls.update_stored_data(games_info)

        return games_info

    @classmethod
    def get_games_stored(cls):
        psn_instance = cls.objects.first()
        return psn_instance.games_data if psn_instance else {}
