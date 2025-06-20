# Movies & Shows Feature Documentation

This folder contains the comprehensive entertainment dashboard for the NowPlaying application, supporting Trakt integration for movies and TV shows with **advanced search functionality** and detailed media tracking.

## Supported Platforms

### Trakt

- **OAuth2 Authentication**: Secure token-based authentication with automatic refresh
- **Movie Integration**: Complete movie tracking with watch history, ratings, and metadata
- **TV Show Integration**: Episode tracking, season progress, and detailed show information
- **TMDB Integration**: Automatic poster image fetching for rich visual display
- **YouTube Integration**: Automatic trailer integration for movies and shows

## Advanced Search Functionality

### Cross-Platform Media Search

The movies and shows dashboard features **real-time search functionality** that searches across both movies and TV shows simultaneously:

#### Features

- **Dual Platform Search**: Searches both movies and shows from a single input field
- **TMDB Integration**: Automatic poster image fetching for rich visual search results
- **Rich Metadata**: Displays title, year, and poster in search suggestions
- **Smart Navigation**: Routes to appropriate details page (movie or show) based on media type
- **Complete Data Fetching**: Ensures full data is loaded when navigating to details page
- **Debounced Input**: Optimized performance with intelligent request throttling
- **Loading States**: Visual feedback during search operations
- **Keyboard Navigation**: Full accessibility support (arrow keys, enter, escape)

#### Search Behavior

- **Real-time Suggestions**: Search results update as you type with debounced API calls
- **Dual Media Types**: Searches both movies and shows simultaneously
- **Rich Visual Results**: Each search result displays title, year, and poster image
- **Smart Filtering**: Results are filtered by title with case-insensitive matching
- **Error Handling**: Graceful handling of API failures and network issues
- **Data Completion**: Ensures complete data is fetched when selecting an item

#### Technical Implementation

- **Backend Integration**: New `/trakt/search/` endpoint that queries Trakt API
- **Frontend Component**: `MovieShowSearch` component with Material-UI Autocomplete
- **TMDB Integration**: Automatic poster fetching for enhanced visual results
- **Performance Optimization**: Debounced input with configurable delay (300ms default)

## Components

### Core Components

#### `mediaCard.tsx`

Primary component for displaying individual movies and TV shows:

**Features:**

- **Responsive Design**: Adaptive layout with hover effects
- **Media Type Detection**: Automatic movie/show recognition and appropriate display
- **Rich Metadata**: Title, year, rating, and genre information
- **Poster Display**: High-quality poster images from TMDB
- **Progress Tracking**: Watch history and episode progress for TV shows

#### `MediaCardSections.tsx`

Container component for organizing media into categorized sections:

**Features:**

- **Horizontal Scrolling**: Responsive carousel layout for media cards
- **Loading States**: Skeleton loading with consistent card dimensions
- **Section Titles**: Clear categorization with emoji indicators
- **Responsive Grid**: Adapts to various screen sizes

#### `MediaInfoSections.tsx`

Specialized component for displaying detailed media information:

**Features:**

- **Comprehensive Data**: Release dates, ratings, genres, and production information
- **Watch History**: Detailed viewing progress and history
- **Episode Tracking**: Season and episode progress for TV shows
- **YouTube Integration**: Automatic trailer display

### Search Components

#### `MovieShowSearch.tsx` (Global Component)

Advanced search component with autocomplete functionality for movies and shows:

**Features:**

- **Material-UI Autocomplete**: Rich autocomplete interface with custom styling
- **Debounced Input**: Optimized API calls with configurable delay
- **Loading States**: Skeleton loading during search operations
- **Error Handling**: Graceful error display and recovery
- **Keyboard Navigation**: Full accessibility support
- **Poster Images**: TMDB poster display in search suggestions
- **Media Type Indicators**: Visual indicators for movies vs shows

**Props:**

