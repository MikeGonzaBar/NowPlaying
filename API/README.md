# NowPlaying API

This folder contains the backend API for the **NowPlaying** project. The API is built using Django 5.1 and Django REST Framework to fetch and manage data from various entertainment services including Steam, PlayStation, Xbox, RetroAchievements, Spotify, Last.fm, and Trakt.

## Quick Start

### Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- A virtual environment tool (e.g., `venv` or `virtualenv`)
- PostgreSQL (optional, SQLite is configured by default)

### Installation

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

4. Navigate to the Django project directory:

   ```bash
   cd NowPlayingAPI
   ```

5. Apply migrations to set up the database:

   ```bash
   python manage.py migrate
   ```

6. Start the development server:

   ```bash
   python manage.py runserver
   ```

7. Access the API at <http://127.0.0.1:8000/>.

---

## Authentication

All API endpoints require **JWT authentication**. Include your token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### API Key Management

The system uses encrypted storage for all external service credentials. See the [User Management Documentation](./NowPlayingAPI/users/README_USERS.md) for complete API key management details.

---

## Service Integrations

### 🎵 Music Services

#### Music (Spotify + Last.fm)

**Endpoints**: `/music/`

- **Spotify**: Recently played tracks with full metadata
- **Last.fm**: Scrobbled tracks with MusicBrainz IDs and enhanced metadata
- **Features**: Unified storage, source filtering, duplicate prevention

📖 **[Complete Music Documentation](./NowPlayingAPI/music/README_MUSIC.md)**

---

### 🎬 Entertainment Services

#### Trakt (Movies & TV Shows)

**Endpoints**: `/trakt/`

- **OAuth2 Authentication**: Secure token-based authentication
- **Movies**: Watch history, ratings, metadata from TMDB
- **TV Shows**: Episode tracking, season progress, detailed information
- **Features**: Automatic token refresh, pagination support

📖 **[Complete Trakt Documentation](./NowPlayingAPI/trakt/README_TRAKT.md)**

---

### 🎮 Gaming Services

#### Steam

**Endpoints**: `/steam/`

- **Game Library**: Complete Steam collection with achievements
- **Playtime Analytics**: Total and recent playtime tracking
- **Achievement Progress**: Per-game completion percentages

📖 **[Complete Steam Documentation](./NowPlayingAPI/steam/README_STEAM.md)**

#### PlayStation Network

**Endpoints**: `/psn/`

- **Trophy Tracking**: Bronze, Silver, Gold, and Platinum trophies
- **Game Collection**: PSN library with playtime data
- **Trophy Analytics**: Weighted scoring system

📖 **[Complete PlayStation Documentation](./NowPlayingAPI/playstation/README_PLAYSTATION.md)**

#### Xbox Live

**Endpoints**: `/xbox/`

- **Achievement Tracking**: Gamerscore and achievement progress
- **Game Library**: Xbox collection with detailed metadata
- **Analytics**: Playtime and completion statistics

📖 **[Complete Xbox Documentation](./NowPlayingAPI/xbox/README_XBOX.md)**

#### RetroAchievements

**Endpoints**: `/retroachievements/`

- **Classic Gaming**: Achievements for retro/classic games
- **Multi-Console Support**: NES, SNES, PlayStation, Sega, and more
- **Community Features**: TrueRatio scoring, badge system

📖 **[Complete RetroAchievements Documentation](./NowPlayingAPI/retroachievements/README_RETROACHIEVEMENTS.md)**

---

### 👤 User Management

#### Users & API Keys

**Endpoints**: `/users/`

- **JWT Authentication**: Secure user authentication
- **Encrypted API Key Storage**: Secure credential management
- **Service Integration**: Unified credential management for all services

📖 **[Complete User Management Documentation](./NowPlayingAPI/users/README_USERS.md)**

---

## Quick API Reference

### Music Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /music/fetch-recently-played/` | Fetch Spotify recent tracks |
| `GET /music/fetch-lastfm-recent/` | Fetch Last.fm scrobbles |
| `GET /music/get-stored-songs/` | Get stored songs (with filtering) |

### Trakt Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /trakt/auth-status/` | Check authentication status |
| `GET /trakt/authenticate/` | Start OAuth flow |
| `GET /trakt/fetch-latest-movies/` | Fetch recent movies |
| `GET /trakt/fetch-latest-shows/` | Fetch recent TV shows |
| `GET /trakt/get-stored-movies/` | Get stored movies (paginated) |
| `GET /trakt/get-stored-shows/` | Get stored shows (paginated) |
| `GET /trakt/search/` | **Search movies and shows** with TMDB poster integration |

### Gaming Endpoints

| Service | Fetch Library | Get Stored | By Playtime | By Achievements | Search |
|---------|---------------|------------|-------------|-----------------|---------|
| **Steam** | `GET /steam/get-game-list/` | `GET /steam/get-game-list-stored/` | `GET /steam/get-game-list-total-playtime/` | `GET /steam/get-game-list-most-achieved/` | - |
| **PlayStation** | `GET /psn/get-game-list/` | `GET /psn/get-game-list-stored/` | `GET /psn/get-game-list-total-playtime/` | `GET /psn/get-game-list-most-achieved/` | - |
| **Xbox** | `GET /xbox/get-game-list/` | `GET /xbox/get-game-list-stored/` | `GET /xbox/get-game-list-total-playtime/` | `GET /xbox/get-game-list-most-achieved/` | - |
| **RetroAchievements** | `GET /retroachievements/fetch-recently-played-games/` | `GET /retroachievements/fetch-games/` | - | `GET /retroachievements/get-most-achieved-games/` | - |
| **Cross-Platform** | - | - | - | - | `GET /games/search/` |

