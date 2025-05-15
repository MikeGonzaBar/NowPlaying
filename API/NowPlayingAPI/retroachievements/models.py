from django.conf import settings
from django.db import models
import requests
from django.utils.timezone import make_aware
from datetime import datetime
from django.db.models import F, FloatField, ExpressionWrapper
from django.contrib.auth.models import User
import logging

# Set up logging
logger = logging.getLogger("retroachievements")

# Your credentials
# api_key = settings.RETROACHIEVEMENTS_API_KEY
# username = settings.RETROACHIEVEMENTS_USER

def get_json_response(url):
    """Helper function to GET a URL and return JSON data, handling errors."""
    try:
        response = requests.get(url)
        logger.debug(f"Requesting: {url}")
        logger.debug("Status Code: %s", response.status_code)
        response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
        try:
            return response.json()
        except ValueError as json_err:
            logger.error("Failed to decode JSON: %s", json_err)
            logger.error("Raw response: %s", response.text)
            return None
    except requests.RequestException as req_err:
        logger.error("Request failed: %s", req_err)
        return None

def parse_datetime(datetime_str):
    """Convert a naive datetime string to a timezone-aware datetime object."""
    if not datetime_str:  # Check if the datetime string is None or empty
        return None
    try:
        naive_datetime = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
        return make_aware(naive_datetime)  # Convert to timezone-aware datetime
    except ValueError:
        return None

class RetroAchievementsGame(models.Model):
    # Django will automatically add an id field as primary key
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='retroachievements_games')
    game_id = models.IntegerField()  # Not a primary key
    console_id = models.IntegerField()
    console_name = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    image_icon = models.URLField()
    image_title = models.URLField()
    image_ingame = models.URLField()
    image_box_art = models.URLField()
    last_played = models.DateTimeField()
    achievements_total = models.IntegerField()
    num_possible_achievements = models.IntegerField()
    possible_score = models.IntegerField()
    num_achieved = models.IntegerField()
    score_achieved = models.IntegerField()
    num_achieved_hardcore = models.IntegerField()
    score_achieved_hardcore = models.IntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'game_id'], name='unique_user_game')
        ]

    def __str__(self):
        return f"{self.title} ({self.console_name})"

    @classmethod
    def populate_recently_played_games(cls):
        """Fetch and populate the latest 50 played games."""
        recently_played_url = f'https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php?u={username}&y={api_key}&c=50'
        recent_games = get_json_response(recently_played_url)

        if recent_games:
            for game_data in recent_games:
                last_played = parse_datetime(game_data['LastPlayed'])  # Convert to timezone-aware
                game, created = cls.objects.update_or_create(
                    game_id=game_data['GameID'],
                    defaults={
                        'console_id': game_data['ConsoleID'],
                        'console_name': game_data['ConsoleName'],
                        'title': game_data['Title'],
                        'image_icon': game_data['ImageIcon'],
                        'image_title': game_data['ImageTitle'],
                        'image_ingame': game_data['ImageIngame'],
                        'image_box_art': game_data['ImageBoxArt'],
                        'last_played': last_played,  # Use timezone-aware datetime
                        'achievements_total': game_data['AchievementsTotal'],
                        'num_possible_achievements': game_data['NumPossibleAchievements'],
                        'possible_score': game_data['PossibleScore'],
                        'num_achieved': game_data['NumAchieved'],
                        'score_achieved': game_data['ScoreAchieved'],
                        'num_achieved_hardcore': game_data['NumAchievedHardcore'],
                        'score_achieved_hardcore': game_data['ScoreAchievedHardcore'],
                    }
                )
                # Populate achievements for the game
                GameAchievement.populate_achievements_for_game(game)

    @classmethod
    def get_most_achieved_games(cls):
        """
        Get the list of games ordered by the percentage of unlocked achievements,
        with a secondary ordering by the last played date.
        """
        # Exclude games with no achievements to avoid division by zero
        games = cls.objects.filter(achievements_total__gt=0).annotate(
            unlocked_percentage=ExpressionWrapper(
                F('num_achieved') * 100.0 / F('achievements_total'),
                output_field=FloatField()
            )
        ).order_by('-unlocked_percentage')  # Order by percentage in descending order

        return games

    @classmethod
    def fetch_games(cls):
        """Fetch all games without their achievements."""
        return cls.objects.all().order_by('-last_played')  # Order by last played date


