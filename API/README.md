# API Configuration Guide

This folder contains the backend API for the **NowPlaying** project. The API is built using Django and Django REST Framework to fetch and manage data from various services like Steam, PlayStation, Spotify, and Trakt.

## Prerequisites

Before running the API, ensure you have the following installed:

- Python 3.10 or higher
- pip (Python package manager)
- A virtual environment tool (e.g., `venv` or `virtualenv`)

## Installation

1. Navigate to the `API` folder:
   ```bash
   cd /root/NowPlaying/API
   ```
2. Create and activate a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
   ```
3. Install the required dependencies:
    ```bash
    pip install -r requirements.txt
   ```


## Environment Variables
The API relies on several environment variables for configuration. Create a .env file in the API folder and add the following variables:

    STEAM_API_KEY=<your_steam_api_key>
    STEAM_ID=<your_steam_id>
    PLAY_STATION_NPSSO=<your_playstation_npso_token>
    PLAY_STATION_ID=<your_playstation_id>
    TRAKT_CLIENT_ID=<your_trakt_client_id>
    TRAKT_CLIENT_SECRET=<your_trakt_client_secret>
    TRAKT_REDIRECT_URI=<your_trakt_redirect_uri>
    TRAKT_AUTH_CODE=<your_trakt_auth_code>
    SPOTIFY_ACCESS_TOKEN=<your_spotify_access_token>

## Running the api

1. Apply migrations to set up the database:
   ```bash
   python manage.py migrate
   ```
2. Start the development server:
    ```bash
    python manage.py runserver
   ```
3. Access the API at http://127.0.0.1:8000/.

## API Endpoints
The following endpoints are available:

### Steam
- `/steam/get-game-list`: Fetches the list of games and achievements from Steam.
- `/steam/get-game-list-stored`: Retrieves stored Steam game data.
- `/steam/get-game-list-total-playtime`: Retrieves Steam games sorted by total playtime.
- `/steam/get-game-list-most-achieved`: Retrieves Steam games sorted by the percentage of unlocked achievements.
### PlayStation
- `/psn/get-game-list`: Fetches the list of games and achievements from PlayStation.
- `/psn/get-game-list-stored`: Retrieves stored PlayStation game data.
- `/psn/get-game-list-total-playtime`: Retrieves PlayStation games sorted by total playtime.
- `/psn/get-game-list-most-achieved`: Retrieves PlayStation games sorted by the weighted score of unlocked achievements.
### Spotify
- `/spotify/fetch-recently-played`: Fetches recently played songs from Spotify.
- `/spotify/get-stored-songs`: Retrieves stored Spotify song data.
### Trakt
- `/trakt/fetch-latest-movies`: Fetches the latest watched movies from Trakt and updates the database.
- `/trakt/fetch-latest-shows`: Fetches the latest watched TV shows (including episode details) from Trakt and updates the database.
- `/trakt/get-stored-movies`: Retrieves stored movie data from the database.
- `/trakt/get-stored-shows`: Retrieves stored TV show data from the database.
- `/trakt/get-watched-seasons-episodes`: Retrieves watched seasons and episodes for a specific show, filtered by `trakt_id`.
- `/trakt/refresh-token`: Refreshes the Trakt access token.

## Notes
- **Steam**: Ensure your Steam API [key](https://steamcommunity.com/dev/apikey) is valid and linked to your account.
- **PlayStation**: Manual cookie manipulation is required to obtain the npsso token. For more information on how to retrieve the required cookies visit the library [guide](https://github.com/isFakeAccount/psnawp)
- **Spotify**: The access token must be configured by using the [dashboard](https://developer.spotify.com/dashboard) and app creation in spotify for developers.
- **Trakt**: Ensure your Trakt account is authenticated and tokens are valid, this can be obtaines in the following [link](https://trakt.tv/oauth/applications).

