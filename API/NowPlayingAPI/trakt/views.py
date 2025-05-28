from rest_framework.decorators import action
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import status
from django.db import models
from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse
import requests
from datetime import timedelta
from django.utils import timezone
from .models import (
    Episode,
    Season,
    fetch_latest_watched_movies,
    fetch_latest_watched_shows,
    refresh_trakt_token,
    TraktToken,
    Show,
    Movie,
    get_trakt_api_credentials,
)
from django.core.serializers import serialize  # For serializing data


class TraktViewSet(viewsets.ViewSet):
    """
    A viewset that provides actions to fetch the latest watched movies,
    shows, and refresh the Trakt token.
    """

    def list(self, request):
        """
        Default endpoint for /trakt/ that returns a list of available actions.
        """
        return Response(
            {
                "available_endpoints": {
                    "auth_status": request.build_absolute_uri("auth-status/"),
                    "authenticate": request.build_absolute_uri("authenticate/"),
                    "oauth_callback": request.build_absolute_uri("oauth-callback/"),
                    "fetch_latest_movies": request.build_absolute_uri(
                        "fetch-latest-movies/"
                    ),
                    "fetch_latest_shows": request.build_absolute_uri(
                        "fetch-latest-shows/"
                    ),
                    "refresh_token": request.build_absolute_uri("refresh-token/"),
                    "get_stored_movies": request.build_absolute_uri(
                        "get-stored-movies/"
                    ),
                    "get-stored-shows": request.build_absolute_uri("get-stored-shows/"),
                    "get-watched-seasons-episode": request.build_absolute_uri(
                        "get-watched-seasons-episode/"
                    ),
                }
            }
        )

    @action(detail=False, methods=["get"], url_path="get-stored-movies")
    def get_stored_movies(self, request):
        """
        Returns the stored values from the Movie model for the authenticated user, 
        sorted by last_watched_at, and formatted like the fetch_latest_movies endpoint.
        """
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 5))
        offset = (page - 1) * page_size
        limit = offset + page_size
        
        # Query movies for the authenticated user and order by last_watched_at in descending order
        movies_qs = Movie.objects.filter(user=request.user).order_by("-last_watched_at")
        total = movies_qs.count()

        movies = movies_qs[offset:limit].values(
            "title",
            "year",
            "plays",
            "last_watched_at",
            "last_updated_at",
            "trakt_id",
            "slug",
            "imdb_id",
            "tmdb_id",
        )

        # Format the response to match the desired structure
        formatted_movies = [
            {
                "plays": movie["plays"],
                "last_watched_at": movie["last_watched_at"],
                "last_updated_at": movie["last_updated_at"],
                "movie": {
                    "title": movie["title"],
                    "year": movie["year"],
                    "ids": {
                        "trakt": movie["trakt_id"],
                        "slug": movie["slug"],
                        "imdb": movie["imdb_id"],
                        "tmdb": movie["tmdb_id"],
                    },
                },
            }
            for movie in movies
        ]

        return Response({
        "page": page,
        "page_size": page_size,
        "total_items": total,
        "total_pages": (total + page_size - 1) // page_size,
        "movies": formatted_movies
        })

    @action(detail=False, methods=["get"], url_path="get-stored-shows")
    def get_stored_shows(self, request):
        """
        Returns paginated stored values from the Show model for the authenticated user, 
        sorted by last_watched_at.
        """
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 5))
        offset = (page - 1) * page_size
        limit = offset + page_size

        shows_qs = Show.objects.filter(user=request.user).order_by("-last_watched_at")
        total = shows_qs.count()

        shows = shows_qs[offset:limit].values(
            "id",
            "trakt_id",
            "tmdb_id",
            "title",
            "year",
            "image_url",
            "last_watched_at",
        )

        formatted_shows = [
            {
                "last_watched_at": show["last_watched_at"],
                "show": {
                    "id": show["id"],
                    "title": show["title"],
                    "year": show["year"],
                    "image_url": show["image_url"],
                    "ids": {
                        "trakt": show["trakt_id"],
                        "tmdb": show["tmdb_id"],
                    },
                },
            }
            for show in shows
        ]

        return Response({
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": (total + page_size - 1) // page_size,
            "shows": formatted_shows
        })

    @action(detail=False, methods=["get"], url_path="get-watched-seasons-episodes")
    def get_watched_seasons_episodes(self, request):
        """
        Returns the details of watched seasons and episodes for the authenticated user, 
        including their shows. Allows filtering by trakt_id.
        """
        trakt_id = request.query_params.get(
            "trakt_id"
        )  # Get trakt_id from query params

        # Validate that trakt_id is provided
        if not trakt_id:
            raise ValidationError({"detail": "The 'trakt_id' parameter is required."})

        # Filter seasons and episodes by trakt_id and user
        seasons = Season.objects.filter(
            show__trakt_id=trakt_id, 
            show__user=request.user
        ).values(
            "id", "season_number", "show__id", "show__title", "show__trakt_id"
        )

        # Use distinct to avoid duplicate episodes caused by multiple EpisodeWatch records
        episodes = (
            Episode.objects.filter(
                show__trakt_id=trakt_id,
                show__user=request.user
            )
            .values(
                "id",
                "episode_number",
                "title",
                "image_url",
                "rating",
                "overview",
                "season__id",
                "season__season_number",
                "show__id",
                "show__title",
                "show__trakt_id",
            )
            .annotate(
                last_watched_at=models.Max(
                    "watches__watched_at"
                ),  # Get the latest watch time
                progress=models.Max("watches__progress"),  # Get the highest progress
            )
        )

        return Response(
            {
                "seasons": list(seasons),
                "episodes": list(episodes),
            }
        )

    @action(detail=False, methods=["get"], url_path="fetch-latest-movies")
    def fetch_latest_movies(self, request):
        """
        Fetches the latest watched movies from Trakt and updates the database for the authenticated user.
        """
        try:
            # Check if user has a Trakt token
            if not TraktToken.objects.filter(user=request.user).exists():
                auth_url = request.build_absolute_uri("authenticate/")
                return Response(
                    {
                        "error": "No Trakt token found. Please authenticate with Trakt first.",
                        "auth_url": auth_url,
                        "message": f"Visit {auth_url} to start the authentication process"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            result = fetch_latest_watched_movies(request.user)
            return Response({"result": result})
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"], url_path="fetch-latest-shows")
    def fetch_latest_shows(self, request):
        """
        Fetches the latest watched TV shows (including episode details) from Trakt 
        and updates the database for the authenticated user.
        """
        try:
            # Check if user has a Trakt token
            if not TraktToken.objects.filter(user=request.user).exists():
                auth_url = request.build_absolute_uri("authenticate/")
                return Response(
                    {
                        "error": "No Trakt token found. Please authenticate with Trakt first.",
                        "auth_url": auth_url,
                        "message": f"Visit {auth_url} to start the authentication process"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            result = fetch_latest_watched_shows(request.user)
            return Response({"result": result})
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"], url_path="refresh-token")
    def refresh_token(self, request):
        """
        Manually refreshes the Trakt access token for the authenticated user.
        """
        try:
            token_instance = TraktToken.objects.filter(user=request.user).latest("updated_at")
        except TraktToken.DoesNotExist:
            return Response(
                {"error": "Trakt token not found. Please authenticate with Trakt first."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            refreshed = refresh_trakt_token(token_instance)
            return Response(
                {"access_token": refreshed.access_token, "expires_at": refreshed.expires_at}
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to refresh token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"], url_path="auth-status")
    def auth_status(self, request):
        """
        Check if the user has a valid Trakt token.
        """
        try:
            token = TraktToken.objects.filter(user=request.user).latest("updated_at")
            is_expired = token.is_expired()
            return Response({
                "authenticated": True,
                "token_expired": is_expired,
                "expires_at": token.expires_at
            })
        except TraktToken.DoesNotExist:
            return Response({
                "authenticated": False,
                "auth_url": request.build_absolute_uri(reverse('trakt-authenticate'))
            })

    @action(detail=False, methods=["get"], url_path="authenticate")
    def authenticate(self, request):
        """
        Redirect user to Trakt OAuth authorization page.
        """
        try:
            client_id, _ = get_trakt_api_credentials(request.user)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build the authorization URL
        auth_url = (
            f"https://api.trakt.tv/oauth/authorize"
            f"?response_type=code"
            f"&client_id={client_id}"
            f"&redirect_uri={settings.TRAKT_REDIRECT_URI}"
            f"&state={request.user.id}"  # Use user ID as state for security
        )
        
        return Response({
            "auth_url": auth_url,
            "message": "Visit this URL to authorize your Trakt account"
        })

    @action(detail=False, methods=["get", "post"], url_path="oauth-callback")
    def oauth_callback(self, request):
        """
        Handle the OAuth callback from Trakt.
        GET: Receives redirect from Trakt with authorization code
        POST: Processes the authorization code (requires authentication)
        """
        if request.method == "GET":
            # Handle the redirect from Trakt (no authentication required)
            return self._handle_oauth_redirect(request)
        else:
            # Handle the POST request with authorization code (requires authentication)
            return self._handle_oauth_token_exchange(request)

    def _handle_oauth_redirect(self, request):
        """
        Handle the GET redirect from Trakt with authorization code.
        This displays an HTML page that will complete the authentication.
        """
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')
        
        if error:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Trakt OAuth Error</title>
                <style>
                    body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }}
                    .error {{ color: red; }}
                </style>
            </head>
            <body>
                <h1>❌ Authorization Failed</h1>
                <div class="error">
                    <p>Error: {error}</p>
                    <p>Please try the authorization process again.</p>
                </div>
            </body>
            </html>
            """
            return Response(html_content, content_type='text/html')
        
        if not code:
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Trakt OAuth Error</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    .error { color: red; }
                </style>
            </head>
            <body>
                <h1>❌ Missing Authorization Code</h1>
                <div class="error">
                    <p>No authorization code received from Trakt.</p>
                    <p>Please try the authorization process again.</p>
                </div>
            </body>
            </html>
            """
            return Response(html_content, content_type='text/html')
        
        # Display success page with instructions
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Trakt OAuth - Complete Authentication</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                    line-height: 1.6;
                }}
                .success {{ color: green; }}
                .info {{ color: blue; }}
                .code-box {{
                    background: #f4f4f4;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 10px 0;
                    font-family: monospace;
                    word-break: break-all;
                }}
                .copy-btn {{
                    background: #007cba;
                    color: white;
                    padding: 5px 10px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    margin-left: 10px;
                }}
            </style>
        </head>
        <body>
            <h1>🎬 Trakt Authorization Received!</h1>
            <div class="success">
                <p>✅ Successfully received authorization code from Trakt!</p>
            </div>
            
            <div class="info">
                <h3>Complete the Authentication</h3>
                <p>You now need to send this authorization code to your backend to complete the authentication.</p>
                
                <h4>Option 1: Use curl (if you have a JWT token)</h4>
                <div class="code-box">
curl -X POST \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;-H "Authorization: Bearer YOUR_JWT_TOKEN" \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;-d '{{"code": "{code}", "state": "{state}"}}' \\<br>
&nbsp;&nbsp;&nbsp;&nbsp;{request.build_absolute_uri()}
                </div>
                
                <h4>Option 2: Copy the authorization details</h4>
                <p><strong>Authorization Code:</strong></p>
                <div class="code-box">
                    {code}
                    <button class="copy-btn" onclick="copyToClipboard('{code}')">Copy</button>
                </div>
                
                <p><strong>State:</strong></p>
                <div class="code-box">
                    {state or 'None'}
                    <button class="copy-btn" onclick="copyToClipboard('{state or ''}')">Copy</button>
                </div>
                
                <h4>Option 3: Use the Python setup script</h4>
                <p>If you used the <code>oauth_setup.py</code> script, paste this full URL back into the script:</p>
                <div class="code-box">
                    {request.build_absolute_uri(request.get_full_path())}
                    <button class="copy-btn" onclick="copyToClipboard('{request.build_absolute_uri(request.get_full_path())}')">Copy</button>
                </div>
            </div>
            
            <script>
                function copyToClipboard(text) {{
                    navigator.clipboard.writeText(text).then(function() {{
                        alert('Copied to clipboard!');
                    }});
                }}
            </script>
        </body>
        </html>
        """
        
        return Response(html_content, content_type='text/html')

    def _handle_oauth_token_exchange(self, request):
        """
        Handle the POST request to exchange authorization code for access token.
        Requires authentication.
        """
        code = request.data.get('code')
        state = request.data.get('state')
        
        if not code:
            return Response(
                {"error": "Authorization code is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify state matches user ID for security
        if state and str(request.user.id) != str(state):
            return Response(
                {"error": "Invalid state parameter"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            client_id, client_secret = get_trakt_api_credentials(request.user)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Exchange code for access token
        token_url = "https://api.trakt.tv/oauth/token"
        token_data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": settings.TRAKT_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        try:
            response = requests.post(token_url, json=token_data)
            response.raise_for_status()
            token_info = response.json()
            
            # Store the token
            expires_at = timezone.now() + timedelta(seconds=token_info.get('expires_in', 0))
            
            token_obj, created = TraktToken.objects.update_or_create(
                user=request.user,
                defaults={
                    'access_token': token_info['access_token'],
                    'refresh_token': token_info['refresh_token'],
                    'expires_at': expires_at
                }
            )
            
            return Response({
                "success": True,
                "message": "Successfully authenticated with Trakt!",
                "expires_at": expires_at
            })
            
        except requests.RequestException as e:
            return Response(
                {"error": f"Failed to exchange code for token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
