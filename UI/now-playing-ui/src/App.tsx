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
import ProfilePage from './pages/profile/ProfilePage';
import { isAuthenticated, refreshAuthToken } from './utils/auth';
import Footer from './components/Footer';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        setAuthenticated(true);
      } else {
        // Try to refresh the token
        const refreshed = await refreshAuthToken();
        setAuthenticated(refreshed);
      }
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  if (isChecking) {
    // Show loading spinner or placeholder while checking authentication
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0E0022',
        color: '#fff'
      }}>
        <div>Checking authentication...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

function App() {


  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
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

            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />

            <Route path="/game" element={
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
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App
