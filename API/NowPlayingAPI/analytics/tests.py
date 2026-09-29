from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase

from analytics.services import AnalyticsService
from music.models import Song
from steam.models import Game
from trakt.models import Episode, EpisodeWatch, Movie, MovieWatch, Season, Show


class MediaAnalyticsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="analytics-user")
        now = timezone.now()

        movie = Movie.objects.create(
            user=self.user,
            trakt_id="100",
            title="Analytics Movie",
            year=2026,
            genres=["Action", "Adventure"],
            directors=["Jane Director"],
            studios=["Example Pictures"],
            last_watched_at=now,
        )
        MovieWatch.objects.create(movie=movie, watched_at=now)

        show = Show.objects.create(
            user=self.user,
            trakt_id="200",
            title="Analytics Show",
            year=2026,
            genres=["Action", "Drama"],
            network="Example Network",
            status="Ended",
            last_watched_at=now,
        )
        season = Season.objects.create(show=show, season_number=1)
        episode = Episode.objects.create(show=show, season=season, episode_number=1)
        EpisodeWatch.objects.create(episode=episode, watched_at=now)
        EpisodeWatch.objects.create(episode=episode, watched_at=now - timedelta(days=1))

        Song.objects.create(
            user=self.user,
            title="Rock Song",
            artist="Rock Artist",
            played_at=now,
            source="lastfm",
            genre_tags=["Rock", "Pop"],
        )
        Song.objects.create(
            user=self.user,
            title="Pop Song",
            artist="Pop Artist",
            played_at=now - timedelta(days=1),
            source="lastfm",
            genre_tags=["Pop", "Dance Pop"],
        )
        Song.objects.create(
            user=self.user,
            title="Old Song",
            artist="Old Artist",
            played_at=now - timedelta(days=60),
            source="lastfm",
            genre_tags=["Oldies"],
        )

    def test_media_genre_distribution_uses_stored_metadata(self):
        result = AnalyticsService.get_media_genre_distribution(self.user, days=30)

        self.assertEqual(result["total_count"], 3)
        genres = {genre["name"]: genre for genre in result["genres"]}
        self.assertEqual(genres["Action"]["count"], 3)
        self.assertIn("Adventure", genres)
        self.assertIn("Drama", genres)

    def test_media_insights_uses_stored_metadata(self):
        result = AnalyticsService.get_media_insights(self.user, days=30)

        self.assertEqual(result["binge_streak"], "2 days")
        self.assertEqual(result["favorite_director"], "Jane Director")
        self.assertEqual(result["top_studio"], "Example Network")

    def test_media_completion_rate_is_unknown_without_episode_catalog(self):
        self.assertIsNone(AnalyticsService.get_media_completion_rate(self.user, days=30))

    def test_music_genre_distribution_uses_song_tags(self):
        result = AnalyticsService.get_music_genre_distribution(self.user, days=30)

        self.assertEqual(result["total_count"], 3)
        self.assertEqual(result["tagged_songs"], 2)
        genres = {genre["name"]: genre for genre in result["genres"]}
        self.assertEqual(genres["Pop"]["count"], 2)
        self.assertEqual(genres["Pop"]["percentage"], 50)
        self.assertIn("Rock", genres)
        self.assertIn("Dance Pop", genres)

    def test_genre_of_the_week_uses_top_music_tag(self):
        self.assertEqual(AnalyticsService.get_genre_of_the_week(self.user, days=7), "Pop")


