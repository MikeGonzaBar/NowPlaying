"""
URL configuration for NowPlayingAPI project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

from retroachievements import views as retroachievements_views
from steam import views as steam_views
from playstation import views as psn_views
from trakt import views as trakt_views
from music import views as spotify_views
from xbox import views as xbox_views


admin.autodiscover()

router = routers.DefaultRouter()
router.register(r"steam", steam_views.SteamViewSet, basename="steam")
router.register(r"psn", psn_views.PSNViewSet, basename="psn")
router.register(r"trakt", trakt_views.TraktViewSet, basename="trakt")
router.register(r"spotify", spotify_views.StreamedSongViewSet, basename="spotify")
router.register(r'retroachievements', retroachievements_views.RetroAchievementsViewSet, basename='retroachievements')
router.register(r'xbox', xbox_views.XBOXViewSet, basename='xbox')


# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include(router.urls)),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    path("auth/", include("users.urls")),  # Include our authentication endpoints
    path("users/", include("users.urls")),  # Also include under users/ path
]
