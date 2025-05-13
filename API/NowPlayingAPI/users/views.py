from django.shortcuts import render
from rest_framework import generics, status, permissions, viewsets
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserSerializer,
    ApiKeySerializer,
    ApiKeyCheckSerializer
)
from .models import UserApiKey
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

# Create your views here.

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class UserLoginView(generics.GenericAPIView):
    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })

class UserProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class ApiKeyViewSet(viewsets.ModelViewSet):
    serializer_class = ApiKeySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserApiKey.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        serializer = ApiKeyCheckSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response({'status': 'valid'}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def services(self, request):
        """Return a list of services for which the user has stored API keys"""
        services = UserApiKey.objects.filter(user=request.user).values_list('service_name', flat=True)
        return Response(services)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Endpoint to demonstrate getting the user from a JWT token.
    This endpoint will return the user ID and username of the authenticated user.
    """
    user = request.user
    return Response({
        'user_id': user.id,
        'username': user.username,
        'email': user.email
    })
