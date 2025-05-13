from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from .models import UserApiKey

class ApiKeyMixin:
    """
    Mixin that provides methods for securely retrieving API keys
    based on the authenticated user's stored keys.
    """
    
    def get_user_api_key(self, service_name):
        """
        Get the API key for the specified service for the authenticated user.
        Raises appropriate exceptions if no key is found or user isn't authenticated.
        
        Args:
            service_name (str): The name of the service (e.g., 'steam', 'psn')
            
        Returns:
            str: The decrypted API key
            
        Raises:
            NotAuthenticated: If user is not authenticated
            PermissionDenied: If no API key exists for this service
        """
        user = self.request.user
        
        if not user.is_authenticated:
            raise NotAuthenticated("Authentication required to access this resource")
            
        try:
            # Get the API key object
            api_key_obj = UserApiKey.objects.get(user=user, service_name=service_name)
            
            # Mark that the key was used
            api_key_obj.update_last_used()
            
            # The key is retrieved via session, not directly returned
            # In this implementation, we'll need to return it from the DB
            # This is a placeholder - the actual key can't be retrieved as it's hashed
            # Instead, we would normally use it directly in the service module
            return {
                'service_name': service_name,
                'key_exists': True
            }
        except UserApiKey.DoesNotExist:
            raise PermissionDenied(f"No API key found for {service_name}. Please add your API key in profile settings.")

def get_service_key_from_user(user, service_name):
    """
    Standalone function to get an API key for a service from a user object.
    Returns None if no key exists rather than raising an exception.
    
    Args:
        user: Django User object
        service_name (str): Name of the service
        
    Returns:
        dict: Information about the API key
    """
    try:
        api_key_obj = UserApiKey.objects.get(user=user, service_name=service_name)
        api_key_obj.update_last_used()
        return {
            'service_name': service_name,
            'key_exists': True
        }
    except UserApiKey.DoesNotExist:
        return {
            'service_name': service_name,
            'key_exists': False
        } 