
import { BrowserRouter as Router, Routes, Route, } from 'react-router-dom';


import LandingPage from './pages/LandingPage';
import Games from './pages/games/games';
import Movies from './pages/movies/movies';
import Music from './pages/music/music';
import GameDetails from './pages/games/gameDetails';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/page1" element={<Games />} />
        <Route path="/page2" element={<Movies />} />
        <Route path="/page3" element={<Music />} />
        <Route path="/game/:id" element={<GameDetails />} />
      </Routes>
    </Router>
  );
}

export default App
