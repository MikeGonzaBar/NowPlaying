# Epic Games Store Integration

This document provides comprehensive documentation for the **Epic Games Store** integration for fetching and managing your Epic Games library.

## Overview

The Epic service allows you to:

- **Game Library**: Fetch and store your complete Epic Games library with game metadata
- **Achievement Tracking**: Monitor achievement progress across Epic games
- **Playtime Analytics**: Track total playtime and gaming habits
- **Cumulative Playtime**: Epic reports lifetime/accumulated playtime, not per-window playtime

## Setup & Authentication

### 1. Get Epic API Credentials

Epic uses OAuth2 authentication. There's no traditional API key:

- Connect your Epic account through the NowPlaying UI profile settings
- The system will initiate an OAuth flow with Epic's authorization server
- After authorization, tokens are stored encrypted in the database

### 2. Store Epic Credentials

The OAuth flow handles token storage automatically. No manual credential setup required.

## API Endpoints

### 1. Fetch Epic Game List

**Endpoint**: `GET /epic/get-game-list/`

**Description**: Fetches your complete Epic Games library with achievements from the Epic API and stores it in the database.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    "http://localhost:8000/epic/get-game-list/"
```

**Response**:

```json
{
    "result": "Games and achievements fetched and stored successfully"
}
```

### 2. Get Stored Games

**Endpoint**: `GET /epic/get-game-list-stored/

**Description**: Retrieves all stored Epic games from the database, sorted by last played date.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    "http://localhost:8000/epic/get-game-list-stored/"
```

**Response**: Array of stored Epic games with achievement progress and playtime data

### 3. Get Most Achieved Games

**Endpoint**: `GET /epic/get-game-list-most-achieved/

**Description**: Lists stored Epic games sorted by achievement completion percentage.

**Authentication**: Required (JWT Token)

**Example Request**:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    "http://localhost:8000/epic/get-game-list-most-achieved/"
```

## Key Features

### Achievement Tracking

- Epic uses a weighted trophy scoring system similar to PlayStation
- Platinum trophies worth the most points, followed by Gold, Silver, and Bronze
- Overall "most achieved" section ranks games by total achievement points

### Playtime Reporting

- **Important**: Epic only exposes cumulative launcher total playtime
- Unlike Steam or PlayStation, Epic does not provide per-session/per-window playtime
- Playtime is reported as a lifetime figure for each game

### Data Structure

- Games are identified by their Epic namespace/ID
- Achievement progress is calculated as percentage of total achievements unlocked
- Playtime is stored as a cumulative total (minutes/hours)

## Error Handling

| Error | Cause | Solution |
| ------- | ------- | ---------- |
| `No Epic token found` | User not authenticated | Connect Epic account in profile settings |
| `Epic API error` | API request failed | Check network connectivity, retry later |
| `Private profile` | Epic profile is private | Set Epic profile to public for API access |
| `OAuth flow failed` | Authorization code expired | Re-initiate Epic connection |

## Rate Limits

- **Epic API**: Varies by endpoint; generally generous for library data
- **Recommendation**: System caches results for a week to minimize API calls
- **Large Libraries**: Users with 500+ games may experience longer initial sync times

## Integration Notes

- **OAuth2 Flow**: Standard authorization code flow with automatic token refresh
- **Data Persistence**: All Epic data stored in database, persists across sessions
- **Achievement Calculations**: Weighted scoring system for "most achieved" rankings
- **Playtime**: Cumulative total only - no per-window tracking available

## Admin Interface

The Django admin provides enhanced management:

- Visual thumbnails and game covers
- Achievement progress tracking per game
- Playtime analytics and sorting
- User isolation: data isolated per authenticated user

## Backfill Commands

```bash
# No specific backfill command needed - data syncs on demand
```

The system will automatically sync your Epic library when you trigger the endpoint or when connected through the UI.

---

**See also**: [NowPlaying API Documentation](./README.md) for overall project setup and authentication details.
