import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { SectionsProvider } from "./preferences/SectionsContext";
import { RequireSection } from "./components/RequireSection";
import type { SectionKey } from "./preferences/types";
import "./App.css";

const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const AuthPage = React.lazy(() => import("./pages/auth/AuthPage"));
const GamesPage = React.lazy(() => import("./pages/games/pages/games"));
const GameDetails = React.lazy(() => import("./pages/games/pages/gameDetails"));
const LegacyGameIdRedirect = React.lazy(
  () => import("./pages/games/pages/LegacyGameIdRedirect"),
);
const AllGames = React.lazy(() => import("./pages/games/pages/allGames"));
const MoviesPage = React.lazy(
  () => import("./pages/movies/pages/moviesDashboard"),
);
const MovieDetails = React.lazy(
  () => import("./pages/movies/pages/movieDetails"),
);
const ShowDetails = React.lazy(
  () => import("./pages/movies/pages/showDetails"),
);
const WatchHistory = React.lazy(
  () => import("./pages/movies/pages/watchHistory"),
);
const CompletedMedia = React.lazy(
  () => import("./pages/movies/pages/completedMedia"),
);

const MusicDashboard = React.lazy(
  () => import("./pages/music/pages/musicDashboard"),
);
const TopTracks = React.lazy(() => import("./pages/music/pages/topTracks"));
const TopArtists = React.lazy(() => import("./pages/music/pages/topArtists"));
const TopAlbums = React.lazy(() => import("./pages/music/pages/topAlbums"));
const SongHistory = React.lazy(() => import("./pages/music/pages/songHistory"));
const ArtistDetail = React.lazy(() => import("./pages/music/pages/artistDetail"));
const AlbumDetail = React.lazy(() => import("./pages/music/pages/albumDetail"));
const TrackDetail = React.lazy(() => import("./pages/music/pages/trackDetail"));
const ProfilePage = React.lazy(() => import("./pages/profile/ProfilePage"));
const AnalyticsPage = React.lazy(
  () => import("./pages/analytics/AnalyticsPage"),
);

const LoadingSpinner = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "200px",
      fontSize: "18px",
      color: "#666",
    }}
  >
    Loading...
  </div>
);

const LegacyGameTitleRedirect = () => {
  const { title } = useParams<{ title: string }>();
  const location = useLocation();
  return (
    <Navigate
      to={`/games/title/${encodeURIComponent(title || "")}${location.search}`}
      replace
    />
  );
};

const AppRoutes = () => {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Attach the auth gate and the section gate to one route element.
  const guard = (section: SectionKey, node: React.ReactNode) =>
    authenticated ? (
      <RequireSection section={section}>{node}</RequireSection>
    ) : (
      <Navigate to="/auth" replace />
    );

  return (
    <SectionsProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
        <Route
          path="/"
          element={
            authenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage />
            )
          }
        />
        <Route
          path="/auth"
          element={
            authenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
          }
        />
        <Route
          path="/dashboard"
          element={
            authenticated ? <LandingPage /> : <Navigate to="/auth" replace />
          }
        />
        <Route
          path="/games"
          element={guard("games", <GamesPage />)}
        />
        <Route
          path="/games/all"
          element={guard("games", <AllGames />)}
        />
        <Route
          path="/games/:platform/:id"
          element={guard("games", <GameDetails />)}
        />
        <Route
          path="/games/title/:title"
          element={guard("games", <GameDetails />)}
        />
        <Route path="/game" element={<Navigate to="/games" replace />} />
        <Route
          path="/game/title/:title"
          element={<LegacyGameTitleRedirect />}
        />
        <Route
          path="/game/:id"
          element={guard("games", <LegacyGameIdRedirect />)}
        />
        <Route
          path="/movies"
          element={guard("movies", <MoviesPage />)}
        />
        <Route
          path="/history"
          element={guard("movies", <WatchHistory />)}
        />
        <Route
          path="/completed"
          element={guard("movies", <CompletedMedia />)}
        />
        <Route
          path="/movies/:id"
          element={guard("movies", <MovieDetails />)}
        />
        <Route
          path="/movieDetails"
          element={<Navigate to="/movies" replace />}
        />
        <Route
          path="/showDetails"
          element={<Navigate to="/movies" replace />}
        />
        <Route
          path="/shows/:id/seasons/:season/episodes/:episode"
          element={guard("movies", <ShowDetails />)}
        />
        <Route
          path="/shows/:id"
          element={guard("movies", <ShowDetails />)}
        />
        <Route
          path="/music"
          element={guard("music", <MusicDashboard />)}
        />
        <Route
          path="/music/tracks"
          element={guard("music", <TopTracks />)}
        />
        <Route
          path="/music/artists"
          element={guard("music", <TopArtists />)}
        />
        <Route
          path="/music/albums"
          element={guard("music", <TopAlbums />)}
        />
        <Route
          path="/music/history"
          element={guard("music", <SongHistory />)}
        />
        <Route
          path="/music/artists/:name"
          element={guard("music", <ArtistDetail />)}
        />
        <Route
          path="/music/albums/:name"
          element={guard("music", <AlbumDetail />)}
        />
        <Route
          path="/music/tracks/:name"
          element={guard("music", <TrackDetail />)}
        />
        <Route
          path="/profile"
          element={
            authenticated ? <ProfilePage /> : <Navigate to="/auth" replace />
          }
        />
        <Route
          path="/analytics"
          element={
            authenticated ? <AnalyticsPage /> : <Navigate to="/auth" replace />
          }
        />
      </Routes>
      </Suspense>
    </SectionsProvider>
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
