# Trakt OAuth Setup Guide

This guide explains how to authenticate with Trakt to resolve the "No Trakt token found" error.

## Overview

The Trakt integration requires OAuth authentication to access your personal Trakt data (watched movies, shows, etc.). This guide provides multiple methods to complete the authentication process.

## Prerequisites

1. **Trakt API Application**: You need to create a Trakt API application at <https://trakt.tv/oauth/applications>
2. **API Credentials**: Your Trakt client ID and client secret must be stored in the `UserApiKey` model
3. **Redirect URI**: Must be configured in your Trakt application settings

## Step 1: Set Up Trakt API Application

1. Visit <https://trakt.tv/oauth/applications>
2. Click "New Application"
3. Fill in the details:
   - **Name**: Your application name
   - **Description**: Brief description
   - **Redirect URI**: This should match the redirect URI used by the app. With the default Docker Compose UI proxy, use `http://<ui-host>:3200/api/trakt/oauth-callback/`.
4. Note down your **Client ID** and **Client Secret**

## Step 2: Configure API Credentials

Add your Trakt credentials to the `UserApiKey` model:

```python
from users.models import UserApiKey
from django.contrib.auth.models import User

user = User.objects.get(username='your_username')
UserApiKey.objects.create(
    user=user,
    service_name='trakt',
    service_user_id='your_client_id',  # Trakt Client ID
    api_key='your_client_secret'       # Trakt Client Secret (will be encrypted)
)
```

## Step 3: Complete OAuth Authentication

You have several options to complete the OAuth flow:

### Option A: Using the Python Script (Recommended)

1. Make sure your Django server is running
2. Run the OAuth setup script:

   ```bash
   cd API/NowPlayingAPI/trakt/
   python oauth_setup.py
   ```

3. Follow the prompts:
   - Enter your server URL (for the default Docker Compose UI proxy, use `http://localhost:3200/api`; for a VM/LAN deployment, use the reachable UI host such as `http://192.168.1.19:3200/api`)
   - Enter your username and password
   - The script will open your browser for Trakt authorization
   - Authorize the application on Trakt
   - Copy the redirect URL and paste it back into the script

### Option B: Using API Endpoints Manually

1. **Check authentication status**:

   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        http://localhost:3200/api/trakt/auth-status/
   ```

2. **Get authentication URL**:

   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        http://localhost:3200/api/trakt/authenticate/
   ```

3. **Visit the auth URL** in your browser and authorize the application

4. **Extract the authorization code** from the redirect URL

5. **Complete the authentication**:

   ```bash
   curl -X POST \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"code": "AUTHORIZATION_CODE", "state": "USER_ID"}' \
        http://localhost:3200/api/trakt/oauth-callback/
   ```

### Option C: Using the HTML Helper Page

1. Open `trakt/oauth_helper.html` in your browser
2. Update the JavaScript with your backend URL and JWT token
3. Follow the instructions on the page

## Available Endpoints

After successful authentication, you can use these endpoints:

- `GET /trakt/auth-status/` - Check authentication status
- `GET /trakt/fetch-latest-movies/` - Fetch latest watched movies
- `GET /trakt/fetch-latest-shows/` - Fetch latest watched shows
- `GET /trakt/refresh-token/` - Manually refresh the access token

## Troubleshooting

### "Trakt API credentials not found"

- Make sure you've added your API credentials to the `UserApiKey` model
- Verify the `service_name` is exactly 'trakt'

### "Invalid redirect URI"

- Ensure the redirect URI returned by `/trakt/authenticate/` matches what's configured in your Trakt application.
- The redirect URI must be an exact match (including trailing slashes)

### "Invalid client credentials"

- Double-check your client ID and client secret
- Make sure they're stored correctly in the `UserApiKey` model

### "Token expired"

- Tokens automatically refresh, but you can manually refresh using `/trakt/refresh-token/`
- If refresh fails, you may need to re-authenticate

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Optional. Leave blank when using the default Docker UI /api proxy.
# Trakt app redirect for default Compose UI: http://<ui-host>:3200/api/trakt/oauth-callback/
TRAKT_REDIRECT_URI=
```

## Security Notes

- Access tokens are automatically refreshed when they expire
- All tokens are stored securely in the database
- The `state` parameter is used to prevent CSRF attacks
- API credentials are encrypted in the database

## Example Successful Response

After successful authentication:

```json
{
    "success": true,
    "message": "Successfully authenticated with Trakt!",
    "expires_at": "2024-01-01T12:00:00Z"
}
```

You can now use all Trakt endpoints without the "No Trakt token found" error!
