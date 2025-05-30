# User Management & Authentication Service

This document provides comprehensive documentation for the **User Management** service, covering authentication, API key management, and user-related functionality.

## Overview

The User Management service provides:

- **JWT Authentication**: Secure token-based authentication
- **API Key Management**: Encrypted storage of third-party service credentials
- **Service Integration**: Unified credential management for all external services
- **Security Features**: Encrypted storage and user isolation

---

## Authentication

### JWT Token Authentication

All API endpoints require authentication using JWT tokens in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Obtaining JWT Tokens

**Note**: JWT token generation endpoints would typically be implemented through Django REST Framework's token authentication or a custom authentication system. Refer to your authentication setup for token generation.

---

## API Key Management

### Overview

The API key management system allows users to securely store credentials for external services:

- **Encrypted Storage**: All API keys encrypted at rest
- **Service Isolation**: Keys organized by service name
- **User Isolation**: Each user's keys are isolated
- **Flexible Storage**: Support for API keys, usernames, and additional metadata

---

## API Endpoints

### 1. List API Keys

**Endpoint**: `GET /users/api-keys/`

**Description**: Retrieve all API keys for the authenticated user.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/users/api-keys/"
```

**Response**:

```json
[
    {
        "id": 1,
        "service_name": "spotify",
        "service_user_id": null,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
    },
    {
        "id": 2,
        "service_name": "lastfm",
        "service_user_id": "username",
        "created_at": "2024-01-15T11:00:00Z",
        "updated_at": "2024-01-15T11:00:00Z"
    }
]
```

### 2. Create API Key

**Endpoint**: `POST /users/api-keys/`

**Description**: Store a new API key for a service.

**Authentication**: Required (JWT Token)

**Request Body**:

```json
{
    "service_name": "service_name",
    "api_key": "your_api_key",
    "service_user_id": "optional_username"
}
```

**Example Request**:

```bash
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "spotify",
       "api_key": "BQC4YXsKD8...",
       "service_user_id": null
     }'
```

**Response**:

```json
{
    "id": 3,
    "service_name": "spotify",
    "service_user_id": null,
    "created_at": "2024-01-15T12:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
}
```

### 3. Update API Key

**Endpoint**: `PUT /users/api-keys/{id}/`

**Description**: Update an existing API key.

**Authentication**: Required (JWT Token)

**Request Body**:

```json
{
    "service_name": "spotify",
    "api_key": "new_api_key",
    "service_user_id": "optional_username"
}
```

**Example Request**:

```bash
curl -X PUT "http://localhost:8000/users/api-keys/3/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "spotify",
       "api_key": "new_token_here",
       "service_user_id": null
     }'
```

### 4. Delete API Key

**Endpoint**: `DELETE /users/api-keys/{id}/`

**Description**: Delete an API key.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -X DELETE "http://localhost:8000/users/api-keys/3/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**: `204 No Content`

### 5. Verify API Key

**Endpoint**: `POST /users/api-keys/verify/`

**Description**: Verify if an API key exists for a specific service.

**Authentication**: Required (JWT Token)

**Request Body**:

```json
{
    "service_name": "spotify"
}
```

**Example Request**:

```bash
curl -X POST "http://localhost:8000/users/api-keys/verify/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"service_name": "spotify"}'
```

**Response**:

```json
{
    "status": "valid"
}
```

### 6. List Services

**Endpoint**: `GET /users/api-keys/services/`

**Description**: Get a list of services for which the user has stored API keys.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/users/api-keys/services/"
```

**Response**:

```json
["spotify", "lastfm", "trakt_client_id", "trakt_client_secret"]
```

---

## Supported Services

### Current Service Integrations

| Service | Service Name | Required Fields | Optional Fields |
|---------|--------------|-----------------|-----------------|
| **Spotify** | `spotify` | `api_key` (Access Token) | - |
| **Last.fm** | `lastfm` | `api_key` (API Key) | `service_user_id` (Username) |
| **Trakt Client ID** | `trakt_client_id` | `api_key` (Client ID) | - |
| **Trakt Client Secret** | `trakt_client_secret` | `api_key` (Client Secret) | - |
| **Steam** | `steam` | `api_key` (API Key) | `service_user_id` (Steam ID) |
| **PlayStation** | `psn` | `api_key` (NPSSO Token) | `service_user_id` (PSN User ID) |
| **Xbox** | `xbox` | `api_key` (OpenXBL API Key) | `service_user_id` (XUID) |
| **RetroAchievements** | `retroachievements` | `api_key` (API Key) | `service_user_id` (Username) |

### Service Setup Examples

#### Spotify

```bash
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "spotify",
       "api_key": "BQC4YXsKD8_your_access_token"
     }'
```

#### Last.fm

