# RetroAchievements Gaming Service Integration

This document provides comprehensive documentation for the **RetroAchievements** service endpoints, covering retro gaming achievements, progress tracking, and game collection management.

## Overview

The RetroAchievements service allows you to:

- **Retro Game Library**: Fetch and store your RetroAchievements game collection
- **Achievement Tracking**: Monitor achievement progress across classic games
- **Recently Played**: Track your recent retro gaming activity
- **Detailed Game Info**: Access comprehensive game and achievement details

---

## Setup & Authentication

### 1. Get RetroAchievements API Credentials

1. **Create RetroAchievements Account**:
   - Visit [RetroAchievements.org](https://retroachievements.org)
   - Create an account if you don't have one
   - Start earning achievements in supported emulators

2. **Obtain API Key**:
   - Visit your [RetroAchievements API settings](https://retroachievements.org/controlpanel.php)
   - Generate your API key
   - Note your username and API key

3. **Store RetroAchievements Credentials**:

   ```bash
   curl -X POST "http://localhost:8000/users/api-keys/" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "service_name": "retroachievements",
          "api_key": "YOUR_RA_API_KEY",
          "service_user_id": "your_ra_username"
        }'
   ```

---

## API Endpoints

### 1. Fetch Recently Played Games

**Endpoint**: `GET /retroachievements/fetch-recently-played-games/`

**Description**: Fetches and populates the latest 50 recently played games with achievements from RetroAchievements.

**Authentication**: Required (JWT Token + RetroAchievements API Key)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/retroachievements/fetch-recently-played-games/"
```

**Response**:

```json
{
    "result": "Recently played games fetched and stored successfully"
}
```

### 2. Get Most Achieved Games

**Endpoint**: `GET /retroachievements/get-most-achieved-games/`

**Description**: Returns games ordered by achievement completion percentage, with secondary ordering by last played date.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/retroachievements/get-most-achieved-games/"
```

**Response**:

```json
{
    "result": [
        {
            "id": 1,
            "game_id": 1,
            "title": "Mega Man (NES)",
            "console_name": "NES",
            "image_icon": "/Images/112645.png",
            "image_title": "/Images/000001.png",
            "image_ingame": "/Images/000002.png",
            "image_boxart": "/Images/000003.png",
            "last_played": "2024-01-15T20:30:00Z",
            "achievements": [
                {
                    "id": 1,
                    "achievement_id": 123,
                    "title": "Blue Bomber",
                    "description": "Complete the game",
                    "points": 25,
                    "true_ratio": 50,
                    "unlocked": true,
                    "date_earned": "2024-01-15T19:45:00Z",
                    "badge_name": "12345"
                }
            ],
            "completion_percentage": 87.5,
            "total_achievements": 8,
            "unlocked_achievements": 7
        }
    ]
}
```

### 3. Fetch All Games

**Endpoint**: `GET /retroachievements/fetch-games/`

**Description**: Fetches all games along with their achievements from the database.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/retroachievements/fetch-games/"
```

**Response**:

```json
{
    "result": [
        {
            "id": 2,
            "game_id": 2,
            "title": "Super Mario Bros. (NES)",
            "console_name": "NES",
            "image_icon": "/Images/112646.png",
            "image_title": "/Images/000004.png",
            "image_ingame": "/Images/000005.png",
            "image_boxart": "/Images/000006.png",
            "last_played": "2024-01-14T18:15:00Z",
            "achievements": [
                {
                    "id": 5,
                    "achievement_id": 456,
                    "title": "World 1 Complete",
                    "description": "Complete World 1",
                    "points": 10,
                    "true_ratio": 15,
                    "unlocked": true,
                    "date_earned": "2024-01-14T18:00:00Z",
                    "badge_name": "45678"
                }
            ]
        }
    ]
}
```

### 4. Fetch Game Details

**Endpoint**: `GET /retroachievements/fetch-game-details/`

**Description**: Fetches a specific game and its achievements by game ID.

**Authentication**: Required (JWT Token)

**Query Parameters**:

- `game_id` (required): RetroAchievements game ID

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/retroachievements/fetch-game-details/?game_id=1"
```

**Response**:

```json
{
    "result": {
        "id": 1,
        "game_id": 1,
        "title": "Mega Man (NES)",
        "console_name": "NES",
        "image_icon": "/Images/112645.png",
        "image_title": "/Images/000001.png",
        "image_ingame": "/Images/000002.png",
        "image_boxart": "/Images/000003.png",
        "last_played": "2024-01-15T20:30:00Z",
        "achievements": [
            {
                "id": 1,
                "achievement_id": 123,
                "title": "Blue Bomber",
                "description": "Complete the game",
                "points": 25,
                "true_ratio": 50,
                "unlocked": true,
                "date_earned": "2024-01-15T19:45:00Z",
                "badge_name": "12345"
            },
            {
                "id": 2,
                "achievement_id": 124,
                "title": "Cut Man Defeated",
                "description": "Defeat Cut Man",
                "points": 5,
                "true_ratio": 10,
                "unlocked": false,
                "date_earned": null,
                "badge_name": "12346"
            }
        ]
    }
}
```

---

## Data Models

### RetroAchievementsGame Model

```python
class RetroAchievementsGame(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ra_games')
    game_id = models.IntegerField()  # RetroAchievements game ID
    title = models.CharField(max_length=255)
    console_name = models.CharField(max_length=100)
    image_icon = models.CharField(max_length=255, blank=True)
    image_title = models.CharField(max_length=255, blank=True)
    image_ingame = models.CharField(max_length=255, blank=True)
    image_boxart = models.CharField(max_length=255, blank=True)
    last_played = models.DateTimeField(null=True, blank=True)
```

### RetroAchievementsAchievement Model

```python
class RetroAchievementsAchievement(models.Model):
    game = models.ForeignKey(RetroAchievementsGame, on_delete=models.CASCADE, related_name='achievements')
    achievement_id = models.IntegerField()  # RetroAchievements achievement ID
    title = models.CharField(max_length=255)
    description = models.TextField()
    points = models.IntegerField()
    true_ratio = models.IntegerField()  # Rarity/difficulty score
    unlocked = models.BooleanField(default=False)
    date_earned = models.DateTimeField(null=True, blank=True)
    badge_name = models.CharField(max_length=255, blank=True)
```

---

## Advanced Features

### Achievement Analysis

The system provides comprehensive achievement tracking:

1. **Completion Percentage**: Calculate achievement completion rate per game
2. **Point Tracking**: Track total achievement points earned
3. **Rarity Analysis**: Identify rare achievements via TrueRatio scores
4. **Progress Monitoring**: Track achievement unlock dates

### Game Collection Management

- **Recently Played**: Automatically track recent gaming activity
- **Console Organization**: Games categorized by gaming console
- **Image Assets**: Multiple image types for rich UI display
- **Historical Data**: Preserve achievement unlock timestamps

### Retro Gaming Insights

```python
# Calculate total achievement points
total_points = sum(
    achievement.points 
    for game in user_games 
    for achievement in game.achievements.filter(unlocked=True)
)

# Find rarest achievements (highest TrueRatio)
rarest_achievements = RetroAchievementsAchievement.objects.filter(
    game__user=user,
    unlocked=True
).order_by('-true_ratio')[:10]

# Console distribution
console_stats = user_games.values('console_name').annotate(
    game_count=Count('id'),
    total_achievements=Count('achievements'),
    unlocked_achievements=Count('achievements__unlocked', filter=Q(achievements__unlocked=True))
)
```

---

## RetroAchievements API Integration

### API Methods Used

The service integrates with RetroAchievements Web API:

1. **API_GetUserRecentlyPlayedGames**: Fetches recently played games
2. **API_GetGameInfoAndUserProgress**: Gets game details with user progress
3. **API_GetAchievementCount**: Retrieves achievement statistics
4. **RetroAchievements CDN**: Game images and achievement badges

### Rate Limits

- **RetroAchievements API**: 300 requests per minute per API key
- **Respectful Usage**: Built-in delays to avoid overwhelming the service
- **Caching Strategy**: Local storage reduces repeated API calls

### Data Accuracy

- **Real-Time Updates**: Achievement unlocks reflected immediately
- **Game Progress**: Tracks per-game completion status
- **Historical Preservation**: Unlock dates and timestamps maintained

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `No RetroAchievements API key found` | Missing RA credentials | Add API key in profile settings |
| `No RetroAchievements username found` | Missing username | Add username in `service_user_id` field |
| `Invalid API key` | Incorrect API key | Verify API key in RA control panel |
| `Private profile` | Profile privacy settings | Set profile to public in RA settings |
| `The 'game_id' parameter is required` | Missing game_id parameter | Provide valid game_id in request |
| `Game not found` | Invalid game_id | Check game exists in RetroAchievements database |

### API Response Validation

- **Data Sanitization**: All API responses validated and sanitized
- **Error Recovery**: Graceful handling of API failures
- **Partial Success**: Individual game failures don't stop bulk operations

---

## Console Support

### Supported Gaming Consoles

RetroAchievements supports achievements for many classic consoles:

- **Nintendo**: NES, SNES, Game Boy, Game Boy Color, Game Boy Advance, N64
- **Sega**: Master System, Genesis/Mega Drive, Game Gear, 32X, CD, Saturn
- **Sony**: PlayStation, PlayStation Portable
- **Atari**: 2600, 7800, Lynx, Jaguar
- **Neo Geo**: Pocket, CD
- **PC Engine**: TurboGrafx-16
- **And many more**: Arcade, Colecovision, Intellivision, etc.

### Image Assets

Each game provides multiple image types:

- **Icon**: Small thumbnail for lists
- **Title**: Game title screen
- **In-Game**: Gameplay screenshot  
- **Box Art**: Original game box artwork

---

## Achievement System

### Point Values

Achievements have different point values based on difficulty:

- **Easy**: 1-5 points
- **Medium**: 5-10 points  
- **Hard**: 10-25 points
- **Very Hard**: 25+ points

### TrueRatio System

TrueRatio represents achievement rarity/difficulty:

- **Higher Values**: Rarer, more difficult achievements
- **Calculation**: Based on unlock percentage across all players
- **Dynamic**: Updates as more players attempt achievements

### Badge System

Each achievement has an associated badge image:

- **Unique Design**: Custom artwork for each achievement
- **Visual Recognition**: Easy identification of accomplishments
- **Collection Display**: Rich visual achievement galleries

---

## Integration Notes

### Emulator Compatibility

RetroAchievements works with specific emulators:

- **RetroArch**: Most comprehensive support
- **Standalone Emulators**: RALibretro, PCSX2, DuckStation, etc.
- **Achievement Support**: Must use RA-compatible emulator cores

### Data Synchronization

- **Real-Time Sync**: Achievement unlocks sync immediately when online
- **Offline Play**: Achievements earned offline sync when connected
- **Progress Tracking**: Per-game completion status maintained
- **Historical Data**: All unlock timestamps preserved

### Community Features

- **Leaderboards**: Compare progress with other players
- **Achievement Comments**: Community discussion on achievements
- **Game Requests**: Community-driven game addition process
- **Quality Assurance**: Community-reviewed achievement sets

This comprehensive RetroAchievements integration brings modern achievement tracking to classic gaming!
