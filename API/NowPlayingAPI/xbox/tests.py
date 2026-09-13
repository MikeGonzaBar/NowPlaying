from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from .models import XboxAPI, XboxAchievement, XboxGame
from .serializers import XboxGameSerializer


class XboxAPITests(TestCase):
    def test_make_request_unwraps_openxbl_content(self):
        fake_response = Mock(status_code=200, reason="OK")
        fake_response.json.return_value = {
            "code": 200,
            "content": {"titles": [{"titleId": "123", "name": "Wrapped Game"}]},
        }

        with patch("xbox.models.http_client.get", return_value=fake_response):
            result = XboxAPI.make_request("https://xbl.io/api/v2/player/titleHistory", "api-key")

        self.assertEqual(result, {"titles": [{"titleId": "123", "name": "Wrapped Game"}]})

    def test_fetch_games_excludes_generic_win32_titles(self):
        user = User.objects.create_user(username="xbox-user")
        title_history = {
            "titles": [
                {
                    "titleId": "1955296332",
                    "name": "Dolphin",
                    "devices": ["Win32"],
                    "displayImage": "",
                    "titleHistory": {"lastTimePlayed": "2026-05-20T04:51:56Z"},
                    "achievement": {"currentAchievements": 0, "totalGamerscore": 0},
                    "stats": {"sourceVersion": 0},
                    "gamePass": {"isGamePass": False},
                },
                {
                    "titleId": "1792830437",
                    "name": "Balatro",
                    "devices": ["PC", "XboxOne", "XboxSeries"],
                    "displayImage": "https://example.com/balatro.jpg",
                    "titleHistory": {"lastTimePlayed": "2026-05-20T04:12:22Z"},
                    "achievement": {"currentAchievements": 13, "totalGamerscore": 1000},
                    "stats": {"sourceVersion": 1},
                    "gamePass": {"isGamePass": True},
                }
            ]
        }
        stats = {"statlistscollection": []}
        achievements = {"achievements": []}

        with patch.object(XboxAPI, "make_request", side_effect=[title_history, stats, achievements]):
            result = XboxAPI.fetch_games(user, "api-key", "2535436324847295")

        self.assertEqual(len(result["games"]), 1)
        self.assertEqual(result["games"][0]["name"], "Balatro")
        self.assertEqual(result["games"][0]["platform"], "PC, XboxOne, XboxSeries")
        self.assertFalse(
            XboxGame.objects.filter(user=user, appid="1955296332", name="Dolphin").exists()
        )
        self.assertTrue(
            XboxGame.objects.filter(user=user, appid="1792830437", name="Balatro").exists()
        )


