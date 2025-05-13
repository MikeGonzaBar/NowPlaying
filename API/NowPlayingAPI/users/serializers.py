from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import UserApiKey

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')
        
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        user = authenticate(username=attrs['username'], password=attrs['password'])
        
        if not user:
            raise serializers.ValidationError('Invalid credentials')
        
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')
        
        return {'user': user}

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        read_only_fields = ('id',)

class ApiKeySerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(write_only=True, required=True)
    service_user_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = UserApiKey
        fields = ('id', 'service_name', 'service_user_id', 'created_at', 'updated_at', 'last_used', 'api_key')
        read_only_fields = ('id', 'created_at', 'updated_at', 'last_used')
    
    def create(self, validated_data):
        raw_key = validated_data.pop('api_key')
        service_user_id = validated_data.pop('service_user_id', None)
        user = self.context['request'].user
        service_name = validated_data['service_name']
        
        # Try to get existing API key or create a new one
        api_key, created = UserApiKey.objects.get_or_create(
            user=user,
            service_name=service_name,
            defaults={}
        )
        
        # Update the key and service_user_id regardless of whether it's new or existing
        api_key.set_key(raw_key, service_user_id=service_user_id)
        api_key.save()
        return api_key
    
    def update(self, instance, validated_data):
        service_user_id = validated_data.pop('service_user_id', None)
        if 'api_key' in validated_data:
            instance.set_key(validated_data.pop('api_key'), service_user_id=service_user_id)
        elif service_user_id is not None:
            instance.service_user_id = service_user_id
            instance.save(update_fields=['service_user_id'])
        return super().update(instance, validated_data)

class ApiKeyCheckSerializer(serializers.Serializer):
    service_name = serializers.CharField(required=True)
    api_key = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        user = self.context['request'].user
        service_name = attrs['service_name']
        
        try:
            api_key_obj = UserApiKey.objects.get(user=user, service_name=service_name)
            stored_key = api_key_obj.get_key()
            
            if not stored_key or attrs['api_key'] != stored_key:
                raise serializers.ValidationError("Invalid API key")
            
            api_key_obj.update_last_used()
            return {'valid': True, 'service_name': service_name}
            
        except UserApiKey.DoesNotExist:
            raise serializers.ValidationError(f"No API key found for service: {service_name}")