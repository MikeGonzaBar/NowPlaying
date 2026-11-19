from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.exceptions import APIException
from django.conf import settings
from django.test import override_settings
from datetime import datetime, time, timezone as datetime_timezone

from .credentials import get_service_credentials
from .models import SyncJob, UserApiKey, UserPreference
from .sync_service import enqueue_due_jobs


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'Test1234!',
            'password2': 'Test1234!'
        }
        
    def test_user_registration(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)


class BrowserSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = User.objects.create_user(
            username='browser-user', email='browser@example.com', password='Test1234!'
        )
        self.csrf_url = reverse('browser_csrf')
        self.login_url = reverse('browser_login')
        self.refresh_url = reverse('browser_refresh')
        self.logout_url = reverse('browser_logout')

    def csrf_headers(self):
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        return {'HTTP_X_CSRFTOKEN': self.client.cookies['csrftoken'].value}

    def login(self):
        response = self.client.post(
            self.login_url,
            {'username': 'browser-user', 'password': 'Test1234!'},
            format='json',
            **self.csrf_headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    @override_settings(AUTH_COOKIE_SECURE=True)
    def test_browser_login_sets_http_only_secure_cookie_pair_without_tokens_in_body(self):
        response = self.login()
        self.assertEqual(set(response.data), {'user'})
        access = response.cookies[settings.AUTH_ACCESS_COOKIE_NAME]
        refresh = response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]
        self.assertTrue(access['httponly'])
        self.assertTrue(refresh['httponly'])
        self.assertTrue(access['secure'])
        self.assertTrue(refresh['secure'])
        self.assertEqual(access['samesite'], 'Lax')
        self.assertEqual(access['path'], settings.AUTH_ACCESS_COOKIE_PATH)
        self.assertEqual(refresh['path'], settings.AUTH_REFRESH_COOKIE_PATH)

    def test_cookie_session_authenticates_profile_and_requires_csrf_for_writes(self):
        self.login()
        profile = self.client.get(reverse('profile'))
        self.assertEqual(profile.status_code, status.HTTP_200_OK)

        response = self.client.post(
            reverse('api-keys-list'),
            {'service_name': 'steam', 'api_key': 'secret'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_browser_refresh_rotates_and_blacklists_the_old_refresh_token(self):
        login_response = self.login()
        old_refresh = login_response.cookies[settings.AUTH_REFRESH_COOKIE_NAME].value
        response = self.client.post(self.refresh_url, format='json', **self.csrf_headers())
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        new_refresh = response.cookies[settings.AUTH_REFRESH_COOKIE_NAME].value
        self.assertNotEqual(old_refresh, new_refresh)

        stale_client = APIClient(enforce_csrf_checks=True)
        stale_client.get(self.csrf_url)
        stale_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = old_refresh
        stale_response = stale_client.post(
            self.refresh_url,
            format='json',
            HTTP_X_CSRFTOKEN=stale_client.cookies['csrftoken'].value,
        )
        self.assertEqual(stale_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_and_expires_browser_cookies(self):
        login_response = self.login()
        old_refresh = login_response.cookies[settings.AUTH_REFRESH_COOKIE_NAME].value
        response = self.client.post(self.logout_url, format='json', **self.csrf_headers())
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.cookies[settings.AUTH_ACCESS_COOKIE_NAME]['max-age'], 0)
        self.assertEqual(response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]['max-age'], 0)

        stale_client = APIClient(enforce_csrf_checks=True)
        stale_client.get(self.csrf_url)
        stale_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = old_refresh
        stale_response = stale_client.post(
            self.refresh_url,
            format='json',
            HTTP_X_CSRFTOKEN=stale_client.cookies['csrftoken'].value,
        )
        self.assertEqual(stale_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(User.objects.count(), 1)
        
    def test_user_login(self):
        user = User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        login_data = {
            'username': self.user_data['username'],
            'password': self.user_data['password']
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)


class ServiceCredentialsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='credential-user',
            email='credential@example.com',
            password='Test1234!',
        )

    def create_api_key(self, service_name='steam', raw_key='secret', service_user_id='service-user'):
        api_key = UserApiKey(
            user=self.user,
            service_name=service_name,
        )
        api_key.set_key(raw_key, service_user_id=service_user_id)
        api_key.save()
        return api_key

    def test_get_service_credentials_returns_decrypted_key_and_updates_last_used(self):
        api_key = self.create_api_key()
        self.assertIsNone(api_key.last_used)

        credentials = get_service_credentials(self.user, 'steam', require_user_id=True)
        api_key.refresh_from_db()

        self.assertEqual(credentials.api_key, 'secret')
        self.assertEqual(credentials.service_user_id, 'service-user')
        self.assertIsNotNone(api_key.last_used)
        self.assertLessEqual(api_key.last_used, timezone.now())

    def test_get_service_credentials_missing_key(self):
        with self.assertRaises(APIException) as exc:
            get_service_credentials(self.user, 'steam')

        self.assertEqual(exc.exception.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No Steam API key found', str(exc.exception.detail))

    def test_get_service_credentials_missing_service_user_id(self):
        self.create_api_key(service_user_id='')

        with self.assertRaises(APIException) as exc:
            get_service_credentials(self.user, 'steam', require_user_id=True)

        self.assertEqual(exc.exception.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No Steam user ID found', str(exc.exception.detail))

    def test_get_service_credentials_decryption_failure(self):
        UserApiKey.objects.create(
            user=self.user,
            service_name='steam',
            service_user_id='service-user',
            key_hash='not-a-valid-fernet-token',
        )

        with self.assertRaises(APIException) as exc:
            get_service_credentials(self.user, 'steam')

        self.assertEqual(exc.exception.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Could not decrypt the stored Steam API key', str(exc.exception.detail))


class SyncScheduleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('sync-user', 'sync@example.com', 'Test1234!')
        self.connection = UserApiKey(user=self.user, service_name='steam', service_user_id='steam-id')
        self.connection.set_key('secret')
        self.connection.save()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_user_can_update_one_connection_schedule(self):
        SyncJob.objects.create(user=self.user, provider='steam')
        response = self.client.patch(
            reverse('api-keys-schedule', kwargs={'pk': self.connection.pk}),
            {'sync_enabled': True, 'sync_time': '03:15', 'sync_timezone': 'America/Mexico_City'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.connection.refresh_from_db()
        self.assertEqual(self.connection.sync_time, time(3, 15))
        self.assertEqual(self.connection.sync_timezone, 'America/Mexico_City')
        self.assertFalse(SyncJob.objects.exists())

    def test_schedule_rejects_invalid_timezone(self):
        response = self.client.patch(
            reverse('api-keys-schedule', kwargs={'pk': self.connection.pk}),
            {'sync_timezone': 'not/a-timezone'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_daily_schedule_only_enqueues_after_configured_time(self):
        self.connection.sync_time = time(3, 0)
        self.connection.sync_timezone = 'UTC'
        self.connection.save(update_fields=['sync_time', 'sync_timezone'])

        before = datetime(2026, 10, 30, 2, 59, tzinfo=datetime_timezone.utc)
        after = datetime(2026, 10, 30, 3, 1, tzinfo=datetime_timezone.utc)
        self.assertEqual(enqueue_due_jobs(before), 0)
        self.assertEqual(enqueue_due_jobs(after), 1)
        self.assertEqual(SyncJob.objects.get().provider, 'steam')


class LoginIdentifierTests(TestCase):
    """The login form accepts a username in any casing, or the email address."""

    def setUp(self):
        self.user = User.objects.create_user('MaikOck', 'mike@example.com', 'Test1234!')
        self.client = APIClient()
        self.url = reverse('login')

    def login(self, identifier, password='Test1234!'):
        return self.client.post(
            self.url, {'username': identifier, 'password': password}, format='json'
        )

    def test_exact_username_is_unchanged(self):
        self.assertEqual(self.login('MaikOck').status_code, status.HTTP_200_OK)

    def test_username_is_case_insensitive(self):
        response = self.login('maikock')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'MaikOck')

    def test_email_can_be_used_instead_of_username(self):
        response = self.login('MIKE@example.com')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'MaikOck')

    def test_surrounding_whitespace_is_ignored(self):
        self.assertEqual(self.login('  MaikOck  ').status_code, status.HTTP_200_OK)

    def test_wrong_password_still_fails(self):
        self.assertEqual(
            self.login('maikock', 'wrong-password').status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_shared_email_is_not_guessed(self):
        User.objects.create_user('other-user', 'mike@example.com', 'Test1234!')
        self.assertEqual(self.login('mike@example.com').status_code, status.HTTP_400_BAD_REQUEST)


class UserPreferenceTests(TestCase):
    """Contract tests for /api/users/preferences/."""

    def setUp(self):
        self.user = User.objects.create_user('pref-user', 'pref@example.com', 'Test1234!')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = reverse('preferences')

    def test_read_creates_default_preferences(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data'], {'version': 1, 'hidden_sections': []})
        self.assertTrue(UserPreference.objects.filter(user=self.user).exists())

    def test_update_persists_hidden_sections(self):
        response = self.client.patch(
            self.url, {'data': {'hidden_sections': ['games']}}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['hidden_sections'], ['games'])
        self.assertEqual(
            UserPreference.objects.get(user=self.user).data['hidden_sections'], ['games']
        )

    def test_duplicate_sections_are_normalised(self):
        response = self.client.patch(
            self.url,
            {'data': {'hidden_sections': ['games', 'games']}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['hidden_sections'], ['games'])

    def test_unknown_section_is_rejected(self):
        response = self.client.patch(
            self.url, {'data': {'hidden_sections': ['podcasts']}}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_hiding_every_section_is_rejected(self):
        response = self.client.patch(
            self.url,
            {'data': {'hidden_sections': ['games', 'movies', 'music']}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_preference_key_is_rejected(self):
        response = self.client.patch(
            self.url, {'data': {'theme': 'dark'}}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)