@override_settings(TIME_ZONE="UTC")
class XboxStoredContractTests(APITestCase):
    endpoints = (
        ("/xbox/get-game-list-stored/", ["C", "B", "A", "D"]),
        ("/xbox/get-game-list-total-playtime/", ["B", "D", "A", "C"]),
        ("/xbox/get-game-list-most-achieved/", ["D", "A", "B", "C"]),
    )

    def setUp(self):
        self.user = User.objects.create_user(username="xbox-contract")
        self.client.force_authenticate(user=self.user)
        self.serialized = {}
        self.stored = {}
        for appid, minutes, day, states in (
            ("A", "60", 2, [(False, "50"), (True, "020")]),
            ("B", "180", 3, []),
            ("C", "0", 4, [(False, "100")]),
            ("D", "120", 1, [(True, "100")]),
        ):
            timestamp = f"2026-01-0{day}T12:00:00Z"
            game = XboxGame.objects.create(
                user=self.user, appid=appid, name=f"Game {appid}",
                platform="PC, XboxOne", total_playtime=minutes, last_played=timestamp,
            )
            achievements = []
            for index, (unlocked, value) in enumerate(states):
                payload = {
                    "name": f"Achievement {9 - index}", "description": "",
                    "image": "https://example.test/achievement.png", "unlocked": unlocked,
                    "unlock_time": "2026-01-01T00:00:00Z" if unlocked else None,
                    "achievement_value": value,
                }
                achievement = XboxAchievement.objects.create(game=game, **payload)
                achievements.append({"id": achievement.pk, **payload})
            unlocked_count = sum(unlocked for unlocked, _ in states)
            payload = {
                "id": game.pk, "appid": appid, "name": f"Game {appid}",
                "platform": "PC, XboxOne", "total_playtime": minutes,
                "first_played": None, "last_played": timestamp, "img_icon_url": "",
                "total_achievements": len(states), "unlocked_achievements": unlocked_count,
                "locked_achievements": len(states) - unlocked_count,
                "achievements": achievements,
            }
            self.serialized[appid] = payload
            self.stored[appid] = {
                key: value for key, value in payload.items() if key != "id"
            }
            self.stored[appid]["achievements"] = [
                {key: value for key, value in item.items() if key != "id"}
                for item in achievements
            ]
        other = User.objects.create_user(username="xbox-contract-other")
        hidden = XboxGame.objects.create(user=other, appid="A", name="Private", platform="PC")
        XboxAchievement.objects.create(game=hidden, name="Private", unlocked=True)

    def test_full_payloads_preserve_distinct_envelopes_and_ordering(self):
        for endpoint, order in self.endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                expected = [self.serialized[appid] for appid in order]
                if endpoint.endswith("get-game-list-stored/"):
                    expected = {"games": [self.stored[appid] for appid in order]}
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {"result": expected})

    def test_serializer_with_and_without_prefetch(self):
        games = XboxGame.objects.filter(user=self.user).order_by("id")
        expected = [self.serialized[appid] for appid in ("A", "B", "C", "D")]
        self.assertEqual(XboxGameSerializer(games, many=True).data, expected)
        self.assertEqual(
            XboxGameSerializer(games.prefetch_related("achievements"), many=True).data,
            expected,
        )

    def test_empty_library_and_cross_user_retrieve(self):
        self.client.force_authenticate(user=User.objects.create_user(username="xbox-empty"))
        for endpoint, _ in self.endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                expected = {"games": []} if endpoint.endswith("get-game-list-stored/") else []
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {"result": expected})
        game_id = self.serialized["A"]["id"]
        self.assertEqual(self.client.get(f"/xbox/{game_id}/").status_code, 404)

    def test_queries_stay_constant_as_library_grows(self):
        for count in (4, 10):
            if count == 10:
                for index in range(6):
                    game = XboxGame.objects.create(
                        user=self.user, appid=f"Extra{index}", name="Extra",
                        platform="XboxSeries", total_playtime="0",
                    )
                    XboxAchievement.objects.create(
                        game=game, name="Extra", unlocked=True, achievement_value="5",
                    )
            for endpoint, _ in self.endpoints:
                with self.subTest(endpoint=endpoint, games=count):
                    with self.assertNumQueries(2):
                        response = self.client.get(endpoint)
                    self.assertEqual(response.status_code, 200)
                    result = response.data["result"]
                    games = result["games"] if isinstance(result, dict) else result
                    self.assertEqual(len(games), count)

    def test_prefetched_serializer_needs_no_additional_queries(self):
        games = list(
            XboxGame.objects.filter(user=self.user).order_by("id").prefetch_related("achievements")
        )
        with self.assertNumQueries(0):
            payload = XboxGameSerializer(games, many=True).data
        self.assertEqual(payload, [self.serialized[appid] for appid in ("A", "B", "C", "D")])

    def test_stored_helper_preserves_datetime_objects_and_missing_user_error(self):
        from datetime import datetime

        result = XboxAPI.get_games_stored(self.user)
        self.assertIsInstance(result["games"][0]["last_played"], datetime)
        self.assertIsNone(result["games"][0]["first_played"])
        with self.assertRaisesMessage(ValueError, "User must be provided to retrieve their games."):
            XboxAPI.get_games_stored(None)
