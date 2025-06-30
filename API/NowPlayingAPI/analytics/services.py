from django.db.models import Sum, Count, Avg, F, Q, Max, Min
from django.utils import timezone
from django.core.cache import cache
from datetime import datetime, timedelta, date
from .models import UserStatistics, GamingStreak
from steam.models import Game as SteamGame, Achievement as SteamAchievement
from playstation.models import PSNGame, PSNAchievement
from xbox.models import XboxGame, XboxAchievement
from retroachievements.models import RetroAchievementsGame, GameAchievement
from music.models import Song
from trakt.models import Movie, Show, Episode, MovieWatch, EpisodeWatch
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Optimized service class for calculating and managing user statistics"""
    
    @staticmethod
    def _format_duration(duration):
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
    def get_comprehensive_statistics(user, days=30):
        """Get comprehensive statistics calculated live from source models with caching"""
        cache_key = f"analytics_{user.id}_{days}_{timezone.now().date()}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # === GAMING STATISTICS (optimized queries) ===
        # Get all gaming data in bulk
        steam_games = SteamGame.objects.filter(
            user=user,
            last_played__gte=start_date,
            last_played__lte=end_date
        ).aggregate(
            count=Count('id'),
            total_playtime=Sum('playtime_forever')
        )
        
        steam_achievements = SteamAchievement.objects.filter(
            game__user=user,
            unlock_time__gte=start_date,
            unlock_time__lte=end_date,
            unlocked=True
        ).count()
        
        psn_games_count = PSNGame.objects.filter(
            user=user,
            last_played__gte=start_date,
            last_played__lte=end_date
        ).count()
        
        psn_achievements = PSNAchievement.objects.filter(
            game__user=user,
            unlock_time__gte=start_date,
            unlock_time__lte=end_date,
            unlocked=True
        ).count()
        
        xbox_games_count = XboxGame.objects.filter(
            user=user,
            last_played__gte=start_date,
            last_played__lte=end_date
        ).count()
        
        xbox_achievements = XboxAchievement.objects.filter(
            game__user=user,
            unlock_time__gte=start_date,
            unlock_time__lte=end_date,
            unlocked=True
        ).count()
        
        retro_games_count = RetroAchievementsGame.objects.filter(
            user=user,
            last_played__gte=start_date,
            last_played__lte=end_date
        ).count()
        
        retro_achievements = GameAchievement.objects.filter(
            game__user=user,
            date_earned__gte=start_date,
            date_earned__lte=end_date
        ).count()
        
        # Calculate totals
        total_games_played = (
            steam_games['count'] + psn_games_count + 
            xbox_games_count + retro_games_count
        )
        total_achievements_earned = (
            steam_achievements + psn_achievements + 
            xbox_achievements + retro_achievements
        )
        total_gaming_time = timedelta(minutes=steam_games['total_playtime'] or 0)
        
        # === MUSIC STATISTICS (optimized) ===
        songs_data = Song.objects.filter(
            user=user,
            played_at__gte=start_date,
            played_at__lte=end_date
        ).aggregate(
            count=Count('id'),
            total_duration=Sum('duration_ms')
        )
        
        total_songs_listened = songs_data['count'] or 0
        total_listening_time = timedelta(milliseconds=songs_data['total_duration'] or 0)
        
        # === MOVIE/TV STATISTICS (optimized) ===
        movie_watches_count = MovieWatch.objects.filter(
            movie__user=user,
            watched_at__gte=start_date,
            watched_at__lte=end_date
        ).count()
        
        episode_watches_count = EpisodeWatch.objects.filter(
            episode__show__user=user,
            watched_at__gte=start_date,
            watched_at__lte=end_date
        ).count()
        
        # Estimate watch time (2 hours per movie, 45 minutes per episode)
        total_watch_time = timedelta(
            hours=2 * movie_watches_count,
            minutes=45 * episode_watches_count
        )
        
        # === TOTALS ===
        total_engagement_time = total_gaming_time + total_listening_time + total_watch_time
        
        # === BUILD RESPONSE ===
        result = {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days,
            },
            'totals': {
                'total_games_played': total_games_played,
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
        
        # Cache for 1 hour
        cache.set(cache_key, result, 3600)
        return result
    
    @staticmethod
    def _get_daily_breakdown(user, start_date, end_date):
        """Get optimized daily breakdown of activity"""
        daily_stats = []
        current_date = start_date
        
        while current_date <= end_date:
            # Optimized daily queries
            daily_movies = MovieWatch.objects.filter(
                movie__user=user,
                watched_at__date=current_date
            ).count()
            
            daily_episodes = EpisodeWatch.objects.filter(
                episode__show__user=user,
                watched_at__date=current_date
            ).count()
            
            daily_games = (
                SteamGame.objects.filter(user=user, last_played__date=current_date).count() +
                PSNGame.objects.filter(user=user, last_played__date=current_date).count() +
                XboxGame.objects.filter(user=user, last_played__date=current_date).count() +
                RetroAchievementsGame.objects.filter(user=user, last_played__date=current_date).count()
            )
            
            daily_achievements = (
                SteamAchievement.objects.filter(game__user=user, unlock_time__date=current_date, unlocked=True).count() +
                PSNAchievement.objects.filter(game__user=user, unlock_time__date=current_date, unlocked=True).count() +
                XboxAchievement.objects.filter(game__user=user, unlock_time__date=current_date, unlocked=True).count() +
                GameAchievement.objects.filter(game__user=user, date_earned__date=current_date).count()
            )
            
            daily_songs = Song.objects.filter(
                user=user,
                played_at__date=current_date
            ).count()
            
            # Only include days with activity
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
    def get_platform_distribution(user, days=30):
        """Get optimized platform usage distribution"""
        cache_key = f"platform_dist_{user.id}_{days}_{timezone.now().date()}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Optimized platform queries
        platforms = {
            'steam': {'games': 0, 'achievements': 0, 'playtime': timedelta()},
            'psn': {'games': 0, 'achievements': 0, 'playtime': timedelta()},
            'xbox': {'games': 0, 'achievements': 0, 'playtime': timedelta()},
            'retroachievements': {'games': 0, 'achievements': 0, 'playtime': timedelta()},
            'spotify': {'songs': 0, 'listening_time': timedelta()},
            'lastfm': {'songs': 0, 'listening_time': timedelta()},
            'trakt': {'movies': 0, 'episodes': 0, 'watch_time': timedelta()},
        }
        
        # Steam data
        steam_data = SteamGame.objects.filter(
            user=user,
            last_played__gte=start_date
        ).aggregate(
            count=Count('id'),
            total_playtime=Sum('playtime_forever')
        )
        platforms['steam']['games'] = steam_data['count'] or 0
        platforms['steam']['playtime'] = timedelta(minutes=steam_data['total_playtime'] or 0)
        platforms['steam']['achievements'] = SteamAchievement.objects.filter(
            game__user=user,
            unlock_time__gte=start_date,
            unlocked=True
        ).count()
        
        # PSN, Xbox, RetroAchievements data
        platforms['psn']['games'] = PSNGame.objects.filter(user=user, last_played__gte=start_date).count()
        platforms['psn']['achievements'] = PSNAchievement.objects.filter(
            game__user=user, unlock_time__gte=start_date, unlocked=True
        ).count()
        
        platforms['xbox']['games'] = XboxGame.objects.filter(user=user, last_played__gte=start_date).count()
        platforms['xbox']['achievements'] = XboxAchievement.objects.filter(
            game__user=user, unlock_time__gte=start_date, unlocked=True
        ).count()
        
        platforms['retroachievements']['games'] = RetroAchievementsGame.objects.filter(
            user=user, last_played__gte=start_date
        ).count()
        platforms['retroachievements']['achievements'] = GameAchievement.objects.filter(
            game__user=user, date_earned__gte=start_date
        ).count()
        
        # Music platforms
        spotify_data = Song.objects.filter(
            user=user, played_at__gte=start_date, source='spotify'
        ).aggregate(count=Count('id'), total_duration=Sum('duration_ms'))
        platforms['spotify']['songs'] = spotify_data['count'] or 0
        platforms['spotify']['listening_time'] = timedelta(milliseconds=spotify_data['total_duration'] or 0)
        
        lastfm_data = Song.objects.filter(
            user=user, played_at__gte=start_date, source='lastfm'
        ).aggregate(count=Count('id'), total_duration=Sum('duration_ms'))
        platforms['lastfm']['songs'] = lastfm_data['count'] or 0
        platforms['lastfm']['listening_time'] = timedelta(milliseconds=lastfm_data['total_duration'] or 0)
        
        # Trakt data
        movie_watches = MovieWatch.objects.filter(movie__user=user, watched_at__gte=start_date).count()
        episode_watches = EpisodeWatch.objects.filter(episode__show__user=user, watched_at__gte=start_date).count()
        
        platforms['trakt']['movies'] = movie_watches
        platforms['trakt']['episodes'] = episode_watches
        platforms['trakt']['watch_time'] = timedelta(hours=2 * movie_watches, minutes=45 * episode_watches)
        
        # Format all time-related values for human readability
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
        
        # Cache for 1 hour
        cache.set(cache_key, formatted_platforms, 3600)
        return formatted_platforms
    
    @staticmethod
    def get_achievement_efficiency(user, days=30):
        """Calculate optimized achievement efficiency (achievements per hour)"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get total achievements earned in one query
        total_achievements = (
            SteamAchievement.objects.filter(
                game__user=user, unlock_time__gte=start_date, unlocked=True
            ).count() +
            PSNAchievement.objects.filter(
                game__user=user, unlock_time__gte=start_date, unlocked=True
            ).count() +
            XboxAchievement.objects.filter(
                game__user=user, unlock_time__gte=start_date, unlocked=True
            ).count() +
            GameAchievement.objects.filter(
                game__user=user, date_earned__gte=start_date
            ).count()
        )
        
        # Get total gaming time
        steam_playtime = SteamGame.objects.filter(
            user=user, last_played__gte=start_date
        ).aggregate(total=Sum('playtime_forever'))['total'] or 0
        total_gaming_time = timedelta(minutes=steam_playtime)
        
        # Calculate efficiency
        efficiency = 0
        if total_gaming_time.total_seconds() > 0:
            efficiency = total_achievements / (total_gaming_time.total_seconds() / 3600)
        
        return {
            'total_achievements': total_achievements,
            'total_gaming_time': AnalyticsService._format_duration(total_gaming_time),
            'efficiency_per_hour': round(efficiency, 2),
        }
    
    @staticmethod
    def get_gaming_streaks(user):
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