from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Achievement, Game
from .serializers import SteamSerializer


class SteamViewSetIsolationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="testpass123",
        )
        self.owned_game = Game.objects.create(
            user=self.user,
            appid=10,
            name="Owned Game",
            playtime_forever=30,
        )
        self.other_game = Game.objects.create(
            user=self.other_user,
            appid=20,
            name="Other Game",
            playtime_forever=60,
        )
        self.client.force_authenticate(user=self.user)

    def test_list_only_returns_authenticated_users_games(self):
        response = self.client.get("/steam/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data.get("results", response.data)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["appid"], self.owned_game.appid)

    def test_retrieve_denies_cross_user_game(self):
        response = self.client.get(f"/steam/{self.other_game.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_allows_owned_game(self):
        response = self.client.get(f"/steam/{self.owned_game.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["appid"], self.owned_game.appid)

    def test_stored_custom_action_only_returns_authenticated_users_games(self):
        response = self.client.get("/steam/get-game-list-stored/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["result"]), 1)
        self.assertEqual(response.data["result"][0]["appid"], self.owned_game.appid)


@override_settings(
    TIME_ZONE="UTC",
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class SteamStoredResponseContractTests(APITestCase):
    endpoints = (
        ("/steam/get-game-list-stored/", [30, 20, 10, 40]),
        ("/steam/get-game-list-total-playtime/", [20, 40, 10, 30]),
        ("/steam/get-game-list-most-achieved/", [40, 10, 20, 30]),
    )

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.user = User.objects.create_user(username="steam-contract")
        self.client.force_authenticate(user=self.user)
        self.expected = {}
        self.games = []
        for appid, minutes, day, states in (
            (10, 60, 2, [False, True]),
            (20, 180, 3, []),
            (30, 0, 4, [False]),
            (40, 120, 1, [True]),
        ):
            timestamp = f"2026-01-0{day}T12:00:00Z"
            game = Game.objects.create(
                user=self.user,
                appid=appid,
                name=f"Game {appid}",
                playtime_forever=minutes,
                last_played=timestamp,
                content_descriptorids=[1, 5],
                has_community_visible_stats=True,
            )
            self.games.append(game)
            achievements = []
            for index, unlocked in enumerate(states):
                values = {
                    "name": "Z first" if index == 0 else "A second",
                    "description": "" if index == 0 else "A description",
                    "image": "https://example.test/achievement.png",
                    "unlocked": unlocked,
                    "unlock_time": "2026-01-01T00:00:00Z" if unlocked else None,
                }
                Achievement.objects.create(game=game, **values)
                achievements.append(values)
            self.expected[appid] = {
                "appid": appid,
                "name": f"Game {appid}",
                "playtime_forever": minutes,
                "playtime_formatted": f"{minutes // 60}h {minutes % 60}m",
                "img_icon_url": "",
                "has_community_visible_stats": True,
                "last_played": timestamp,
                "content_descriptorids": [1, 5],
                "total_achievements": len(states),
                "unlocked_achievements_count": sum(states),
                "locked_achievements_count": len(states) - sum(states),
                "achievements": achievements,
            }
        other = User.objects.create_user(username="steam-contract-other")
        hidden = Game.objects.create(user=other, appid=10, name="Private game")
        Achievement.objects.create(game=hidden, name="Private achievement", unlocked=True)

    def test_complete_payload_ordering_and_warm_cache_for_each_stored_view(self):
        for endpoint, order in self.endpoints:
            with self.subTest(endpoint=endpoint):
                expected = {"result": [self.expected[appid] for appid in order]}
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.json(), expected)
                with self.assertNumQueries(0):
                    cached = self.client.get(endpoint)
                self.assertEqual(cached.status_code, status.HTTP_200_OK)
                self.assertEqual(cached.json(), expected)

    def test_serializer_preserves_payload_with_and_without_prefetch(self):
        expected = [self.expected[appid] for appid in (10, 20, 30, 40)]
        games = Game.objects.filter(user=self.user).order_by("id")
        self.assertEqual(SteamSerializer(games, many=True).data, expected)
        self.assertEqual(
            SteamSerializer(games.prefetch_related("achievements"), many=True).data,
            expected,
        )

    def test_empty_library_and_null_last_played(self):
        user = User.objects.create_user(username="steam-empty-library")
        self.client.force_authenticate(user=user)
        for endpoint, _ in self.endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.json(), {"result": []})
        game = Game.objects.get(pk=self.games[0].pk)
        game.last_played = None
        game.save()
        expected = {**self.expected[10], "last_played": None}
        self.assertEqual(SteamSerializer(game).data, expected)

    def test_cold_queries_stay_constant_as_library_grows(self):
        for count in (4, 10):
            if count == 10:
                for appid in range(100, 106):
                    game = Game.objects.create(
                        user=self.user, appid=appid, name=f"Game {appid}",
                    )
                    Achievement.objects.create(
                        game=game, name="Extra achievement", unlocked=True,
                    )
            for endpoint, _ in self.endpoints:
                with self.subTest(endpoint=endpoint, games=count):
                    cache.clear()
                    with self.assertNumQueries(2):
                        response = self.client.get(endpoint)
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                    self.assertEqual(len(response.data["result"]), count)

    def test_prefetched_serializer_needs_no_additional_queries(self):
        games = list(
            Game.objects.filter(user=self.user)
            .order_by("id")
            .prefetch_related("achievements")
        )
        with self.assertNumQueries(0):
            payload = SteamSerializer(games, many=True).data
        self.assertEqual(payload, [self.expected[appid] for appid in (10, 20, 30, 40)])
