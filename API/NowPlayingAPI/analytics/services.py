from typing import Any

from django.contrib.auth.models import User
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.core.cache import cache
from datetime import datetime, timedelta, date
from collections import Counter
from .models import GamingStreak
from steam.models import Game as SteamGame, Achievement as SteamAchievement
from playstation.models import PSNGame, PSNAchievement
from xbox.models import XboxGame, XboxAchievement
from retroachievements.models import RetroAchievementsGame, GameAchievement
from music.models import Song
from users.models import UserApiKey
from trakt.models import MovieWatch, EpisodeWatch
from utils import versioned_cache_key, versioned_cache_invalidate
import logging
import re

# pyright: reportAttributeAccessIssue=false

logger = logging.getLogger(__name__)

StatsPayload = dict[str, Any]
StatsList = list[StatsPayload]

ANALYTICS_CACHE_NS = "analytics"


class AnalyticsService:
    """Optimized service class for calculating and managing user statistics"""

    @staticmethod
    def invalidate_user_cache(user_id: int) -> int:
        """Invalidate all cached analytics for a user in O(1).

        Bumping the generation retires every day-bucketed analytics key at once;
        old keys expire via their natural TTL. The new generation is returned
        for callers to include in logs.
        """
        return versioned_cache_invalidate(ANALYTICS_CACHE_NS, user_id)
    
    @staticmethod
    def _format_duration(duration: timedelta | None) -> str:
        """Convert timedelta to human-readable string"""
        if not duration or duration.total_seconds() == 0:
            return "0 minutes"
        
        total_seconds = int(duration.total_seconds())
        days = total_seconds // 86400
        hours = (total_seconds % 86400) // 3600
        minutes = (total_seconds % 3600) // 60
        
        parts = []
        if days > 0:
            parts.append(f"{days} day{'s' if days != 1 else ''}")
        if hours > 0:
            parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
        if minutes > 0:
            parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
        
        if not parts:
            return "0 minutes"
        
        if len(parts) == 1:
            return parts[0]
        elif len(parts) == 2:
            return f"{parts[0]} and {parts[1]}"
        else:
            return f"{parts[0]}, {parts[1]} and {parts[2]}"

    @staticmethod
    def _game_identity(value: object) -> str:
        """Normalize common edition and punctuation differences for unique game totals."""
        text = str(value or "").strip().lower()
        text = re.sub(r"\s*\([^)]*\)", "", text)
        text = re.sub(r"\s*\[[^]]*\]", "", text)
        text = re.sub(
            r"\b(?:goty|game of the year|definitive|remastered|remake|edition|deluxe|special|international|complete|ultimate)\b",
            "",
            text,
        )
        return re.sub(r"[^a-z0-9]+", " ", text).strip()

    @staticmethod
    def _unique_game_count(user: User, start_datetime: datetime, end_datetime: datetime) -> int:
        titles = set()
        for model, title_field in (
            (SteamGame, "name"),
            (PSNGame, "name"),
            (XboxGame, "name"),
            (RetroAchievementsGame, "title"),
        ):
            titles.update(
                AnalyticsService._game_identity(title)
                for title in model.objects.filter(
                    user=user,
                    last_played__gte=start_datetime,
                    last_played__lte=end_datetime,
                ).values_list(title_field, flat=True)
            )
        return len({title for title in titles if title})
    
    @staticmethod
    def get_comprehensive_statistics(user: User, days: int = 30) -> StatsPayload:
        """Get comprehensive statistics calculated live from source models with caching"""
        cache_key = versioned_cache_key(ANALYTICS_CACHE_NS, user.id, f"{days}_{timezone.now().date()}")
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        
        steam_games = SteamGame.objects.filter(
            user=user,
            last_played__gte=start_datetime,
            last_played__lte=end_datetime
        ).aggregate(
            count=Count('id'),
            total_playtime=Sum('playtime_forever')
        )
        
        steam_achievements = SteamAchievement.objects.filter(
            game__user=user,
            unlock_time__gte=start_datetime,
            unlock_time__lte=end_datetime,
            unlocked=True
        ).count()
        
        psn_games_count = PSNGame.objects.filter(
            user=user,
            last_played__gte=start_datetime,
            last_played__lte=end_datetime
        ).count()
        
        psn_achievements = PSNAchievement.objects.filter(
            game__user=user,
            unlock_time__gte=start_datetime,
            unlock_time__lte=end_datetime,
            unlocked=True
        ).count()
        
        xbox_games_count = XboxGame.objects.filter(
            user=user,
            last_played__gte=start_datetime,
            last_played__lte=end_datetime
        ).count()
        
        xbox_achievements = XboxAchievement.objects.filter(
            game__user=user,
            unlock_time__gte=start_datetime,
            unlock_time__lte=end_datetime,
            unlocked=True
        ).count()
        
        retro_games_count = RetroAchievementsGame.objects.filter(
            user=user,
            last_played__gte=start_datetime,
            last_played__lte=end_datetime
        ).count()
        
        retro_achievements = GameAchievement.objects.filter(
            game__user=user,
            date_earned__gte=start_datetime,
            date_earned__lte=end_datetime
        ).count()
        
        total_games_played = AnalyticsService._unique_game_count(user, start_datetime, end_datetime)
        total_achievements_earned = (
            steam_achievements + psn_achievements + 
            xbox_achievements + retro_achievements
        )
        total_gaming_time = timedelta(minutes=steam_games['total_playtime'] or 0)
        
        songs_data = Song.objects.filter(
            user=user,
            played_at__gte=start_datetime,
            played_at__lte=end_datetime
        ).aggregate(
            count=Count('id'),
            total_duration=Sum('duration_ms')
        )
        
        total_songs_listened = songs_data['count'] or 0
        total_duration_ms = songs_data['total_duration'] or 0
        total_listening_time = timedelta(milliseconds=total_duration_ms)
        if total_listening_time.total_seconds() == 0 and total_songs_listened > 0:
            total_listening_time = timedelta(minutes=round(total_songs_listened * 3.5))
        
        movie_watches_count = MovieWatch.objects.filter(
            movie__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime
        ).count()
        
        episode_watches_count = EpisodeWatch.objects.filter(
            episode__show__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime
        ).count()
        
        total_watch_time = timedelta(
            hours=2 * movie_watches_count,
            minutes=45 * episode_watches_count
        )
        
        total_engagement_time = total_gaming_time + total_listening_time + total_watch_time
        
        total_games_completed = AnalyticsService._calculate_games_completed(user, days)
        
        result = {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days,
            },
            'totals': {
                'total_games_played': total_games_played,
                'total_games_completed': total_games_completed,
                'total_gaming_time': AnalyticsService._format_duration(total_gaming_time),
                'total_achievements_earned': total_achievements_earned,
                'total_songs_listened': total_songs_listened,
                'total_listening_time': AnalyticsService._format_duration(total_listening_time),
                'total_movies_watched': movie_watches_count,
                'total_episodes_watched': episode_watches_count,
                'total_watch_time': AnalyticsService._format_duration(total_watch_time),
                'total_engagement_time': AnalyticsService._format_duration(total_engagement_time),
            },
            'averages': {
                'avg_games_per_day': round(total_games_played / days, 1),
                'avg_achievements_per_day': round(total_achievements_earned / days, 1),
                'avg_songs_per_day': round(total_songs_listened / days, 1),
                'avg_gaming_time_per_day': AnalyticsService._format_duration(total_gaming_time / days),
                'avg_listening_time_per_day': AnalyticsService._format_duration(total_listening_time / days),
                'avg_watch_time_per_day': AnalyticsService._format_duration(total_watch_time / days),
            },
            'daily_stats': AnalyticsService._get_daily_breakdown(user, start_date, end_date),
        }
        
        cache.set(cache_key, result, 3600)
        return result
    
    @staticmethod
    def _by_day(qs, field: str, start_dt: datetime, end_dt: datetime, **aggs) -> dict[date, dict]:
        """Aggregate rows into per-day buckets with a single grouped query.

        Filters `qs` to [start_dt, end_dt] on `field`, buckets by TruncDate
        and applies the given annotation expressions. Returns
        {date: {'day': date, <agg keys>: value}}. Replaces the O(days) loop of
        one-query-per-day with one query for the whole window.
        """
        rows = (
            qs.filter(**{f"{field}__gte": start_dt, f"{field}__lte": end_dt})
            .annotate(day=TruncDate(field))
            .values("day")
            .annotate(**aggs)
        )
        return {r["day"]: r for r in rows if r["day"] is not None}

    @staticmethod
    def _titles_by_day(
        model, title_field: str, user: User, start_dt: datetime, end_dt: datetime
    ) -> dict[date, set[str]]:
        """Normalized per-day title sets for one game platform (single query)."""
        qs = model.objects.filter(
            user=user, last_played__gte=start_dt, last_played__lte=end_dt
        ).annotate(day=TruncDate("last_played"))
        buckets: dict[date, set[str]] = {}
        for day, title in qs.values_list("day", title_field):
            buckets.setdefault(day, set()).add(AnalyticsService._game_identity(title))
        return buckets

    @staticmethod
    def _get_daily_breakdown(user: User, start_date: date, end_date: date) -> StatsList:
        """Get optimized daily breakdown of activity.

        All per-day metrics are computed with a constant number of grouped
        queries (independent of the window length) instead of one query per
        metric per day.
        """
        start_dt = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_dt = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

        movies = AnalyticsService._by_day(
            MovieWatch.objects.filter(movie__user=user), "watched_at", start_dt, end_dt, c=Count("id")
        )
        episodes = AnalyticsService._by_day(
            EpisodeWatch.objects.filter(episode__show__user=user), "watched_at", start_dt, end_dt, c=Count("id")
        )
        songs = AnalyticsService._by_day(
            Song.objects.filter(user=user), "played_at", start_dt, end_dt, c=Count("id")
        )

        achievements: dict[date, int] = {}
        for model, field, extra in (
            (SteamAchievement, "unlock_time", {"unlocked": True}),
            (PSNAchievement, "unlock_time", {"unlocked": True}),
            (XboxAchievement, "unlock_time", {"unlocked": True}),
            (GameAchievement, "date_earned", {}),
        ):
            for day, row in AnalyticsService._by_day(
                model.objects.filter(game__user=user, **extra), field, start_dt, end_dt, c=Count("id")
            ).items():
                achievements[day] = achievements.get(day, 0) + row["c"]

        # Cross-platform unique game titles per day (same normalization and
        # dedup semantics as _unique_game_count, bucketed per day).
        titles_per_day: dict[date, set[str]] = {}
        for model, title_field in (
            (SteamGame, "name"),
            (PSNGame, "name"),
            (XboxGame, "name"),
            (RetroAchievementsGame, "title"),
        ):
            for day, titles in AnalyticsService._titles_by_day(
                model, title_field, user, start_dt, end_dt
            ).items():
                titles_per_day.setdefault(day, set()).update(titles)

        daily_stats = []
        current_date = start_date
        while current_date <= end_date:
            daily_movies = movies.get(current_date, {}).get("c", 0)
            daily_episodes = episodes.get(current_date, {}).get("c", 0)
            daily_songs = songs.get(current_date, {}).get("c", 0)
            daily_achievements = achievements.get(current_date, 0)
            daily_games = len({t for t in titles_per_day.get(current_date, set()) if t})

            if daily_movies > 0 or daily_episodes > 0 or daily_games > 0 or daily_songs > 0:
                daily_stats.append({
                    'date': current_date.isoformat(),
                    'games_played': daily_games,
                    'achievements_earned': daily_achievements,
                    'songs_listened': daily_songs,
                    'movies_watched': daily_movies,
                    'episodes_watched': daily_episodes,
                    'total_engagement_time': AnalyticsService._format_duration(timedelta(
                        hours=2 * daily_movies,
                        minutes=45 * daily_episodes
                    )),
                })

            current_date += timedelta(days=1)

        return daily_stats
    
    @staticmethod
    def get_platform_distribution(user: User, days: int = 30) -> StatsPayload:
        """Get optimized platform usage distribution"""
        cache_key = versioned_cache_key(ANALYTICS_CACHE_NS, user.id, f"pd_{days}_{timezone.now().date()}")
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        
        platforms = {
            'steam': {'games': 0, 'achievements': 0, 'playtime': timedelta()},
            'psn': {'games': 0, 'achievements': 0, 'playtime': timedelta()},
            'xbox': {'games': 0, 'achievements': 0, 'playtime': timedelta()},
            'retroachievements': {'games': 0, 'achievements': 0, 'playtime': timedelta()},
            'spotify': {'songs': 0, 'listening_time': timedelta()},
            'lastfm': {'songs': 0, 'listening_time': timedelta()},
            'trakt': {'movies': 0, 'episodes': 0, 'watch_time': timedelta()},
        }
        connected_services = set(
            UserApiKey.objects.filter(user=user).values_list('service_name', flat=True)
        )
        platforms['spotify']['connected'] = 'spotify' in connected_services
        platforms['lastfm']['connected'] = 'lastfm' in connected_services
        
        steam_data = SteamGame.objects.filter(
            user=user,
            last_played__gte=start_datetime,
            last_played__lte=end_datetime
        ).aggregate(
            count=Count('id'),
            total_playtime=Sum('playtime_forever')
        )
        platforms['steam']['games'] = steam_data['count'] or 0
        platforms['steam']['playtime'] = timedelta(minutes=steam_data['total_playtime'] or 0)
        platforms['steam']['achievements'] = SteamAchievement.objects.filter(
            game__user=user,
            unlock_time__gte=start_datetime,
            unlock_time__lte=end_datetime,
            unlocked=True
        ).count()
        
        platforms['psn']['games'] = PSNGame.objects.filter(user=user, last_played__gte=start_datetime, last_played__lte=end_datetime).count()
        platforms['psn']['achievements'] = PSNAchievement.objects.filter(
            game__user=user, unlock_time__gte=start_datetime, unlock_time__lte=end_datetime, unlocked=True
        ).count()
        
        platforms['xbox']['games'] = XboxGame.objects.filter(user=user, last_played__gte=start_datetime, last_played__lte=end_datetime).count()
        platforms['xbox']['achievements'] = XboxAchievement.objects.filter(
            game__user=user, unlock_time__gte=start_datetime, unlock_time__lte=end_datetime, unlocked=True
        ).count()
        
        platforms['retroachievements']['games'] = RetroAchievementsGame.objects.filter(
            user=user, last_played__gte=start_datetime, last_played__lte=end_datetime
        ).count()
        platforms['retroachievements']['achievements'] = GameAchievement.objects.filter(
            game__user=user, date_earned__gte=start_datetime, date_earned__lte=end_datetime
        ).count()
        
        spotify_data = Song.objects.filter(
            user=user, played_at__gte=start_datetime, played_at__lte=end_datetime, source='spotify'
        ).aggregate(count=Count('id'), total_duration=Sum('duration_ms'))
        platforms['spotify']['songs'] = spotify_data['count'] or 0
        platforms['spotify']['listening_time'] = timedelta(milliseconds=spotify_data['total_duration'] or 0)
        if platforms['spotify']['songs'] and platforms['spotify']['listening_time'].total_seconds() == 0:
            platforms['spotify']['listening_time'] = timedelta(minutes=round(platforms['spotify']['songs'] * 3.5))
        
        lastfm_data = Song.objects.filter(
            user=user, played_at__gte=start_datetime, played_at__lte=end_datetime, source='lastfm'
        ).aggregate(count=Count('id'), total_duration=Sum('duration_ms'))
        platforms['lastfm']['songs'] = lastfm_data['count'] or 0
        platforms['lastfm']['listening_time'] = timedelta(milliseconds=lastfm_data['total_duration'] or 0)
        if platforms['lastfm']['songs'] and platforms['lastfm']['listening_time'].total_seconds() == 0:
            platforms['lastfm']['listening_time'] = timedelta(minutes=round(platforms['lastfm']['songs'] * 3.5))
        
        movie_watches = MovieWatch.objects.filter(movie__user=user, watched_at__gte=start_datetime, watched_at__lte=end_datetime).count()
        episode_watches = EpisodeWatch.objects.filter(episode__show__user=user, watched_at__gte=start_datetime, watched_at__lte=end_datetime).count()
        
        platforms['trakt']['movies'] = movie_watches
        platforms['trakt']['episodes'] = episode_watches
        platforms['trakt']['watch_time'] = timedelta(hours=2 * movie_watches, minutes=45 * episode_watches)
        
        formatted_platforms = {}
        for platform, data in platforms.items():
            formatted_data = data.copy()
            
            if 'playtime' in formatted_data:
                formatted_data['playtime'] = AnalyticsService._format_duration(formatted_data['playtime'])
            if 'listening_time' in formatted_data:
                formatted_data['listening_time'] = AnalyticsService._format_duration(formatted_data['listening_time'])
            if 'watch_time' in formatted_data:
                formatted_data['watch_time'] = AnalyticsService._format_duration(formatted_data['watch_time'])
            
            formatted_platforms[platform] = formatted_data
        
        cache.set(cache_key, formatted_platforms, 3600)
        return formatted_platforms
    
    @staticmethod
    def get_achievement_efficiency(user: User, days: int = 30) -> StatsPayload:
        """Calculate optimized achievement efficiency (achievements per hour)"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        
        total_achievements = (
            SteamAchievement.objects.filter(
                game__user=user, unlock_time__gte=start_datetime, unlocked=True
            ).count() +
            PSNAchievement.objects.filter(
                game__user=user, unlock_time__gte=start_datetime, unlocked=True
            ).count() +
            XboxAchievement.objects.filter(
                game__user=user, unlock_time__gte=start_datetime, unlocked=True
            ).count() +
            GameAchievement.objects.filter(
                game__user=user, date_earned__gte=start_datetime
            ).count()
        )
        
        steam_playtime = SteamGame.objects.filter(
            user=user, last_played__gte=start_datetime
        ).aggregate(total=Sum('playtime_forever'))['total'] or 0
        total_gaming_time = timedelta(minutes=steam_playtime)
        
        efficiency = 0
        if total_gaming_time.total_seconds() > 0:
            efficiency = total_achievements / (total_gaming_time.total_seconds() / 3600)
        
        return {
            'total_achievements': total_achievements,
            'total_gaming_time': AnalyticsService._format_duration(total_gaming_time),
            'efficiency_per_hour': round(efficiency, 2),
        }
    
    @staticmethod
    def get_gaming_streaks(user: User) -> StatsList:
        """Get user's gaming streaks"""
        streaks = GamingStreak.objects.filter(user=user).order_by('-streak_length')[:10]
        
        return [
            {
                'start_date': streak.start_date.isoformat(),
                'end_date': streak.end_date.isoformat(),
                'streak_length': streak.streak_length,
                'total_gaming_time': AnalyticsService._format_duration(streak.total_gaming_time),
                'games_played': streak.games_played,
                'achievements_earned': streak.achievements_earned,
            }
            for streak in streaks
        ]
    
    @staticmethod
    def _format_time_ago(minutes: float) -> str:
        """Format minutes into human-readable time ago string"""
        if minutes < 1:
            return "0 minutes ago"
        elif minutes < 60:
            return f"{int(minutes)} minute{'s' if int(minutes) != 1 else ''} ago"
        elif minutes < 1440:
            hours = int(minutes // 60)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = int(minutes // 1440)
            return f"{days} day{'s' if days != 1 else ''} ago"
    
    @staticmethod
    def get_last_played_time(user: User) -> str | None:
        """Get time since last song was played"""
        last_song = Song.objects.filter(user=user).order_by('-played_at').first()
        if not last_song:
            return None
        
        time_diff = timezone.now() - last_song.played_at
        minutes_ago = time_diff.total_seconds() / 60
        return AnalyticsService._format_time_ago(minutes_ago)
    
    @staticmethod
    def get_weekly_trend(user: User, days: int = 30) -> list:
        """Get weekly trend data for Time Dedicated Trend chart - returns last 7 days (rolling)"""
        end_date = timezone.now().date()
        chart_start_date = end_date - timedelta(days=6)
        
        max_total_time = 0
        
        # Grouped queries: one per metric for the whole 7-day window, instead
        # of ~11 queries per day.
        start_dt = timezone.make_aware(datetime.combine(chart_start_date, datetime.min.time()))
        end_dt = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

        achievements_by_day: dict[date, int] = {}
        for model, field, extra in (
            (SteamAchievement, "unlock_time", {"unlocked": True}),
            (PSNAchievement, "unlock_time", {"unlocked": True}),
            (XboxAchievement, "unlock_time", {"unlocked": True}),
            (GameAchievement, "date_earned", {}),
        ):
            for day, row in AnalyticsService._by_day(
                model.objects.filter(game__user=user, **extra), field, start_dt, end_dt, c=Count("id")
            ).items():
                achievements_by_day[day] = achievements_by_day.get(day, 0) + row["c"]

        games_by_day: dict[date, int] = {}
        for model in (SteamGame, PSNGame, XboxGame, RetroAchievementsGame):
            for day, row in AnalyticsService._by_day(
                model.objects.filter(user=user), "last_played", start_dt, end_dt, c=Count("id")
            ).items():
                games_by_day[day] = games_by_day.get(day, 0) + row["c"]

        songs_by_day = AnalyticsService._by_day(
            Song.objects.filter(user=user), "played_at", start_dt, end_dt,
            total_duration=Sum("duration_ms"), count=Count("id"),
        )
        movies_by_day = AnalyticsService._by_day(
            MovieWatch.objects.filter(movie__user=user), "watched_at", start_dt, end_dt, c=Count("id")
        )
        episodes_by_day = AnalyticsService._by_day(
            EpisodeWatch.objects.filter(episode__show__user=user), "watched_at", start_dt, end_dt, c=Count("id")
        )

        daily_data = []
        for i in range(7):
            day_date = chart_start_date + timedelta(days=i)
            if day_date > end_date:
                break

            daily_achievements = achievements_by_day.get(day_date, 0)
            daily_games_played = games_by_day.get(day_date, 0)
            
            raw_gaming_minutes = (daily_achievements * 30) + (daily_games_played * 60)
            estimated_gaming_minutes = min(raw_gaming_minutes, 24 * 60)
            day_gaming_time = timedelta(minutes=estimated_gaming_minutes)
            if raw_gaming_minutes > 24 * 60:
                logger.info(
                    "weekly_trend capped gaming for %s: achievements=%s games_played=%s raw_hours=%.1f capped_to_24h",
                    day_date, daily_achievements, daily_games_played, raw_gaming_minutes / 60
                )
            logger.debug(
                "weekly_trend day=%s achievements=%s games_played=%s estimated_min=%s gaming_hours=%.1f",
                day_date, daily_achievements, daily_games_played, estimated_gaming_minutes,
                day_gaming_time.total_seconds() / 3600
            )
            
            song_row = songs_by_day.get(day_date, {})
            total_ms = song_row.get("total_duration") or 0
            song_count = song_row.get("count") or 0
            if total_ms > 0:
                day_music_time = timedelta(milliseconds=total_ms)
            else:
                day_music_time = timedelta(minutes=3.5 * song_count)
            
            day_movie_watches = movies_by_day.get(day_date, {}).get("c", 0)
            
            day_episode_watches = episodes_by_day.get(day_date, {}).get("c", 0)
            
            day_tv_time = timedelta(
                hours=2 * day_movie_watches,
                minutes=45 * day_episode_watches
            )
            
            total_day_time = day_gaming_time + day_music_time + day_tv_time
            max_total_time = max(max_total_time, total_day_time.total_seconds())
            
            daily_data.append({
                'date': day_date,
                'gaming_time': day_gaming_time,
                'music_time': day_music_time,
                'tv_time': day_tv_time,
                'games_played': daily_games_played,
            })
        
        daily_stats = []
        for day_data in daily_data:
            total_time = day_data['gaming_time'] + day_data['music_time'] + day_data['tv_time']
            
            if total_time.total_seconds() > 0:
                gaming_pct = (day_data['gaming_time'].total_seconds() / total_time.total_seconds()) * 100
                music_pct = (day_data['music_time'].total_seconds() / total_time.total_seconds()) * 100
                tv_pct = (day_data['tv_time'].total_seconds() / total_time.total_seconds()) * 100
            else:
                gaming_pct = 0
                music_pct = 0
                tv_pct = 0
            
            if max_total_time > 0:
                relative_height = (total_time.total_seconds() / max_total_time) * 100
            else:
                relative_height = 0
            
            gaming_time_hours = day_data['gaming_time'].total_seconds() / 3600
            gaming_time_minutes = day_data['gaming_time'].total_seconds() / 60
            games_played = day_data.get('games_played', 0)
            avg_session_minutes = 0
            if games_played > 0:
                avg_session_minutes = max(60, gaming_time_minutes / games_played)
            elif gaming_time_minutes > 0:
                avg_session_minutes = gaming_time_minutes
            
            day_result = {
                'date': day_data['date'].isoformat(),
                'day_name': day_data['date'].strftime('%a'),
                'gaming_percentage': round(gaming_pct, 1),
                'music_percentage': round(music_pct, 1),
                'tv_percentage': round(tv_pct, 1),
                'gaming_time_hours': gaming_time_hours,
                'music_time_hours': day_data['music_time'].total_seconds() / 3600,
                'tv_time_hours': day_data['tv_time'].total_seconds() / 3600,
                'avg_session_duration_minutes': round(avg_session_minutes, 0),
                'relative_height': round(relative_height, 1),
            }
            
            daily_stats.append(day_result)
        
        return daily_stats
    
    @staticmethod
    def get_monthly_comparison(user: User, days: int = 30) -> StatsPayload:
        """Calculate engagement time comparison with previous month"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        previous_start = start_date - timedelta(days=days)
        
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        previous_start_datetime = timezone.make_aware(datetime.combine(previous_start, datetime.min.time()))
        
        current_gaming = timedelta(minutes=SteamGame.objects.filter(
            user=user, last_played__gte=start_datetime
        ).aggregate(total=Sum('playtime_forever'))['total'] or 0)
        
        current_songs = Song.objects.filter(
            user=user, played_at__gte=start_datetime
        ).aggregate(total_duration=Sum('duration_ms'))
        current_music = timedelta(milliseconds=current_songs['total_duration'] or 0)
        
        current_movies = MovieWatch.objects.filter(
            movie__user=user, watched_at__gte=start_datetime
        ).count()
        current_episodes = EpisodeWatch.objects.filter(
            episode__show__user=user, watched_at__gte=start_datetime
        ).count()
        current_tv = timedelta(hours=2 * current_movies, minutes=45 * current_episodes)
        
        current_total = current_gaming + current_music + current_tv
        
        previous_gaming = timedelta(minutes=SteamGame.objects.filter(
            user=user, last_played__gte=previous_start_datetime, last_played__lt=start_datetime
        ).aggregate(total=Sum('playtime_forever'))['total'] or 0)
        
        previous_songs = Song.objects.filter(
            user=user, played_at__gte=previous_start_datetime, played_at__lt=start_datetime
        ).aggregate(total_duration=Sum('duration_ms'))
        previous_music = timedelta(milliseconds=previous_songs['total_duration'] or 0)
        
        previous_movies = MovieWatch.objects.filter(
            movie__user=user, watched_at__gte=previous_start_datetime, watched_at__lt=start_datetime
        ).count()
        previous_episodes = EpisodeWatch.objects.filter(
            episode__show__user=user, watched_at__gte=previous_start_datetime, watched_at__lt=start_datetime
        ).count()
        previous_tv = timedelta(hours=2 * previous_movies, minutes=45 * previous_episodes)
        
        previous_total = previous_gaming + previous_music + previous_tv
        
        if previous_total.total_seconds() > 0:
            change_pct = ((current_total.total_seconds() - previous_total.total_seconds()) / previous_total.total_seconds()) * 100
        else:
            change_pct = 100 if current_total.total_seconds() > 0 else 0
        
        return {
            'current_time': current_total.total_seconds() / 3600,
            'previous_time': previous_total.total_seconds() / 3600,
            'change_percentage': round(change_pct, 1),
        }
    
    @staticmethod
    def get_platform_count(user: User, days: int = 30) -> int:
        """Get count of active platforms"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        active_platforms = 0
        
        if SteamGame.objects.filter(user=user, last_played__gte=start_date).exists():
            active_platforms += 1
        if PSNGame.objects.filter(user=user, last_played__gte=start_date).exists():
            active_platforms += 1
        if XboxGame.objects.filter(user=user, last_played__gte=start_date).exists():
            active_platforms += 1
        if RetroAchievementsGame.objects.filter(user=user, last_played__gte=start_date).exists():
            active_platforms += 1
        
        if Song.objects.filter(user=user, played_at__gte=start_date, source='spotify').exists():
            active_platforms += 1
        if Song.objects.filter(user=user, played_at__gte=start_date, source='lastfm').exists():
            active_platforms += 1
        
        if (MovieWatch.objects.filter(movie__user=user, watched_at__gte=start_date).exists() or
            EpisodeWatch.objects.filter(episode__show__user=user, watched_at__gte=start_date).exists()):
            active_platforms += 1
        
        return active_platforms
    
    @staticmethod
    def get_genre_distribution(user: User, days: int = 30) -> StatsPayload:
        """Get genre distribution across gaming, music, and movies/TV"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        genres = []
        
        
        gaming_count = (
            SteamGame.objects.filter(user=user, last_played__gte=start_date).count() +
            PSNGame.objects.filter(user=user, last_played__gte=start_date).count() +
            XboxGame.objects.filter(user=user, last_played__gte=start_date).count() +
            RetroAchievementsGame.objects.filter(user=user, last_played__gte=start_date).count()
        )
        
        music_count = Song.objects.filter(
            user=user, played_at__gte=start_date
        ).count()
        
        tv_count = (
            MovieWatch.objects.filter(movie__user=user, watched_at__gte=start_date).count() +
            EpisodeWatch.objects.filter(episode__show__user=user, watched_at__gte=start_date).count()
        )
        
        total = gaming_count + music_count + tv_count
        if total > 0:
            gaming_pct = (gaming_count / total) * 100
            music_pct = (music_count / total) * 100
            tv_pct = (tv_count / total) * 100
            
            if gaming_pct > 0:
                genres.append({
                    'name': 'Gaming',
                    'percentage': round(gaming_pct, 1),
                    'type': 'gaming'
                })
            if music_pct > 0:
                genres.append({
                    'name': 'Music',
                    'percentage': round(music_pct, 1),
                    'type': 'music'
                })
            if tv_pct > 0:
                genres.append({
                    'name': 'TV & Movies',
                    'percentage': round(tv_pct, 1),
                    'type': 'tv'
                })
        
        return {
            'genres': genres,
            'total_tags': len(genres)
        }
    
    
    @staticmethod
    def get_top_artist(user: User, days: int = 30) -> StatsPayload | None:
        """Get top artist by scrobble count in period"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        top = (
            Song.objects.filter(user=user, played_at__gte=start_datetime, played_at__lte=end_datetime)
            .values('artist')
            .annotate(count=Count('id'))
            .order_by('-count')
            .first()
        )
        if not top:
            return None
        artist_album = Song.objects.filter(
            user=user, artist=top['artist'],
            played_at__gte=start_datetime, played_at__lte=end_datetime
        ).exclude(album__isnull=True).exclude(album='').values('album').annotate(c=Count('id')).order_by('-c').first()
        return {
            'name': top['artist'],
            'scrobbles': top['count'],
            'top_album': artist_album.get('album') if artist_album else None,
        }
    
    @staticmethod
    def get_top_track(user: User, days: int = 30) -> StatsPayload | None:
        """Get top track by play count in period"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        top = (
            Song.objects.filter(user=user, played_at__gte=start_datetime, played_at__lte=end_datetime)
            .values('title', 'artist')
            .annotate(count=Count('id'))
            .order_by('-count')
            .first()
        )
        if not top:
            return None
        last_played = (
            Song.objects.filter(
                user=user, title=top['title'], artist=top['artist'],
                played_at__gte=start_datetime, played_at__lte=end_datetime
            )
            .order_by('-played_at')
            .first()
        )
        return {
            'title': top['title'],
            'artist': top['artist'],
            'plays': top['count'],
            'recently_played': AnalyticsService._format_time_ago(
                (timezone.now() - last_played.played_at).total_seconds() / 60
            ) if last_played else None,
        }
    
    @staticmethod
    def get_new_discoveries(user: User, days: int = 30) -> StatsPayload:
        """Count of artists first seen in this period (not in previous period). Optional: change vs last period."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        prev_start = start_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        prev_start_datetime = timezone.make_aware(datetime.combine(prev_start, datetime.min.time()))
        artists_in_period = set(
            Song.objects.filter(
                user=user, played_at__gte=start_datetime, played_at__lte=end_datetime
            ).values_list('artist', flat=True).distinct()
        )
        artists_before = set(
            Song.objects.filter(user=user, played_at__lt=start_datetime).values_list('artist', flat=True).distinct()
        )
        new_artists = artists_in_period - artists_before
        count_prev = 0
        if prev_start_datetime:
            artists_prev_period = set(
                Song.objects.filter(
                    user=user, played_at__gte=prev_start_datetime, played_at__lt=start_datetime
                ).values_list('artist', flat=True).distinct()
            )
            artists_before_prev = set(
                Song.objects.filter(user=user, played_at__lt=prev_start_datetime).values_list('artist', flat=True).distinct()
            )
            count_prev = len(artists_prev_period - artists_before_prev)
        change_pct = None
        if count_prev and count_prev > 0:
            change_pct = round(((len(new_artists) - count_prev) / count_prev) * 100, 0)
        return {
            'new_artists_count': len(new_artists),
            'change_percentage': change_pct,
        }
    
    @staticmethod
    def get_music_listening_insights(user: User, days: int = 30) -> StatsPayload:
        """Morning vs evening listening, scrobble milestone."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        songs = Song.objects.filter(
            user=user, played_at__gte=start_datetime, played_at__lte=end_datetime
        ).only('played_at')
        morning = 0
        evening = 0
        for s in songs:
            h = s.played_at.hour
            if 5 <= h < 12:
                morning += 1
            elif 18 <= h <= 23 or h == 0:
                evening += 1
        total = morning + evening
        evening_pct = round((evening / total) * 100, 0) if total else 0
        listener_type = 'Evening Listener' if evening_pct >= 50 else 'Morning Listener'
        total_scrobbles = Song.objects.filter(user=user).count()
        milestone = 50000
        while total_scrobbles >= milestone:
            milestone += 50000
        return {
            'morning_vs_evening': listener_type,
            'evening_percentage': evening_pct,
            'scrobble_milestone': {
                'current': total_scrobbles,
                'target': milestone,
                'percentage': round((total_scrobbles / milestone) * 100, 1) if milestone else 0,
            },
        }
    
    @staticmethod
    def get_music_genre_distribution(user: User, days: int = 30) -> StatsPayload:
        """Get music genre distribution from stored Last.fm/Spotify tags."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

        counts = Counter()
        songs = Song.objects.filter(
            user=user,
            played_at__gte=start_datetime,
            played_at__lte=end_datetime,
        ).only("genre_tags")

        tagged_song_count = 0
        for song in songs:
            tags = song.genre_tags or []
            if tags:
                tagged_song_count += 1
            for tag in tags:
                if tag:
                    counts[str(tag)] += 1

        total_hits = sum(counts.values())
        genres = []
        if total_hits:
            for name, count in counts.most_common(6):
                genres.append({
                    'name': name,
                    'count': count,
                    'percentage': round((count / total_hits) * 100),
                })

        return {
            'genres': genres,
            'total_count': len(counts),
            'tagged_songs': tagged_song_count,
        }
    
    @staticmethod
    def get_music_weekly_scrobbles(user: User, days: int = 30) -> StatsList:
        """Scrobbles per day for last 7 days (for chart). Uses same rolling 7 days as weekly_trend."""
        end_date = timezone.now().date()
        chart_start = end_date - timedelta(days=6)
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        result = []
        for i in range(7):
            d = chart_start + timedelta(days=i)
            if d > end_date:
                break
            cnt = Song.objects.filter(user=user, played_at__date=d).count()
            result.append({
                'date': d.isoformat(),
                'day_name': day_names[d.weekday()],
                'scrobbles': cnt,
            })
        return result
    
    @staticmethod
    def get_genre_of_the_week(user: User, days: int = 7) -> str | None:
        """Return the most common music genre in the recent period."""
        distribution = AnalyticsService.get_music_genre_distribution(user, days=days)
        genres = distribution.get('genres', [])
        return genres[0]['name'] if genres else None
    
    @staticmethod
    def get_most_played_game(user: User, days: int = 30) -> StatsPayload | None:
        """Get the most played game across all platforms"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        
        most_played = None
        max_playtime = 0
        platform = None
        
        steam_games = SteamGame.objects.filter(
            user=user,
            last_played__gte=start_datetime
        ).order_by('-playtime_forever').first()
        
        if steam_games and steam_games.playtime_forever > max_playtime:
            max_playtime = steam_games.playtime_forever
            most_played = steam_games
            platform = 'steam'
        
        
        
        
        if most_played:
            if platform == 'steam':
                image_url = most_played.img_icon_url or f"https://cdn.akamai.steamstatic.com/steam/apps/{most_played.appid}/header.jpg"
                return {
                    'name': most_played.name,
                    'image_url': image_url,
                    'platform': 'steam',
                    'playtime_minutes': most_played.playtime_forever,
                    'appid': most_played.appid
                }
            elif platform in ['psn', 'xbox']:
                image_url = most_played.img_icon_url or ''
                return {
                    'name': most_played.name,
                    'image_url': image_url,
                    'platform': platform,
                    'playtime_minutes': max_playtime
                }
        
        return None
    
    @staticmethod
    def get_hardest_achievement(user: User, days: int = 30) -> StatsPayload | None:
        """Get the hardest/rarest achievement the user has unlocked"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        
        hardest = None
        lowest_rarity = 100.0
        
        retro_achievements = GameAchievement.objects.filter(
            game__user=user,
            date_earned__gte=start_datetime,
            date_earned__isnull=False
        ).select_related('game').order_by('true_ratio').first()
        
        if retro_achievements:
            if retro_achievements.true_ratio < 1000:
                estimated_rarity = 0.1
            elif retro_achievements.true_ratio < 5000:
                estimated_rarity = 0.5
            else:
                estimated_rarity = max(0.1, retro_achievements.true_ratio / 100000)
            
            if estimated_rarity < lowest_rarity:
                lowest_rarity = estimated_rarity
                hardest = {
                    'name': retro_achievements.title,
                    'rarity_percentage': round(estimated_rarity, 2),
                    'game_name': retro_achievements.game.title,
                    'platform': 'retroachievements',
                    'unlock_date': retro_achievements.date_earned.isoformat() if retro_achievements.date_earned else None
                }
        
        
        
        
        return hardest
    
    @staticmethod
    def _calculate_games_completed(user: User, days: int = 30) -> int:
        """Calculate total number of completed games across all platforms"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        
        completed_titles = set()
        
        steam_games = SteamGame.objects.filter(user=user, last_played__gte=start_datetime)
        for game in steam_games:
            total_achievements = game.achievements.count()
            if total_achievements > 0:
                unlocked_count = game.achievements.filter(unlocked=True).count()
                if unlocked_count == total_achievements:
                    completed_titles.add(AnalyticsService._game_identity(game.name))
        
        psn_games = PSNGame.objects.filter(user=user, last_played__gte=start_datetime)
        for game in psn_games:
            platinum_trophy = PSNAchievement.objects.filter(
                game=game,
                unlocked=True
            ).filter(
                Q(trophy_type__icontains='platinum') | Q(name__icontains='platinum')
            ).first()
            if platinum_trophy:
                completed_titles.add(AnalyticsService._game_identity(game.name))
        
        xbox_games = XboxGame.objects.filter(user=user, last_played__gte=start_datetime)
        for game in xbox_games:
            total_achievements = game.achievements.count()
            if total_achievements > 0:
                unlocked_count = game.achievements.filter(unlocked=True).count()
                if unlocked_count == total_achievements:
                    completed_titles.add(AnalyticsService._game_identity(game.name))
        
        retro_games = RetroAchievementsGame.objects.filter(user=user, last_played__gte=start_datetime)
        for game in retro_games:
            if game.num_possible_achievements > 0:
                if game.num_achieved == game.num_possible_achievements:
                    completed_titles.add(AnalyticsService._game_identity(game.title))
        
        return len({title for title in completed_titles if title})


    @staticmethod
    def get_media_movies_change(user: User, days: int = 30) -> StatsPayload:
        """Movies watched this period vs previous period (for '+X from last month')."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        prev_start = start_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        prev_start_datetime = timezone.make_aware(datetime.combine(prev_start, datetime.min.time()))
        current = MovieWatch.objects.filter(
            movie__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime
        ).count()
        previous = MovieWatch.objects.filter(
            movie__user=user,
            watched_at__gte=prev_start_datetime,
            watched_at__lt=start_datetime
        ).count()
        return {'change': current - previous, 'current': current, 'previous': previous}

    @staticmethod
    def get_media_weekly_watch(user: User, days: int = 30) -> StatsList:
        """Daily watch stats for last 7 days (movies, episodes, watch_time_hours)."""
        end_date = timezone.now().date()
        chart_start = end_date - timedelta(days=6)
        day_names = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        result = []
        for i in range(7):
            d = chart_start + timedelta(days=i)
            if d > end_date:
                break
            movies = MovieWatch.objects.filter(movie__user=user, watched_at__date=d).count()
            episodes = EpisodeWatch.objects.filter(episode__show__user=user, watched_at__date=d).count()
            watch_minutes = 2 * 60 * movies + 45 * episodes
            watch_hours = round(watch_minutes / 60, 2)
            result.append({
                'date': d.isoformat(),
                'day_name': day_names[d.weekday()],
                'movies': movies,
                'episodes': episodes,
                'watch_time_hours': watch_hours,
            })
        return result

    @staticmethod
    def get_media_watch_breakdown(user: User, days: int = 30) -> StatsPayload:
        """Percentage of watch time: movies vs TV (from 2h/movie, 45m/episode)."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        movies = MovieWatch.objects.filter(
            movie__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime
        ).count()
        episodes = EpisodeWatch.objects.filter(
            episode__show__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime
        ).count()
        movie_minutes = movies * 120
        tv_minutes = episodes * 45
        total = movie_minutes + tv_minutes
        if total == 0:
            return {'movies_percentage': 0, 'tv_percentage': 0}
        return {
            'movies_percentage': round((movie_minutes / total) * 100, 0),
            'tv_percentage': round((tv_minutes / total) * 100, 0),
        }

    @staticmethod
    def get_media_series_count(user: User, days: int = 30) -> int:
        """Count of distinct shows with at least one episode watch in period."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        return EpisodeWatch.objects.filter(
            episode__show__user=user,
            watched_at__gte=start_datetime
        ).values_list('episode__show', flat=True).distinct().count()

    @staticmethod
    def get_media_genre_distribution(user: User, days: int = 30) -> StatsPayload:
        """Get movie/show genre distribution from stored Trakt/TMDB metadata."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

        counts = Counter()

        movie_watches = MovieWatch.objects.filter(
            movie__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime,
        ).select_related('movie')
        for watch in movie_watches:
            for genre in watch.movie.genres or []:
                if genre:
                    counts[str(genre)] += 1

        episode_watches = EpisodeWatch.objects.filter(
            episode__show__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime,
        ).select_related('episode__show')
        for watch in episode_watches:
            for genre in watch.episode.show.genres or []:
                if genre:
                    counts[str(genre)] += 1

        total_hits = sum(counts.values())
        genres = []
        if total_hits:
            for name, count in counts.most_common(6):
                genres.append({
                    'name': name,
                    'count': count,
                    'percentage': round((count / total_hits) * 100),
                })

        return {
            'genres': genres,
            'total_count': len(counts),
            'total_items': movie_watches.count() + episode_watches.count(),
        }

    @staticmethod
    def get_media_completion_rate(user: User, days: int = 30) -> None:
        """Completion rate requires a complete episode catalog; return unknown when unavailable."""
        return None

    @staticmethod
    def get_media_insights(user: User, days: int = 30) -> StatsPayload:
        """Get media quick insights from stored metadata."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))

        watched_dates = set()
        movie_watches = MovieWatch.objects.filter(
            movie__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime,
        ).select_related('movie')
        episode_watches = EpisodeWatch.objects.filter(
            episode__show__user=user,
            watched_at__gte=start_datetime,
            watched_at__lte=end_datetime,
        ).select_related('episode__show')

        director_counts = Counter()
        studio_counts = Counter()

        for watch in movie_watches:
            if watch.watched_at:
                watched_dates.add(watch.watched_at.date())
            for director in watch.movie.directors or []:
                if director:
                    director_counts[str(director)] += 1
            for studio in watch.movie.studios or []:
                if studio:
                    studio_counts[str(studio)] += 1

        for watch in episode_watches:
            if watch.watched_at:
                watched_dates.add(watch.watched_at.date())
            network = watch.episode.show.network
            if network:
                studio_counts[str(network)] += 1

        max_streak = 0
        current_streak = 0
        cursor = start_date
        while cursor <= end_date:
            if cursor in watched_dates:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 0
            cursor += timedelta(days=1)

        binge_streak = None
        if max_streak:
            binge_streak = f"{max_streak} day{'s' if max_streak != 1 else ''}"

        return {
            'binge_streak': binge_streak,
            'favorite_director': director_counts.most_common(1)[0][0] if director_counts else None,
            'top_studio': studio_counts.most_common(1)[0][0] if studio_counts else None,
        }
