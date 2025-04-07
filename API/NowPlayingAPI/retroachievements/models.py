from django.conf import settings
from django.db import models
import requests
from django.utils.timezone import make_aware
from datetime import datetime
from django.db.models import F, FloatField, ExpressionWrapper


# Your credentials
api_key = settings.RETROACHIEVEMENTS_API_KEY
username = settings.RETROACHIEVEMENTS_USER

def get_json_response(url):
    """Helper function to GET a URL and return JSON data, handling errors."""
    try:
        response = requests.get(url)
        print(f"Requesting: {url}")
        print("Status Code:", response.status_code)
        response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
        try:
            return response.json()
        except ValueError as json_err:
            print("Failed to decode JSON:", json_err)
            print("Raw response:")
            print(response.text)
            return None
    except requests.RequestException as req_err:
        print("Request failed:", req_err)
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
    game_id = models.IntegerField(primary_key=True)  # Unique identifier for the game
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
    achievement_id = models.IntegerField(primary_key=True)  # Unique identifier for the achievement
    game = models.ForeignKey(RetroAchievementsGame, related_name="achievements", on_delete=models.CASCADE)
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
                    achievement_id=achievement_data['ID'],
                    game=game,
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