class GameAchievement(models.Model):
    # Django will automatically add an id field as primary key
    game = models.ForeignKey(RetroAchievementsGame, related_name="achievements", on_delete=models.CASCADE)
    achievement_id = models.IntegerField()  # Not a primary key
    title = models.CharField(max_length=255)
    description = models.TextField()
    points = models.IntegerField()
    true_ratio = models.IntegerField()
    author = models.CharField(max_length=100)
    date_created = models.DateTimeField()
    date_modified = models.DateTimeField()
    badge_name = models.CharField(max_length=100, null=True, blank=True)
    display_order = models.IntegerField()
    type = models.CharField(max_length=50, null=True, blank=True)
    date_earned = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['game', 'achievement_id'], name='unique_game_achievement')
        ]

    def __str__(self):
        return f"{self.title} ({self.points} points)"

    @classmethod
    def populate_achievements_for_game(cls, game):
        """Fetch and populate achievements for a specific game."""
        progress_url = f'https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?g={game.game_id}&u={username}&y={api_key}&a=1'
        game_progress = get_json_response(progress_url)

        if game_progress and 'Achievements' in game_progress:
            for achievement_id, achievement_data in game_progress['Achievements'].items():
                date_created = parse_datetime(achievement_data['DateCreated'])  # Convert to timezone-aware
                date_modified = parse_datetime(achievement_data['DateModified'])  # Convert to timezone-aware
                date_earned = parse_datetime(achievement_data.get('DateEarned'))  # Convert to timezone-aware if present

                cls.objects.update_or_create(
                    game=game,
                    achievement_id=achievement_data['ID'],
                    defaults={
                        'title': achievement_data['Title'],
                        'description': achievement_data['Description'],
                        'points': achievement_data['Points'],
                        'true_ratio': achievement_data['TrueRatio'],
                        'author': achievement_data['Author'],
                        'date_created': date_created,  # Use timezone-aware datetime
                        'date_modified': date_modified,  # Use timezone-aware datetime
                        'badge_name': achievement_data.get('BadgeName'),
                        'display_order': achievement_data['DisplayOrder'],
                        'type': achievement_data.get('type'),
                        'date_earned': date_earned,  # Use timezone-aware datetime
                    }
                )

    @classmethod
    def fetch_game_details(cls, game_id):
        """Fetch a game and its achievements by game ID."""
        try:
            game = RetroAchievementsGame.objects.get(game_id=game_id)
            achievements = cls.objects.filter(game=game)
            return game, achievements
        except RetroAchievementsGame.DoesNotExist:
            return None, None

