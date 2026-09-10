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

### 1. Connect PlayStation

1. **Obtain NPSSO Token**:
   - Visit [PlayStation.com](https://www.playstation.com) and log in
   - In the same browser, open <https://ca.account.sony.com/api/v1/ssocookie>
   - Copy the `npsso` value from the JSON response

2. **Store PlayStation Credentials**:
   - Paste the NPSSO value in the profile PlayStation card
   - The API validates it, detects your PSN Online ID, exchanges it for PlayStation access/refresh tokens, and stores only the encrypted token payload

   ```bash
   curl -X POST "http://localhost:8000/psn/exchange-npsso/" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "npsso": "YOUR_NPSSO_TOKEN"
        }'
   ```

3. **Legacy Records**:
   Older raw-NPSSO records can still be read for backward compatibility, but new PlayStation writes through `/users/api-keys/` are rejected. Use `/psn/exchange-npsso/`.

---

## API Endpoints

### 1. Fetch Game List

**Endpoint**: `GET /psn/get-game-list/`

**Description**: Fetches your complete PlayStation game library with trophies from PSN and stores it in the database.

**Authentication**: Required (JWT Token + stored PlayStation token payload)

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
| `No PlayStation connection found` | Missing PSN credentials | Connect PlayStation in profile settings |
| `Your npsso code has expired or is incorrect` | Expired/invalid NPSSO during setup | Refresh NPSSO from Sony's `ssocookie` JSON |
| `Private profile` | PSN profile is private | Set PSN profile to public |
| `PSN API unavailable` | PlayStation Network down | Retry later, check PSN status |

### NPSSO and Token Notes

- **Expiration**: NPSSO tokens and PlayStation refresh tokens expire periodically
- **Refresh Required**: NPSSO is only needed for the initial exchange or when the stored refresh token can no longer be refreshed
- **Storage**: The app stores an encrypted access/refresh token payload, not the raw NPSSO, after `/psn/exchange-npsso/` succeeds
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
