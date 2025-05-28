# NowPlaying

## What is it about?

NowPlaying is a comprehensive portfolio project designed to showcase your latest entertainment activities across multiple platforms. The application features JWT-based authentication and provides a centralized dashboard to track:

- **Gaming Activity**: Latest games you've played, time spent, achievements earned, and trophies collected across multiple platforms
- **Movie & TV Shows**: Movies and shows you've watched with detailed progress tracking
- **Music**: Songs you've listened to with scrobbling data and listening history

The application includes user authentication, profile management, and integrated API key configuration for seamless service connectivity.

## Recent Updates & Fixes

### Xbox Achievement Tracking Fix (Latest)

- **Issue**: Xbox games were not appearing in the "Most Achieved 🏆" section despite having high achievement percentages
- **Root Cause**: TypeScript type guard logic incorrectly identified Xbox games as PSN games, causing wrong calculation methods
- **Solution**:
  - Fixed `isPsnGame()` type guard to specifically check for trophy object structure
  - Enhanced `isXboxGame()` type guard with proper platform string validation
  - Updated `calculateAchievementPercentage()` function to handle all game types (Steam, PSN, Xbox, RetroAchievements)
  - Fixed import conflicts between `utils.ts` and `typeGuards.ts`
- **Result**: Xbox games now properly appear in Most Achieved section with correct percentage calculations

### Enhanced Multi-Platform Gaming Support

- **Full Xbox Integration**: Achievement tracking across Xbox One, Series X/S, 360, and PC platforms
- **Unified Achievement Calculation**: Consistent percentage calculations across all gaming platforms
- **Platform-Specific Type Guards**: Robust TypeScript discrimination for different game data structures
- **Improved Error Handling**: Better debugging and error detection for gaming data processing

## Supported Apps

### Games

- **Steam**: ✅ Supported - Full integration with game library, achievements, and playtime tracking
- **PlayStation**: ✅ Supported - Complete trophy system with platinum, gold, silver, and bronze tracking
  - ⚠️ Manual cookie manipulation required for the npsso token
- **Xbox**: ✅ Supported - Achievement tracking across Xbox One, Series X/S, 360, and PC platforms
  - ⚠️ Account required from [OpenXBL](https://xbl.io/)
- **Nintendo**: ❌ Not supported
- **RetroAchievements**: ✅ Supported - Comprehensive support for classic consoles including PS1, PS2, Nintendo DS, Game Boy Color/Advance, and more

### Movies & TV Shows

- **Trakt**: ✅ Supported - Complete integration for both movies and TV shows with detailed watch history
  - ⚠️ No direct streaming platform integrations are available

### Music

- **Spotify**: ✅ Supported - Recently played tracks with enhanced metadata
- **Last.fm**: ✅ Supported - Music scrobbling with MusicBrainz integration, loved tracks, and listening history
- **Apple Music**: ❌ Not supported
- **YouTube Music**: ❌ Not supported

## Key Features

### Authentication & Security

- **JWT-based Authentication**: Secure login/registration system with automatic token refresh
- **Protected Routes**: All application features require authentication
- **User Profile Management**: Comprehensive account settings and service configuration

### Gaming Dashboard

- **Multi-Platform Support**: Unified view across Steam, PlayStation, Xbox, and RetroAchievements
- **Platform-Specific Features**:
  - PlayStation trophy system with visual trophy indicators
  - Steam achievement tracking with detailed statistics
  - Xbox achievement support across all Xbox platforms
  - RetroAchievements for classic console gaming
- **Smart Organization**: Games sorted by recent activity, total playtime, and achievement completion
- **Visual Platform Recognition**: Automatic platform detection with appropriate icons and branding

### API Key Management

- **Integrated Service Configuration**: Manage all API keys from within the application
- **Visual Service Status**: Clear indicators for connected vs. disconnected services
- **Secure Storage**: Server-side API key management with masked display
- **Platform-Specific Setup**: Guided configuration for each supported service

## Project Structure

- **API**: Django-based backend with JWT authentication, user management, and multi-platform API integrations
- **UI**: React-based frontend built with TypeScript, Vite, and Material-UI featuring modern authentication and responsive design

## Setup and Configuration

### API Configuration

To set up the required API integrations for this project, refer to the [API Configuration Guide](./API/README.md).

### UI Configuration

To set up the UI for this project, refer to the [UI Configuration Guide](./UI/README.md).

## Authentication Flow

1. **Registration/Login**: Users create accounts or log in through the unified authentication page
2. **Profile Setup**: Configure API keys for desired services through the integrated profile management
3. **Dashboard Access**: Access comprehensive dashboards for gaming, movies, and music
4. **Data Synchronization**: Automatic data fetching and updates from configured services

## Technology Stack

### Backend (API)

- **Django**: Web framework with REST API capabilities
- **Django REST Framework**: API development with JWT authentication
- **Multi-Platform Integrations**: Steam, PlayStation, Xbox, Trakt, Spotify, Last.fm APIs

### Frontend (UI)

- **React 18**: Modern UI components and state management
- **TypeScript**: Type safety and enhanced developer experience
- **Material-UI**: Responsive design system
- **JWT Authentication**: Secure token-based authentication
- **React Router**: Protected routing system

## Changelog

### Version 1.1.0 - Gaming Platform Fixes & Enhancements

#### 🎮 Xbox Games Most Achieved Fix (Critical)

- **Fixed**: Xbox games now properly appear in "Most Achieved 🏆" section
- **Resolved**: Type guard logic that incorrectly identified Xbox games as PSN games
- **Enhanced**: `calculateAchievementPercentage()` function to handle all platform types
- **Improved**: Platform detection with robust TypeScript type guards

#### 🔧 Technical Improvements

- **Modularized**: Type guard functions separated into dedicated `typeGuards.ts`
- **Fixed**: Import conflicts between utility modules in `gameCard.tsx` and other components
- **Enhanced**: Error handling and debugging capabilities for gaming data
- **Added**: Comprehensive logging for troubleshooting achievement calculations

#### 🎯 Achievement Calculation Overhaul

- **Steam**: Simple percentage based on unlocked/total achievements
- **PlayStation**: Weighted trophy scoring system (Platinum: 300pts, Gold: 90pts, Silver: 30pts, Bronze: 15pts)
- **Xbox**: Direct percentage calculation with proper type detection
- **RetroAchievements**: Standard percentage calculation

#### 🛠️ Developer Experience

- **Improved**: TypeScript type safety across gaming utilities
- **Added**: Debug logging for game processing pipeline (now removed in production)
- **Enhanced**: Code organization and separation of concerns
- **Fixed**: Hot module reload issues with TypeScript changes
- **Cleaned**: Removed duplicate functions and debug logs from production code

### Version 1.0.0 - Initial Release

- **Multi-Platform Gaming**: Steam, PlayStation, Xbox, RetroAchievements support
- **Entertainment Tracking**: Trakt integration for movies and TV shows
- **Music Integration**: Spotify and Last.fm scrobbling
- **JWT Authentication**: Secure user authentication and API key management
- **Responsive UI**: Modern React-based frontend with Material-UI

## Deployment

The project includes Docker configuration for easy deployment using Docker Compose with both development and production configurations.
