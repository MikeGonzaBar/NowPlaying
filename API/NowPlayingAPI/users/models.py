from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.auth.models import User
from django.utils import timezone
from .crypto import encrypt_api_key, decrypt_api_key

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(username, email, password, **extra_fields)

class UserApiKey(models.Model):
    """
    Stores API keys for external services in encrypted form.
    Keys are encrypted before storage and can be decrypted when needed.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    service_name = models.CharField(max_length=100)  # e.g., 'steam', 'playstation', 'trakt'
    service_user_id = models.CharField(max_length=255, null=True, blank=True)  # Optional service-specific user ID
    key_hash = models.TextField()  # Field renamed from key_hash, now stores encrypted key
    last_used = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'service_name')
        verbose_name = 'User API Key'
        verbose_name_plural = 'User API Keys'
    
    def __str__(self):
        return f"{self.user.username}'s {self.service_name} API key"
    
    def set_key(self, raw_key, service_user_id=None):
        """Encrypt and save the API key and optional service user ID"""
        self.key_hash = encrypt_api_key(raw_key)
        if service_user_id is not None:
            self.service_user_id = service_user_id
        
    def get_key(self):
        """Decrypt and return the API key"""
        decrypted_key = decrypt_api_key(self.key_hash)
        print(f"DEBUG: Decrypted API key for {self.service_name}: {decrypted_key}")
        return decrypted_key
    
    def update_last_used(self):
        """Update the last used timestamp"""
        self.last_used = timezone.now()
        self.save(update_fields=['last_used'])