class AnalyticsApiContractTests(APITestCase):
    """Contract tests for the /api/analytics/ response shape.

    The frontend normalizes every section before rendering, and the backend
    must never collapse a partially failing provider into a non-200 response
    (audit: Analytics 500 / blank page). These tests lock both guarantees.
    """

    def setUp(self):
        self.user = User.objects.create_user(username="contract-user")
        self.client.force_authenticate(user=self.user)

    def test_partial_failure_still_returns_200_with_partial_failures(self):
        """A failing analytics section must degrade, not 500."""
        from unittest.mock import patch

        with patch(
            "analytics.views.AnalyticsService.get_comprehensive_statistics",
            side_effect=RuntimeError("boom"),
        ):
            response = self.client.get("/analytics/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("partial_failures", response.data)
        self.assertIn("comprehensive_stats", response.data["partial_failures"])
        self.assertIn("request_id", response.data)
        self.assertTrue(response.data["request_id"])

    def test_success_response_has_required_top_level_schema(self):
        """Every section the dashboard renders must exist in the payload."""
        response = self.client.get("/analytics/")
        self.assertEqual(response.status_code, 200)
        required_keys = {
            "comprehensive_stats",
            "platform_distribution",
            "achievement_efficiency",
            "gaming_streaks",
            "weekly_trend",
            "monthly_comparison",
            "genre_distribution",
            "music_genre_distribution",
            "music_weekly_scrobbles",
            "media_watch_breakdown",
            "media_genre_distribution",
            "media_insights",
        }
        self.assertTrue(
            required_keys.issubset(response.data.keys()),
            f"Missing keys: {required_keys - set(response.data.keys())}",
        )
        stats = response.data["comprehensive_stats"]
        for section in ("period", "totals", "averages"):
            self.assertIn(section, stats)

    def test_unknown_route_returns_404_not_500(self):
        """An unknown analytics path must not raise."""
        response = self.client.get("/api/nonexistent/")
        self.assertEqual(response.status_code, 404)


class RecentActivityFeedTests(TestCase):
    """The cross-pillar feed must order every media type by one real timestamp.

    Regression guard for the dashboard audit finding: the page concatenated a
    music block above a movie block, so a 20-day-old scrobble rendered above a
    5-month-old film, and games were missing entirely.
    """

    def setUp(self):
        self.user = User.objects.create_user(username="feed-user")
        self.now = timezone.now()

    def test_feed_merges_every_pillar_newest_first(self):
        Game.objects.create(user=self.user, appid=440, name="Old Game", last_played=self.now - timedelta(days=160))
        Game.objects.create(user=self.user, appid=570, name="Newer Game", last_played=self.now - timedelta(days=2))
        Song.objects.create(user=self.user, title="Fresh Scrobble", artist="Artist", played_at=self.now, source="lastfm")
        Movie.objects.create(
            user=self.user,
            trakt_id="1",
            title="Stale Movie",
            tmdb_id="99999",
            last_watched_at=self.now - timedelta(days=150),
        )
        Show.objects.create(user=self.user, trakt_id="2", title="Recent Show", last_watched_at=self.now - timedelta(days=1))

        feed = AnalyticsService.get_recent_activity(self.user, limit=10)

        self.assertEqual(
            [item["title"] for item in feed],
            ["Fresh Scrobble", "Recent Show", "Newer Game", "Stale Movie", "Old Game"],
        )
        self.assertEqual(
            [item["type"] for item in feed],
            ["music", "show", "game", "movie", "game"],
        )

    def test_feed_respects_limit_and_shapes_items(self):
        for index in range(5):
            Song.objects.create(
                user=self.user,
                title=f"Song {index}",
                artist="Artist",
                played_at=self.now - timedelta(hours=index),
                source="lastfm",
            )

        feed = AnalyticsService.get_recent_activity(self.user, limit=3)

        self.assertEqual(len(feed), 3)
        self.assertEqual([item["title"] for item in feed], ["Song 0", "Song 1", "Song 2"])
        self.assertEqual(feed[0]["detail"], "Artist")
        self.assertEqual(feed[0]["type"], "music")
        self.assertIsNotNone(feed[0]["occurred_at"].tzinfo)

    def test_feed_skips_rows_without_a_timestamp(self):
        Game.objects.create(user=self.user, appid=1, name="Never Played", last_played=None)
        Movie.objects.create(user=self.user, trakt_id="9", title="No Date", last_watched_at=None)

        self.assertEqual(AnalyticsService.get_recent_activity(self.user), [])


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "recent-activity-tests",
        }
    }
)
class RecentActivityEndpointTests(APITestCase):
    """Contract tests for /api/analytics/recent-activity/."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="feed-api-user")
        self.client.force_authenticate(user=self.user)

    def test_endpoint_returns_ordered_activities(self):
        Song.objects.create(user=self.user, title="API Song", artist="Artist", played_at=timezone.now(), source="lastfm")
        Game.objects.create(user=self.user, appid=7, name="API Game", last_played=timezone.now() - timedelta(hours=1))

        response = self.client.get("/analytics/recent-activity/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["title"] for item in response.data["activities"]], ["API Song", "API Game"])

    def test_limit_above_maximum_is_clamped_not_rejected(self):
        self.assertEqual(self.client.get("/analytics/recent-activity/?limit=999").status_code, 200)

    def test_non_integer_limit_is_rejected(self):
        self.assertEqual(self.client.get("/analytics/recent-activity/?limit=abc").status_code, 400)
