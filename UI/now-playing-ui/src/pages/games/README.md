# Games Feature Documentation

This folder contains the comprehensive gaming dashboard for the NowPlaying application, supporting multiple gaming platforms with platform-specific features and unified data display.

## Supported Platforms

### Steam

- **Full Integration**: Complete game library with achievements and playtime
- **Achievement Tracking**: Detailed achievement progress with unlock timestamps
- **Rich Metadata**: Game icons, descriptions, and content descriptors
- **Playtime Analytics**: Forever playtime and recent activity tracking

### PlayStation Network (PSN)

- **Trophy System**: Complete trophy tracking with Bronze, Silver, Gold, and Platinum trophies
- **Multi-Platform Support**: PS4 and PS5 game tracking
- **Weighted Scoring**: Trophy-based achievement scoring system

### Xbox Live

- **Achievement System**: Gamerscore and achievement tracking across all Xbox platforms
- **Multi-Platform Coverage**: Xbox One, Series X/S, Xbox 360, and PC gaming

### RetroAchievements

- **Classic Gaming**: Achievement tracking for retro and classic consoles
- **Community Features**: Points-based achievement system with TrueRatio scoring

## Architecture

### Pages

#### `pages/games.tsx`

Main gaming dashboard: consolidated game sources, latest/top-played rails, platform update controls, and service configuration alerts (including PSN NPSSO reconnect).

#### `pages/allGames.tsx`

Full library table view with sorting and playtime columns.

#### `pages/gameDetails.tsx`

Individual game detail page: playtime metrics, achievements, and cross-platform comparison.

#### `pages/LegacyGameIdRedirect.tsx`

Redirects legacy game-id routes to the canonical detail pages.

### Utilities (`utils/`)

- `types.ts` — shared game type definitions
- `typeGuards.ts` — `isPsnGame` / `isXboxGame` / `isRetroAchievementsGame` / `isSteamGame` type guards (single source)
- `platformHelper.ts` — logo matching (`getPlatformMatch`) and the service display config (`SERVICE_PLATFORM_CONFIG`, single source of platform names/colors)
- `normalize.ts` — title normalization and platform resolution
- `grouping.ts` — consolidates the same game from multiple platform sources
- `utils.ts` — playtime parsing/formatting and achievement percentage calculation

### Components (`components/`)

- `EnhancedTimeMetrics.tsx` — playtime breakdown display
- `GameComparison.tsx` — cross-platform playtime comparison
- `MasterAchievementList.tsx` — achievement browsing
- `PlatformPills.tsx`, `GameContextMetadata.tsx` — presentation details
- `RecentWinsStrip.tsx`, `ActivitySparkline.tsx`, `CircularProgress.tsx` — dashboard visuals

### Hooks

- `hooks/useGameData.ts` — dashboard data fetching (parallel platform calls with error isolation)
- `hooks/useGameDetail.ts` — detail page data loading

## API Integration

### Endpoints

**Data Fetching:**

- `GET /steam/get-game-list-stored/`: Stored Steam games
- `GET /psn/get-game-list-stored/`: Stored PlayStation games
- `GET /xbox/get-game-list-stored/`: Stored Xbox games
- `GET /retroachievements/fetch-games/`: RetroAchievements games

**Analytics Endpoints:**

- `GET /{platform}/get-game-list-total-playtime/`: Playtime-sorted games
- `GET /{platform}/get-game-list-most-achieved/`: Achievement-sorted games

**Refresh Endpoints:**

- `GET /steam/get-game-list/`: Refresh Steam data
- `GET /psn/get-game-list/`: Refresh PlayStation data
- `GET /xbox/get-game-list/`: Refresh Xbox data
- `GET /retroachievements/fetch-recently-played-games/`: Refresh RetroAchievements

**Service Management:**

- `GET /users/api-keys/services/`: Check configured services

## Missing Service Handling

The dashboard intelligently detects missing API key configurations and provides:

- **Service Alerts**: Visual notifications for unconfigured platforms
- **Configuration Links**: Direct links to profile page for API key setup
- **Graceful Degradation**: App functions with partial platform configuration

## Performance Optimizations

- **Concurrent Fetching**: Parallel API calls for faster loading
- **Error Isolation**: Platform failures don't affect other platforms
- **Caching Strategy**: Server-side cache with versioned invalidation per user
- **React.memo / useMemo**: Memoized components and derived data
