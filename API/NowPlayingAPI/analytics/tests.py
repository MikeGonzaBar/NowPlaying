from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from analytics.services import AnalyticsService
from music.models import Song
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
