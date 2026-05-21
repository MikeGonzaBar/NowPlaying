from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import timedelta
from unittest.mock import patch, MagicMock
from users.models import UserApiKey
from .models import Song

class LastFmIntegrationTestCase(APITestCase):
    def setUp(self):
        """Set up test user and API key"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create a test Last.fm API key
        self.api_key = UserApiKey(
            user=self.user,
            service_name='lastfm'
        )
        self.api_key.set_key('test_api_key', service_user_id='test_lastfm_user')
        self.api_key.save()

    def test_fetch_lastfm_recent_missing_api_key(self):
        """Test that missing API key returns appropriate error"""
        # Delete the API key
        self.api_key.delete()
        
        response = self.client.get('/music/fetch-lastfm-recent/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No Last.fm API key found', response.data['detail'])

    def test_fetch_lastfm_recent_missing_username(self):
        """Test that missing username returns appropriate error"""
        # Clear the service_user_id
        self.api_key.service_user_id = None
        self.api_key.save()
        
        response = self.client.get('/music/fetch-lastfm-recent/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No Last.fm user ID found', response.data['detail'])

    @patch('music.models.http_client.get')
    def test_fetch_lastfm_recent_success_with_enhanced_data(self, mock_get):
        """Test successful Last.fm API call with all enhanced fields"""
        # Mock the Last.fm API response with extended data
        recent_response = MagicMock()
        recent_response.status_code = 200
        recent_response.json.return_value = {
            "recenttracks": {
                "track": [
                    {
                        "name": "Test Song",
                        "artist": {
                            "#text": "Test Artist",
                            "mbid": "test-artist-mbid-123",
                            "url": "https://www.last.fm/music/Test+Artist"
                        },
                        "album": {
                            "#text": "Test Album",
                            "mbid": "test-album-mbid-456"
                        },
                        "date": {"#text": "01 Jan 2024, 12:00"},
                        "url": "https://www.last.fm/music/Test+Artist/_/Test+Song",
                        "mbid": "test-track-mbid-789",
                        "loved": "1",
                        "streamable": "1",
                        "image": [
                            {"#text": "https://example.com/small.jpg", "size": "small"},
                            {"#text": "https://example.com/medium.jpg", "size": "medium"},
                            {"#text": "https://example.com/large.jpg", "size": "large"},
                            {"#text": "https://example.com/extralarge.jpg", "size": "extralarge"}
                        ]
                    }
                ]
            }
        }
        tags_response = MagicMock()
        tags_response.status_code = 200
        tags_response.json.return_value = {
            "toptags": {
                "tag": [
                    {"name": "rock", "count": "100"},
                    {"name": "alternative rock", "count": "80"},
                    {"name": "seen live", "count": "50"},
                ]
            }
        }
        mock_get.side_effect = [recent_response, tags_response]
        today = timezone.now().date()
        stale_keys = [
            f"analytics_{self.user.id}_30",
            f"analytics_{self.user.id}_30_{today}",
            f"platform_dist_{self.user.id}_30_{today}",
            f"music_dashboard_stats_{self.user.id}_30",
        ]
        for key in stale_keys:
            cache.set(key, "stale")
        
        response = self.client.get('/music/fetch-lastfm-recent/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Last.fm ALL recent tracks fetched and stored successfully', response.data['message'])
        self.assertEqual(len(response.data['data']), 1)
        for key in stale_keys:
            self.assertIsNone(cache.get(key))
        
        # Check that the song was saved to the database with enhanced data
        song = Song.objects.filter(user=self.user, source='lastfm').first()
        self.assertIsNotNone(song)
        self.assertEqual(song.title, 'Test Song')
        self.assertEqual(song.artist, 'Test Artist')
        self.assertEqual(song.source, 'lastfm')
        
        # Test enhanced fields
        self.assertEqual(song.track_mbid, 'test-track-mbid-789')
        self.assertEqual(song.artist_mbid, 'test-artist-mbid-123')
        self.assertEqual(song.album_mbid, 'test-album-mbid-456')
        self.assertEqual(song.artist_lastfm_url, 'https://www.last.fm/music/Test+Artist')
        self.assertTrue(song.loved)
        self.assertTrue(song.streamable)
        self.assertEqual(song.genre_tags, ["Rock", "Alternative Rock"])
        
        # Test image fields
        self.assertEqual(song.album_thumbnail_small, 'https://example.com/small.jpg')
        self.assertEqual(song.album_thumbnail_medium, 'https://example.com/medium.jpg')
        self.assertEqual(song.album_thumbnail_large, 'https://example.com/large.jpg')
        self.assertEqual(song.album_thumbnail_extralarge, 'https://example.com/extralarge.jpg')
        self.assertEqual(song.album_thumbnail, 'https://example.com/extralarge.jpg')  # Should use largest
        
        # Check response data includes enhanced fields
        track_data = response.data['data'][0]
        self.assertEqual(track_data['track_mbid'], 'test-track-mbid-789')
        self.assertEqual(track_data['artist_mbid'], 'test-artist-mbid-123')
        self.assertEqual(track_data['album_mbid'], 'test-album-mbid-456')
        self.assertEqual(track_data['artist_lastfm_url'], 'https://www.last.fm/music/Test+Artist')
        self.assertTrue(track_data['loved'])
        self.assertTrue(track_data['streamable'])
        self.assertEqual(track_data['genre_tags'], ["Rock", "Alternative Rock"])
        
        # Check album thumbnails object
        thumbnails = track_data['album_thumbnails']
        self.assertEqual(thumbnails['small'], 'https://example.com/small.jpg')
        self.assertEqual(thumbnails['medium'], 'https://example.com/medium.jpg')
        self.assertEqual(thumbnails['large'], 'https://example.com/large.jpg')
        self.assertEqual(thumbnails['extralarge'], 'https://example.com/extralarge.jpg')

    @patch('music.models.http_client.get')
    def test_fetch_lastfm_recent_accepts_long_urls(self, mock_get):
        """Long Last.fm and artwork URLs should fit in the database columns."""
        long_url = "https://www.last.fm/music/Test+Artist/_/Test+Song?" + ("token=abc123&" * 25)
        long_image_url = "https://lastfm.freetls.fastly.net/i/u/300x300/" + ("abcdef1234567890" * 12) + ".jpg"
        self.assertGreater(len(long_url), 200)
        self.assertGreater(len(long_image_url), 200)

        for field_name in [
            "album_thumbnail",
            "track_url",
            "artist_lastfm_url",
            "album_thumbnail_extralarge",
        ]:
            self.assertEqual(Song._meta.get_field(field_name).max_length, 2048)

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "recenttracks": {
                "track": [
                    {
                        "name": "Long URL Song",
                        "artist": {
                            "#text": "Test Artist",
                            "url": long_url,
                        },
                        "album": {"#text": "Test Album"},
                        "date": {"#text": "01 Jan 2024, 12:00"},
                        "url": long_url,
                        "image": [
                            {"#text": long_image_url, "size": "extralarge"},
                        ],
                    }
                ]
            }
        }
        mock_get.return_value = mock_response

        response = self.client.get('/music/fetch-lastfm-recent/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        song = Song.objects.get(user=self.user, source='lastfm', title='Long URL Song')
        self.assertEqual(song.track_url, long_url)
        self.assertEqual(song.artist_lastfm_url, long_url)
        self.assertEqual(song.album_thumbnail, long_image_url)
        self.assertEqual(song.album_thumbnail_extralarge, long_image_url)

    def test_normalize_lastfm_tags_returns_genre_like_tags(self):
        tags = Song.normalize_lastfm_tags([
            {"name": "seen live", "count": "999"},
            {"name": "r&b", "count": "900"},
            {"name": "pop", "count": "700"},
            {"name": "80s", "count": "100"},
            {"name": "dance-pop", "count": "600"},
        ])

        self.assertEqual(tags, ["R&B", "Pop", "Dance Pop"])

    def test_get_stored_songs_filter_by_source(self):
        """Test filtering songs by source"""
        # Create test songs
        Song.objects.create(
            user=self.user,
            title='Spotify Song',
            artist='Spotify Artist',
            played_at='2024-01-01T12:00:00Z',
            source='spotify'
        )
        Song.objects.create(
            user=self.user,
            title='Last.fm Song',
            artist='Last.fm Artist',
            played_at='2024-01-01T13:00:00Z',
            source='lastfm',
            loved=True,
            track_mbid='test-mbid-123'
        )
        
        # Test getting all songs
        response = self.client.get('/music/get-stored-songs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Test filtering by Last.fm
        response = self.client.get('/music/get-stored-songs/?source=lastfm')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        result = response.data['results'][0]
        self.assertEqual(result['source'], 'lastfm')
        self.assertTrue(result['loved'])
        self.assertEqual(result['track_mbid'], 'test-mbid-123')
        
        # Test filtering by Spotify
        response = self.client.get('/music/get-stored-songs/?source=spotify')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['source'], 'spotify')

    def test_get_stored_songs_rejects_invalid_page(self):
        response = self.client.get('/music/get-stored-songs/?page=0')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('page', response.data)

    def test_get_stored_songs_clamps_oversized_page_size(self):
        response = self.client.get('/music/get-stored-songs/?page_size=1000')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page_size'], 100)

    def test_dashboard_stats_rejects_invalid_days(self):
        response = self.client.get('/music/dashboard-stats/?days=0')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('days', response.data)

    def test_top_artists_filters_by_days_and_source(self):
        now = timezone.now()
        Song.objects.create(
            user=self.user,
            title='Recent Last.fm Song',
            artist='Recent Artist',
            album='Recent Album',
            played_at=now - timedelta(days=10),
            source='lastfm',
        )
        Song.objects.create(
            user=self.user,
            title='Old Spotify Song',
            artist='Old Artist',
            album='Old Album',
            played_at=now - timedelta(days=120),
            source='spotify',
        )

        response = self.client.get('/music/top-artists/?days=30&source=lastfm')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['artists']), 1)
        self.assertEqual(response.data['artists'][0]['name'], 'Recent Artist')

    def test_top_albums_filters_by_source(self):
        now = timezone.now()
        Song.objects.create(
            user=self.user,
            title='Spotify Song',
            artist='Shared Artist',
            album='Spotify Album',
            played_at=now - timedelta(days=1),
            source='spotify',
        )
        Song.objects.create(
            user=self.user,
            title='Last.fm Song',
            artist='Shared Artist',
            album='Last.fm Album',
            played_at=now - timedelta(days=2),
            source='lastfm',
        )

        response = self.client.get('/music/top-albums/?source=spotify')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['albums']), 1)
        self.assertEqual(response.data['albums'][0]['name'], 'Spotify Album')

    def test_top_tracks_rejects_invalid_filters(self):
        response = self.client.get('/music/top-tracks/?days=0')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('days', response.data)

        response = self.client.get('/music/top-tracks/?source=itunes')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('source', response.data)
