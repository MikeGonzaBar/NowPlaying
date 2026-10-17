from rest_framework import generics, status, permissions, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth.models import User
from django.db.models import QuerySet
from typing import cast
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserSerializer,
    ApiKeySerializer,
    ApiKeyCheckSerializer
)
from .models import UserApiKey
from rest_framework.decorators import action, api_view, permission_classes
from .authentication import enforce_csrf

# pyright: reportAttributeAccessIssue=false


class UserRegistrationView(generics.CreateAPIView):
    """Create a new user and return JWT tokens."""

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(summary="Register a new user", responses={201: OpenApiTypes.OBJECT})
    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Validate registration data and return a token pair for the new user."""
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = cast(User, serializer.save())
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class UserLoginView(generics.GenericAPIView):
    """Authenticate a user and return JWT tokens."""

    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(summary="Log in a user", responses={200: OpenApiTypes.OBJECT})
    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Validate credentials and return a token pair."""
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = cast(dict, serializer.validated_data)
        user = validated_data.get('user')
        if not user:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


def _cookie_options(path: str, max_age: int) -> dict:
    options = {
        "max_age": max_age,
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "path": path,
    }
    if settings.AUTH_COOKIE_DOMAIN:
        options["domain"] = settings.AUTH_COOKIE_DOMAIN
    return options


def _set_browser_tokens(response: Response, refresh: RefreshToken) -> None:
    response.set_cookie(
        settings.AUTH_ACCESS_COOKIE_NAME,
        str(refresh.access_token),
        **_cookie_options(
            settings.AUTH_ACCESS_COOKIE_PATH,
            int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        ),
    )
    response.set_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        str(refresh),
        **_cookie_options(
            settings.AUTH_REFRESH_COOKIE_PATH,
            int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        ),
    )


def _clear_browser_tokens(response: Response) -> None:
    response.delete_cookie(
        settings.AUTH_ACCESS_COOKIE_NAME,
        path=settings.AUTH_ACCESS_COOKIE_PATH,
        domain=settings.AUTH_COOKIE_DOMAIN,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
        domain=settings.AUTH_COOKIE_DOMAIN,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )


class BrowserSessionMixin:
    """Shared cookie-only behavior for browser registration and login."""

    def _response_for_user(self, user: User, status_code: int) -> Response:
        response = Response({"user": UserSerializer(user).data}, status=status_code)
        _set_browser_tokens(response, RefreshToken.for_user(user))
        get_token(self.request)
        return response


class BrowserRegistrationView(BrowserSessionMixin, generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        enforce_csrf(request)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._response_for_user(cast(User, serializer.save()), status.HTTP_201_CREATED)


class BrowserLoginView(BrowserSessionMixin, generics.GenericAPIView):
    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        enforce_csrf(request)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = cast(User | None, serializer.validated_data.get("user"))
        if not user:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        return self._response_for_user(user, status.HTTP_200_OK)


class BrowserRefreshView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        enforce_csrf(request)
        raw_refresh = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME)
        if not raw_refresh:
            return Response({"detail": "Refresh cookie was not provided."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(raw_refresh)
            user = User.objects.get(id=refresh[settings.SIMPLE_JWT["USER_ID_CLAIM"]])
            refresh.blacklist()
        except (TokenError, User.DoesNotExist, KeyError):
            response = Response({"detail": "Refresh cookie is invalid."}, status=status.HTTP_401_UNAUTHORIZED)
            _clear_browser_tokens(response)
            return response
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _set_browser_tokens(response, RefreshToken.for_user(user))
        return response


class BrowserLogoutView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        enforce_csrf(request)
        raw_refresh = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_browser_tokens(response)
        return response


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def browser_csrf(request: Request) -> Response:
    get_token(request)
    return Response(status=status.HTTP_204_NO_CONTENT)

class UserProfileView(generics.RetrieveAPIView):
    """Return the authenticated user's profile."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self) -> User:  # pyright: ignore[reportIncompatibleMethodOverride]
        """Return the user attached to the current request."""
        return cast(User, self.request.user)


@extend_schema_view(
    verify=extend_schema(summary="Verify a stored API key value", responses={200: OpenApiTypes.OBJECT}),
    services=extend_schema(summary="List services with stored API keys", responses={200: OpenApiTypes.OBJECT}),
)
class ApiKeyViewSet(viewsets.ModelViewSet):
    """Manage encrypted external-service API keys for the current user."""

    queryset = UserApiKey.objects.none()
    serializer_class = ApiKeySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self) -> QuerySet[UserApiKey]:  # pyright: ignore[reportIncompatibleMethodOverride]
        """Return only API keys owned by the authenticated user."""
        return UserApiKey.objects.filter(user=self.request.user).order_by('-updated_at')
    
    @action(detail=False, methods=['post'])
    def verify(self, request: Request) -> Response:
        """Verify a submitted key against the current user's stored key."""
        serializer = ApiKeyCheckSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response({'status': 'valid'}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def services(self, request: Request) -> Response:
        """Return a list of services for which the user has stored API keys"""
        services = UserApiKey.objects.filter(user=request.user).values_list('service_name', flat=True)
        return Response(services)
