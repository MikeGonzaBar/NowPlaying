import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import './App.css';

// Lazy load all page components - SAFE OPTIMIZATION
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const AuthPage = React.lazy(() => import('./pages/auth/AuthPage'));
const GamesPage = React.lazy(() => import('./pages/games/pages/games'));
const GameDetails = React.lazy(() => import('./pages/games/pages/gameDetails'));
const AllGames = React.lazy(() => import('./pages/games/pages/allGames'));
const MoviesPage = React.lazy(() => import('./pages/movies/pages/moviesDashboard'));
const MovieDetails = React.lazy(() => import('./pages/movies/pages/movieDetails'));
const ShowDetails = React.lazy(() => import('./pages/movies/pages/showDetails'));
const WatchHistory = React.lazy(() => import('./pages/movies/pages/watchHistory'));
const CompletedMedia = React.lazy(() => import('./pages/movies/pages/completedMedia'));

const MusicDashboard = React.lazy(() => import('./pages/music/pages/musicDashboard'));
const TopTracks = React.lazy(() => import('./pages/music/pages/topTracks'));
const TopArtists = React.lazy(() => import('./pages/music/pages/topArtists'));
const TopAlbums = React.lazy(() => import('./pages/music/pages/topAlbums'));
const SongHistory = React.lazy(() => import('./pages/music/pages/songHistory'));
const ProfilePage = React.lazy(() => import('./pages/profile/ProfilePage'));
const AnalyticsPage = React.lazy(() => import('./pages/analytics/AnalyticsPage'));

// Loading component for Suspense fallbacks
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#666'
  }}>
    Loading...
  </div>
);

// App Routes component that uses useAuth inside Router context
const AppRoutes = () => {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route
          path="/"
          element={authenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />
        <Route
          path="/auth"
          element={authenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
        />
        <Route
          path="/dashboard"
          element={authenticated ? <LandingPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/games"
          element={authenticated ? <GamesPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/games/all"
          element={authenticated ? <AllGames /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/games/:platform/:id"
          element={authenticated ? <GameDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/game"
          element={authenticated ? <GameDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/game/:id"
          element={authenticated ? <GameDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/movies"
          element={authenticated ? <MoviesPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/history"
          element={authenticated ? <WatchHistory /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/completed"
          element={authenticated ? <CompletedMedia /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/movies/:id"
          element={authenticated ? <MovieDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/movieDetails"
          element={authenticated ? <MovieDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/showDetails"
          element={authenticated ? <ShowDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/shows/:id"
          element={authenticated ? <ShowDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/music"
          element={authenticated ? <MusicDashboard /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/music/tracks"
          element={authenticated ? <TopTracks /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/music/artists"
          element={authenticated ? <TopArtists /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/music/albums"
          element={authenticated ? <TopAlbums /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/music/history"
          element={authenticated ? <SongHistory /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/profile"
          element={authenticated ? <ProfilePage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/analytics"
          element={authenticated ? <AnalyticsPage /> : <Navigate to="/auth" replace />}
        />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <Router>
      <div className="App">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;
