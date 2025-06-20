# NowPlaying UI

This folder contains the frontend user interface for the **NowPlaying** project, built with **React**, **TypeScript**, and **Vite**, with Material-UI for styling. The application provides a comprehensive dashboard for tracking your gaming, movie, and music activities across multiple platforms with advanced search functionality.

> **Note**: For the complete project overview, features, and screenshots, see the [main README](../README.md).

## Recent Features

### Advanced Search Functionality (Latest)

- **Cross-Platform Game Search**: Real-time search across Steam, PlayStation, Xbox, and RetroAchievements
  - **Autocomplete Interface**: Shows game title, platform, and cover image in search suggestions
  - **Debounced Search**: Optimized API calls with intelligent input handling to reduce server load
  - **Seamless Navigation**: Direct navigation to game details page with full game data context
  - **Platform Recognition**: Visual platform indicators in search results for easy identification
  - **Loading States**: Visual feedback during search operations with skeleton loading

- **Movie & Show Search**: Comprehensive search across Trakt movies and TV shows
  - **TMDB Integration**: Automatic poster image fetching for rich visual search results
  - **Dual Platform Search**: Searches both movies and shows simultaneously from single input
  - **Rich Metadata**: Displays title, year, and poster in search suggestions
  - **Smart Navigation**: Routes to appropriate details page (movie or show) based on media type
  - **Complete Data Fetching**: Ensures full data is loaded when navigating to details page

- **Enhanced User Experience**:
  - **Error Handling**: Graceful handling of API failures and network issues
  - **Responsive Design**: Mobile-friendly search interface that works across all devices
  - **Keyboard Navigation**: Full keyboard support for accessibility (arrow keys, enter, escape)
  - **Performance Optimization**: Debounced input with configurable delay to prevent excessive API calls

### Xbox Games Most Achieved Fix

- **Issue Resolved**: Xbox games were not appearing in the "Most Achieved 🏆" section despite having high achievement percentages
- **Technical Fix**:
  - Updated `calculateAchievementPercentage()` in `utils/utils.ts` to support all game types (Steam, PSN, Xbox, RetroAchievements)
  - Fixed TypeScript type guards in `utils/typeGuards.ts` to properly discriminate between game platforms
  - Resolved import conflicts between utility modules
  - Enhanced Xbox game detection with proper platform string validation

## Project Overview

The NowPlaying UI is a modern React application that provides:

- **JWT Authentication**: Secure login/registration with automatic token refresh
- **Multi-Platform Gaming**: Steam, PlayStation, Xbox, and RetroAchievements integration
- **Entertainment Tracking**: Trakt integration for movies and TV shows
- **Music Integration**: Spotify and Last.fm scrobbling
- **Advanced Search**: Cross-platform search functionality across all entertainment categories
- **Responsive Design**: Mobile-friendly interface using Material-UI

## Technology Stack

- **React 18**: Modern UI components and state management
- **TypeScript**: Type safety and enhanced developer experience
- **Vite**: Fast development and optimized builds
- **Material-UI (MUI)**: Responsive design system
- **React Router**: Protected routing system
- **JWT Authentication**: Secure token-based authentication

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Installation

1. Navigate to the `now-playing-ui` folder:

   ```bash
   cd UI/now-playing-ui
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

3. Create environment variables file:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`

### Environment Variables

Create a `.env` file with the following variables:

```env
VITE_REACT_APP_NEWS_API_KEY=<your_news_api_key>
VITE_REACT_APP_TMDB_API_KEY=<your_tmdb_api_key>
VITE_REACT_APP_SPOTIFY_API_KEY=<your_spotify_api_key>
```

