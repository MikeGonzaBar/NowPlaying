# Xbox Gaming Service Integration

This document provides comprehensive documentation for the **Xbox** service endpoints, covering Xbox game library management, achievement tracking, and playtime analytics.

## Overview

The Xbox service allows you to:

- **Xbox Game Library**: Fetch and store your Xbox game collection
- **Achievement Tracking**: Monitor achievement progress across all games
- **Playtime Analytics**: Analyze playtime patterns and statistics
- **Gamerscore System**: Track Xbox achievement points (Gamerscore)

---

## Setup & Authentication

### 1. Get Xbox API Credentials

1. **Obtain OpenXBL API Key**:
   - Visit [OpenXBL.com](https://xbl.io)
   - Create an account and get your API key
   - Follow [OpenXBL documentation](https://xbl.io/docs) for detailed instructions

2. **Find Your XUID**:
   - Your Xbox Live User ID (XUID)
   - Can be found through OpenXBL or Xbox Live tools

3. **Store Xbox Credentials**:

   ```bash
   curl -X POST "http://localhost:8000/users/api-keys/" \
        -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "service_name": "xbox",
          "api_key": "YOUR_OPENXBL_API_KEY",
          "service_user_id": "your_xuid"
        }'
   ```

---

## API Endpoints

### 1. Fetch Game List

**Endpoint**: `GET /xbox/get-game-list/`

**Description**: Fetches your complete Xbox game library with achievements from Xbox Live and stores it in the database.

**Authentication**: Required (JWT Token + OpenXBL API Key)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/xbox/get-game-list/"
```

**Response**:

```json
{
    "result": "Games and achievements fetched and stored successfully"
}
```

### 2. Get Stored Games

**Endpoint**: `GET /xbox/get-game-list-stored/`

**Description**: Retrieves all stored Xbox games from the database.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/xbox/get-game-list-stored/"
```

**Response**:

```json
{
    "result": [
        {
            "id": 1,
            "title_id": "1234567890",
            "name": "Halo Infinite",
            "total_playtime": "120",
            "product_id": "ABCD1234",
            "last_played": "2024-01-15T20:30:00Z",
            "achievements": [
                {
                    "id": 1,
                    "achievement_name": "First Contact",
                    "achievement_description": "Complete the first mission",
                    "achievement_value": "15",
                    "unlocked": true,
                    "date_earned": "2024-01-15T19:45:00Z"
                }
            ]
        }
    ]
}
```

### 3. Get Games by Total Playtime

**Endpoint**: `GET /xbox/get-game-list-total-playtime/`

**Description**: Retrieves stored games sorted by total playtime (highest first).

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/xbox/get-game-list-total-playtime/"
```

### 4. Get Games by Achievement Progress

**Endpoint**: `GET /xbox/get-game-list-most-achieved/`

**Description**: Retrieves stored games sorted by weighted achievement score (sum of achievement values).

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:8000/xbox/get-game-list-most-achieved/"
```

---

## Data Models

### XboxGame Model

```python
class XboxGame(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='xbox_games')
    title_id = models.CharField(max_length=50, unique=True)  # Xbox Title ID
    name = models.CharField(max_length=255)
    total_playtime = models.CharField(max_length=50)  # Hours as string
    product_id = models.CharField(max_length=50, blank=True)
    last_played = models.DateTimeField(null=True, blank=True)
```

### XboxAchievement Model

```python
class XboxAchievement(models.Model):
    game = models.ForeignKey(XboxGame, on_delete=models.CASCADE, related_name='achievements')
    achievement_name = models.CharField(max_length=255)
    achievement_description = models.TextField()
    achievement_value = models.CharField(max_length=10)  # Gamerscore value
    unlocked = models.BooleanField(default=False)
    date_earned = models.DateTimeField(null=True, blank=True)
```

---

## Achievement System

### Xbox Gamerscore

Xbox achievements have point values that contribute to your Gamerscore:

- **Variable Points**: Achievements can have 5, 10, 15, 20, 25, 50, 100+ points
- **Total Gamerscore**: Sum of all unlocked achievement points
- **Completion Rate**: Percentage of total possible achievements unlocked

### Achievement Analytics

```python
# Calculate total Gamerscore
def calculate_gamerscore(user_games):
    total_score = 0
    for game in user_games:
        for achievement in game.achievements.filter(unlocked=True):
            try:
                score = int(achievement.achievement_value)
                total_score += score
            except (ValueError, TypeError):
                pass  # Skip invalid values
    return total_score

# Achievement completion rate
def completion_rate(game):
    total = game.achievements.count()
    if total == 0:
        return 0
    unlocked = game.achievements.filter(unlocked=True).count()
    return (unlocked / total) * 100
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `No Xbox API key found` | Missing Xbox credentials | Add OpenXBL API key in profile settings |
| `No Xbox XUID found` | Missing XUID | Add XUID in `service_user_id` field |
| `Invalid API key` | Incorrect OpenXBL key | Verify API key at OpenXBL.com |
| `Private profile` | Xbox profile is private | Set Xbox profile to public |
| `Xbox Live unavailable` | Xbox Live down | Retry later, check Xbox Live status |

### OpenXBL API Notes

- **Rate Limits**: OpenXBL has API rate limits
- **Subscription Tiers**: Different features based on OpenXBL plan
- **Privacy**: Respects Xbox Live privacy settings
- **Data Accuracy**: Real-time achievement unlock tracking

---

## Integration Notes

### Xbox Live Requirements

- **Xbox Live Account**: Active Xbox Live account required
- **Privacy Settings**: Profile must be public for API access
- **Game Library**: Games must be in your Xbox library

### Data Synchronization

- **Full Sync**: Initial fetch downloads complete library
- **Achievement Progress**: Real-time achievement unlock tracking
- **Playtime Format**: Xbox's time format (hours)
- **Product IDs**: Microsoft Store product identifiers

### OpenXBL Service

- **Third-Party API**: Uses OpenXBL.com for Xbox Live data access
- **API Limitations**: Subject to OpenXBL terms and limitations
- **Cost**: OpenXBL may require subscription for full features
- **Reliability**: Dependent on OpenXBL service availability

This Xbox integration provides comprehensive achievement tracking and gaming analytics for your Xbox Live library!
