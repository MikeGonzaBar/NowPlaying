
import { BrowserRouter as Router, Routes, Route, } from 'react-router-dom';


import LandingPage from './pages/LandingPage';
import Games from './pages/games/pages/games';
import Movies from './pages/movies/pages/movies';
import Music from './pages/music/music';
import GameDetails from './pages/games/pages/gameDetails';
import './App.css'
import MovieDetails from './pages/movies/pages/movieDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/page1" element={<Games />} />
        <Route path="/page2" element={<Movies />} />
        <Route path="/page3" element={<Music />} />
        <Route path="/game/:id" element={<GameDetails />} />
        <Route path="/movieDetails" element={<MovieDetails />} />
      </Routes>
    </Router>
  );
}

export default App