- **NewsAPI**: Used to fetch news articles related to games. Get your API key from [NewsAPI](https://newsapi.org/).
- **TMDB**: Used for movie and TV show metadata and images. Get your API key from [The Movie Database](https://www.themoviedb.org/documentation/api).
- **Spotify**: Used to fetch recently played music. Get your API key from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).

### Running the UI

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open the application in your browser at [http://localhost:5173](http://localhost:5173).

## Project Structure

The project follows a feature-based organization with authentication and protected routes:

```plaintext
now-playing-ui/
├── public/                 # Static assets
│   ├── Platforms/         # Platform icons (Steam, PSN, Xbox, etc.)
│   └── PSN_Trophies/      # PlayStation trophy icons
├── src/                    # Source code
│   ├── components/         # Reusable components
│   │   ├── sideBar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── GameSearch.tsx  # Cross-platform game search with autocomplete
│   │   └── MovieShowSearch.tsx # Movie and show search with TMDB integration
│   ├── hooks/             # Custom React hooks
│   │   ├── useApi.ts      # API request management
│   │   └── useAuth.ts     # Authentication state management
│   ├── pages/             # Page components
│   │   ├── auth/          # Authentication pages
│   │   ├── profile/       # User profile and settings
│   │   ├── games/         # Games-related pages
│   │   ├── movies/        # Movies-related pages
│   │   └── music/         # Music-related pages
│   ├── services/          # API service layer
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── .env                   # Environment variables
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## Key Components

### Search Components

- **GameSearch**: Cross-platform game search with autocomplete
- **MovieShowSearch**: Movie and show search with TMDB integration

### Gaming Components

- **GameCard**: Individual game display with platform-specific styling
- **GameSection**: Container for organizing games into sections
- **TrophyStats**: PlayStation trophy visualization
- **TrophyIcon**: Reusable trophy/achievement icons

### Media Components

- **MediaCard**: Movie and TV show display
- **MediaCardSections**: Container for media organization
- **MediaInfoSections**: Detailed media information display

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run lint`: Lint the codebase
- `npm run preview`: Preview production build

### Component Architecture

- **Feature-based organization**: Components grouped by functionality
- **Reusable components**: Shared UI elements in `/components`
- **Custom hooks**: Business logic extracted into reusable hooks
- **Type safety**: Comprehensive TypeScript interfaces for all data structures
- **Responsive design**: Mobile-friendly layouts using MUI's responsive system

### State Management

- **React Context**: For authentication state
- **Custom hooks**: For feature-specific state (games, music, etc.)
- **Local storage**: For JWT token persistence
- **Error handling**: Comprehensive error boundaries and user feedback

## Authentication System

The application implements JWT-based authentication with the following features:

- **Login/Registration**: Unified authentication page with form validation
- **Token Management**: Automatic access token refresh using refresh tokens
- **Protected Routes**: All main application routes require authentication
- **Auto-redirect**: Unauthenticated users are redirected to `/auth`
- **Logout**: Secure token cleanup and redirect to login

### Authentication Flow

1. Users access the app and are redirected to `/auth` if not authenticated
2. Login/registration forms validate credentials against Django backend
3. Successful authentication stores JWT tokens in localStorage
4. Protected routes check token validity and auto-refresh when needed
5. API requests include authentication headers automatically

## API Integration

The UI connects to a Django backend API with JWT authentication. Key endpoints:

### Authentication

- `POST /users/login/`: User login
- `POST /users/register/`: User registration  
- `POST /users/token/refresh/`: Token refresh

### Games

- `GET /games/search/`: **Cross-platform game search** (Steam, PlayStation, Xbox, RetroAchievements)
- `GET /steam/get-game-list-stored/`: Steam games library
- `GET /psn/get-game-list-stored/`: PlayStation games
- `GET /xbox/get-game-list-stored/`: Xbox games
- `GET /retroachievements/fetch-games/`: RetroAchievements games

### Movies & Shows

- `GET /trakt/search/`: **Movie and show search** with TMDB poster integration
- `GET /trakt/get-stored-movies/`: Watched movies
- `GET /trakt/get-stored-shows/`: Watched TV shows

### Music

- `GET /music/fetch-lastfm-recent/`: Last.fm recent tracks
- `GET /spotify/get-recently-played/`: Spotify recent tracks

## Features

### Advanced Search System

- **Cross-Platform Game Search**: Real-time search across Steam, PlayStation, Xbox, and RetroAchievements
- **Movie & Show Search**: Unified search for Trakt movies and TV shows with TMDB integration
- **Smart Navigation**: Direct routing to appropriate detail pages
- **Debounced API Calls**: Optimized performance with intelligent request throttling
- **Platform Recognition**: Visual indicators for different platforms and media types

### Gaming Dashboard

- **Multi-Platform Support**: Unified view across all gaming platforms
- **Achievement Tracking**: Platform-specific achievement/trophy visualization
- **Playtime Analytics**: Formatted playtime display with platform recognition
- **Recent Activity**: Games sorted by last played across all platforms

### Entertainment Tracking

- **Movie Integration**: Trakt integration with TMDB poster fetching
- **TV Show Tracking**: Episode progress and season tracking
- **YouTube Integration**: Automatic trailer display
- **Rich Metadata**: Comprehensive movie and show information

### Music Dashboard

- **Multi-Service Integration**: Spotify and Last.fm support
- **Enhanced Metadata**: MusicBrainz integration for rich music data
- **Visual Display**: Album artwork with multiple image sizes
- **Scrobbling History**: Complete listening history tracking

## Deployment

### Production Build

```bash
npm run build
```

The production-ready files will be available in the `dist` folder.

### Docker Deployment

The UI includes Docker configuration for easy deployment:

```bash
docker build -t now-playing-ui .
docker run -p 8080:80 now-playing-ui
```

Or use the root docker-compose.yml file to deploy the entire application.

## Troubleshooting

### Development Issues

#### TypeScript Import Errors

**Symptoms**: "The requested module does not provide an export named..."
**Solution**:

1. Ensure all imports are pointing to correct files
2. Check that `isPsnGame`, `isXboxGame`, etc. are imported from `typeGuards.ts`, not `utils.ts`
3. Restart development server: `npm run dev`
4. Clear browser cache

#### Hot Module Reload Not Working

**Symptoms**: Changes to TypeScript files not reflecting in browser
**Solution**:

1. Restart Vite development server
2. Clear browser cache and localStorage
3. Check for TypeScript compilation errors in terminal

### Gaming Dashboard Issues

#### Xbox Games Not Appearing in Most Achieved

**Symptoms**: Xbox games visible in library but missing from "Most Achieved 🏆" section
**Solution**: This issue has been resolved in the latest update. If you still experience this:

1. Check browser console for error messages
2. Verify Xbox API key is properly configured in Profile settings
3. Ensure Xbox games have achievement data (unlocked_achievements and total_achievements fields)
4. Hard refresh browser (Ctrl+F5) to clear any cached code

## Documentation

For detailed documentation on specific features:

- **[Games Documentation](./now-playing-ui/src/pages/games/README.md)**: Gaming dashboard and search functionality
- **[Movies Documentation](./now-playing-ui/src/pages/movies/README.md)**: Movies and shows with search
- **[API Documentation](../API/README.md)**: Backend API setup and configuration
- **[Main Project README](../README.md)**: Complete project overview and features

## Contributing

1. Follow the existing code style and TypeScript conventions
2. Ensure all new features include proper error handling
3. Add appropriate loading states for user feedback
4. Test cross-platform compatibility
5. Update documentation for new features

## License

This project is for personal/portfolio use only and is not intended for commercial purposes.
