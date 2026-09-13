from rest_framework import generics, status, permissions, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
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
from rest_framework.decorators import action

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
