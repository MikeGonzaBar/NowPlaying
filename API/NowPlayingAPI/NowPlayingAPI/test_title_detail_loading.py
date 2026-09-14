from unittest.mock import patch

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from steam.models import Game as SteamGame, Achievement
from steam.serializers import SteamSerializer
from playstation.models import PSNGame, PSNAchievement
from playstation.serializers import PSNGameSerializer
from xbox.models import XboxGame, XboxAchievement
from xbox.serializers import XboxGameSerializer
from retroachievements.models import RetroAchievementsAPI, RetroAchievementsGame


class TitleDetailLoadingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="title-loading")
        self.client.force_authenticate(user=self.user)
        self.providers = (
            ("steam", SteamGame, Achievement, SteamSerializer, {}),
            ("psn", PSNGame, PSNAchievement, PSNGameSerializer, {"platform": "PS5"}),
            (
                "xbox",
                XboxGame,
                XboxAchievement,
                XboxGameSerializer,
                {"platform": "XboxOne"},
            ),
        )
        self.matches = {}
        for platform, model, achievement_model, _, fields in self.providers:
            match = model.objects.create(
                user=self.user, appid=1, name="Shared Quest", **fields
            )
            self.matches[platform] = match
            achievement_model.objects.create(
                game=match, name="Matched trophy", unlocked=True
            )
            unrelated = model.objects.create(
                user=self.user, appid=2, name="Entirely Different Puzzle", **fields
            )
            for index in range(3):
                achievement_model.objects.create(
                    game=unrelated, name=f"Unrelated {index}"
                )
        other = User.objects.create_user(username="title-other")
        SteamGame.objects.create(user=other, appid=1, name="Shared Quest")

    def request_title(self, title="Shared Quest"):
        return self.client.get("/games/detail-by-title/", {"title": title})

    def test_complete_exact_payloads_and_provider_order(self):
        expected = []
        for platform, model, _, serializer, _ in self.providers:
            game = model.objects.get(pk=self.matches[platform].pk)
            expected.append(
                {
                    "platform": platform,
                    "data": {
                        **serializer(game).data,
                        "recency_rank": {"rank": 1, "total": 2},
                    },
                }
            )
        response = self.request_title()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "title": "Shared Quest",
                "platforms": expected,
                "platform_count": 3,
            },
        )

    def test_any_exact_provider_match_suppresses_all_near_matches(self):
        game = self.matches["steam"]
        game.name = "Shared Ques"
        game.save()
        response = self.request_title()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [p["platform"] for p in response.data["platforms"]], ["psn", "xbox"]
        )

    def test_near_matches_used_only_when_no_exact_match_exists(self):
        for game in self.matches.values():
            game.name = "Shared Ques"
            game.save()
        response = self.request_title()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [p["platform"] for p in response.data["platforms"]],
            ["steam", "psn", "xbox"],
        )
        self.assertTrue(
            all(p["data"]["name"] == "Shared Ques" for p in response.data["platforms"])
        )

    def test_multiple_normalized_matches_keep_existing_order(self):
        duplicate = SteamGame.objects.create(
            user=self.user, appid=3, name="Shared Quest Deluxe"
        )
        response = self.request_title()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [p["platform"] for p in response.data["platforms"]],
            ["steam", "steam", "psn", "xbox"],
        )
        self.assertEqual(
            [p["data"]["appid"] for p in response.data["platforms"][:2]],
            [1, duplicate.appid],
        )

    def test_retro_exact_match_suppresses_other_provider_fuzzy_matches(self):
        for game in self.matches.values():
            game.name = "Shared Ques"
            game.save()
        retro = RetroAchievementsGame.objects.create(
            user=self.user,
            game_id=10,
            title="Shared Quest",
            console_id=1,
            console_name="SNES",
            image_icon="/icon.png",
            image_title="/title.png",
            image_ingame="/ingame.png",
            image_box_art="/box.png",
            last_played=timezone.now(),
            achievements_total=0,
            num_possible_achievements=0,
            possible_score=0,
            num_achieved=0,
            score_achieved=0,
            num_achieved_hardcore=0,
            score_achieved_hardcore=0,
        )
        expected = RetroAchievementsAPI.fetch_game_details(self.user, retro.game_id)
        expected["recency_rank"] = {"rank": 1, "total": 1}
        response = self.request_title()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "title": "Shared Quest",
                "platform_count": 1,
                "platforms": [{"platform": "retroachievements", "data": expected}],
            },
        )

    def test_missing_and_unmatched_titles_preserve_errors(self):
        for title, code, message in (
            ("", 400, "title is required."),
            ("No Such Title", 404, "Game not found."),
        ):
            response = self.request_title(title)
            self.assertEqual(response.status_code, code)
            self.assertEqual(response.json(), {"error": message})

    def test_one_provider_failure_retains_other_exact_results(self):
        with patch(
            "steam.serializers.SteamSerializer",
            side_effect=ValueError("fixture failure"),
        ):
            response = self.request_title()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [p["platform"] for p in response.data["platforms"]], ["psn", "xbox"]
        )

    def test_only_matched_achievements_load_as_libraries_grow(self):
        for size in (2, 9):
            if size == 9:
                for _, model, achievement_model, _, fields in self.providers:
                    for index in range(3, 10):
                        game = model.objects.create(
                            user=self.user,
                            appid=index,
                            name=f"Unrelated Puzzle {index}",
                            **fields,
                        )
                        achievement_model.objects.create(game=game, name="Never loaded")
            for _, _, achievement_model, _, _ in self.providers:
                with self.subTest(model=achievement_model.__name__, games=size):
                    with patch.object(
                        achievement_model, "from_db", wraps=achievement_model.from_db
                    ) as loaded:
                        response = self.request_title()
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(loaded.call_count, 1)

    def test_no_achievements_load_for_unmatched_title(self):
        for _, _, achievement_model, _, _ in self.providers:
            with self.subTest(model=achievement_model.__name__):
                with patch.object(
                    achievement_model, "from_db", wraps=achievement_model.from_db
                ) as loaded:
                    response = self.request_title("No Such Title")
                self.assertEqual(response.status_code, 404)
                loaded.assert_not_called()

    def test_suppressed_fuzzy_provider_loads_no_achievements(self):
        game = self.matches["steam"]
        game.name = "Shared Ques"
        game.save()
        with patch.object(Achievement, "from_db", wraps=Achievement.from_db) as loaded:
            response = self.request_title()
        self.assertEqual(response.status_code, 200)
        loaded.assert_not_called()