- `onMediaSelect`: Callback function when media is selected
- `placeholder`: Customizable placeholder text
- `debounceDelay`: Configurable debounce delay (default: 300ms)

**API Integration:**

- **Endpoint**: `GET /trakt/search/?query={searchTerm}`
- **Response Format**: Array of media objects with TMDB poster URLs
- **Error Handling**: Network errors and API failures gracefully handled

### Hooks

#### `useMediaData.ts`

Central hook for managing movie and TV show data:

**Features:**

- **Trakt Integration**: Data fetching from Trakt API with OAuth authentication
- **Data Processing**: Intelligent processing and sorting of media data
- **Error Handling**: Comprehensive error states and user feedback
- **Missing Service Detection**: Identifies unconfigured Trakt authentication
- **Refresh Functionality**: Manual data refresh with loading states

**Data Categories:**

- **Recent Movies**: Recently watched movies sorted by watch date
- **Recent Shows**: Recently watched TV shows with episode progress
- **Watch History**: Comprehensive viewing history across all media

#### `useMediaDetails.ts`

Specialized hook for managing detailed media information:

**Features:**

- **Detailed Data Fetching**: Comprehensive media information retrieval
- **YouTube Integration**: Automatic trailer fetching and display
- **Episode Progress**: Detailed episode tracking for TV shows
- **Rating Information**: User ratings and community ratings
- **Metadata Enhancement**: Additional metadata from TMDB

### Utility Components

#### `types.ts`

Comprehensive TypeScript interfaces for movie and TV show data:

**Defined Types:**

- `Movie`: Movie-specific data with release dates, ratings, and genres
- `Show`: TV show data with episode tracking and season information
- `Episode`: Individual episode data with progress tracking
- `MediaSearchResult`: Search result interface with TMDB poster integration

## Media Organization

### Data Categorization

**Recent Movies 🎬**

- Movies sorted by most recent watch date
- Displays poster, title, year, and rating
- Shows watch progress and history

**Recent Shows 📺**

- TV shows sorted by most recent episode watch
- Displays poster, title, year, and current episode progress
- Shows season and episode tracking

### Missing Service Handling

The dashboard intelligently detects missing Trakt authentication and provides:

- **Setup Guidance**: Clear instructions for Trakt OAuth setup
- **Visual Indicators**: Service status display in profile settings
- **Graceful Degradation**: Empty state with helpful messaging

## Platform Assets

### Media Icons

- **Movie Icons**: Visual indicators for movie content
- **TV Show Icons**: Visual indicators for TV show content
- **Platform Integration**: Trakt branding and integration indicators

## API Integration

### Trakt Endpoints

- `GET /trakt/get-stored-movies/`: Fetch user's watched movies
- `GET /trakt/get-stored-shows/`: Fetch user's watched TV shows
- `GET /trakt/search/`: **Search movies and shows** with TMDB integration
- `GET /trakt/auth-status/`: Check Trakt authentication status

### TMDB Integration

- **Poster Fetching**: Automatic high-quality poster image retrieval
- **Metadata Enhancement**: Additional movie and show metadata
- **Image Optimization**: Multiple image sizes for responsive display

## User Experience Features

### Search Experience

- **Intuitive Interface**: Clean, modern search interface with Material-UI
- **Fast Results**: Debounced search with optimized API calls
- **Rich Suggestions**: Visual search results with posters and metadata
- **Smart Navigation**: Automatic routing to appropriate details page

### Media Display

- **Visual Appeal**: High-quality poster images and modern card design
- **Information Rich**: Comprehensive metadata display
- **Progress Tracking**: Clear indication of watch progress and history
- **Responsive Design**: Mobile-friendly layout that works across all devices

### Error Handling

- **Network Resilience**: Graceful handling of API failures
- **User Feedback**: Clear error messages and recovery options
- **Loading States**: Visual feedback during data operations
- **Fallback Content**: Appropriate fallbacks when data is unavailable