class RetroAchievementsAPI:
    @staticmethod
    def populate_recently_played_games(user, ra_username, ra_api_key):
        """Fetch and populate the latest 50 played games for a specific user."""
        if not ra_username or not ra_api_key:
            logger.error("Missing RetroAchievements credentials for user %s", user.username)
            return {"error": "No RetroAchievements credentials provided."}
            
        try:
            recently_played_url = f'https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php?u={ra_username}&y={ra_api_key}&c=50'
            recent_games = get_json_response(recently_played_url)
            
            if not recent_games:
                logger.error("Failed to fetch recently played games")
                return {"error": "Failed to fetch recently played games."}
                
            games_info = []
            
            for game_data in recent_games:
                last_played = parse_datetime(game_data['LastPlayed'])  # Convert to timezone-aware
                
                game, created = RetroAchievementsGame.objects.update_or_create(
                    user=user,
                    game_id=game_data['GameID'],
                    defaults={
                        'console_id': game_data['ConsoleID'],
                        'console_name': game_data['ConsoleName'],
                        'title': game_data['Title'],
                        'image_icon': game_data['ImageIcon'],
                        'image_title': game_data['ImageTitle'],
                        'image_ingame': game_data['ImageIngame'],
                        'image_box_art': game_data['ImageBoxArt'],
                        'last_played': last_played,  # Use timezone-aware datetime
                        'achievements_total': game_data['AchievementsTotal'],
                        'num_possible_achievements': game_data['NumPossibleAchievements'],
                        'possible_score': game_data['PossibleScore'],
                        'num_achieved': game_data['NumAchieved'],
                        'score_achieved': game_data['ScoreAchieved'],
                        'num_achieved_hardcore': game_data['NumAchievedHardcore'],
                        'score_achieved_hardcore': game_data['ScoreAchievedHardcore'],
                    }
                )
                
                # Populate achievements for the game
                RetroAchievementsAPI.populate_achievements_for_game(game, ra_username, ra_api_key)
                
                # Collect information about the game and its achievements
                achievements = game.achievements.all().order_by('display_order')
                
                formatted_achievements = [
                    {
                        "achievement_id": achievement.achievement_id,
                        "name": achievement.title,
                        "description": achievement.description,
                        "image": "https://media.retroachievements.org/Badge/"+str(achievement.badge_name)+".png",
                        "points": achievement.points,
                        "true_ratio": achievement.true_ratio,
                        "unlock_time": achievement.date_earned,
                        "display_order": achievement.display_order,
                        "type": achievement.type,
                        "unlocked": bool(achievement.date_earned),
                    }
                    for achievement in achievements
                ]
                
                games_info.append({
                    "appid": game.game_id,
                    "name": game.title,
                    "console_name": game.console_name,
                    "image_icon": "https://retroachievements.org" + game.image_icon,
                    "image_title": "https://retroachievements.org" + game.image_title,
                    "image_ingame": "https://retroachievements.org" + game.image_ingame,
                    "img_icon_url": "https://retroachievements.org" + game.image_box_art,
                    "last_played": game.last_played,
                    "total_achievements": game.achievements_total,
                    "unlocked_achievements": game.num_achieved,
                    "locked_achievements": game.achievements_total - game.num_achieved,
                    "achievements": formatted_achievements,
                })
                
            return {"games": games_info}
                
        except Exception as e:
            logger.error("Error populating recently played games: %s", str(e))
            return {"error": f"Error fetching RetroAchievements data: {str(e)}"}

    @staticmethod
    def populate_achievements_for_game(game, ra_username, ra_api_key):
        """Fetch and populate achievements for a specific game."""
        try:
            progress_url = f'https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?g={game.game_id}&u={ra_username}&y={ra_api_key}&a=1'
            game_progress = get_json_response(progress_url)

            if game_progress and 'Achievements' in game_progress:
                for achievement_id, achievement_data in game_progress['Achievements'].items():
                    date_created = parse_datetime(achievement_data['DateCreated'])
                    date_modified = parse_datetime(achievement_data['DateModified'])
                    date_earned = parse_datetime(achievement_data.get('DateEarned'))

                    GameAchievement.objects.update_or_create(
                        game=game,
                        achievement_id=achievement_data['ID'],
                        defaults={
                            'title': achievement_data['Title'],
                            'description': achievement_data['Description'],
                            'points': achievement_data['Points'],
                            'true_ratio': achievement_data['TrueRatio'],
                            'author': achievement_data['Author'],
                            'date_created': date_created,
                            'date_modified': date_modified,
                            'badge_name': achievement_data.get('BadgeName'),
                            'display_order': achievement_data['DisplayOrder'],
                            'type': achievement_data.get('type'),
                            'date_earned': date_earned,
                        }
                    )
        except Exception as e:
            logger.error("Error populating achievements for game %s: %s", game.game_id, str(e))

    @staticmethod
    def get_most_achieved_games(user):
        """Get the list of games ordered by the percentage of unlocked achievements."""
        try:
            # Exclude games with no achievements to avoid division by zero
            games = RetroAchievementsGame.objects.filter(
                user=user,
                achievements_total__gt=0
            ).annotate(
                unlocked_percentage=ExpressionWrapper(
                    F('num_achieved') * 100.0 / F('achievements_total'),
                    output_field=FloatField()
                )
            ).order_by('-unlocked_percentage')  # Order by percentage in descending order
            
            games_info = []
            
            for game in games:
                achievements = game.achievements.all().order_by('display_order')
                
                formatted_achievements = [
                    {
                        "achievement_id": achievement.achievement_id,
                        "name": achievement.title,
                        "description": achievement.description,
                        "image": "https://media.retroachievements.org/Badge/"+str(achievement.badge_name)+".png",
                        "points": achievement.points,
                        "true_ratio": achievement.true_ratio,
                        "unlock_time": achievement.date_earned,
                        "display_order": achievement.display_order,
                        "type": achievement.type,
                        "unlocked": bool(achievement.date_earned),
                    }
                    for achievement in achievements
                ]
                
                games_info.append({
                    "appid": game.game_id,
                    "name": game.title,
                    "console_name": game.console_name,
                    "image_icon": "https://retroachievements.org" + game.image_icon,
                    "image_title": "https://retroachievements.org" + game.image_title,
                    "image_ingame": "https://retroachievements.org" + game.image_ingame,
                    "img_icon_url": "https://retroachievements.org" + game.image_box_art,
                    "last_played": game.last_played,
                    "total_achievements": game.achievements_total,
                    "unlocked_achievements": game.num_achieved,
                    "locked_achievements": game.achievements_total - game.num_achieved,
                    "achievements": formatted_achievements,
                })
                
            return {"games": games_info}
            
        except Exception as e:
            logger.error("Error getting most achieved games: %s", str(e))
            return {"error": f"Error fetching RetroAchievements data: {str(e)}"}

    @staticmethod
    def fetch_games(user):
        """Fetch all games for a specific user."""
        try:
            games = RetroAchievementsGame.objects.filter(user=user).order_by('-last_played')
            
            games_info = []
            
            for game in games:
                achievements = game.achievements.all().order_by('display_order')
                
                formatted_achievements = [
                    {
                        "achievement_id": achievement.achievement_id,
                        "name": achievement.title,
                        "description": achievement.description,
                        "image": "https://media.retroachievements.org/Badge/"+str(achievement.badge_name)+".png",
                        "points": achievement.points,
                        "true_ratio": achievement.true_ratio,
                        "unlock_time": achievement.date_earned,
                        "display_order": achievement.display_order,
                        "type": achievement.type,
                        "unlocked": bool(achievement.date_earned),
                    }
                    for achievement in achievements
                ]
                
                games_info.append({
                    "appid": game.game_id,
                    "name": game.title,
                    "console_name": game.console_name,
                    "image_icon": "https://retroachievements.org" + game.image_icon,
                    "image_title": "https://retroachievements.org" + game.image_title,
                    "image_ingame": "https://retroachievements.org" + game.image_ingame,
                    "img_icon_url": "https://retroachievements.org" + game.image_box_art,
                    "last_played": game.last_played,
                    "total_achievements": game.achievements_total,
                    "unlocked_achievements": game.num_achieved,
                    "locked_achievements": game.achievements_total - game.num_achieved,
                    "achievements": formatted_achievements,
                })
                
            return {"games": games_info}
            
        except Exception as e:
            logger.error("Error fetching games: %s", str(e))
            return {"error": f"Error fetching RetroAchievements data: {str(e)}"}

    @staticmethod
    def fetch_game_details(user, game_id):
        """Fetch a game and its achievements by game ID for a specific user."""
        try:
            game = RetroAchievementsGame.objects.get(user=user, game_id=game_id)
            achievements = game.achievements.all().order_by('display_order')
            
            formatted_achievements = [
                {
                    "achievement_id": achievement.achievement_id,
                    "name": achievement.title,
                    "description": achievement.description,
                    "image": "https://media.retroachievements.org/Badge/"+str(achievement.badge_name)+".png",
                    "points": achievement.points,
                    "true_ratio": achievement.true_ratio,
                    "unlock_time": achievement.date_earned,
                    "display_order": achievement.display_order,
                    "type": achievement.type,
                    "unlocked": bool(achievement.date_earned),
                }
                for achievement in achievements
            ]
            
            return {
                "game": {
                    "appid": game.game_id,
                    "name": game.title,
                    "console_name": game.console_name,
                    "image_icon": "https://retroachievements.org" + game.image_icon,
                    "image_title": "https://retroachievements.org" + game.image_title,
                    "image_ingame": "https://retroachievements.org" + game.image_ingame,
                    "img_icon_url": "https://retroachievements.org" + game.image_box_art,
                    "last_played": game.last_played,
                    "total_achievements": game.achievements_total,
                    "unlocked_achievements": game.num_achieved,
                    "locked_achievements": game.achievements_total - game.num_achieved,
                },
                "achievements": formatted_achievements,
            }
            
        except RetroAchievementsGame.DoesNotExist:
            return None, None
        except Exception as e:
            logger.error("Error fetching game details: %s", str(e))
            return None, None