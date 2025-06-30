import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import './App.css';

// Lazy load all page components - SAFE OPTIMIZATION
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const AuthPage = React.lazy(() => import('./pages/auth/AuthPage'));
const GamesPage = React.lazy(() => import('./pages/games/pages/games'));
const GameDetails = React.lazy(() => import('./pages/games/pages/gameDetails'));
const MoviesPage = React.lazy(() => import('./pages/movies/pages/movies'));
const MovieDetails = React.lazy(() => import('./pages/movies/pages/movieDetails'));
const MusicPage = React.lazy(() => import('./pages/music/music'));
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
          path="/movies/:id"
          element={authenticated ? <MovieDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/movieDetails"
          element={authenticated ? <MovieDetails /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/music"
          element={authenticated ? <MusicPage /> : <Navigate to="/auth" replace />}
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
