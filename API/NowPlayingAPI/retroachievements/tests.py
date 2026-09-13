from datetime import datetime, timezone

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import GameAchievement, RetroAchievementsAPI, RetroAchievementsGame


@override_settings(TIME_ZONE="UTC")
class RetroAchievementsStoredContractTests(APITestCase):
    endpoints = (
        ("/retroachievements/fetch-games/", [3, 2, 1]),
        ("/retroachievements/get-most-achieved-games/", [1, 2]),
    )

    def setUp(self):
        self.user = User.objects.create_user(username="ra-contract")
        self.client.force_authenticate(user=self.user)
        self.expected = {}
        for game_id, total, earned in ((1, 4, 3), (2, 4, 1), (3, 0, 0)):
            game = self.create_game(self.user, game_id, total, earned)
            achievements = []
            for order in (2, 1) if game_id == 1 else ():
                unlocked = order == 1
                date = datetime(2026, 1, 1, tzinfo=timezone.utc)
                GameAchievement.objects.create(
                    game=game,
                    achievement_id=order,
                    title=f"Trophy {order}",
                    description="",
                    points=5,
                    true_ratio=10,
                    author="Author",
                    date_created=date,
                    date_modified=date,
                    badge_name="badge" if unlocked else None,
                    display_order=order,
                    type="progression" if unlocked else None,
                    date_earned=date if unlocked else None,
                )
                achievements.append(
                    {
                        "achievement_id": order,
                        "name": f"Trophy {order}",
                        "description": "",
                        "image": "https://media.retroachievements.org/Badge/"
                        + ("badge" if unlocked else "None")
                        + ".png",
                        "points": 5,
                        "true_ratio": 10,
                        "unlock_time": "2026-01-01T00:00:00Z" if unlocked else None,
                        "display_order": order,
                        "type": "progression" if unlocked else None,
                        "unlocked": unlocked,
                    }
                )
            self.expected[game_id] = {
                "appid": game_id,
                "name": f"Game {game_id}",
                "console_name": "SNES",
                "image_icon": "https://retroachievements.org/icon.png",
                "image_title": "https://retroachievements.org/title.png",
                "image_ingame": "https://retroachievements.org/ingame.png",
                "img_icon_url": "https://retroachievements.org/box.png",
                "last_played": f"2026-01-0{game_id}T00:00:00Z",
                "total_achievements": total,
                "unlocked_achievements": earned,
                "locked_achievements": total - earned,
                "achievements": sorted(
                    achievements, key=lambda item: item["display_order"]
                ),
            }
        other = User.objects.create_user(username="ra-other")
        self.create_game(other, 1, 10, 10)

    def create_game(self, user, game_id, total, earned):
        return RetroAchievementsGame.objects.create(
            user=user,
            game_id=game_id,
            console_id=3,
            console_name="SNES",
            title=f"Game {game_id}",
            image_icon="/icon.png",
            image_title="/title.png",
            image_ingame="/ingame.png",
            image_box_art="/box.png",
            last_played=datetime(2026, 1, min(game_id, 28), tzinfo=timezone.utc),
            achievements_total=total,
            num_possible_achievements=total,
            possible_score=100,
            num_achieved=earned,
            score_achieved=5,
            num_achieved_hardcore=0,
            score_achieved_hardcore=0,
        )

    def test_full_payloads_preserve_order_and_stored_summary_counts(self):
        for endpoint, order in self.endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    response.json(),
                    {
                        "result": {
                            "games": [self.expected[game_id] for game_id in order]
                        },
                    },
                )

    def test_empty_library(self):
        self.client.force_authenticate(
            user=User.objects.create_user(username="ra-empty")
        )
        for endpoint, _ in self.endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {"result": {"games": []}})

    def test_raw_helpers_keep_datetime_values(self):
        for loader in (
            RetroAchievementsAPI.fetch_games,
            RetroAchievementsAPI.get_most_achieved_games,
        ):
            games = loader(self.user)["games"]
            self.assertIsInstance(games[0]["last_played"], datetime)
            game = next(game for game in games if game["appid"] == 1)
            self.assertIsInstance(game["achievements"][0]["unlock_time"], datetime)
            self.assertIsNone(game["achievements"][1]["unlock_time"])

    def test_queries_stay_constant_as_library_grows(self):
        for count in (3, 10):
            if count == 10:
                for game_id in range(4, 11):
                    self.create_game(self.user, game_id, 5, 1)
            for endpoint, _ in self.endpoints:
                with self.subTest(endpoint=endpoint, games=count):
                    with self.assertNumQueries(2):
                        response = self.client.get(endpoint)
                    self.assertEqual(response.status_code, 200)
                    expected_count = count - 1 if "most-achieved" in endpoint else count
                    self.assertEqual(
                        len(response.data["result"]["games"]), expected_count
                    )
