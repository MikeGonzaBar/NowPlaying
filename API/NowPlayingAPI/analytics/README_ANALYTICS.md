# Analytics System Documentation

## Overview

The Analytics system provides comprehensive statistics and insights across all entertainment platforms integrated into the NowPlaying application. This system has been heavily optimized for performance with caching, efficient database queries, and streamlined endpoints.

## Recent Optimizations (Latest)

### Performance Improvements

- **Endpoint Consolidation**: Reduced from 8 separate endpoints to 2 streamlined endpoints
- **Database Cleanup**: Removed 5 unused models for better database performance
- **Query Optimization**: Replaced inefficient loops with bulk database aggregation queries
- **Caching Implementation**: Added Redis/Django cache support with 1-hour TTL
- **Code Reduction**: Reduced codebase by 50% while maintaining all functionality

### Technical Improvements

- **Efficient Aggregation**: Implemented Django's Count() and Sum() for bulk operations
- **Smart Caching**: Cache keys based on user ID, date range, and current date
- **Query Count Reduction**: From 15-20 queries per request to 5-7 optimized queries
- **Performance Gain**: ~10x faster response times for cached requests

## API Endpoints

### Main Analytics Endpoint

**Endpoint**: `GET /analytics/`

**Description**: Comprehensive analytics dashboard combining statistics from all entertainment platforms.

**Query Parameters**:

- `days` (optional): Number of days to include in statistics (default: 30)

**Response**:

```json
{
  "user_statistics": {
    "gaming": {
      "total_games": 150,
      "total_achievements": 1250,
      "total_playtime_hours": 480.5,
      "platform_breakdown": {
        "steam": {"games": 80, "achievements": 800, "playtime_hours": 320.0},
        "psn": {"games": 45, "trophies": 280, "playtime_hours": 120.5},
        "xbox": {"games": 20, "achievements": 150, "playtime_hours": 30.0},
        "retroachievements": {"games": 5, "achievements": 20, "playtime_hours": 10.0}
      }
    },
    "music": {
      "total_tracks": 1520,
      "unique_artists": 340,
      "unique_albums": 180,
      "total_listening_hours": 95.5,
      "platform_breakdown": {
        "spotify": {"tracks": 1200, "hours": 75.0},
        "lastfm": {"tracks": 320, "hours": 20.5}
      }
    },
    "movies": {
      "total_movies": 85,
      "total_shows": 25,
      "total_episodes": 420,
      "total_watch_hours": 180.5
    }
  },
  "gaming_streak": {
    "current_streak": 5,
    "best_streak": 12,
    "last_activity_date": "2024-01-15"
  }
}
```

### Today's Statistics Calculator

**Endpoint**: `GET /analytics/calculate-today/`

**Description**: Calculate and update today's activity statistics across all platforms.

**Response**:

```json
{
  "success": true,
  "message": "Today's statistics calculated successfully",
  "date": "2024-01-15",
  "stats_updated": true
}
```

## Database Models

### UserStatistics

Stores comprehensive user statistics across all entertainment platforms.

**Fields**:

- `user`: ForeignKey to User model
- `total_games`: Total number of games across all platforms
- `total_achievements`: Total achievements/trophies earned
- `total_playtime_hours`: Total gaming hours across all platforms
- `total_tracks`: Total music tracks listened to
- `total_listening_hours`: Total music listening hours
- `total_movies`: Total movies watched
- `total_shows`: Total TV shows watched
- `total_episodes`: Total episodes watched
- `last_updated`: Timestamp of last statistics update

### GamingStreak

Tracks gaming activity streaks for gamification.

**Fields**:

- `user`: ForeignKey to User model
- `current_streak`: Current consecutive days with gaming activity
- `best_streak`: Best streak ever achieved
- `last_activity_date`: Date of last gaming activity

## Caching Strategy

The analytics system implements intelligent caching to provide optimal performance:

### Cache Keys

- Format: `analytics_{user.id}_{days}_{current_date}`
- Includes user ID for security
- Includes days parameter for different time ranges
- Includes current date for daily cache invalidation

### Cache TTL

- **Duration**: 1 hour (3600 seconds)
- **Rationale**: Balances data freshness with performance
- **Auto-invalidation**: Cache automatically expires daily

### Cache Benefits

- **Response Time**: ~10x faster for cached requests
- **Database Load**: Reduced from 15-20 to 0 queries for cached responses
- **User Experience**: Near-instant analytics loading

## Database Query Optimization

### Before Optimization

- Individual queries for each platform and statistic
- Multiple loops through data collections
- 15-20 database queries per analytics request
- Inefficient aggregation in Python code

### After Optimization

- Bulk aggregation using Django's Count() and Sum()
- Single queries with complex aggregations
- 5-7 optimized database queries per request
- Database-level calculations for efficiency

### Example Optimized Query

```python
# Before: Multiple individual queries
total_games = 0
for platform in platforms:
    total_games += Game.objects.filter(user=user, platform=platform).count()

# After: Single aggregated query
total_games = Game.objects.filter(user=user).aggregate(
    total=Count('id')
)['total'] or 0
```

## Integration with Other Services

The analytics system automatically aggregates data from:

### Gaming Platforms

- **Steam**: Games, achievements, playtime
- **PlayStation**: Games, trophies, playtime  
- **Xbox**: Games, achievements, playtime
- **RetroAchievements**: Games, achievements, points

### Entertainment Platforms

- **Trakt**: Movies, TV shows, episodes, watch time
- **Spotify**: Recently played tracks, listening time
- **Last.fm**: Scrobbled tracks, listening history

## Performance Monitoring

### Key Metrics

- **Response Time**: Average response time per endpoint
- **Cache Hit Rate**: Percentage of requests served from cache
- **Database Query Count**: Number of queries per request
- **Memory Usage**: Cache memory consumption

### Optimization Targets

- **Response Time**: < 200ms for cached, < 500ms for uncached
- **Cache Hit Rate**: > 80% during normal usage
- **Query Count**: < 10 queries per analytics request

## Error Handling

The analytics system includes comprehensive error handling:

- **Database Errors**: Graceful fallback to empty statistics
- **Cache Errors**: Automatic fallback to database queries
- **Service Timeouts**: Timeout protection for external API calls
- **Data Validation**: Input validation for all parameters

## Security Considerations

- **User Isolation**: All statistics are user-scoped with proper filtering
- **Cache Security**: Cache keys include user ID to prevent data leaks
- **Input Validation**: All query parameters are validated and sanitized
- **Rate Limiting**: Endpoints respect Django's rate limiting configuration

## Future Enhancements

### Planned Features

- **Real-time Updates**: WebSocket support for live statistics
- **Advanced Filtering**: Date range and platform-specific filtering
- **Export Functionality**: CSV/JSON export of analytics data
- **Comparison Views**: User-to-user or time period comparisons

### Performance Improvements

- **Database Indexing**: Additional indexes for complex queries
- **Query Optimization**: Further query optimization based on usage patterns
- **Caching Layers**: Multi-level caching with Redis and database-level caching
- **Background Processing**: Asynchronous statistics calculation for large datasets