### User Management Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /users/api-keys/` | List user's API keys |
| `POST /users/api-keys/` | Store new API key |
| `PUT /users/api-keys/{id}/` | Update API key |
| `DELETE /users/api-keys/{id}/` | Delete API key |
| `GET /users/api-keys/services/` | List services with stored keys |

---

## Environment Variables

Create a `.env` file in the API folder with the following variables:

```env
# Database Configuration (Optional - PostgreSQL)
POSTGRES_DB=<your_psql_db>
POSTGRES_USER=<your_psql_user>
POSTGRES_PASSWORD=<your_psql_pwd>
POSTGRES_HOST=<your_psql_host>
POSTGRES_PORT=<your_psql_port>

# TMDB API (for Trakt movie/show metadata)
TMDB_API_KEY=<your_tmdb_api_key>
```

**Note**: Service API keys (Steam, Spotify, Last.fm, etc.) are now managed through the User API Key system and stored encrypted in the database.

---

## Service Setup Requirements

| Service | Required Credentials | Where to Get Them |
|---------|---------------------|-------------------|
| **Spotify** | Access Token | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
| **Last.fm** | API Key + Username | [Last.fm API](https://www.last.fm/api) |
| **Trakt** | Client ID + Client Secret | [Trakt API Applications](https://trakt.tv/oauth/applications) |
| **Steam** | API Key + Steam ID | [Steam API Key](https://steamcommunity.com/dev/apikey) |
| **PlayStation** | NPSSO Token | Browser cookies (see PlayStation docs) |
| **Xbox** | OpenXBL API Key + XUID | [OpenXBL.com](https://xbl.io) |
| **RetroAchievements** | API Key + Username | [RetroAchievements](https://retroachievements.org) |

---

## Docker Deployment

The API can be deployed using Docker:

1. Build and run using Docker Compose from the project root:

   ```bash
   docker-compose up -d
   ```

2. Alternatively, build and run the API container directly:

   ```bash
   docker build -t nowplaying-api .
   docker run -p 8000:8000 nowplaying-api
   ```

---

## Technologies Used

- **Django 5.1**: Web framework for building the API
- **Django REST Framework 3.15**: For creating RESTful API endpoints
- **PostgreSQL/SQLite**: Database options
- **Gunicorn**: WSGI HTTP server for production
- **Django CORS Headers**: For handling Cross-Origin Resource Sharing
- **Python-dotenv**: For managing environment variables
- **Cryptography**: For encrypted API key storage

---

## Project Structure

```plaintext
API/
├── NowPlayingAPI/           # Django project root
│   ├── NowPlayingAPI/       # Main Django settings module
│   │   ├── settings.py      # Project settings
│   │   ├── urls.py          # URL declarations
│   │   └── wsgi.py          # WSGI application entry point
│   ├── music/               # Music integration (Spotify + Last.fm)
│   │   └── README_MUSIC.md  # Detailed music service documentation
│   ├── trakt/               # Trakt integration (Movies + TV)
│   │   └── README_TRAKT.md  # Detailed Trakt service documentation
│   ├── users/               # User management & API keys
│   │   └── README_USERS.md  # Detailed user management documentation
│   ├── steam/               # Steam integration
│   │   └── README_STEAM.md  # Detailed Steam service documentation
│   ├── playstation/         # PlayStation integration
│   │   └── README_PLAYSTATION.md # Detailed PlayStation documentation
│   ├── xbox/                # Xbox integration
│   │   └── README_XBOX.md   # Detailed Xbox service documentation
│   ├── retroachievements/   # RetroAchievements integration
│   │   └── README_RETROACHIEVEMENTS.md # Detailed RA documentation
│   ├── static/              # Collected static files
│   ├── db.sqlite3           # SQLite database (if used)
│   └── manage.py            # Django command-line utility
├── requirements.txt         # Python dependencies
├── Dockerfile               # Docker configuration
└── README.md                # This file
```

---

## Getting Help

### Service-Specific Issues

- 📖 **Music Problems**: See [Music Documentation](./NowPlayingAPI/music/README_MUSIC.md)
- 📖 **Trakt Problems**: See [Trakt Documentation](./NowPlayingAPI/trakt/README_TRAKT.md)
- 📖 **Gaming Problems**: See respective service documentation
- 📖 **Authentication Issues**: See [User Management Documentation](./NowPlayingAPI/users/README_USERS.md)

### Common Issues

- **403 Errors**: Check if service profiles are set to public
- **Authentication Errors**: Verify JWT token and API key storage
- **Rate Limits**: Each service has different rate limiting policies
- **Private Profiles**: Most services require public profiles for API access

This comprehensive API provides powerful integrations across entertainment and gaming platforms with secure credential management and rich metadata!
