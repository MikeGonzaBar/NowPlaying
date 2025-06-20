# Games Feature Documentation

This folder contains the comprehensive gaming dashboard for the NowPlaying application, supporting multiple gaming platforms with platform-specific features, unified data display, and **advanced search functionality**.

## Supported Platforms

### Steam

- **Full Integration**: Complete game library with achievements and playtime
- **Achievement Tracking**: Detailed achievement progress with unlock timestamps
- **Rich Metadata**: Game icons, descriptions, and content descriptors
- **Playtime Analytics**: Forever playtime and recent activity tracking

### PlayStation Network (PSN)

- **Trophy System**: Complete trophy tracking with Bronze, Silver, Gold, and Platinum trophies
- **Visual Trophy Display**: Platform-specific trophy icons with grayscale for unearned trophies
- **Multi-Platform Support**: PS4 and PS5 game tracking
- **Weighted Scoring**: Trophy-based achievement scoring system

### Xbox Live

- **Achievement System**: Gamerscore and achievement tracking across all Xbox platforms
- **Multi-Platform Coverage**: Xbox One, Series X/S, Xbox 360, and PC gaming
- **Comprehensive Data**: Achievement values, unlock times, and progress tracking
- **Cross-Platform Games**: Support for games spanning multiple Xbox ecosystems

### RetroAchievements

- **Classic Gaming**: Achievement tracking for retro and classic consoles
- **Multi-Console Support**: PS1, PS2, Nintendo DS, Game Boy Color/Advance, and more
- **Community Features**: Points-based achievement system with TrueRatio scoring
- **Detailed Metadata**: Console-specific information and achievement categorization

## Advanced Search Functionality

### Cross-Platform Game Search

The games dashboard now features **real-time search functionality** that searches across all gaming platforms simultaneously:

#### Features

- **Autocomplete Interface**: Shows game title, platform, and cover image in search suggestions
- **Debounced Search**: Optimized API calls with intelligent input handling to reduce server load
- **Seamless Navigation**: Direct navigation to game details page with full game data context
- **Platform Recognition**: Visual platform indicators in search results for easy identification
- **Loading States**: Visual feedback during search operations with skeleton loading
- **Keyboard Navigation**: Full accessibility support (arrow keys, enter, escape)

#### Search Behavior

- **Real-time Suggestions**: Search results update as you type with debounced API calls
- **Cross-Platform Results**: Searches Steam, PlayStation, Xbox, and RetroAchievements simultaneously
- **Rich Metadata**: Each search result displays game title, platform icon, and cover image
- **Smart Filtering**: Results are filtered by game title with case-insensitive matching
- **Error Handling**: Graceful handling of API failures and network issues

#### Technical Implementation

- **Backend Integration**: New `/games/search/` endpoint that queries all gaming platforms
- **Frontend Component**: `GameSearch` component with Material-UI Autocomplete
- **Data Handling**: Proper data structure management for cross-platform compatibility
- **Performance Optimization**: Debounced input with configurable delay (300ms default)

## Components

### Core Components

#### `GameCard.tsx`

Primary component for displaying individual games with platform-specific styling:

**Features:**

- **Responsive Design**: Fixed dimensions with hover effects
- **Platform Detection**: Automatic platform recognition and icon display
- **Achievement Display**: Platform-specific trophy/achievement visualization
- **Playtime Formatting**: Human-readable playtime display
- **Last Played**: Formatted date display with consistent formatting

**Platform-Specific Elements:**

- Steam: Steam logo and achievement count
- PlayStation: Platform-specific logos (PS4/PS5) with trophy breakdown
- Xbox: Xbox logo with achievement progress
- RetroAchievements: Console-specific logos with points display

#### `GameSection.tsx`

Container component for organizing games into categorized sections:

**Features:**

- **Horizontal Scrolling**: Responsive carousel layout
- **Loading States**: Skeleton loading with consistent card dimensions
- **Section Titles**: Clear categorization with emoji indicators
- **Responsive Grid**: Adapts to various screen sizes

#### `TrophyStats.tsx`

Specialized component for PlayStation trophy display:

**Features:**

- **Trophy Icons**: Bronze, Silver, Gold, and Platinum trophy visualization
- **Conditional Display**: Shows only available trophy types
- **Grayscale Effect**: Visual indication for unearned trophies
- **Fallback Support**: Generic achievement display for non-PSN games

#### `TrophyIcon.tsx`

Reusable component for individual trophy/achievement icons:

**Features:**

- **Configurable Display**: Supports both trophy counts and achievement ratios
- **Visual States**: Grayscale and color modes
- **Flexible Sizing**: Consistent icon sizing across components

### Search Components

#### `GameSearch.tsx` (Global Component)

Advanced search component with autocomplete functionality:

**Features:**

- **Material-UI Autocomplete**: Rich autocomplete interface with custom styling
- **Debounced Input**: Optimized API calls with configurable delay
- **Loading States**: Skeleton loading during search operations
- **Error Handling**: Graceful error display and recovery
- **Keyboard Navigation**: Full accessibility support
- **Platform Icons**: Visual platform indicators in search results
- **Cover Images**: Game cover art display in search suggestions

**Props:**

- `onGameSelect`: Callback function when a game is selected
- `placeholder`: Customizable placeholder text
- `debounceDelay`: Configurable debounce delay (default: 300ms)

**API Integration:**

- **Endpoint**: `GET /games/search/?query={searchTerm}`
- **Response Format**: Array of game objects with platform-specific data
- **Error Handling**: Network errors and API failures gracefully handled

