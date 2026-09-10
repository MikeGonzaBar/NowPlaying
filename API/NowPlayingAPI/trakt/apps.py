from django.apps import AppConfig


class TraktConfig(AppConfig):
    """Configure the Trakt Django app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'trakt'
