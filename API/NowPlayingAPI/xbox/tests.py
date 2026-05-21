from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import TestCase

from .models import XboxAPI, XboxGame


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
