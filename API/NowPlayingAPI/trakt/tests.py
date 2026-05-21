from django.contrib.auth.models import User
from django.test import TestCase
from unittest.mock import patch

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
