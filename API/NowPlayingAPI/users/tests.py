from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.exceptions import APIException

from .credentials import get_service_credentials
from .models import UserApiKey

# Create your tests here.

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
        self.assertEqual(User.objects.count(), 1)
        
    def test_user_login(self):
        # Create user first
        user = User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        # Login
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
