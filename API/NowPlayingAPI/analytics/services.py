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
        
        # Convert to datetime for proper filtering with timezone-aware datetimes
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        
        # === GAMING STATISTICS (optimized queries) ===
        # Get all gaming data in bulk - use datetime filtering to avoid naive datetime warnings
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
            played_at__gte=start_datetime,
            played_at__lte=end_datetime
        ).aggregate(
            count=Count('id'),
            total_duration=Sum('duration_ms')
        )
        
        total_songs_listened = songs_data['count'] or 0
        total_duration_ms = songs_data['total_duration'] or 0
        total_listening_time = timedelta(milliseconds=total_duration_ms)
        # If no duration stored (e.g. Last.fm doesn't provide it), estimate ~3.5 min per track
        if total_listening_time.total_seconds() == 0 and total_songs_listened > 0:
            total_listening_time = timedelta(minutes=round(total_songs_listened * 3.5))
        
        # === MOVIE/TV STATISTICS (optimized) ===
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
        
        # Estimate watch time (2 hours per movie, 45 minutes per episode)
        total_watch_time = timedelta(
            hours=2 * movie_watches_count,
            minutes=45 * episode_watches_count
        )
        
        # === TOTALS ===
        total_engagement_time = total_gaming_time + total_listening_time + total_watch_time
        
        # Calculate completed games
        total_games_completed = AnalyticsService._calculate_games_completed(user, days)
        
        # === BUILD RESPONSE ===
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
    
    @staticmethod
    def _format_time_ago(minutes):
        """Format minutes into human-readable time ago string"""
        if minutes < 1:
            return "0 minutes ago"
        elif minutes < 60:
            return f"{int(minutes)} minute{'s' if int(minutes) != 1 else ''} ago"
        elif minutes < 1440:  # Less than 24 hours
            hours = int(minutes // 60)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = int(minutes // 1440)
            return f"{days} day{'s' if days != 1 else ''} ago"
    
    @staticmethod
    def get_last_played_time(user):
        """Get time since last song was played"""
        last_song = Song.objects.filter(user=user).order_by('-played_at').first()
        if not last_song:
            return None
        
        time_diff = timezone.now() - last_song.played_at
        minutes_ago = time_diff.total_seconds() / 60
        return AnalyticsService._format_time_ago(minutes_ago)
    
    @staticmethod
    def get_weekly_trend(user, days=30):
        """Get weekly trend data for Time Dedicated Trend chart - returns last 7 days (rolling)"""
        end_date = timezone.now().date()
        # Get last 7 days for the chart (rolling, not week-based)
        chart_start_date = end_date - timedelta(days=6)
        
        # Calculate max time for normalization
        max_total_time = 0
        
        # First pass: calculate all daily stats
        daily_data = []
        for i in range(7):
            day_date = chart_start_date + timedelta(days=i)
            if day_date > end_date:
                break
            
            # Calculate time spent for this day
            # Use __date lookup for consistency with comprehensive_stats (which works correctly)
            # For gaming: estimate based on achievements unlocked on this day (proxy for activity)
            # 1 achievement ≈ 30 minutes of gaming (heuristic)
            daily_achievements = (
                SteamAchievement.objects.filter(
                    game__user=user, 
                    unlock_time__date=day_date,
                    unlocked=True
                ).count() +
                PSNAchievement.objects.filter(
                    game__user=user, 
                    unlock_time__date=day_date,
                    unlocked=True
                ).count() +
                XboxAchievement.objects.filter(
                    game__user=user, 
                    unlock_time__date=day_date,
                    unlocked=True
                ).count() +
                GameAchievement.objects.filter(
                    game__user=user, 
                    date_earned=day_date
                ).count()
            )
            
            # Also check if any games were played on this day
            daily_games_played = (
                SteamGame.objects.filter(
                    user=user, 
                    last_played__date=day_date
                ).count() +
                PSNGame.objects.filter(
                    user=user, 
                    last_played__date=day_date
                ).count() +
                XboxGame.objects.filter(
                    user=user, 
                    last_played__date=day_date
                ).count() +
                RetroAchievementsGame.objects.filter(
                    user=user, 
                    last_played__date=day_date
                ).count()
            )
            
            # Estimate gaming time: achievements * 30 min + games played * 1 hour minimum
            # Cap at 24h per day to avoid unrealistic totals (e.g. many achievements in one day)
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
            
            # For music: use actual duration from played_at; fallback 3.5 min per track when duration missing (same as Music tab)
            day_songs_data = Song.objects.filter(
                user=user,
                played_at__date=day_date
            ).aggregate(
                total_duration=Sum('duration_ms'),
                count=Count('id')
            )
            total_ms = day_songs_data['total_duration'] or 0
            song_count = day_songs_data['count'] or 0
            if total_ms > 0:
                day_music_time = timedelta(milliseconds=total_ms)
            else:
                # Fallback: 3.5 min per scrobble when duration not available (align with music listening time logic)
                day_music_time = timedelta(minutes=3.5 * song_count)
            
            # For TV/Movies: count watches and estimate time
            day_movie_watches = MovieWatch.objects.filter(
                movie__user=user,
                watched_at__date=day_date
            ).count()
            
            day_episode_watches = EpisodeWatch.objects.filter(
                episode__show__user=user,
                watched_at__date=day_date
            ).count()
            
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
        
        # Second pass: normalize to percentages for stacked bar chart
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
            
            # Calculate relative heights (0-100) for visualization
            if max_total_time > 0:
                relative_height = (total_time.total_seconds() / max_total_time) * 100
            else:
                relative_height = 0
            
            # Calculate average session duration (estimate)
            # Use heuristic: average session = total gaming time / max(games played, 1)
            # If no games played, use 0
            gaming_time_hours = day_data['gaming_time'].total_seconds() / 3600
            gaming_time_minutes = day_data['gaming_time'].total_seconds() / 60
            games_played = day_data.get('games_played', 0)
            avg_session_minutes = 0
            if games_played > 0:
                # Estimate average session: total time / games played (at least 1 hour per game)
                avg_session_minutes = max(60, gaming_time_minutes / games_played)
            elif gaming_time_minutes > 0:
                # If there's gaming time but no games recorded, use a default
                avg_session_minutes = gaming_time_minutes
            
            day_result = {
                'date': day_data['date'].isoformat(),
                'day_name': day_data['date'].strftime('%a'),  # Mon, Tue, etc.
                'gaming_percentage': round(gaming_pct, 1),
                'music_percentage': round(music_pct, 1),
                'tv_percentage': round(tv_pct, 1),
                'gaming_time_hours': gaming_time_hours,
                'music_time_hours': day_data['music_time'].total_seconds() / 3600,
                'tv_time_hours': day_data['tv_time'].total_seconds() / 3600,
                'avg_session_duration_minutes': round(avg_session_minutes, 0),
                'relative_height': round(relative_height, 1),  # For chart visualization
            }
            
            daily_stats.append(day_result)
        
        return daily_stats
    
    @staticmethod
    def get_monthly_comparison(user, days=30):
        """Calculate engagement time comparison with previous month"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        previous_start = start_date - timedelta(days=days)
        
        # Convert dates to datetime for queries
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        previous_start_datetime = timezone.make_aware(datetime.combine(previous_start, datetime.min.time()))
        
        # Current period
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
        
        # Previous period
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
        
        # Calculate percentage change
        if previous_total.total_seconds() > 0:
            change_pct = ((current_total.total_seconds() - previous_total.total_seconds()) / previous_total.total_seconds()) * 100
        else:
            change_pct = 100 if current_total.total_seconds() > 0 else 0
        
        return {
            'current_time': current_total.total_seconds() / 3600,  # hours
            'previous_time': previous_total.total_seconds() / 3600,  # hours
            'change_percentage': round(change_pct, 1),
        }
    
    @staticmethod
    def get_platform_count(user, days=30):
        """Get count of active platforms"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        active_platforms = 0
        
        # Gaming platforms
        if SteamGame.objects.filter(user=user, last_played__gte=start_date).exists():
            active_platforms += 1
        if PSNGame.objects.filter(user=user, last_played__gte=start_date).exists():
            active_platforms += 1
        if XboxGame.objects.filter(user=user, last_played__gte=start_date).exists():
            active_platforms += 1
        if RetroAchievementsGame.objects.filter(user=user, last_played__gte=start_date).exists():
            active_platforms += 1
        
        # Music platforms
        if Song.objects.filter(user=user, played_at__gte=start_date, source='spotify').exists():
            active_platforms += 1
        if Song.objects.filter(user=user, played_at__gte=start_date, source='lastfm').exists():
            active_platforms += 1
        
        # TV/Movies platform
        if (MovieWatch.objects.filter(movie__user=user, watched_at__gte=start_date).exists() or
            EpisodeWatch.objects.filter(episode__show__user=user, watched_at__gte=start_date).exists()):
            active_platforms += 1
        
        return active_platforms
    
    @staticmethod
    def get_genre_distribution(user, days=30):
        """Get genre distribution across gaming, music, and movies/TV"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        genres = []
        
        # For now, we'll create a simple distribution based on available data
        # This can be enhanced later with actual genre data from games/movies
        # Since we don't have genre data in the current models, we'll return a placeholder
        # that shows distribution by content type
        
        # Count by content type as a proxy for genre distribution
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
    
    # ---------- Music analytics (Gaming Tab style) ----------
    
    @staticmethod
    def get_top_artist(user, days=30):
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
        # Get top album for this artist in period
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
    def get_top_track(user, days=30):
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
    def get_new_discoveries(user, days=30):
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
    def get_music_listening_insights(user, days=30):
        """Morning vs evening listening, scrobble milestone."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        songs = Song.objects.filter(
            user=user, played_at__gte=start_datetime, played_at__lte=end_datetime
        ).only('played_at')
        morning = 0  # 05–12
        evening = 0  # 18–24
        for s in songs:
            h = s.played_at.hour
            if 5 <= h < 12:
                morning += 1
            elif 18 <= h <= 23 or h == 0:
                evening += 1
        total = morning + evening
        evening_pct = round((evening / total) * 100, 0) if total else 0
        listener_type = 'Evening Listener' if evening_pct >= 50 else 'Morning Listener'
        # Total scrobbles all-time for milestone (next 50k step)
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
    def get_music_genre_distribution(user, days=30):
        """Music genres. Song model has no genre field - return empty structure for UI to show placeholder."""
        return {
            'genres': [],
            'total_count': 0,
        }
    
    @staticmethod
    def get_music_weekly_scrobbles(user, days=30):
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
    def get_genre_of_the_week(user, days=7):
        """Genre of the week - not available without genre on Song. Placeholder."""
        return None
    
    @staticmethod
    def get_most_played_game(user, days=30):
        """Get the most played game across all platforms"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        
        most_played = None
        max_playtime = 0
        platform = None
        
        # Check Steam games
        steam_games = SteamGame.objects.filter(
            user=user,
            last_played__gte=start_datetime
        ).order_by('-playtime_forever').first()
        
        if steam_games and steam_games.playtime_forever > max_playtime:
            max_playtime = steam_games.playtime_forever
            most_played = steam_games
            platform = 'steam'
        
        # Check PSN games - total_playtime is stored as string, so we can't easily compare
        # For now, we'll primarily use Steam for most_played_game as it has numeric playtime
        # PSN/Xbox games can still be returned if they're the only games
        
        # Check Xbox games - similar to PSN, stored as string
        # We'll focus on Steam for accurate comparison
        
        # RetroAchievements doesn't have playtime stored, so skip for now
        
        if most_played:
            if platform == 'steam':
                # Steam game
                image_url = most_played.img_icon_url or f"https://steamcdn-a.akamaihd.net/steam/apps/{most_played.appid}/library_600x900_2x.jpg"
                return {
                    'name': most_played.name,
                    'image_url': image_url,
                    'platform': 'steam',
                    'playtime_minutes': most_played.playtime_forever,
                    'appid': most_played.appid
                }
            elif platform in ['psn', 'xbox']:
                # PSN or Xbox game
                image_url = most_played.img_icon_url or ''
                return {
                    'name': most_played.name,
                    'image_url': image_url,
                    'platform': platform,
                    'playtime_minutes': max_playtime
                }
        
        return None
    
    @staticmethod
    def get_hardest_achievement(user, days=30):
        """Get the hardest/rarest achievement the user has unlocked"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        
        hardest = None
        lowest_rarity = 100.0  # Start with 100% (common), we want lowest
        
        # Check RetroAchievements - use true_ratio (lower = rarer)
        # Note: true_ratio is a score, lower means rarer
        retro_achievements = GameAchievement.objects.filter(
            game__user=user,
            date_earned__gte=start_datetime,
            date_earned__isnull=False
        ).select_related('game').order_by('true_ratio').first()
        
        if retro_achievements:
            # Convert true_ratio to percentage (this is approximate)
            # Lower true_ratio means fewer people have it
            # We'll use a heuristic: if true_ratio < 1000, it's very rare (<1%)
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
        
        # For Steam, PSN, Xbox - we don't have rarity stored
        # So we'll check if there are achievements and return the most recent rare one
        # or just use a placeholder
        
        # Check Steam achievements - no rarity data, so we'll skip for now
        # In a real implementation, you'd need to fetch from Steam API
        
        # Check PSN achievements - no rarity data stored
        # Check Xbox achievements - no rarity data stored
        
        return hardest
    
    @staticmethod
    def _calculate_games_completed(user, days=30):
        """Calculate total number of completed games across all platforms"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        
        completed_count = 0
        
        # Steam: Game is completed if 100% achievements unlocked
        steam_games = SteamGame.objects.filter(user=user, last_played__gte=start_datetime)
        for game in steam_games:
            total_achievements = game.achievements.count()
            if total_achievements > 0:
                unlocked_count = game.achievements.filter(unlocked=True).count()
                if unlocked_count == total_achievements:
                    completed_count += 1
        
        # PSN: Game is completed if platinum trophy earned
        psn_games = PSNGame.objects.filter(user=user, last_played__gte=start_datetime)
        for game in psn_games:
            # Check if platinum trophy exists and is unlocked
            platinum_trophy = PSNAchievement.objects.filter(
                game=game,
                unlocked=True
            ).filter(
                Q(trophy_type__icontains='platinum') | Q(name__icontains='platinum')
            ).first()
            if platinum_trophy:
                completed_count += 1
        
        # Xbox: Game is completed if all achievements unlocked
        xbox_games = XboxGame.objects.filter(user=user, last_played__gte=start_datetime)
        for game in xbox_games:
            total_achievements = game.achievements.count()
            if total_achievements > 0:
                unlocked_count = game.achievements.filter(unlocked=True).count()
                if unlocked_count == total_achievements:
                    completed_count += 1
        
        # RetroAchievements: Game is completed if all achievements unlocked
        retro_games = RetroAchievementsGame.objects.filter(user=user, last_played__gte=start_datetime)
        for game in retro_games:
            if game.num_possible_achievements > 0:
                if game.num_achieved == game.num_possible_achievements:
                    completed_count += 1
        
        return completed_count

    # ---------- Movies & TV (Trakt) analytics ----------

    @staticmethod
    def get_media_movies_change(user, days=30):
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
    def get_media_weekly_watch(user, days=30):
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
    def get_media_watch_breakdown(user, days=30):
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
    def get_media_series_count(user, days=30):
        """Count of distinct shows with at least one episode watch in period."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        return EpisodeWatch.objects.filter(
            episode__show__user=user,
            watched_at__gte=start_datetime
        ).values_list('episode__show', flat=True).distinct().count()

    @staticmethod
    def get_media_genre_distribution(user, days=30):
        """Placeholder: no genre on Trakt watch models. Return structure for UI."""
        return {'genres': [], 'total_count': 0}

    @staticmethod
    def get_media_completion_rate(user, days=30):
        """Placeholder: would need 'started' vs 'finished' series. Return None or 0."""
        return None

    @staticmethod
    def get_media_insights(user, days=30):
        """Placeholder: binge_streak, favorite_director, top_studio. Ready for future API."""
        return {
            'binge_streak': None,
            'favorite_director': None,
            'top_studio': None,
        }