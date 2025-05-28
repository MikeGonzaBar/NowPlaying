# Music Service Integration

This document provides comprehensive documentation for the Music service endpoints, covering both **Spotify** and **Last.fm** integrations for fetching and managing recently played songs.

## Overview

The Music service allows you to:

- **Spotify**: Fetch recently played tracks with full metadata
- **Last.fm**: Fetch scrobbled tracks with enhanced metadata including MusicBrainz IDs
- **Unified Storage**: Store tracks from both services in a unified data model
- **Source Filtering**: Filter stored songs by their source (spotify/lastfm)

---

## Setup & Authentication

### Spotify Setup

1. **Get Spotify API Credentials**:
   - Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create an app to get Client ID and Client Secret
   - Obtain an access token through OAuth2 flow

2. **Store Spotify Credentials**:

   ```bash
   curl -X POST "http://localhost:8000/users/api-keys/" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "service_name": "spotify",
          "api_key": "YOUR_SPOTIFY_ACCESS_TOKEN"
        }'
   ```

### Last.fm Setup

1. **Get Last.fm API Key**:
   - Visit [Last.fm API](https://www.last.fm/api) and create an account
   - Get your API key (no secret needed for scrobbling data)

2. **Store Last.fm Credentials**:

   ```bash
   curl -X POST "http://localhost:8000/users/api-keys/" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "service_name": "lastfm",
          "api_key": "YOUR_LASTFM_API_KEY",
          "service_user_id": "your_lastfm_username"
        }'
   ```

---

## API Endpoints

### 1. Fetch Spotify Recent Tracks

**Endpoint**: `GET /music/fetch-recently-played/`

**Description**: Fetches the latest 50 recently played songs from Spotify.

**Authentication**: Required (JWT Token)

**Parameters**: None

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/music/fetch-recently-played/"
```

**Response**:

```json
{
    "message": "Recently played songs fetched and stored successfully.",
    "data": [
        {
            "title": "Song Title",
            "artist": "Artist Name",
            "album": "Album Name",
            "album_thumbnail": "https://i.scdn.co/image/...",
            "track_url": "https://open.spotify.com/track/...",
            "artists_url": "https://open.spotify.com/artist/...",
            "duration_ms": 210000,
            "played_at": "2024-01-15T14:30:00.123456Z",
            "source": "spotify"
        }
    ]
}
```

### 2. Fetch Last.fm Recent Tracks

**Endpoint**: `GET /music/fetch-lastfm-recent/`

**Description**: Fetches recent scrobbled tracks from Last.fm with enhanced metadata.

**Authentication**: Required (JWT Token)

**Query Parameters**:

- `limit` (optional): Number of tracks to fetch (default: 50, max: 200)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/music/fetch-lastfm-recent/?limit=100"
```

**Enhanced Response** (includes MusicBrainz IDs and multiple image sizes):

```json
{
    "message": "Last.fm recent tracks fetched and stored successfully for user 'username'.",
    "data": [
        {
            "title": "Song Title",
            "artist": "Artist Name",
            "album": "Album Name",
            "album_thumbnail": "https://lastfm.freetls.fastly.net/i/u/300x300/...",
            "track_url": "https://www.last.fm/music/Artist/_/Song",
            "artists_url": "",
            "duration_ms": 0,
            "played_at": "2024-01-15T14:30:00",
            "source": "lastfm",
            "artist_lastfm_url": "https://www.last.fm/music/Artist",
            "track_mbid": "abc123-def456-ghi789",
            "artist_mbid": "xyz789-uvw456-rst123",
            "album_mbid": "mno345-pqr678-stu901",
            "loved": true,
            "streamable": false,
            "album_thumbnails": {
                "small": "https://lastfm.freetls.fastly.net/i/u/34s/...",
                "medium": "https://lastfm.freetls.fastly.net/i/u/64s/...",
                "large": "https://lastfm.freetls.fastly.net/i/u/174s/...",
                "extralarge": "https://lastfm.freetls.fastly.net/i/u/300x300/..."
            }
        }
    ],
    "count": 100
}
```

### 3. Get Stored Songs

**Endpoint**: `GET /music/get-stored-songs/`

**Description**: Retrieves stored songs from the database with optional source filtering.

**Authentication**: Required (JWT Token)

**Query Parameters**:

- `source` (optional): Filter by source (`spotify`, `lastfm`, or omit for all)

**Example Requests**:

```bash
# Get all songs
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/music/get-stored-songs/"

# Get only Last.fm songs
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/music/get-stored-songs/?source=lastfm"

# Get only Spotify songs
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/music/get-stored-songs/?source=spotify"
```

**Response**:

```json
{
    "results": [
        {
            "id": 123,
            "title": "Song Title",
            "artist": "Artist Name",
            "album": "Album Name",
            "played_at": "2024-01-15T14:30:00Z",
            "album_thumbnail": "https://...",
            "track_url": "https://...",
            "artists_url": "https://...",
            "duration_ms": 210000,
            "source": "spotify",
            "artist_lastfm_url": null,
            "track_mbid": null,
            "artist_mbid": null,
            "album_mbid": null,
            "loved": false,
            "streamable": false,
            "album_thumbnail_small": null,
            "album_thumbnail_medium": null,
            "album_thumbnail_large": null,
            "album_thumbnail_extralarge": null
        }
    ]
}
```

---

## Data Model

### Song Model Fields

#### **Core Fields**

| Field | Type | Description |
|-------|------|-------------|
| `user` | ForeignKey | Associated user |
| `title` | CharField | Song title |
| `artist` | CharField | Artist name |
| `album` | CharField | Album name |
| `played_at` | DateTimeField | When the track was played |
| `source` | CharField | Source service (`spotify` or `lastfm`) |

#### **Spotify-Specific Fields**

| Field | Type | Description |
|-------|------|-------------|
| `track_url` | URLField | Spotify track URL |
| `artists_url` | URLField | Spotify artist URLs (comma-separated) |
| `duration_ms` | PositiveIntegerField | Track duration in milliseconds |
| `album_thumbnail` | URLField | Main album artwork |

#### **Last.fm Enhanced Fields**

| Field | Type | Description |
|-------|------|-------------|
| `artist_lastfm_url` | URLField | Artist's Last.fm page |
| `track_mbid` | CharField | MusicBrainz track ID |
| `artist_mbid` | CharField | MusicBrainz artist ID |
| `album_mbid` | CharField | MusicBrainz album ID |
| `loved` | BooleanField | User "loved" status on Last.fm |
| `streamable` | BooleanField | Track streamable on Last.fm |

#### **Multiple Image Sizes**

| Field | Type | Description |
|-------|------|-------------|
| `album_thumbnail_small` | URLField | 34x34px album art |
| `album_thumbnail_medium` | URLField | 64x64px album art |
| `album_thumbnail_large` | URLField | 174x174px album art |
| `album_thumbnail_extralarge` | URLField | 300x300px album art |

---

## Advanced Features

### Duplicate Prevention

The system prevents duplicates using a unique constraint on:

- `user` + `title` + `artist` + `played_at`

**Benefits**:

- No storage waste from duplicate entries
- Updates metadata if it changes (like `loved` status)
- Maintains accurate play timeline

### MusicBrainz Integration

Last.fm tracks include MusicBrainz IDs when available:

- **Cross-platform identification**: Link tracks across services
- **Music database integration**: Connect to comprehensive music metadata
- **Analytics support**: Enable advanced music analysis features

### Responsive Image Support

Last.fm provides multiple image sizes for optimal UI performance:

```json
"album_thumbnails": {
    "small": "34x34px - for compact lists",
    "medium": "64x64px - for standard lists",
    "large": "174x174px - for detailed views",
    "extralarge": "300x300px - for full-screen displays"
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `No Spotify API key found` | Missing Spotify credentials | Add Spotify access token in profile settings |
| `No Last.fm API key found` | Missing Last.fm credentials | Add Last.fm API key and username |
| `No Last.fm username found` | Missing `service_user_id` | Update Last.fm API key with username |
| `Failed to fetch recently played songs` | Invalid/expired Spotify token | Refresh Spotify access token |
| `Last.fm API error` | Invalid Last.fm username or API key | Verify credentials are correct |

### Rate Limits

- **Spotify**: 100 requests per hour per user
- **Last.fm**: 5 requests per second, 300 requests per minute

### Data Limitations

| Service | Duration | Currently Playing | Timezone |
|---------|----------|-------------------|----------|
| **Spotify** | ✅ Provided | ❌ Not included in recent tracks | ✅ UTC with milliseconds |
| **Last.fm** | ❌ Not provided | ❌ Skipped automatically | ✅ Converted to timezone-aware |

---

## Integration Notes

### Spotify Integration

- Requires active Spotify Premium for some endpoints
- Access tokens expire every hour (implement refresh logic)
- Recently played tracks limited to last 50 tracks
- Full track metadata including duration and multiple URLs

### Last.fm Integration

- Uses `user.getRecentTracks` API method
- Requires only API key (no OAuth needed for public scrobble data)
- Enhanced metadata with `extended=1` parameter
- MusicBrainz IDs may be empty for some tracks

### Database Benefits

- **Unified Model**: Both services use the same Song model
- **Source Filtering**: Easy separation of Spotify vs Last.fm data
- **Enhanced Metadata**: Last.fm provides additional context
- **Offline Access**: Data persists locally for fast retrieval

---

## Admin Interface

The Django admin provides enhanced management:

### Features

- **Visual Thumbnails**: All image sizes displayed in grid
- **Source Filtering**: Filter by Spotify or Last.fm
- **MusicBrainz Search**: Search by MBID fields
- **Loved Status**: Filter by user preferences
- **Comprehensive Metadata**: All fields visible and searchable

### Read-Only Protection

- Manual song creation disabled (data must come from APIs)
- Prevents data corruption from manual editing
- Maintains API-driven data integrity

This comprehensive music service integration provides powerful tools for tracking and analyzing your listening history across multiple platforms!
