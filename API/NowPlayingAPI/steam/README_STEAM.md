# Steam Gaming Service Integration

This document provides comprehensive documentation for the **Steam** service endpoints, covering game library management, achievement tracking, and playtime analytics.

## Overview

The Steam service allows you to:

- **Game Library**: Fetch and store your complete Steam game collection
- **Achievement Tracking**: Monitor achievement progress across all games
- **Playtime Analytics**: Analyze playtime patterns and statistics
- **Data Persistence**: Store game data locally for offline access and analysis

---

## Setup & Authentication

### 1. Get Steam API Credentials

1. **Obtain Steam API Key**:
   - Visit [Steam API Key Registration](https://steamcommunity.com/dev/apikey)
   - Register for an API key (requires Steam account)
   - Note your API key

2. **Find Your Steam ID**:
   - Visit your Steam profile
   - Use [SteamID Finder](https://steamidfinder.com/) if needed
   - Note your 64-bit Steam ID

3. **Store Steam Credentials**:

   ```bash
   curl -X POST "http://localhost:8000/users/api-keys/" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "service_name": "steam",
          "api_key": "YOUR_STEAM_API_KEY",
          "service_user_id": "YOUR_STEAM_ID"
        }'
   ```

---

## API Endpoints

### 1. Fetch Game List

**Endpoint**: `GET /steam/get-game-list/`

**Description**: Fetches your complete Steam game library with achievements from the Steam API and stores it in the database.

**Authentication**: Required (JWT Token + Steam API Key)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/steam/get-game-list/"
```

**Response**:

```json
{
    "result": "Games and achievements fetched and stored successfully"
}
```

### 2. Get Stored Games

**Endpoint**: `GET /steam/get-game-list-stored/`

**Description**: Retrieves all stored Steam games from the database, sorted by last played date.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/steam/get-game-list-stored/"
```

**Response**:

```json
{
    "result": [
        {
            "id": 1,
            "appid": "440",
            "name": "Team Fortress 2",
            "playtime_forever": 1234,
            "playtime_2weeks": 56,
            "last_played": "2024-01-15T20:30:00Z",
            "img_icon_url": "e3f595a92552da3d664ad00277fad2107345f743",
            "img_logo_url": "07385eb55b5ba974aebbe74d3c99626bda7920b8",
            "has_community_visible_stats": true,
            "achievements": [
                {
                    "id": 1,
                    "achievement_name": "TF_PLAY_GAME_EVERYCLASS",
                    "unlocked": true,
                    "unlock_time": "2024-01-10T15:30:00Z"
                }
            ]
        }
    ]
}
```

### 3. Get Games by Total Playtime

**Endpoint**: `GET /steam/get-game-list-total-playtime/`

**Description**: Retrieves stored games sorted by total playtime (highest first).

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/steam/get-game-list-total-playtime/"
```

**Response**:

```json
{
    "result": [
        {
            "id": 2,
            "appid": "730",
            "name": "Counter-Strike: Global Offensive",
            "playtime_forever": 5432,
            "playtime_2weeks": 120,
            "last_played": "2024-01-15T22:00:00Z",
            "img_icon_url": "69f7ebe2735c366c65c0b33dae00e12dc40edbe4",
            "img_logo_url": "d0595ff02f5c79fd19b06f4d6165c3fda2372820",
            "has_community_visible_stats": true,
            "achievements": []
        }
    ]
}
```

### 4. Get Games by Achievement Progress

**Endpoint**: `GET /steam/get-game-list-most-achieved/`

**Description**: Retrieves stored games sorted by achievement completion percentage (highest first).

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/steam/get-game-list-most-achieved/"
```

**Response**:

```json
{
    "result": [
        {
            "id": 3,
            "appid": "620",
            "name": "Portal 2",
            "playtime_forever": 890,
            "playtime_2weeks": 0,
            "last_played": "2024-01-10T18:45:00Z",
            "img_icon_url": "834b38a4396859ea6ba41f4ac89a3e01b8e1e34f",
            "img_logo_url": "c50de7c3c001fc4d1abd5d34bb7b8b9e67f7b9a7",
            "has_community_visible_stats": true,
            "achievements": [
                {
                    "id": 5,
                    "achievement_name": "ACH.WAKE_UP",
                    "unlocked": true,
                    "unlock_time": "2024-01-05T12:15:00Z"
                },
                {
                    "id": 6,
                    "achievement_name": "ACH.ESCAPE_TESTCHAMBER",
                    "unlocked": true,
                    "unlock_time": "2024-01-05T12:30:00Z"
                }
            ]
        }
    ]
}
```

---

## Data Models

### Game Model

```python
class Game(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='steam_games')
    appid = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    playtime_forever = models.PositiveIntegerField(default=0)  # Total playtime in minutes
    playtime_2weeks = models.PositiveIntegerField(default=0)   # Recent playtime in minutes
    last_played = models.DateTimeField(null=True, blank=True)
    img_icon_url = models.CharField(max_length=255, blank=True)
    img_logo_url = models.CharField(max_length=255, blank=True)
    has_community_visible_stats = models.BooleanField(default=False)
```

### Achievement Model

```python
class Achievement(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='achievements')
    achievement_name = models.CharField(max_length=255)
    unlocked = models.BooleanField(default=False)
    unlock_time = models.DateTimeField(null=True, blank=True)
```

---

## Advanced Features

### Playtime Analytics

The system provides multiple ways to analyze your gaming habits:

1. **Total Playtime**: See which games you've invested the most time in
2. **Recent Activity**: Track your 2-week gaming patterns
3. **Last Played**: Find games you haven't touched recently
4. **Achievement Progress**: Identify completion opportunities

### Achievement Tracking

- **Per-Game Tracking**: Individual achievement status for each game
- **Progress Calculation**: Automatic percentage calculation
- **Unlock Timestamps**: When you earned each achievement
- **Completion Analysis**: Sort games by achievement completion rate

### Image Assets

Steam provides game imagery:

- **Icon URLs**: Small game icons for lists
- **Logo URLs**: Larger game logos for detailed views
- **Consistent Formatting**: All URLs follow Steam's CDN pattern

---

## Steam API Integration

### API Methods Used

The service integrates with several Steam Web API methods:

1. **IPlayerService/GetOwnedGames**: Retrieves user's game library
2. **ISteamUserStats/GetPlayerAchievements**: Fetches achievement data per game
3. **Steam CDN**: Game images and assets

### Rate Limits

- **Steam API**: 100,000 requests per day per API key
- **Per-User Limits**: Shared across all users of your API key
- **Recommendation**: Cache data locally to minimize API calls

### Data Accuracy

- **Playtime**: Updated when Steam client syncs
- **Achievements**: Real-time when unlocked
- **Game List**: Updates when you purchase/remove games
- **Privacy**: Respects Steam privacy settings

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `No Steam API key found` | Missing Steam credentials | Add Steam API key in profile settings |
| `No Steam ID found` | Missing Steam ID | Add Steam ID in `service_user_id` field |
| `Invalid Steam API key` | Incorrect API key | Verify API key is correct and active |
| `Private profile` | Steam profile is private | Set Steam profile to public |
| `Steam API unavailable` | Steam API down | Retry later, check Steam status |

### API Response Codes

- **200**: Success
- **400**: Bad Request (invalid parameters)
- **401**: Unauthorized (invalid API key)
- **403**: Forbidden (private profile/insufficient permissions)
- **429**: Rate Limit Exceeded
- **500**: Steam API Error

---

## Data Analysis Features

### Playtime Insights

```python
# Total gaming time across all games
total_minutes = sum(game.playtime_forever for game in user_games)
total_hours = total_minutes / 60

# Most played game
most_played = max(user_games, key=lambda g: g.playtime_forever)

# Recent activity
active_games = [g for g in user_games if g.playtime_2weeks > 0]
```

### Achievement Statistics

```python
# Overall completion rate
total_achievements = sum(game.achievements.count() for game in user_games)
unlocked_achievements = sum(
    game.achievements.filter(unlocked=True).count() 
    for game in user_games
)
completion_rate = (unlocked_achievements / total_achievements) * 100

# Perfect games (100% achievements)
perfect_games = [
    game for game in user_games 
    if game.achievements.exists() and 
    game.achievements.filter(unlocked=False).count() == 0
]
```

---

## Integration Notes

### Steam Profile Requirements

- **Public Profile**: Required for API access
- **Game Details Privacy**: Must be set to "Public"
- **Community Features**: Account must have community features enabled

### Data Synchronization

- **Full Sync**: Initial fetch downloads complete library
- **Incremental Updates**: Subsequent calls update existing data
- **Achievement Progress**: Tracked per individual achievement
- **Duplicate Prevention**: Games identified by unique App ID

### Performance Considerations

- **Large Libraries**: Users with 1000+ games may experience longer sync times
- **Achievement Heavy Games**: MMOs and achievement-heavy games increase API calls
- **Batch Processing**: System processes games in batches to manage memory
- **Local Caching**: Reduces repeated API calls for same data

This comprehensive Steam integration provides detailed insights into your gaming library and achievement progress!
