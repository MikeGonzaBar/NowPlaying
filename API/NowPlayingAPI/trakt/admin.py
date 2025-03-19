from django.contrib import admin
from .models import TraktToken


# Register your models here.
@admin.register(TraktToken)
class TraktTokenAdmin(admin.ModelAdmin):
    list_display = ("access_token", "refresh_token", "expires_at", "updated_at")
    search_fields = ("access_token", "refresh_token")
    list_filter = ("expires_at", "updated_at")
