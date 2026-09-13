from types import SimpleNamespace

from django.contrib.auth.models import User
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from .models import PSNAchievement, PSNGame
from .serializers import PSNGameSerializer

from .auth import (
    PSN_AUTH_PAYLOAD_TYPE,
    parse_psn_auth_payload,
    serialize_psn_auth_payload,
)


class PSNAuthPayloadTests(SimpleTestCase):
    def test_parse_psn_auth_payload_rejects_legacy_npsso(self):
        self.assertIsNone(parse_psn_auth_payload("legacy-npsso-token"))

    def test_serialize_and_parse_psn_auth_payload(self):
        token_response = {
            "access_token": "access",
            "expires_in": 3600,
            "id_token": "id",
            "refresh_token": "refresh",
            "refresh_token_expires_in": 5183999,
            "scope": "psn:mobile.v2.core psn:clientapp",
            "token_type": "bearer",
            "access_token_expires_at": 123.0,
            "refresh_token_expires_at": 456.0,
        }
        psnawp = SimpleNamespace(
            authenticator=SimpleNamespace(token_response=token_response)
        )

        serialized = serialize_psn_auth_payload(psnawp)
        parsed = parse_psn_auth_payload(serialized)

        self.assertEqual(parsed["type"], PSN_AUTH_PAYLOAD_TYPE)
        self.assertEqual(parsed["token_response"], token_response)


@override_settings(TIME_ZONE="UTC")
class PSNStoredResponseContractTests(APITestCase):
    endpoints = (
        ("/psn/get-game-list-stored/", ["A", "B", "C", "D"]),
        ("/psn/get-game-list-total-playtime/", ["B", "D", "A", "C"]),
        ("/psn/get-game-list-most-achieved/", ["D", "A", "B", "C"]),
    )

    def setUp(self):
        self.user = User.objects.create_user(username="psn-contract")
        self.client.force_authenticate(user=self.user)
        self.expected = {}
        zero = {"platinum": 0, "gold": 0, "silver": 0, "bronze": 0}
        for appid, playtime, trophies, totals, unlocked in (
            (
                "A",
                "01:00:00",
                [
                    ("GoLd", True),
                    ("SILVER", True),
                    ("bronze", True),
                    ("PLATINUM", False),
                    (" gold ", True),
                    ("", True),
                    ("unknown", True),
                ],
                {"platinum": 1, "gold": 1, "silver": 1, "bronze": 1},
                {"platinum": 0, "gold": 1, "silver": 1, "bronze": 1},
            ),
            ("B", "1 day, 00:00:00", [], zero, zero),
            ("C", "", [("gold", False)], {**zero, "gold": 1}, zero),
            (
                "D",
                "02:00:00",
                [("Platinum", True)],
                {**zero, "platinum": 1},
                {**zero, "platinum": 1},
            ),
        ):
            game = PSNGame.objects.create(
                user=self.user,
                appid=appid,
                name=f"Game {appid}",
                platform="PS5",
                total_playtime=playtime,
            )
            achievements = []
            for index, (trophy_type, earned) in enumerate(trophies):
                values = {
                    "name": f"Trophy {9 - index}",
                    "description": "" if index == 0 else "Description",
                    "image": "https://example.test/trophy.png",
                    "unlocked": earned,
                    "unlock_time": "2026-01-01T00:00:00Z" if earned else None,
                    "trophy_type": trophy_type,
                }
                PSNAchievement.objects.create(game=game, **values)
                achievements.append(values)
            self.expected[appid] = {
                "appid": appid,
                "name": f"Game {appid}",
                "platform": "PS5",
                "total_playtime": playtime,
                "first_played": None,
                "last_played": None,
                "img_icon_url": "",
                "total_achievements": totals,
                "unlocked_achievements": unlocked,
                "achievements": achievements,
            }
        other = User.objects.create_user(username="psn-other")
        hidden = PSNGame.objects.create(
            user=other, appid="A", name="Private", platform="PS4"
        )
        PSNAchievement.objects.create(
            game=hidden,
            name="Private trophy",
            trophy_type="platinum",
            unlocked=True,
        )

    def test_full_payloads_and_provider_specific_ordering(self):
        for endpoint, order in self.endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    response.json(),
                    {"result": [self.expected[appid] for appid in order]},
                )

    def test_serializer_matches_with_and_without_prefetch(self):
        games = PSNGame.objects.filter(user=self.user).order_by("id")
        expected = [self.expected[appid] for appid in ("A", "B", "C", "D")]
        self.assertEqual(PSNGameSerializer(games, many=True).data, expected)
        self.assertEqual(
            PSNGameSerializer(games.prefetch_related("achievements"), many=True).data,
            expected,
        )

    def test_empty_library_and_cross_user_retrieve(self):
        empty_user = User.objects.create_user(username="psn-empty")
        self.client.force_authenticate(user=empty_user)
        for endpoint, _ in self.endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {"result": []})
        game = PSNGame.objects.filter(user=self.user).first()
        self.assertEqual(self.client.get(f"/psn/{game.pk}/").status_code, 404)

    def test_queries_stay_constant_as_library_grows(self):
        for count in (4, 10):
            if count == 10:
                for index in range(6):
                    game = PSNGame.objects.create(
                        user=self.user,
                        appid=f"Extra{index}",
                        name="Extra",
                        platform="PS4",
                    )
                    PSNAchievement.objects.create(
                        game=game,
                        name="Extra trophy",
                        trophy_type="gold",
                        unlocked=True,
                    )
            for endpoint, _ in self.endpoints:
                with self.subTest(endpoint=endpoint, games=count):
                    with self.assertNumQueries(2):
                        response = self.client.get(endpoint)
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(len(response.data["result"]), count)

    def test_prefetched_serialization_needs_no_additional_queries(self):
        games = list(
            PSNGame.objects.filter(user=self.user)
            .order_by("id")
            .prefetch_related("achievements")
        )
        with self.assertNumQueries(0):
            payload = PSNGameSerializer(games, many=True).data
        self.assertEqual(
            payload, [self.expected[appid] for appid in ("A", "B", "C", "D")]
        )

    def test_populated_play_dates_preserve_serialized_values(self):
        game = PSNGame.objects.get(user=self.user, appid="A")
        game.first_played = "2026-01-01T12:00:00Z"
        game.last_played = "2026-02-02T12:00:00Z"
        game.save()
        expected = {
            **self.expected["A"],
            "first_played": game.first_played,
            "last_played": game.last_played,
        }
        game.refresh_from_db()
        self.assertEqual(PSNGameSerializer(game).data, expected)
        prefetched = PSNGame.objects.prefetch_related("achievements").get(pk=game.pk)
        self.assertEqual(PSNGameSerializer(prefetched).data, expected)
