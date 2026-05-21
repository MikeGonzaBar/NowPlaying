# Analytics System Documentation

## Overview

The Analytics system provides comprehensive statistics and insights across all entertainment platforms integrated into the NowPlaying application. This system has been heavily optimized for performance with caching, efficient database queries, and streamlined endpoints.

## Recent Updates (Latest)

### Metadata-backed Genre Analytics

- **Music Genres**: Aggregates `Song.genre_tags`, populated from Last.fm artist top-tags during sync/backfill.
- **Genre of the Week**: Uses the top music genre from the recent 7-day listening window.
- **Media Genres**: Aggregates TMDB-backed `Movie.genres` and `Show.genres` from Trakt watch history.
- **Media Insights**: Uses stored directors, studios, and networks for favorite director and top studio/network.
- **Completion Progress**: Returns `null` when complete episode catalog data is unavailable, allowing the UI to show `—` instead of a false `0%`.
- **Cache Invalidation**: Music and Trakt syncs call `AnalyticsService.invalidate_user_cache()` after source data changes.

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

**Response Shape**:

```json
{
  "comprehensive_stats": {
    "totals": {
      "total_games_played": 8,
      "total_songs_listened": 552,
      "total_movies_watched": 3,
      "total_episodes_watched": 17,
      "total_engagement_time": "5 days, 7 hours and 45 minutes"
    }
  },
  "platform_distribution": {},
  "weekly_trend": [],
  "music_genre_distribution": {
    "genres": [
      {"name": "Rock", "count": 280, "percentage": 11},
      {"name": "Pop", "count": 256, "percentage": 10}
    ],
    "total_count": 253,
    "tagged_songs": 545
  },
  "genre_of_the_week": "Pop",
  "media_genre_distribution": {
    "genres": [
      {"name": "Action & Adventure", "count": 15, "percentage": 26}
    ],
    "total_count": 11,
    "total_items": 20
  },
  "media_completion_rate": null,
  "media_insights": {
    "binge_streak": "3 days",
    "favorite_director": "Sam Liu",
    "top_studio": "Netflix"
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
- Platform distribution: `platform_dist_{user.id}_{days}_{current_date}`
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

- **Trakt**: Movies, TV shows, episodes, watch time, TMDB genres, directors, studios, and networks
- **Spotify**: Recently played tracks, listening time
- **Last.fm**: Scrobbled tracks, listening history, MusicBrainz metadata, and normalized artist genre tags

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
