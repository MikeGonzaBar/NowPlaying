from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import UserApiKey

# Unregister the provided model
admin.site.unregister(User)

# Register your own with another Admin
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Add any customizations here
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    search_fields = ('username', 'email')

@admin.register(UserApiKey)
class UserApiKeyAdmin(admin.ModelAdmin):
    list_display = ('user', 'service_name', 'service_user_id', 'last_used', 'created_at', 'updated_at')
    list_filter = ('service_name', 'created_at', 'last_used')
    search_fields = ('user__username', 'service_name', 'service_user_id')
    readonly_fields = ('last_used', 'created_at', 'updated_at')
    fields = ('user', 'service_name', 'service_user_id', 'last_used', 'created_at', 'updated_at')