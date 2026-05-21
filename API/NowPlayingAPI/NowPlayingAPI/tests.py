from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase

import http_client
from steam.models import Game
from trakt.models import Movie, MovieWatch


class HttpClientTests(SimpleTestCase):
    @patch("http_client.time.sleep")
    @patch("http_client.requests.request")
    def test_request_retries_transient_statuses(self, mock_request, _mock_sleep):
        first = MagicMock(status_code=500)
        second = MagicMock(status_code=200)
        mock_request.side_effect = [first, second]

        response = http_client.get("https://example.com/data")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_request.call_count, 2)

    @patch("http_client.time.sleep")
    @patch("http_client.requests.request")
    def test_request_raises_sanitized_error_after_timeout(self, mock_request, _mock_sleep):
        mock_request.side_effect = http_client.requests.Timeout("connect timed out")

        with self.assertRaises(http_client.ExternalRequestError) as exc:
            http_client.get("https://example.com/data", retries=1)

        self.assertEqual(str(exc.exception), "External service request failed.")
        self.assertEqual(mock_request.call_count, 2)


class DetailEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="detail-owner",
            email="detail-owner@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="detail-other",
            email="detail-other@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    def test_games_detail_returns_authorized_game(self):
        Game.objects.create(user=self.user, appid=123, name="Owned Detail")

        response = self.client.get("/games/detail/?platform=steam&appid=123")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["appid"], 123)

    def test_games_detail_denies_cross_user_game(self):
        Game.objects.create(user=self.other_user, appid=456, name="Other Detail")

        response = self.client.get("/games/detail/?platform=steam&appid=456")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_games_detail_rejects_invalid_platform(self):
        response = self.client.get("/games/detail/?platform=unknown&appid=1")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_trakt_detail_returns_authorized_movie(self):
        Movie.objects.create(
            user=self.user,
            trakt_id="1",
            title="Owned Movie",
            tmdb_id="42",
            plays=2,
        )

        response = self.client.get("/trakt/detail/?type=movie&tmdb_id=42")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["movie"]["title"], "Owned Movie")

    def test_trakt_detail_denies_cross_user_movie(self):
        Movie.objects.create(
            user=self.other_user,
            trakt_id="2",
            title="Other Movie",
            tmdb_id="99",
            plays=1,
        )

        response = self.client.get("/trakt/detail/?type=movie&tmdb_id=99")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_trakt_detail_rejects_invalid_type(self):
        response = self.client.get("/trakt/detail/?type=episode&tmdb_id=42")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WatchHistoryFilterTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="history-owner",
            email="history-owner@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="history-other",
            email="history-other@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        now = timezone.now()
        self.new_movie = Movie.objects.create(
            user=self.user,
            trakt_id="history-new",
            title="New Movie",
            tmdb_id="100",
        )
        self.old_movie = Movie.objects.create(
            user=self.user,
            trakt_id="history-old",
            title="Old Movie",
            tmdb_id="101",
        )
        self.other_movie = Movie.objects.create(
            user=self.other_user,
            trakt_id="history-other",
            title="Other Movie",
            tmdb_id="102",
        )
        MovieWatch.objects.create(movie=self.new_movie, watched_at=now - timedelta(days=5))
        MovieWatch.objects.create(movie=self.old_movie, watched_at=now - timedelta(days=200))
        MovieWatch.objects.create(movie=self.other_movie, watched_at=now - timedelta(days=1))

    def test_watch_history_filters_by_days_and_user(self):
        response = self.client.get("/trakt/watch-history/?type=movies&days=30")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_items"], 1)
        self.assertEqual(response.data["history"][0]["title"], "New Movie")

    def test_watch_history_sorts_oldest_first(self):
        response = self.client.get("/trakt/watch-history/?type=movies&sort=oldest")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["history"][0]["title"], "Old Movie")
        self.assertEqual(response.data["history"][1]["title"], "New Movie")

    def test_watch_history_pagination_still_works(self):
        response = self.client.get("/trakt/watch-history/?type=movies&page=1&page_size=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["page_size"], 1)
        self.assertEqual(response.data["total_items"], 2)
        self.assertEqual(response.data["total_pages"], 2)
        self.assertEqual(len(response.data["history"]), 1)

    def test_watch_history_rejects_invalid_filters(self):
        response = self.client.get("/trakt/watch-history/?days=400")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("days", response.data)

        response = self.client.get("/trakt/watch-history/?sort=random")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sort", response.data)
