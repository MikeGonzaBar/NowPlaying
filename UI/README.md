# NowPlaying UI

This folder contains the frontend user interface for the **NowPlaying** project. The UI is built using **React**, **TypeScript**, and **Vite**, with Material-UI for styling.

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

The project follows a feature-based organization:

```plaintext
now-playing-ui/
├── public/                 # Static assets
├── src/                    # Source code
│   ├── components/         # Reusable components
│   │   ├── sideBar.tsx
│   │   └── ...
│   ├── hooks/             # Custom React hooks
│   │   ├── useApi.ts
│   │   └── ...
│   ├── pages/             # Page components
│   │   ├── games/         # Games-related pages
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   ├── movies/        # Movies-related pages
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── music/         # Music-related pages
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## Features

### Games
- Displays recently played games from:
  - Steam
  - PlayStation Network
  - RetroAchievements (supporting classic consoles)
  - Xbox
- Shows achievements and trophies
- Displays playtime statistics
- Platform-specific icons and information
- News articles related to games using NewsAPI

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
- Displays recently played songs from Spotify
- Shows album artwork and artist information

## Technology Stack

- **React**: For UI components and state management
- **TypeScript**: For type safety
- **Material UI**: For modern, responsive UI components
- **React Router**: For application routing
- **Vite**: For fast development and optimized builds

## API Integration

The UI connects to a Django backend API for data retrieval. Each feature (games, movies, music) has its own API endpoints:

- Games: `/trakt/get-stored-games`
- Movies: `/trakt/get-stored-movies`
- Shows: `/trakt/get-stored-shows`
- Music: `/spotify/get-recently-played`

## Development

- **Component Structure**: Components are organized by feature and split into smaller, reusable pieces
- **Custom Hooks**: Common functionality is extracted into custom hooks
- **Type Safety**: TypeScript interfaces for all data structures
- **Responsive Design**: Mobile-friendly layouts using Material-UI's responsive components
- **News Integration**: The `GameDetails` page fetches news articles related to the selected game using the [NewsAPI](https://newsapi.org/)

## Scripts

- `npm run dev`: Starts the development server
- `npm run build`: Builds the project for production
- `npm run lint`: Lints the codebase

## License

This project is for personal/portfolio use only and is not intended for commercial purposes.
