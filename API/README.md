# NowPlaying API

This folder contains the backend API for the **NowPlaying** project. The API is built using Django 5.1 and Django REST Framework to fetch and manage data from various entertainment services including Steam, PlayStation, RetroAchievements, Spotify, and Trakt.

## Prerequisites

Before running the API, ensure you have the following installed:

- Python 3.10 or higher
- pip (Python package manager)
- A virtual environment tool (e.g., `venv` or `virtualenv`)

## Installation

1. Navigate to the `API` folder:

   ```bash
   cd API
   ```

2. Create and activate a virtual environment:

   ```bash
   # On Windows
   python -m venv nowPlayingVenv
   nowPlayingVenv\Scripts\activate
   
   # On macOS/Linux
   python3 -m venv nowPlayingVenv
   source nowPlayingVenv/bin/activate
   ```

3. Install the required dependencies:

   ```bash
   pip install -r requirements.txt
   ```

## Environment Variables

The API relies on several environment variables for configuration. Create a `.env` file in the API folder and add the following variables:

```env
STEAM_API_KEY=<your_steam_api_key>
STEAM_ID=<your_steam_id>
PLAY_STATION_NPSSO=<your_playstation_npso_token>
PLAY_STATION_ID=<your_playstation_id>
TRAKT_CLIENT_ID=<your_trakt_client_id>
TRAKT_CLIENT_SECRET=<your_trakt_client_secret>
TRAKT_REDIRECT_URI=<your_trakt_redirect_uri>
TRAKT_AUTH_CODE=<your_trakt_auth_code>
SPOTIFY_ACCESS_TOKEN=<your_spotify_access_token>
RETROACHIEVEMENTS_API_KEY=<your_retroachievements_api_key>
RETROACHIEVEMENTS_USER=<your_retroachievements_username>
```

## Running the API

1. Navigate to the Django project directory:

   ```bash
   cd NowPlayingAPI
   ```

2. Apply migrations to set up the database:

   ```bash
   python manage.py migrate
   ```

3. Start the development server:

   ```bash
   python manage.py runserver
   ```

4. Access the API at <http://127.0.0.1:8000/>.

## Docker Deployment

The API can be deployed using Docker:

1. Build and run using Docker Compose from the project root:

   ```bash
   docker-compose up -d
   ```

   This will start both the API and UI services.

2. Alternatively, build and run the API container directly:

   ```bash
   docker build -t nowplaying-api .
   docker run -p 8000:8000 nowplaying-api
   ```

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

### RetroAchievements

- `/retroachievements/fetch-recently-played-games`: Fetches and populates the latest 50 recently played games from RetroAchievements.
- `/retroachievements/get-most-achieved-games`: Retrieves the list of games ordered by the percentage of unlocked achievements, with a secondary ordering by the last played date.
- `/retroachievements/fetch-games`: Fetches all games without their achievements.
- `/retroachievements/fetch-game-details`: Fetches a specific game and its achievements by `game_id`.

## Technologies Used

- **Django 5.1**: Web framework for building the API
- **Django REST Framework 3.15**: For creating RESTful API endpoints
- **SQLite**: Default database for development (can be changed in settings)
- **Gunicorn**: WSGI HTTP server for production
- **Django CORS Headers**: For handling Cross-Origin Resource Sharing
- **Python-dotenv**: For managing environment variables

## Service Integration Notes

- **Steam**: Requires a valid Steam API [key](https://steamcommunity.com/dev/apikey) linked to your account and your Steam ID.
- **PlayStation**: Manual cookie manipulation is required to obtain the npsso token. See the [PSNAWP library guide](https://github.com/isFakeAccount/psnawp) for how to retrieve the required cookies.
- **Spotify**: The access token must be configured using the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) by creating an app.
- **Trakt**: Authentication requires setting up an application in the [Trakt API Applications](https://trakt.tv/oauth/applications) page.
- **RetroAchievements**: Requires a valid RetroAchievements API key and username. See the [RetroAchievements API documentation](https://retroachievements.org) for more details.

## Project Structure

```
API/
├── NowPlayingAPI/       # Django project root
│   ├── NowPlayingAPI/   # Main Django settings module
│   │   ├── settings.py  # Project settings
│   │   ├── urls.py      # URL declarations
│   │   └── wsgi.py      # WSGI application entry point
│   ├── steam/           # Steam integration module
│   ├── playstation/     # PlayStation integration module
│   ├── retroachievements/ # RetroAchievements integration module
│   ├── trakt/           # Trakt integration module
│   ├── music/           # Spotify integration module
│   ├── static/          # Collected static files
│   │   └── admin/       # Admin static files
│   ├── db.sqlite3       # SQLite database
│   └── manage.py        # Django command-line utility
├── requirements.txt     # Python dependencies
├── Dockerfile           # Docker configuration
└── .env                 # Environment variables (not tracked by git)
```
