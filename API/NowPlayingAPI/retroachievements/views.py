from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import RetroAchievementsGame, GameAchievement


class RetroAchievementsViewSet(viewsets.ViewSet):
    """
    A viewset that provides actions to fetch recently played games,
    achievements, and game details.
    """

    def list(self, request):
        """
        Default endpoint for /retroachievements/ that returns a list of available actions.
        """
        return Response(
            {
                "available_endpoints": {
                    "fetch_recently_played_games": request.build_absolute_uri(
                        "fetch-recently-played-games/"
                    ),
                    "get_most_achieved_game": request.build_absolute_uri(
                        "get-most-achieved-game/"
                    ),
                    "fetch_games": request.build_absolute_uri("fetch-games/"),
                    "fetch_game_details": request.build_absolute_uri(
                        "fetch-game-details/"
                    ),
                }
            }
        )

    @action(detail=False, methods=["get"], url_path="fetch-recently-played-games")
    def fetch_recently_played_games(self, request):
        """
        Fetches and populates the latest 50 recently played games.
        """
        RetroAchievementsGame.populate_recently_played_games()
        return Response({"message": "Recently played games have been updated."})

    @action(detail=False, methods=["get"], url_path="get-most-achieved-games")
    def get_most_achieved_games(self, request):
        """
        Returns the list of games ordered by the percentage of unlocked achievements.
        """
        games = RetroAchievementsGame.get_most_achieved_games()
        formatted_games = [
            {
                "game_id": game.game_id,
                "title": game.title,
                "console_name": game.console_name,
                "image_icon": game.image_icon,
                "image_title": game.image_title,
                "image_ingame": game.image_ingame,
                "image_box_art": game.image_box_art,
                "num_achieved": game.num_achieved,
                "achievements_total": game.achievements_total,
                "unlocked_percentage": round(game.unlocked_percentage, 2),  # Round to 2 decimal places
            }
            for game in games
        ]
        return Response({"games": formatted_games})

    @action(detail=False, methods=["get"], url_path="fetch-games")
    def fetch_games(self, request):
        """
        Fetches all games without their achievements.
        """
        games = RetroAchievementsGame.fetch_games()
        formatted_games = [
            {
                "game_id": game.game_id,
                "title": game.title,
                "console_name": game.console_name,
                "image_icon": game.image_icon,
                "image_title": game.image_title,
                "image_ingame": game.image_ingame,
                "image_box_art": game.image_box_art,
                "last_played": game.last_played,
                "achievements_total": game.achievements_total,
                "num_achieved": game.num_achieved,
            }
            for game in games
        ]
        return Response({"games": formatted_games})

    @action(detail=False, methods=["get"], url_path="fetch-game-details")
    def fetch_game_details(self, request):
        """
        Fetches a game and its achievements by game ID.
        """
        game_id = request.query_params.get("game_id")

        # Validate that game_id is provided
        if not game_id:
            raise ValidationError({"detail": "The 'game_id' parameter is required."})

        try:
            game_id = int(game_id)
        except ValueError:
            raise ValidationError({"detail": "The 'game_id' parameter must be an integer."})

        game, achievements = GameAchievement.fetch_game_details(game_id)
        if game:
            ordered_achievements = sorted(
            achievements, key=lambda achievement: achievement.display_order
        )
            formatted_achievements = [
                {
                    "achievement_id": achievement.achievement_id,
                    "title": achievement.title,
                    "description": achievement.description,
                    "image_id": achievement.badge_name,
                    "points": achievement.points,
                    "true_ratio": achievement.true_ratio,
                    "date_earned": achievement.date_earned,
                    "display_order": achievement.display_order,
                    "type": achievement.type,
                }
                for achievement in ordered_achievements
            ]
            return Response(
                {
                    "game": {
                        "game_id": game.game_id,
                        "title": game.title,
                        "console_name": game.console_name,
                        "image_icon": game.image_icon,
                        "image_title": game.image_title,
                        "image_ingame": game.image_ingame,
                        "image_box_art": game.image_box_art,
                        "achievements_total": game.achievements_total,
                        "num_achieved": game.num_achieved,
                        "score_achieved": game.score_achieved,
                    },
                    "achievements": formatted_achievements,
                }
            )
        return Response({"message": "Game not found."}, status=404)