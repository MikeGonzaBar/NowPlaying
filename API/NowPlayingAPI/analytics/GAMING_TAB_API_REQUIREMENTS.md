# Gaming Tab API Requirements

This document outlines the additional data fields needed in the analytics API response to fully support the new Gaming Tab UI design.

## Current API Response Structure

The analytics endpoint (`/analytics/`) already returns most of the required data. However, the following fields need to be added or calculated:

## Required Additions

### 1. Most Played Game

**Field**: `most_played_game`

**Type**: Object

**Structure**:

```json
{
  "most_played_game": {
    "name": "Elden Ring",
    "image_url": "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",
    "platform": "steam",
    "playtime_minutes": 2400,
    "appid": 1245620  // Optional, for Steam games
  }
}
```

**Implementation Notes**:

- Query across all gaming platforms (Steam, PSN, Xbox, RetroAchievements)
- Find the game with the highest `playtime_forever` (Steam) or equivalent
- Get the game's image URL from the appropriate source:
  - Steam: `http://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{hash}.jpg`
  - PSN: Use `img_icon_url` or `img_logo_url` from PSNGame model
  - Xbox: Use image URL from XboxGame model
  - RetroAchievements: Use `image_box_art` or `image_icon` from RetroAchievementsGame model

### 2. Hardest Achievement

**Field**: `hardest_achievement`

**Type**: Object

**Structure**:

```json
{
  "hardest_achievement": {
    "name": "Let There Be Light",
    "rarity_percentage": 0.4,  // Percentage of players who have unlocked it
    "game_name": "Elden Ring",
    "platform": "steam",  // or "psn", "xbox", "retroachievements"
    "unlock_date": "2024-01-15T10:30:00Z"  // Optional
  }
}
```

**Implementation Notes**:

- Query achievements across all platforms
- For Steam: Use `percent` field from Achievement model if available
- For RetroAchievements: Use `true_ratio` field (lower = rarer)
- For PSN/Xbox: May need to fetch rarity from external APIs or use a default
- Find the achievement with the lowest unlock percentage (rarest)
- Only consider achievements the user has unlocked

### 3. Completion Rate

**Field**: `completion_rate` (or update existing calculation)

**Current Status**: The component calculates this from `total_games_completed` / `total_games_played`, but `total_games_completed` is not currently in the API response.

**Type**: Float (0-100)

**Implementation Options**:

**Option A**: Add `total_games_completed` to `comprehensive_stats.totals`

```json
{
  "totals": {
    "total_games_completed": 91,
    ...
  }
}
```

**Option B**: Calculate completion rate in the service and return directly

```json
{
  "completion_rate": 64.2,
  "total_games": 142,
  "completed_games": 91
}
```

**Implementation Notes**:

- Need to determine what "completed" means for each platform:
  - Steam: 100% achievements? Or games with all achievements unlocked?
  - PSN: Platinum trophy earned?
  - Xbox: 1000/1000 gamerscore?
  - RetroAchievements: All achievements unlocked?
- May need to add a `completed` field or flag to game models, or calculate on-the-fly

### 4. Daily Gaming Activity - Average Session Duration

**Current Status**: The `weekly_trend` field provides `gaming_time_hours` but not average session duration.

**Field**: Add to `weekly_trend` array items

**Structure**:

```json
{
  "weekly_trend": [
    {
      "date": "2024-01-15",
      "day_name": "MON",
      "gaming_time_hours": 2.5,
      "avg_session_duration_minutes": 45,  // NEW FIELD
      "session_count": 3,  // NEW FIELD (optional)
      ...
    }
  ]
}
```

**Implementation Notes**:

- Calculate average session duration for each day
- Session = continuous period of gaming activity
- Need to identify session boundaries:
  - Steam: Multiple games played within X minutes = same session?
  - Use achievement unlock times or game last_played timestamps
  - Consider gaps > 30 minutes as new session

**Alternative**: If session tracking is not available, estimate based on:

- Average session = total gaming time / number of games played that day
- Or use a heuristic: `gaming_time_hours / max(games_played, 1)`

### 5. Gaming Consistency

**Status**: ✅ Already available! Can be calculated from `comprehensive_stats.daily_stats`

The component already calculates this correctly by counting days with `games_played > 0`.

## Recommended API Response Addition

Add the following fields to the analytics response:

```json
{
  "comprehensive_stats": {
    "totals": {
      "total_games_completed": 91,  // NEW
      ...
    },
    ...
  },
  "weekly_trend": [
    {
      "avg_session_duration_minutes": 45,  // NEW
      ...
    }
  ],
  "most_played_game": {  // NEW
    "name": "...",
    "image_url": "...",
    "platform": "..."
  },
  "hardest_achievement": {  // NEW
    "name": "...",
    "rarity_percentage": 0.4,
    "game_name": "..."
  }
}
```

## Implementation Priority

1. **High Priority**:
   - `most_played_game` - Essential for Quick Insights
   - `hardest_achievement` - Essential for Quick Insights

2. **Medium Priority**:
   - `total_games_completed` - Needed for accurate completion rate
   - `avg_session_duration_minutes` - Nice to have for Daily Activity chart

3. **Low Priority**:
   - Session count - Optional enhancement
   - Achievement unlock dates in hardest_achievement - Optional

## Files to Modify

1. `API/NowPlayingAPI/analytics/services.py`:
   - Add `get_most_played_game(user, days)` method
   - Add `get_hardest_achievement(user, days)` method
   - Add `total_games_completed` calculation to `get_comprehensive_statistics`
   - Add `avg_session_duration_minutes` to `get_weekly_trend`

2. `API/NowPlayingAPI/analytics/views.py`:
   - Add new fields to the response in `list` method

## Component Status

✅ The `GamingStats.tsx` component is ready to consume these fields once they're added to the API.

The component currently uses placeholder values where the API data is missing:

- Most played game: Defaults to "Elden Ring" with placeholder image
- Hardest achievement: Defaults to "Let There Be Light" with 0.4% rarity
- Completion rate: Currently shows 0% if `total_games_completed` is not available
- Average session: Currently shows 0 for all days