```bash
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "lastfm",
       "api_key": "your_lastfm_api_key",
       "service_user_id": "your_lastfm_username"
     }'
```

#### Trakt (requires both client ID and secret)

```bash
# Client ID
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "trakt_client_id",
       "api_key": "your_trakt_client_id"
     }'

# Client Secret
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "trakt_client_secret",
       "api_key": "your_trakt_client_secret"
     }'
```

#### Gaming Services

```bash
# Steam
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "steam",
       "api_key": "your_steam_api_key",
       "service_user_id": "your_steam_id"
     }'

# PlayStation
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "psn",
       "api_key": "your_npsso_token",
       "service_user_id": "your_psn_user_id"
     }'

# Xbox
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "xbox",
       "api_key": "your_openxbl_api_key",
       "service_user_id": "your_xuid"
     }'

# RetroAchievements
curl -X POST "http://localhost:8000/users/api-keys/" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "service_name": "retroachievements",
       "api_key": "your_ra_api_key",
       "service_user_id": "your_ra_username"
     }'
```

---

## Data Model

### UserApiKey Model

```python
class UserApiKey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    service_name = models.CharField(max_length=50)
    key = models.TextField()  # Encrypted API key
    service_user_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'service_name')
```

### Fields Explanation

| Field | Type | Description |
|-------|------|-------------|
| `user` | ForeignKey | Associated user (automatic) |
| `service_name` | CharField | Service identifier (e.g., 'spotify', 'lastfm') |
| `key` | TextField | Encrypted API key/token |
| `service_user_id` | CharField | Optional username/ID for the service |
| `created_at` | DateTimeField | When the key was created |
| `updated_at` | DateTimeField | When the key was last updated |

---

## Security Features

### Encryption

- **AES Encryption**: All API keys encrypted using AES encryption
- **Key Derivation**: Encryption keys derived from Django's SECRET_KEY
- **Secure Storage**: Keys never stored in plain text
- **Automatic Decryption**: Keys decrypted only when needed

### User Isolation

- **Per-User Storage**: Each user's keys are completely isolated
- **Access Control**: Users can only access their own keys
- **Authentication Required**: All endpoints require valid JWT tokens

### Validation

- **Service Name Validation**: Prevents invalid service names
- **Unique Constraints**: One key per service per user
- **Input Sanitization**: All inputs validated and sanitized

---

## Error Handling

### Common Errors

| Error | HTTP Status | Cause | Solution |
|-------|-------------|-------|----------|
| `Authentication credentials were not provided` | 401 | Missing JWT token | Add Authorization header |
| `Invalid token` | 401 | Expired/invalid JWT | Refresh or obtain new token |
| `API key with this service name already exists` | 400 | Duplicate service name | Update existing key instead |
| `Service name is required` | 400 | Missing service_name | Provide service_name in request |
| `API key is required` | 400 | Missing api_key | Provide api_key in request |
| `Not found` | 404 | Key doesn't exist or doesn't belong to user | Check key ID and ownership |

### Validation Errors

```json
{
    "service_name": ["This field is required."],
    "api_key": ["This field is required."]
}
```

---

## Integration Usage

### In Service Endpoints

Services retrieve user API keys like this:

```python
from users.models import UserApiKey

# Get user's Spotify token
try:
    api_key = UserApiKey.objects.get(user=request.user, service_name='spotify')
    spotify_token = api_key.get_key()  # Automatically decrypted
    
    if not spotify_token:
        return Response({"error": "No Spotify access token found"}, 
                       status=status.HTTP_400_BAD_REQUEST)
except UserApiKey.DoesNotExist:
    return Response({"error": "No Spotify API key found"}, 
                   status=status.HTTP_400_BAD_REQUEST)
```

### Service-Specific Requirements

- **Spotify**: Requires periodic token refresh (implement OAuth2 refresh flow)
- **Last.fm**: Username stored in `service_user_id` field
- **Trakt**: Uses separate entries for client ID and secret
- **Gaming Services**: User IDs stored in `service_user_id` field

---

## Best Practices

### API Key Management

1. **Regular Updates**: Update tokens before expiration
2. **Secure Transmission**: Always use HTTPS for API key endpoints
3. **Minimal Exposure**: Don't log or expose decrypted keys
4. **Service Isolation**: Use specific service names for organization

### Authentication

1. **Token Expiration**: Implement JWT token refresh logic
2. **Session Management**: Clear tokens on logout
3. **Error Handling**: Gracefully handle authentication failures

### Security

1. **HTTPS Only**: Never transmit API keys over HTTP
2. **Regular Rotation**: Rotate API keys periodically
3. **Access Logging**: Monitor API key access patterns
4. **Backup Strategy**: Ensure encrypted backups include key data

This user management system provides a secure, scalable foundation for managing external service credentials across all integrated platforms!
