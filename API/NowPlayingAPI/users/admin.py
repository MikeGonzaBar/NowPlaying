from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import SyncJob, UserApiKey

admin.site.unregister(User)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Admin view for Django auth users."""

    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    search_fields = ('username', 'email')

@admin.register(UserApiKey)
class UserApiKeyAdmin(admin.ModelAdmin):
    """Admin view for encrypted external-service API keys."""

    list_display = ('user', 'service_name', 'service_user_id', 'last_used', 'created_at', 'updated_at')
    list_filter = ('service_name', 'created_at', 'last_used')
    search_fields = ('user__username', 'service_name', 'service_user_id')
    readonly_fields = ('last_used', 'created_at', 'updated_at')
    fields = ('user', 'service_name', 'service_user_id', 'last_used', 'created_at', 'updated_at')


@admin.register(SyncJob)
class SyncJobAdmin(admin.ModelAdmin):
    list_display = ('user', 'provider', 'status', 'retry_count', 'scheduled_for', 'finished_at')
    list_filter = ('provider', 'status')
    search_fields = ('user__username', 'provider')
    readonly_fields = ('user', 'provider', 'status', 'scheduled_for', 'started_at', 'finished_at',
                       'next_retry_at', 'retry_count', 'summary', 'error', 'created_at', 'updated_at')
