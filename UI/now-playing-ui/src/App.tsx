import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import LandingPage from './pages/LandingPage';
import Games from './pages/games/pages/games';
import Movies from './pages/movies/pages/movies';
import Music from './pages/music/music';
import GameDetails from './pages/games/pages/gameDetails';
import './App.css'
import MovieDetails from './pages/movies/pages/movieDetails';
import AuthPage from './pages/auth/AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <LandingPage />
          </ProtectedRoute>
        } />

        <Route path="/games" element={
          <ProtectedRoute>
            <Games />
          </ProtectedRoute>
        } />

        <Route path="/movies" element={
          <ProtectedRoute>
            <Movies />
          </ProtectedRoute>
        } />

        <Route path="/music" element={
          <ProtectedRoute>
            <Music />
          </ProtectedRoute>
        } />

        <Route path="/game/:id" element={
          <ProtectedRoute>
            <GameDetails />
          </ProtectedRoute>
        } />

        <Route path="/movieDetails" element={
          <ProtectedRoute>
            <MovieDetails />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App
