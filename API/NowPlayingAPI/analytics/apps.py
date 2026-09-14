from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """Configure the Analytics Django app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'analytics'
    verbose_name = 'Analytics & Statistics'

    def ready(self):
        from analytics import signals  # noqa: F401
        signals._make_signals_ready()
