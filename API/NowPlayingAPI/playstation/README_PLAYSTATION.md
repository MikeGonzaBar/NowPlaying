# PlayStation Gaming Service Integration

This document provides comprehensive documentation for the **PlayStation** service endpoints, covering PSN game library management, trophy tracking, and playtime analytics.

## Overview

The PlayStation service allows you to:

- **PSN Game Library**: Fetch and store your PlayStation game collection
- **Trophy Tracking**: Monitor trophy progress across all games
- **Playtime Analytics**: Analyze playtime patterns and statistics
- **Trophy System**: Track Bronze, Silver, Gold, and Platinum trophies

---

## Setup & Authentication

### 1. Get PlayStation API Credentials

1. **Obtain NPSSO Token**:
   - Visit [PlayStation.com](https://www.playstation.com) and log in
   - Use browser developer tools to find NPSSO cookie
   - Follow [PSNAWP library guide](https://github.com/isFakeAccount/psnawp) for detailed instructions

2. **Find Your PSN User ID** (Optional):
   - Your PSN username or User ID
   - Can be left blank to use default account

3. **Store PlayStation Credentials**:

   ```bash
   curl -X POST "http://localhost:8000/users/api-keys/" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "service_name": "psn",
          "api_key": "YOUR_NPSSO_TOKEN",
          "service_user_id": "your_psn_user_id"
        }'
   ```

---

## API Endpoints

### 1. Fetch Game List

**Endpoint**: `GET /psn/get-game-list/`

**Description**: Fetches your complete PlayStation game library with trophies from PSN and stores it in the database.

**Authentication**: Required (JWT Token + PlayStation NPSSO)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/psn/get-game-list/"
```

**Response**:

```json
{
    "result": "Games and trophies fetched and stored successfully"
}
```

### 2. Get Stored Games

**Endpoint**: `GET /psn/get-game-list-stored/`

**Description**: Retrieves all stored PlayStation games from the database.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/psn/get-game-list-stored/"
```

**Response**:

```json
{
    "result": [
        {
            "id": 1,
            "npwr_id": "NPWR12345_00",
            "title": "The Last of Us Part II",
            "total_playtime": "45:30:15",
            "game_icon": "https://image.api.playstation.com/...",
            "last_played": "2024-01-15T20:30:00Z",
            "trophies": [
                {
                    "id": 1,
                    "trophy_name": "Survivor",
                    "trophy_type": "platinum",
                    "unlocked": true,
                    "date_earned": "2024-01-15T19:45:00Z"
                }
            ]
        }
    ]
}
```

### 3. Get Games by Total Playtime

**Endpoint**: `GET /psn/get-game-list-total-playtime/`

**Description**: Retrieves stored games sorted by total playtime (highest first).

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/psn/get-game-list-total-playtime/"
```

### 4. Get Games by Trophy Progress

**Endpoint**: `GET /psn/get-game-list-most-achieved/`

**Description**: Retrieves stored games sorted by weighted trophy score (Platinum=20, Gold=3, Silver=2, Bronze=1).

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/psn/get-game-list-most-achieved/"
```

---

## Data Models

### PSNGame Model

```python
class PSNGame(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='psn_games')
    npwr_id = models.CharField(max_length=50, unique=True)  # PlayStation Network ID
    title = models.CharField(max_length=255)
    total_playtime = models.CharField(max_length=50)  # Format: "45:30:15"
    game_icon = models.URLField(blank=True)
    last_played = models.DateTimeField(null=True, blank=True)
```

### PSNAchievement Model

```python
class PSNAchievement(models.Model):
    game = models.ForeignKey(PSNGame, on_delete=models.CASCADE, related_name='achievements')
    trophy_name = models.CharField(max_length=255)
    trophy_type = models.CharField(max_length=20)  # bronze, silver, gold, platinum
    unlocked = models.BooleanField(default=False)
    date_earned = models.DateTimeField(null=True, blank=True)
```

---

## Trophy System

### Trophy Types & Values

| Trophy Type | Point Value | Description |
|-------------|-------------|-------------|
| **Bronze** | 1 point | Common achievements |
| **Silver** | 2 points | Moderate difficulty |
| **Gold** | 3 points | Challenging achievements |
| **Platinum** | 20 points | 100% game completion |

### Trophy Analytics

```python
# Calculate weighted trophy score
def calculate_trophy_score(game):
    trophy_values = {
        'platinum': 20,
        'gold': 3,
        'silver': 2,
        'bronze': 1
    }
    
    score = 0
    for trophy in game.achievements.filter(unlocked=True):
        score += trophy_values.get(trophy.trophy_type.lower(), 0)
    return score

# Platinum count
platinum_count = user_games.filter(
    achievements__trophy_type='platinum',
    achievements__unlocked=True
).count()
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `No PlayStation NPSSO found` | Missing PSN credentials | Add NPSSO token in profile settings |
| `Invalid NPSSO token` | Expired/invalid token | Refresh NPSSO token from browser |
| `Private profile` | PSN profile is private | Set PSN profile to public |
| `PSN API unavailable` | PlayStation Network down | Retry later, check PSN status |

### NPSSO Token Notes

- **Expiration**: NPSSO tokens expire periodically
- **Refresh Required**: Must manually refresh from browser
- **Privacy**: Respects PlayStation Network privacy settings
- **Rate Limits**: Built-in delays to respect PSN API limits

---

## Integration Notes

### PlayStation Network Requirements

- **PSN Account**: Active PlayStation Network account required
- **Privacy Settings**: Profile must be public for API access
- **Game Library**: Games must be in your PSN library

### Data Synchronization

- **Full Sync**: Initial fetch downloads complete library
- **Trophy Progress**: Real-time trophy unlock tracking
- **Playtime Format**: PlayStation's time format (HH:MM:SS)
- **Game Icons**: High-resolution game artwork

This PlayStation integration provides comprehensive trophy tracking and gaming analytics for your PSN library!
