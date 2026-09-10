from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import MagicMock, patch

import http_client

from .models import Movie, Show, _process_single_movie, _process_single_show


class TraktShowSyncTests(TestCase):
    def test_process_single_show_uses_module_logger(self):
        user = User.objects.create_user(username="trakt-user")
        item = {
            "last_watched_at": "2026-05-20T00:00:00.000Z",
            "show": {
                "title": "Logger Scope Show",
                "year": 2026,
                "ids": {
                    "trakt": 12345,
                    "tmdb": None,
                    "slug": "logger-scope-show",
                },
            },
            "seasons": [],
        }

        result = _process_single_show(user, item, headers={})

        self.assertEqual(result["title"], "Logger Scope Show")
        self.assertTrue(
            Show.objects.filter(user=user, trakt_id="12345", title="Logger Scope Show").exists()
        )

    @patch("trakt.models.fetch_tmdb_movie_metadata")
    def test_process_single_movie_stores_analytics_metadata(self, mock_metadata):
        user = User.objects.create_user(username="movie-metadata-user")
        mock_metadata.return_value = {
            "poster": "https://image.tmdb.org/t/p/w500/poster.jpg",
            "genres": ["Action", "Science Fiction"],
            "runtime": 124,
            "rating": 7.5,
            "directors": ["Jane Director"],
            "studios": ["Example Pictures"],
        }
        item = {
            "plays": 1,
            "last_watched_at": "2026-05-20T00:00:00.000Z",
            "last_updated_at": "2026-05-20T00:00:00.000Z",
            "movie": {
                "title": "Metadata Movie",
                "year": 2026,
                "ids": {
                    "trakt": 98765,
                    "tmdb": 112233,
                    "imdb": "tt1234567",
                    "slug": "metadata-movie",
                },
            },
        }

        result = _process_single_movie(user, item)

        self.assertEqual(result["title"], "Metadata Movie")
        movie = Movie.objects.get(user=user, trakt_id="98765")
        self.assertEqual(movie.genres, ["Action", "Science Fiction"])
        self.assertEqual(movie.directors, ["Jane Director"])
        self.assertEqual(movie.studios, ["Example Pictures"])
        self.assertEqual(movie.runtime, 124)
        self.assertEqual(movie.rating, 7.5)

    @patch("trakt.models.fetch_tmdb_show_metadata")
    def test_process_single_show_stores_analytics_metadata(self, mock_metadata):
        user = User.objects.create_user(username="show-metadata-user")
        mock_metadata.return_value = {
            "poster": "https://image.tmdb.org/t/p/w500/show.jpg",
            "genres": ["Drama", "Mystery"],
            "runtime": 50,
            "rating": 8.2,
            "network": "Example Network",
            "status": "Ended",
        }
        item = {
            "last_watched_at": "2026-05-20T00:00:00.000Z",
            "show": {
                "title": "Metadata Show",
                "year": 2026,
                "ids": {
                    "trakt": 54321,
                    "tmdb": 445566,
                    "slug": "metadata-show",
                },
            },
            "seasons": [],
        }

        result = _process_single_show(user, item, headers={})

        self.assertEqual(result["title"], "Metadata Show")
        show = Show.objects.get(user=user, trakt_id="54321")
        self.assertEqual(show.genres, ["Drama", "Mystery"])
        self.assertEqual(show.network, "Example Network")
        self.assertEqual(show.status, "Ended")
        self.assertEqual(show.runtime, 50)
        self.assertEqual(show.rating, 8.2)


class TraktCompletedMediaTests(APITestCase):
    def test_completed_media_without_trakt_token_returns_db_movies(self):
        user = User.objects.create_user(username="no-token-user")
        self.client.force_authenticate(user=user)
        Movie.objects.create(
            user=user,
            title="Watched Movie",
            year=2026,
            plays=1,
            trakt_id="123",
            last_watched_at=timezone.now(),
        )

        response = self.client.get("/trakt/completed-media/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["trakt_auth_required"])
        self.assertEqual(response.data["completed_shows"], [])
        self.assertEqual(len(response.data["completed_movies"]), 1)
        self.assertEqual(response.data["completed_movies"][0]["title"], "Watched Movie")


class TraktOAuthCallbackTests(APITestCase):
    def test_oauth_callback_get_allows_trakt_redirect_without_auth(self):
        response = self.client.get("/trakt/oauth-callback/?code=test-code&state=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/html")
        self.assertContains(response, "test-code")

    def test_oauth_callback_post_requires_authentication(self):
        response = self.client.post(
            "/trakt/oauth-callback/",
            {"code": "test-code", "state": "1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MovieStatsTests(APITestCase):
    """Audit #6: movie stats must distinguish permanent absence (404 → N/A in
    the UI) from temporary upstream outages (503 → retry), and never turn a
    missing Trakt token or upstream outage into a 500."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="stats-user", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        self.url = "/trakt/movie-stats/?trakt_id=268642"

    @patch("trakt.views.get_trakt_headers", return_value={"trakt-api-key": "k"})
    @patch("http_client.get")
    def test_success_returns_formatted_stats(self, mock_get, _mock_headers):
        response_mock = MagicMock(status_code=200)
        response_mock.json.return_value = {
            "watchers": 1200,
            "plays": 3400,
            "collectors": 800,
        }
        mock_get.return_value = response_mock

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["watchers"], 1200)
        self.assertEqual(response.data["plays"], 3400)
        self.assertEqual(response.data["collectors"], 800)

    @patch("trakt.views.get_trakt_headers", return_value={"trakt-api-key": "k"})
    @patch("http_client.get")
    def test_upstream_404_maps_to_404_not_500(self, mock_get, _mock_headers):
        mock_get.return_value = MagicMock(status_code=404)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("trakt.views.get_trakt_headers", return_value={"trakt-api-key": "k"})
    @patch("http_client.get")
    def test_upstream_500_maps_to_503_temporarily_unavailable(
        self, mock_get, _mock_headers
    ):
        mock_get.return_value = MagicMock(status_code=500)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("temporarily unavailable", response.data["error"])

    @patch("trakt.views.get_trakt_headers", return_value={"trakt-api-key": "k"})
    @patch("http_client.get")
    def test_network_failure_maps_to_503(self, mock_get, _mock_headers):
        mock_get.side_effect = http_client.ExternalRequestError()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @patch("trakt.views.get_trakt_headers")
    def test_missing_trakt_token_maps_to_404(self, mock_headers):
        mock_headers.side_effect = Exception(
            "Trakt token not found for user stats-user. Please authenticate first."
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_trakt_id_returns_400(self):
        response = self.client.get("/trakt/movie-stats/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
