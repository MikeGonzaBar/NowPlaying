# NowPlaying UI

This folder contains the frontend user interface for the **NowPlaying** project. The UI is built using **React**, **TypeScript**, and **Vite**, with Material-UI for styling. The application features JWT-based authentication and provides a comprehensive dashboard for tracking your gaming, movie, and music activities.

## Recent Updates & Improvements

### Xbox Games Most Achieved Fix (Latest)

- **Issue Resolved**: Xbox games were not appearing in the "Most Achieved 🏆" section despite having high achievement percentages
- **Technical Fix**:
  - Updated `calculateAchievementPercentage()` in `utils/utils.ts` to support all game types (Steam, PSN, Xbox, RetroAchievements)
  - Fixed TypeScript type guards in `utils/typeGuards.ts` to properly discriminate between game platforms
  - Resolved import conflicts between utility modules
  - Enhanced Xbox game detection with proper platform string validation

### Enhanced Gaming Dashboard

- **Multi-Platform Achievement Calculation**: Unified achievement percentage calculation across all gaming platforms
- **Robust Type Safety**: Improved TypeScript type guards for better platform detection
- **Better Error Handling**: Enhanced debugging capabilities for gaming data processing
- **Platform-Specific Logic**: Dedicated calculation methods for each gaming platform's unique data structure

### Code Architecture Improvements

- **Modular Type Guards**: Separated type guard logic into dedicated `typeGuards.ts` module
- **Function Separation**: Clean separation between utility functions and type discrimination
- **Import Organization**: Resolved circular dependencies and import conflicts
- **Debug Capabilities**: Added comprehensive logging for troubleshooting gaming data issues

## Prerequisites

Before running the UI, ensure you have the following installed:

- Node.js 18 or higher
- npm or yarn package manager

## Installation

