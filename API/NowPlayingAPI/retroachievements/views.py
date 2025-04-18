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
                        "get-most-achieved-games/"
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
        formatted_games = []
        for game in games:
            achievements = GameAchievement.objects.filter(game=game).order_by("display_order")

            formatted_achievements = [
                {
                    "achievement_id": achievement.achievement_id,
                    "name": achievement.title,
                    "description": achievement.description,
                    "image": "https://media.retroachievements.org/Badge/"+achievement.badge_name+".png",
                    "points": achievement.points,
                    "true_ratio": achievement.true_ratio,
                    "unlock_time": achievement.date_earned,
                    "display_order": achievement.display_order,
                    "type": achievement.type,
                    "unlocked": bool(achievement.date_earned),
                }
                for achievement in achievements
            ]

            formatted_games.append({
                "appid": game.game_id,
                "name": game.title,
                "console_name": game.console_name,
                "image_icon": "https://retroachievements.org" + game.image_icon,
                "image_title": "https://retroachievements.org" + game.image_title,
                "image_ingame": "https://retroachievements.org" + game.image_ingame,
                "img_icon_url": "https://retroachievements.org" + game.image_box_art,
                "last_played": game.last_played,
                "total_achievements": game.achievements_total,
                "unlocked_achievements_count": game.num_achieved,
                "achievements": formatted_achievements,
            })

        return Response({"result": formatted_games})

    @action(detail=False, methods=["get"], url_path="fetch-games")
    def fetch_games(self, request):
        """
        Fetches all games along with their achievements.
        """
        games = RetroAchievementsGame.fetch_games()
        formatted_games = []

        for game in games:
            achievements = GameAchievement.objects.filter(game=game).order_by("display_order")

            formatted_achievements = [
                {
                    "achievement_id": achievement.achievement_id,
                    "name": achievement.title,
                    "description": achievement.description,
                    "image": "https://media.retroachievements.org/Badge/"+achievement.badge_name+".png",
                    "points": achievement.points,
                    "true_ratio": achievement.true_ratio,
                    "unlock_time": achievement.date_earned,
                    "display_order": achievement.display_order,
                    "type": achievement.type,
                    "unlocked": bool(achievement.date_earned),
                }
                for achievement in achievements
            ]

            formatted_games.append({
                "appid": game.game_id,
                "name": game.title,
                "console_name": game.console_name,
                "image_icon": "https://retroachievements.org" + game.image_icon,
                "image_title": "https://retroachievements.org" + game.image_title,
                "image_ingame": "https://retroachievements.org" + game.image_ingame,
                "img_icon_url": "https://retroachievements.org" + game.image_box_art,
                "last_played": game.last_played,
                "total_achievements": game.achievements_total,
                "unlocked_achievements_count": game.num_achieved,
                "achievements": formatted_achievements,
            })

        return Response({"result": formatted_games})

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
                    "image": achievement.badge_name,
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
                        "appid": game.game_id,
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