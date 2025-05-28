from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
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
        self.api_key = UserApiKey.objects.create(
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
        self.assertIn('No Last.fm API key found', response.data['error'])

    def test_fetch_lastfm_recent_missing_username(self):
        """Test that missing username returns appropriate error"""
        # Clear the service_user_id
        self.api_key.service_user_id = None
        self.api_key.save()
        
        response = self.client.get('/music/fetch-lastfm-recent/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No Last.fm username found', response.data['error'])

    @patch('music.models.requests.get')
    def test_fetch_lastfm_recent_success_with_enhanced_data(self, mock_get):
        """Test successful Last.fm API call with all enhanced fields"""
        # Mock the Last.fm API response with extended data
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
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
        mock_get.return_value = mock_response
        
        response = self.client.get('/music/fetch-lastfm-recent/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Last.fm recent tracks fetched and stored successfully', response.data['message'])
        self.assertEqual(len(response.data['data']), 1)
        
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
        
        # Check album thumbnails object
        thumbnails = track_data['album_thumbnails']
        self.assertEqual(thumbnails['small'], 'https://example.com/small.jpg')
        self.assertEqual(thumbnails['medium'], 'https://example.com/medium.jpg')
        self.assertEqual(thumbnails['large'], 'https://example.com/large.jpg')
        self.assertEqual(thumbnails['extralarge'], 'https://example.com/extralarge.jpg')

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