1. Navigate to the `now-playing-ui` folder:

   ```bash
   cd UI/now-playing-ui
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

## Environment Variables

The UI relies on a `.env` file for configuration. Create a `.env` file in the `now-playing-ui` folder and add the following variables:

```env
VITE_REACT_APP_NEWS_API_KEY=<your_news_api_key>
VITE_REACT_APP_TMDB_API_KEY=<your_tmdb_api_key>
VITE_REACT_APP_SPOTIFY_API_KEY=<your_spotify_api_key>
```

- **NewsAPI**: Used to fetch news articles related to games. Get your API key from [NewsAPI](https://newsapi.org/).
- **TMDB**: Used for movie and TV show metadata and images. Get your API key from [The Movie Database](https://www.themoviedb.org/documentation/api).
- **Spotify**: Used to fetch recently played music. Get your API key from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).

## Running the UI

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open the application in your browser at [http://localhost:5173](http://localhost:5173).

## Building for Production

To build the UI for production, run:

```bash
npm run build
```

The production-ready files will be available in the `dist` folder.

## Docker Deployment

The UI includes Docker configuration for easy deployment:

```bash
docker build -t now-playing-ui .
docker run -p 8080:80 now-playing-ui
```

Or use the root docker-compose.yml file to deploy the entire application.

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
│   │   └── ProtectedRoute.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useApi.ts      # API request management
│   │   └── useAuth.ts     # Authentication state management
│   ├── pages/             # Page components
│   │   ├── auth/          # Authentication pages
│   │   │   └── AuthPage.tsx
│   │   ├── profile/       # User profile and settings
│   │   │   └── ProfilePage.tsx
│   │   ├── games/         # Games-related pages
│   │   │   ├── components/
│   │   │   │   ├── GameCard.tsx    # Individual game card component
│   │   │   │   ├── GameSection.tsx # Game section wrapper
│   │   │   │   ├── TrophyStats.tsx # PlayStation trophy statistics
│   │   │   │   └── TrophyIcon.tsx  # Trophy icon component
│   │   │   ├── hooks/
│   │   │   │   └── useGameData.ts  # Gaming data management hook
│   │   │   ├── utils/
│   │   │   │   ├── types.ts        # TypeScript interfaces for game data
│   │   │   │   ├── typeGuards.ts   # Platform detection type guards (improved)
│   │   │   │   └── utils.ts        # Utility functions including enhanced calculateAchievementPercentage
│   │   │   └── pages/
│   │   │       └── games.tsx       # Main games dashboard page
│   │   ├── movies/        # Movies-related pages
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── music/         # Music-related pages
│   ├── services/          # API service layer
│   │   └── api.ts
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

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

## Features

### Profile Management

The profile page (`/profile`) provides comprehensive account and service management:

#### User Information

- Display username, email, and user ID
- Account creation and last login timestamps

#### API Key Management

Integrated service configuration with platform-specific icons and validation:

**Gaming Services:**

- **Steam**: Game library, achievements, and playtime tracking
- **PlayStation Network**: Trophy data and game progress
- **Xbox**: Achievement data and game library (via OpenXBL)
- **RetroAchievements**: Classic console achievements

**Entertainment Services:**

- **Trakt**: Movie and TV show tracking
- **Last.fm**: Music scrobbling and listening history

**Features:**

- Visual service status (Connected/Not Connected)
- Secure API key storage with masked display
- One-click service deletion with confirmation
- Platform-specific setup instructions

### Games

Enhanced gaming dashboard with comprehensive multi-platform support and unified achievement tracking:

#### Platform Support

- **Steam**: Full integration with detailed achievement data and playtime tracking
- **PlayStation Network**: Trophy system with platinum, gold, silver, bronze tracking and weighted scoring
- **Xbox**: Complete achievement tracking across Xbox One, Series X/S, 360, and PC platforms with proper Most Achieved integration
- **RetroAchievements**: Support for classic consoles including PS1, PS2, Nintendo DS, Game Boy Color/Advance

#### Features

- **Now Playing**: Recently played games sorted by last activity across all platforms
- **Most Played**: Games ranked by total playtime with platform-specific formatting
- **Most Achieved**: Games with highest achievement completion percentage - **now fully supports Xbox games**
- **Platform Recognition**: Automatic platform detection with appropriate icons and branding
- **Achievement Calculation**: Platform-specific calculation methods:
  - Steam: Simple percentage based on unlocked/total achievements
  - PlayStation: Weighted trophy scoring (Platinum: 300pts, Gold: 90pts, Silver: 30pts, Bronze: 15pts)
  - Xbox: Direct percentage calculation with proper game type detection
  - RetroAchievements: Standard percentage calculation
- **Playtime Tracking**: Formatted playtime display with platform-appropriate formatting
- **Missing Service Alerts**: Notifications for unconfigured API keys with setup guidance

#### Technical Improvements

- **Type-Safe Game Detection**: Robust TypeScript type guards for accurate platform identification
- **Unified Data Processing**: Single calculation function handling all platform types
- **Error Prevention**: Comprehensive validation to prevent miscategorization of games
- **Debug Support**: Built-in logging for troubleshooting achievement calculation issues

#### Game Cards

Each game card displays:

- Game cover art and name with proper truncation
- Platform-specific icons (Steam, PlayStation, Xbox, RetroAchievements, classic consoles)
- Last played date with consistent formatting
- Total playtime with platform-appropriate time formatting
- Achievement/trophy progress with platform-appropriate visualization:
  - PlayStation: Individual trophy type counts with colored icons
  - Xbox/Steam/RetroAchievements: Simple unlocked/total count with trophy icon

### Movies & Shows

- Displays recently watched movies and TV shows using Trakt integration
- Shows detailed information including:
  - Release dates
  - Ratings
  - Genres
  - Production companies
  - Watch history
  - Episode progress for TV shows
- YouTube trailer integration
- Chronological episode sorting

### Music

- Displays recently played songs from Spotify and Last.fm
- Enhanced music data with MusicBrainz integration
- Multiple image sizes for album artwork
- Loved track indicators
- Source tracking (Spotify/Last.fm)

## Technology Stack

- **React 18**: For UI components and state management
- **TypeScript**: For type safety and better developer experience
- **Material UI (MUI)**: For modern, responsive UI components
- **React Router**: For application routing and protected routes
- **Vite**: For fast development and optimized builds
- **JWT**: For secure authentication and authorization

## API Integration

The UI connects to a Django backend API with JWT authentication. Each feature has dedicated endpoints:

### Authentication

- `POST /users/login/`: User login
- `POST /users/register/`: User registration  
- `POST /users/token/refresh/`: Token refresh

### Profile & API Keys

- `GET /users/api-keys/`: Fetch user's API keys
- `POST /users/api-keys/`: Add new API key
- `DELETE /users/api-keys/{id}/`: Delete API key
- `GET /users/api-keys/services/`: Get configured services

### Games

- `GET /steam/get-game-list-stored/`: Steam games library
- `GET /psn/get-game-list-stored/`: PlayStation games
- `GET /xbox/get-game-list-stored/`: Xbox games
- `GET /retroachievements/fetch-games/`: RetroAchievements games
- Refresh endpoints for real-time data updates

### Movies & Shows

- `GET /trakt/get-stored-movies/`: Watched movies
- `GET /trakt/get-stored-shows/`: Watched TV shows

### Music

- `GET /music/fetch-lastfm-recent/`: Last.fm recent tracks
- `GET /spotify/get-recently-played/`: Spotify recent tracks

## Development

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

### Security Features

- **JWT token validation**: Automatic token refresh and validation
- **Protected routes**: Authentication required for all main features
- **Secure API calls**: Automatic authentication headers
- **Input validation**: Client-side form validation with server validation

## Scripts

- `npm run dev`: Starts the development server
- `npm run build`: Builds the project for production
- `npm run lint`: Lints the codebase
- `npm run preview`: Preview production build locally

## Deployment Notes

### Environment Configuration

- Ensure all required environment variables are set
- Configure backend API URL for production deployment
- Set up proper CORS configuration for cross-origin requests

### Security Considerations

- JWT tokens are stored in localStorage (consider httpOnly cookies for production)
- API keys are managed server-side for security
- All API requests include proper authentication headers

## License

This project is for personal/portfolio use only and is not intended for commercial purposes.

## Troubleshooting

### Gaming Dashboard Issues

#### Xbox Games Not Appearing in Most Achieved

**Symptoms**: Xbox games visible in library but missing from "Most Achieved 🏆" section
**Solution**: This issue has been resolved in the latest update. If you still experience this:

1. Check browser console for error messages
2. Verify Xbox API key is properly configured in Profile settings
3. Ensure Xbox games have achievement data (unlocked_achievements and total_achievements fields)
4. Hard refresh browser (Ctrl+F5) to clear any cached code

#### Achievement Percentage Calculation Issues

**Symptoms**: Incorrect achievement percentages or games showing 0%
**Debugging Steps**:

1. Open browser Developer Tools (F12)
2. Check Console tab for debug logs showing game processing
3. Look for logs like "Processing Xbox game: [GameName]" or "XBOX: [GameName] = [percentage]%"
4. Verify game data structure matches expected platform format

#### Platform Detection Problems

**Symptoms**: Games showing wrong platform icons or not being categorized correctly
**Solution**:

1. Check that game data includes correct platform identifiers
2. Xbox games should have `platform` field containing "XboxOne", "XboxSeries", "Xbox360", or "PC"
3. PlayStation games should have trophy object structure with bronze/silver/gold/platinum properties
4. Steam games should not have `platform` field and include `unlocked_achievements_count`

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