### Utility Components

#### `types.ts`

Comprehensive TypeScript interfaces for all gaming platforms:

**Defined Types:**

- `SteamGame`: Steam-specific game data with achievements array
- `PsnGame`: PlayStation game data with trophy breakdown
- `RetroAchievementsGame`: RetroAchievements data with points system
- `XboxGame`: Xbox game data with platform information
- Achievement interfaces for each platform with platform-specific fields

#### `typeGuards.ts`

Type guard functions for platform detection and type safety:

**Functions:**

- `isSteamGame()`: Identifies Steam games by checking for Steam-specific properties
- `isPsnGame()`: Identifies PSN games by platform field presence
- `isRetroAchievementsGame()`: Identifies RetroAchievements by console_name field
- `isXboxGame()`: Identifies Xbox games by platform array matching
- `calculateAchievementPercentage()`: Platform-aware achievement percentage calculation

#### `utils.ts`

Utility functions for data processing and formatting:

**Functions:**

- `formatPlaytime()`: Converts raw playtime data to human-readable format
- `parseDate()`: Handles various date formats from different platforms
- `getPlaytime()`: Extracts playtime data with platform-specific logic
- `calculateAchievementPercentage()`: Cross-platform achievement calculation

### Hooks

#### `useGameData.ts`

Central hook for managing all gaming platform data:

**Features:**

- **Multi-Platform Fetching**: Concurrent data fetching from all platforms
- **Data Merging**: Intelligent merging and sorting of cross-platform data
- **Error Handling**: Comprehensive error states and user feedback
- **Missing Service Detection**: Identifies unconfigured platforms
- **Refresh Functionality**: Manual data refresh with loading states

**Data Categories:**

- **Latest Played**: Recently played games sorted by last activity
- **Most Played**: Games ranked by total playtime across platforms
- **Most Achieved**: Games with highest achievement completion percentage

## Platform Assets

### Platform Icons (`/public/Platforms/`)

High-quality platform icons for visual platform identification:

- `steam.webp`: Steam platform icon
- `playstation.webp`: General PlayStation icon
- `playstation-4.png`: PS4-specific icon
- `playstation-5.webp`: PS5-specific icon
- `playstation-2.png`: PS2 retro console icon
- `xbox.svg`: Xbox platform icon (scalable vector)
- `nintendo-ds.png`: Nintendo DS handheld icon
- `gameboy-color.png`: Game Boy Color icon
- `gameboy-advance.png`: Game Boy Advance icon
- `retroachievements.png`: RetroAchievements community icon

### Trophy Assets (`/public/PSN_Trophies/`)

PlayStation trophy icons for accurate trophy representation:

- `PSN_bronze.png`: Bronze trophy icon
- `PSN_silver.png`: Silver trophy icon
- `PSN_gold.png`: Gold trophy icon
- `PSN_platinum.png`: Platinum trophy icon

## Game Organization

### Data Categorization

**Now Playing 🎮**

- Games sorted by most recent activity across all platforms
- Filters out games with invalid timestamps (Unix epoch)
- Cross-platform unified view

**Most Played ⌛**

- Games ranked by total playtime
- Platform-specific playtime calculation
- Excludes games without playtime data

**Most Achieved 🏆**

- Games sorted by achievement completion percentage
- Platform-aware percentage calculation:
  - Steam: `unlocked_achievements_count / total_achievements`
  - PlayStation: Weighted trophy system (Bronze: 15pts, Silver: 30pts, Gold: 90pts, Platinum: 300pts)
  - Xbox: `unlocked_achievements / total_achievements`
  - RetroAchievements: `unlocked_achievements / total_achievements`

### Missing Service Handling

The dashboard intelligently detects missing API key configurations and provides:

- **Service Alerts**: Visual notifications for unconfigured platforms
- **Configuration Links**: Direct links to profile page for API key setup
- **Service Chips**: Clear indication of which services need configuration
- **Graceful Degradation**: App functions with partial platform configuration

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

## Responsive Design

### Mobile Optimization

- **Horizontal Scrolling**: Touch-friendly game browsing
- **Fixed Card Dimensions**: Consistent layout across devices
- **Responsive Typography**: Scalable text and icons
- **Touch Targets**: Appropriately sized interactive elements

### Desktop Experience

- **Hover Effects**: Subtle scale animations on game cards
- **Efficient Layout**: Optimal use of screen real estate
- **Fast Loading**: Optimized asset loading and caching

## Performance Optimizations

### Data Management

- **Concurrent Fetching**: Parallel API calls for faster loading
- **Error Isolation**: Platform failures don't affect other platforms
- **Loading States**: Skeleton loading during data fetching
- **Caching Strategy**: Efficient data caching and refresh logic

### Component Optimization

- **React.memo**: Memoized components for performance
- **Efficient Re-renders**: Minimized unnecessary component updates
- **Optimized Images**: WebP and PNG optimization for platform icons

## Future Enhancements

### Planned Features

- **Game Details Pages**: Individual game achievement browsing
- **Achievement Comparison**: Cross-platform achievement analytics
- **Gaming Statistics**: Personal gaming insights and trends
- **Social Features**: Achievement sharing and comparison

### Platform Expansions

- **Nintendo Switch**: Potential integration via third-party services
- **Epic Games Store**: PC gaming expansion
- **GOG Galaxy**: DRM-free gaming platform integration

This comprehensive gaming dashboard provides a unified view of your gaming achievements across multiple platforms while respecting each platform's unique characteristics and features.
