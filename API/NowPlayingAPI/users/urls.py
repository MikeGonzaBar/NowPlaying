from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    ApiKeyViewSet, BrowserLoginView, BrowserLogoutView, BrowserRefreshView,
    BrowserRegistrationView, UserLoginView, UserProfileView,
    UserRegistrationView, browser_csrf,
)

router = DefaultRouter()
router.register(r'api-keys', ApiKeyViewSet, basename='api-keys')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('browser/csrf/', browser_csrf, name='browser_csrf'),
    path('browser/register/', BrowserRegistrationView.as_view(), name='browser_register'),
    path('browser/login/', BrowserLoginView.as_view(), name='browser_login'),
    path('browser/refresh/', BrowserRefreshView.as_view(), name='browser_refresh'),
    path('browser/logout/', BrowserLogoutView.as_view(), name='browser_logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('', include(router.urls)),
]
