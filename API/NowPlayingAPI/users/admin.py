from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

# Unregister the provided model
admin.site.unregister(User)

# Register your own with another Admin
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Add any customizations here
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    search_fields = ('username', 'email')