from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import UserRegistrationView, UserLoginView, UserProfileView, ApiKeyViewSet, get_current_user

router = DefaultRouter()
router.register(r'api-keys', ApiKeyViewSet, basename='api-keys')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('current-user/', get_current_user, name='current_user'),
    path('', include(router.urls)),
] 