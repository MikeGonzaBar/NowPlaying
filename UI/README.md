# NowPlaying UI

This folder contains the frontend user interface for the **NowPlaying** project. The UI is built using **React**, **TypeScript**, and **Vite**, with Material-UI for styling.

## Prerequisites

Before running the UI, ensure you have the following installed:

- Node.js 18 or higher
- npm or yarn package manager

## Installation

1. Navigate to the `now-playing-ui` folder:

   ```bash
   cd /root/NowPlaying/UI/now-playing-ui
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

## Environment Variables

The UI relies on a `.env` file for configuration. Create a `.env` file in the `now-playing-ui` folder and add the following variables:

```env
VITE_REACT_APP_NEWS_API_KEY=<your_news_api_key>
```

Replace `<your_news_api_key>` with your API key from [NewsAPI](https://newsapi.org/).

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

## Linting

To lint the codebase, run:

```bash
npm run lint
```

## Project Structure

The project is organized as follows:

```
now-playing-ui/
├── public/                 # Static assets
│   └── nowPlaying.svg      # Logo for the application
├── src/                    # Source code
│   ├── assets/             # Additional assets
│   │   └── now-playing-icon.png
│   ├── components/         # Reusable components
│   │   └── sideBar.tsx
│   ├── pages/              # Page components
│   │   ├── LandingPage.tsx # Landing page
│   │   ├── games/          # Games-related pages
│   │   │   ├── games.tsx
│   │   │   ├── gameCard.tsx
│   │   │   ├── gameDetails.tsx
│   │   │   ├── achievementCard.tsx
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   ├── movies/         # Movies-related pages
│   │   │   └── movies.tsx
│   │   └── music/          # Music-related pages
│   │       └── music.tsx
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Entry point
│   ├── index.css           # Global styles
│   └── vite-env.d.ts       # Vite environment types
├── .env                    # Environment variables
├── .gitignore              # Git ignore rules
├── eslint.config.js        # ESLint configuration
├── index.html              # HTML template
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration
├── tsconfig.app.json       # TypeScript app-specific configuration
├── tsconfig.node.json      # TypeScript node-specific configuration
└── vite.config.ts          # Vite configuration
```

## Features

- **Games**: Displays recently played games, total playtime, and achievements from Steam and PlayStation.
- **Movies & Shows**: Displays recently watched movies and TV shows using Trakt integration.
- **Music**: Displays recently played songs from Spotify.

## Notes

- **News Integration**: The `GameDetails` page fetches news articles related to the selected game using the [NewsAPI](https://newsapi.org/).
- **Material-UI**: The project uses Material-UI for consistent and responsive styling.
- **Routing**: React Router is used for navigation between pages.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the project for production.
- `npm run lint`: Lints the codebase.

## License

This project is for personal/portfolio use only and is not intended for commercial purposes.
