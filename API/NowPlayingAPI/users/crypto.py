from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

def get_encryption_key():
    """
    Get or generate an encryption key for API keys.
    
    In production, this should come from a secure environment variable
    or a secure key management service, not settings.
    """
    # Try to get key from settings
    key = getattr(settings, 'API_KEY_ENCRYPTION_KEY', None)
    
    if not key:
        raise ImproperlyConfigured("API_KEY_ENCRYPTION_KEY is required.")
    
    # Check if the key is already properly formatted
    try:
        # If the key is a string representation of bytes, it may need to be encoded
        if isinstance(key, str):
            Fernet(key.encode())
        else:
            Fernet(key)
        return key
    except Exception as e:
        raise ImproperlyConfigured(f"Invalid API_KEY_ENCRYPTION_KEY format: {e}") from e

def encrypt_api_key(raw_key):
    """
    Encrypt an API key using Fernet symmetric encryption.
    
    Args:
        raw_key (str): The raw API key to encrypt
        
    Returns:
        str: The encrypted key as a string
    """
    if not raw_key:
        return None
        
    # Get encryption key
    key = get_encryption_key()
    
    # Make sure we have a properly formatted key
    try:
        f = Fernet(key.encode() if isinstance(key, str) else key)
        
        # Encrypt the API key
        encrypted_key = f.encrypt(raw_key.encode())
        return encrypted_key.decode()
    except Exception as e:
        logger.error(f"Failed to encrypt API key: {e}")
        return None

def decrypt_api_key(encrypted_key):
    """
    Decrypt an API key that was encrypted with encrypt_api_key.
    
    Args:
        encrypted_key (str): The encrypted API key
        
    Returns:
        str: The decrypted API key, or None if decryption fails
    """
    if not encrypted_key:
        return None
    
    try:
        # Get encryption key
        key = get_encryption_key()
        
        # Make sure we have a properly formatted key
        f = Fernet(key.encode() if isinstance(key, str) else key)
        
        # Decrypt the API key
        decrypted_key = f.decrypt(encrypted_key.encode())
        return decrypted_key.decode()
    except Exception as e:
        logger.error(f"Failed to decrypt API key: {e}")
        return None 
