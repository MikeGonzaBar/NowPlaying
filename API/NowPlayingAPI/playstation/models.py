from django.db import models
from psnawp_api.models import Client
from psnawp_api.models.trophies import PlatformType
from psnawp_api.models.title_stats import PlatformCategory
from datetime import datetime, timedelta
from utils import make_timezone_aware
from django.contrib.auth.models import User
from typing import Callable
import logging
from .auth import create_psnawp_from_stored_auth, serialize_psn_auth_payload

logger = logging.getLogger("playstation")

class PSNGame(models.Model):
    """Stored PlayStation title owned by a local user."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='psn_games')
    appid = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    platform = models.CharField(max_length=50)
    total_playtime = models.CharField(max_length=50, blank=True)
    first_played = models.DateTimeField(null=True, blank=True)
    last_played = models.DateTimeField(null=True, blank=True)
    img_icon_url = models.URLField(max_length=500, blank=True)

    class Meta:
        unique_together = ('user', 'appid')

    def __str__(self) -> str:
        """Return the PlayStation game name."""
        return self.name

class PSNAchievement(models.Model):
    """Stored PlayStation trophy for a game."""

    game = models.ForeignKey(PSNGame, related_name="achievements", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.URLField(max_length=500, blank=True)
    unlocked = models.BooleanField(default=False)
    unlock_time = models.DateTimeField(null=True, blank=True)
    trophy_type = models.CharField(max_length=50, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["game", "name"], name="unique_psn_game_achievement"
            )
        ]

    def __str__(self) -> str:
        """Return the trophy name and lock state."""
        return f"{self.name} ({'Unlocked' if self.unlocked else 'Locked'})"

class PSN:
    """PSNAWP adapter that syncs PlayStation games and trophies."""

    @staticmethod
    def timedelta_to_str(td: timedelta | object) -> str | object:
        """Serialize timedelta values while preserving already-serialized values."""
        return str(td) if isinstance(td, timedelta) else td

    @staticmethod
    def datetime_to_str(dt: datetime | object) -> str | object:
        """Serialize datetime values while preserving already-serialized values."""
        return dt.isoformat() if isinstance(dt, datetime) else dt

    @classmethod
    def fetch_achievements(cls, client: Client, title_id: str, title_category: PlatformCategory) -> dict[str, object]:
        """Fetch trophy details for one PlayStation title."""
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
            logger.error(f"Error fetching trophies for {title_id}: {e}")
            return {"achievements": [], "total": {}, "unlocked": {}}

    @classmethod
    def get_games(
        cls,
        psn_auth: str,
        psn_user_id: str | None = None,
        user: User | None = None,
        auth_update_callback: Callable[[str], None] | None = None,
    ) -> dict[str, object]:
        """Fetch PlayStation titles and sync them into local storage."""
        if user is None:
            raise ValueError("User must be provided to associate games.")
        
        if not psn_auth:
            return {"error": "No PlayStation connection provided."}
            
        try:
            psnawp, _ = create_psnawp_from_stored_auth(psn_auth)
            client = psnawp.me()
            titles = list(client.title_stats())
            
            games_info = []
            for title in titles:
                achievements_data = cls.fetch_achievements(client, title.title_id, title.category)
                
                game, created = PSNGame.objects.update_or_create(
                    appid=title.title_id,
                    user=user,
                    defaults={
                        "name": title.name,
                        "platform": title.category.name,
                        "total_playtime": cls.timedelta_to_str(title.play_duration),
                        "first_played": title.first_played_date_time,
                        "last_played": title.last_played_date_time,
                        "img_icon_url": title.image_url,
                        "user": user,
                    },
                )
                
                unlocked_count = 0
                achievement_objs = []
                for ach in achievements_data["achievements"]:
                    if ach["unlocked"]:
                        unlocked_count += 1
                        
                    try:
                        achievement_objs.append(PSNAchievement(
                            game=game,
                            name=ach["name"],
                            description=ach["description"],
                            image=ach["image"],
                            unlocked=ach["unlocked"],
                            unlock_time=(
                                make_timezone_aware(datetime.fromisoformat(ach["unlock_time"])) if ach["unlock_time"] else None
                            ),
                            trophy_type=ach["type"],
                        ))
                    except Exception as e:
                        logger.error(f"Error preparing PSN achievement {ach.get('name', 'Unknown')}: {str(e)}")
                        continue

                # Single bulk upsert instead of one update_or_create per trophy.
                PSNAchievement.objects.bulk_create(
                    achievement_objs,
                    update_conflicts=True,
                    unique_fields=["game", "name"],
                    update_fields=["description", "image", "unlocked", "unlock_time", "trophy_type"],
                    batch_size=500,
                )
                
                achievements_list = list(
                    game.achievements.all().values("name", "description", "image", "unlocked", "unlock_time", "trophy_type")
                )
                total_achievements = len(achievements_list)
                unlocked_achievements = sum(1 for a in achievements_list if a["unlocked"])
                
                games_info.append({
                    "appid": game.appid,
                    "name": game.name,
                    "platform": game.platform,
                    "total_playtime": game.total_playtime,
                    "first_played": cls.datetime_to_str(game.first_played) if game.first_played else None,
                    "last_played": cls.datetime_to_str(game.last_played) if game.last_played else None,
                    "img_icon_url": game.img_icon_url,
                    "total_achievements": total_achievements,
                    "unlocked_achievements": unlocked_achievements,
                    "locked_achievements": total_achievements - unlocked_achievements,
                    "achievements": achievements_list,
                })
            
            if auth_update_callback:
                refreshed_auth = serialize_psn_auth_payload(psnawp)
                if refreshed_auth:
                    auth_update_callback(refreshed_auth)

            return {"games": games_info}
        except Exception as e:
            logger.error(f"Error fetching PlayStation games: {e}")
            return {"error": f"Failed to fetch PlayStation games: {str(e)}"}

    @classmethod
    def get_games_stored(cls, user: User | None = None) -> dict[str, object]:
        """Return stored PlayStation games and trophies for a user."""
        if user is None:
            raise ValueError("User must be provided to retrieve their games.")
            
        games_info = []
        for game in PSNGame.objects.filter(user=user):
            achievements_qs = game.achievements.all()
            unlocked_count = achievements_qs.filter(unlocked=True).count()
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
                "locked_achievements": achievements_qs.count() - unlocked_count,
                "achievements": list(
                    achievements_qs.values("name", "description", "image", "unlocked", "unlock_time", "trophy_type")
                ),
            })
        return {"games": games_info}
