from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Game


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
