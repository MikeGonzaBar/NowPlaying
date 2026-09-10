import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Typography,
  Chip,
  Card,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SyncIcon from "@mui/icons-material/Sync";
import { useEffect, useState } from "react";
import { useTraktConnection } from "../../../hooks/useTraktConnection";
import AppShell from "../../../components/AppShell";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import { format } from "date-fns";

interface MovieData {
  id?: number;
  title: string;
  year: number;
  image_url: string | null;
  ids: {
    trakt: string;
    tmdb: string;
    imdb?: string;
    slug?: string;
  };
}

interface TMDBMovieDetails {
  title?: string;
  backdrop_path?: string;
  poster_path?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{
    id: number;
    name: string;
    logo_path?: string;
  }>;
  spoken_languages?: Array<{ iso_639_1: string; name: string }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character: string;
      profile_path?: string;
      order: number;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job: string;
      profile_path?: string;
    }>;
  };
  similar?: {
    results?: Array<{
      id: number;
      title: string;
      release_date?: string;
      poster_path?: string;
      genre_ids?: number[];
      popularity?: number;
      credits?: {
        cast?: Array<{ id: number; name: string }>;
      };
    }>;
  };
}

interface WatchProvider {
  display_priority: number;
  logo_path: string;
  provider_name: string;
  provider_id: number;
}

interface WatchProviders {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

interface MovieDetailsData {
  plays: number;
  last_watched_at: string | null;
  last_updated_at: string | null;
}

interface TraktStats {
  watchers: number;
  plays: number;
  collectors: number;
  comments?: number;
  lists?: number;
  votes?: number;
}

function MovieDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { media, mediaDetails } = location.state || {};
  const { id } = useParams();
  const initialMovie = media?.movie || media || null;

  const [movieData, setMovieData] = useState<MovieData | null>(initialMovie);
  const [tmdbDetails, setTmdbDetails] = useState<TMDBMovieDetails | null>(
    mediaDetails || null,
  );
  const [movieDetails, setMovieDetails] = useState<MovieDetailsData | null>(
    null,
  );
  const [traktStats, setTraktStats] = useState<TraktStats | null>(null);
  // Audit #6: stats are their own async section. 'unavailable' (404) renders
  // N/A; 'error' (503/500/network) renders a retryable message. One failed
  // section never blanks dependent content.
  type StatsState = "idle" | "loading" | "success" | "unavailable" | "error";
  const [statsState, setStatsState] = useState<StatsState>("idle");
  const [watchProviders, setWatchProviders] = useState<WatchProviders | null>(
    null,
  );
  const [loading, setLoading] = useState(!initialMovie);
  const [syncing, setSyncing] = useState(false);
  const {
    connected: traktConnected,
    expired: traktExpired,
    loading: traktLoading,
  } = useTraktConnection();

  const [castOpen, setCastOpen] = useState(false);

  // A related-movie navigation reuses this component instance. Clear the
  // previous entity before the new route's request can render stale content.
  useEffect(() => {
    if (!id) return;
    const loadedId = movieData?.ids?.tmdb;
    if (loadedId && String(loadedId) !== String(id)) {
      setMovieData(null);
      setTmdbDetails(null);
      setMovieDetails(null);
      setTraktStats(null);
      setStatsState("idle");
      setWatchProviders(null);
      setLoading(true);
    }
  }, [id]);

  useEffect(() => {
    if (!media && !movieData && !id) {
      navigate("/movies");
      return;
    }

    let cancelled = false;
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);

        const routeTmdbId = id ? String(id) : undefined;
        // Only trust state that belongs to the movie this route points at, so
        // a related-movie navigation can never reuse the previous movie's ids.
        const matchesRoute = (candidate: any) =>
          !!candidate &&
          !!routeTmdbId &&
          String(candidate.ids?.tmdb) === routeTmdbId;
        const mediaMovie = media?.movie || media || null;
        const currentMovie = matchesRoute(movieData)
          ? movieData
          : movieData && !routeTmdbId
            ? movieData
            : matchesRoute(mediaMovie)
              ? mediaMovie
              : mediaMovie && !routeTmdbId
                ? mediaMovie
                : null;
        const traktId = currentMovie?.ids?.trakt;
        const tmdbId = routeTmdbId || currentMovie?.ids?.tmdb || id;
        // Resolved before the detail fetch. On a cold load (no navigation
        // state) the detail response below may upgrade this with the trakt id
        // it returns — audit #6.
        let resolvedTraktId = currentMovie?.ids?.trakt || traktId;

        // The effect below only depends on the canonical route id. It used to
        // list every piece of state it writes (movieData, tmdbDetails,
        // movieDetails) as dependencies, which re-armed the effect on every
        // write and caused an unbounded TMDB request loop.
        if (tmdbId) {
          const detailRes = await authenticatedFetch(
            getApiUrl(
              `${API_CONFIG.TRAKT_ENDPOINT}/detail/?type=movie&tmdb_id=${encodeURIComponent(tmdbId)}`,
            ),
          );

          if (detailRes.ok) {
            const data = await detailRes.json();
            const result = data.result;
            if (cancelled) return;
            setMovieDetails({
              plays: result?.plays || 0,
              last_watched_at: result?.last_watched_at || null,
              last_updated_at: result?.last_updated_at || null,
            });
            // Audit #6: on a cold load (no navigation state) the trakt id is
            // only knowable from this response — capture it so the stats
            // section can still run instead of silently showing N/A.
            const detailTraktId = result?.movie?.ids?.trakt;
            if (detailTraktId) {
              resolvedTraktId = String(detailTraktId);
            }
            if (!currentMovie && result?.movie) {
              setMovieData({
                ...result.movie,
                ids: {
                  ...(result.movie.ids || {}),
                  tmdb: String(result.movie.ids?.tmdb ?? tmdbId),
                },
              });
            }
          }
        }

        const targetTmdbId = routeTmdbId || currentMovie?.ids?.tmdb || tmdbId;
        if (targetTmdbId) {
          // TMDB is proxied through the backend so the API key never reaches
          // the browser.
          const tmdbRes = await authenticatedFetch(
            getApiUrl(
              `${API_CONFIG.TRAKT_ENDPOINT}/tmdb-detail/?tmdb_id=${encodeURIComponent(String(targetTmdbId))}&type=movie&append_to_response=credits,similar`,
            ),
          );
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            if (cancelled) return;
            setTmdbDetails(tmdbData);
            if (!currentMovie && tmdbData?.title) {
              // Audit #6: preserve the trakt id resolved from the detail
              // response — overwriting it with undefined here would make the
              // stats Retry path early-return forever on cold loads.
              setMovieData({
                title: tmdbData.title,
                year: Number(tmdbData.release_date?.slice(0, 4) || 0),
                image_url: tmdbData.poster_path
                  ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
                  : null,
                ids: {
                  trakt: resolvedTraktId,
                  tmdb: String(targetTmdbId),
                  slug: tmdbData?.imdb_id ? undefined : undefined,
                },
              });
            }
          }

          const providersRes = await authenticatedFetch(
            getApiUrl(
              `${API_CONFIG.TRAKT_ENDPOINT}/tmdb-watch-providers/?tmdb_id=${encodeURIComponent(String(targetTmdbId))}&type=movie`,
            ),
          );
          if (providersRes.ok) {
            const providersData = await providersRes.json();
            if (cancelled) return;
            const usProviders = providersData.results?.US;
            if (usProviders) {
              setWatchProviders(usProviders);
            } else {
              const firstRegion = Object.values(
                providersData.results || {},
              )[0] as WatchProviders;
              if (firstRegion) {
                setWatchProviders(firstRegion);
              }
            }
          }
        }

        // resolvedTraktId was initialized before the detail fetch and may have
        // been upgraded from its response on cold navigation (audit #6).
        if (resolvedTraktId) {
          // Audit #6: separately modeled async section with its own states.
          setStatsState("loading");
          const statsRes = await authenticatedFetch(
            getApiUrl(
              `${API_CONFIG.TRAKT_ENDPOINT}/movie-stats/?trakt_id=${encodeURIComponent(resolvedTraktId)}`,
            ),
          );
          if (cancelled) return;
          if (statsRes.ok) {
            setTraktStats(await statsRes.json());
            setStatsState("success");
          } else if (statsRes.status === 404) {
            // Confirmed absence → N/A rendering, not an error.
            setTraktStats(null);
            setStatsState("unavailable");
          } else {
            // 503/500 → temporary failure with retry.
            setTraktStats(null);
            setStatsState("error");
          }
        } else {
          setStatsState("unavailable");
        }
      } catch (error) {
        console.error("Error fetching movie details:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchMovieDetails();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // Audit #6: retry re-runs only the stats request, not the whole page load.
  const fetchStats = async () => {
    const resolvedTraktId =
      movieData?.ids?.trakt || media?.movie?.ids?.trakt || media?.ids?.trakt;
    if (!resolvedTraktId) return;
    setStatsState("loading");
    try {
      const statsRes = await authenticatedFetch(
        getApiUrl(
          `${API_CONFIG.TRAKT_ENDPOINT}/movie-stats/?trakt_id=${encodeURIComponent(String(resolvedTraktId))}`,
        ),
      );
      if (statsRes.ok) {
        setTraktStats(await statsRes.json());
        setStatsState("success");
      } else if (statsRes.status === 404) {
        setTraktStats(null);
        setStatsState("unavailable");
      } else {
        setTraktStats(null);
        setStatsState("error");
      }
    } catch {
      setTraktStats(null);
      setStatsState("error");
    }
  };

  const handleSync = async () => {
    try {
      const traktId =
        movieData?.ids?.trakt || media?.movie?.ids?.trakt || media?.ids?.trakt;
      if (!traktId) {
        alert("Unable to get movie ID for sync");
        return;
      }

      setSyncing(true);
      const response = await authenticatedFetch(
        getApiUrl(
          `${API_CONFIG.TRAKT_ENDPOINT}/update-movie/?trakt_id=${traktId}`,
        ),
      );

      if (response.ok) {
        alert(
          "Movie sync started in the background. The page will refresh shortly...",
        );
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        alert(`Failed to sync movie: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error syncing movie:", error);
      alert("Failed to sync movie");
    } finally {
      setSyncing(false);
    }
  };

  if (!movieData) {
    return (
      <AppShell
        activeItem="Movies"
        backgroundColor="#0f1115"
        mainSx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {loading ? (
          <CircularProgress sx={{ color: "#ed1c24" }} />
        ) : (
          <>
            <Typography sx={{ color: "#fff" }}>We couldn’t load this movie.</Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
              <Button variant="contained" onClick={() => navigate(-1)}>
                Back to previous movie
              </Button>
              <Button variant="outlined" onClick={() => window.location.reload()}>
                Retry
              </Button>
              <Button variant="text" onClick={() => navigate("/movies")}>
                Search movies
              </Button>
            </Box>
          </>
        )}
      </AppShell>
    );
  }

  const backdropUrl = tmdbDetails?.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${tmdbDetails.backdrop_path}`
    : movieData.image_url || "";

  const genres = tmdbDetails?.genres?.map((g) => g.name).join(" / ") || "";
  const director =
    tmdbDetails?.credits?.crew?.find((c) => c.job === "Director")?.name ||
    "N/A";
  const runtime = tmdbDetails?.runtime
    ? `${Math.floor(tmdbDetails.runtime / 60)}h ${tmdbDetails.runtime % 60}m`
    : "N/A";
  const traktRating = tmdbDetails?.vote_average?.toFixed(1) || "N/A";
  const userRating = "N/A"; // We don't have user ratings stored yet

  const cast = tmdbDetails?.credits?.cast?.slice(0, 6) || [];
  const allCast = tmdbDetails?.credits?.cast || [];
  const castIds = tmdbDetails?.credits?.cast?.map((c) => c.id) || [];
  const currentGenres = tmdbDetails?.genres?.map((g) => g.id) || [];
  const currentMovieTitle = (movieData?.title || tmdbDetails?.title || "")
    .toLowerCase()
    .trim();

  // Rank similar movies by available franchise/genre/cast hints and then
  // popularity, so related recommendations stay contextually relevant.
  const similarMovies = (tmdbDetails?.similar?.results || [])
    .filter((movie) =>
      movie.id &&
      typeof movie.title === "string" &&
      movie.title.trim().length > 1 &&
      movie.release_date,
    )
    .map((movie) => {
      const movieGenreIds = movie.genre_ids || [];
      const genreOverlap = movieGenreIds.filter((g) =>
        currentGenres.includes(g),
      ).length;

      const movieCastIds = movie.credits?.cast?.map((c) => c.id) || [];
      const castOverlap = castIds.filter((id) => movieCastIds.includes(id)).length;

      const sameTitleSignal =
        movie.title &&
          currentMovieTitle &&
          movie.title.toLowerCase().trim() === currentMovieTitle
          ? 1
          : 0;

      return {
        ...movie,
        genreOverlap,
        castOverlap,
        sameTitleSignal,
      };
    })
    .sort((a, b) => {
      if (b.castOverlap !== a.castOverlap) return b.castOverlap - a.castOverlap;
      if (b.genreOverlap !== a.genreOverlap) return b.genreOverlap - a.genreOverlap;
      if (b.sameTitleSignal !== a.sameTitleSignal) return b.sameTitleSignal - a.sameTitleSignal;
      return (b.popularity || 0) - (a.popularity || 0);
    })
    .slice(0, 6);

  const openRelatedMovie = (movie: any) => {
    if (!movie?.id) return;
    navigate(`/movies/${movie.id}`);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const getProviderLink = (
    provider: WatchProvider,
    movieTitle: string,
    tmdbId?: string,
  ): string => {
    const providerName = provider.provider_name.toLowerCase();
    const encodedTitle = encodeURIComponent(movieTitle);

    // Map provider IDs/names to their search/watch URLs
    const providerLinks: Record<string, string> = {
      // Streaming services
      netflix: `https://www.netflix.com/search?q=${encodedTitle}`,
      "disney plus": `https://www.disneyplus.com/search?q=${encodedTitle}`,
      "disney+": `https://www.disneyplus.com/search?q=${encodedTitle}`,
      hulu: `https://www.hulu.com/search?q=${encodedTitle}`,
      "amazon prime video": `https://www.amazon.com/s?k=${encodedTitle}&i=prime-instant-video`,
      "prime video": `https://www.amazon.com/s?k=${encodedTitle}&i=prime-instant-video`,
      "hbo max": `https://www.hbomax.com/search?q=${encodedTitle}`,
      hbo: `https://www.hbomax.com/search?q=${encodedTitle}`,
      max: `https://www.max.com/search?q=${encodedTitle}`,
      "paramount plus": `https://www.paramountplus.com/search/?q=${encodedTitle}`,
      "paramount+": `https://www.paramountplus.com/search/?q=${encodedTitle}`,
      peacock: `https://www.peacocktv.com/search?q=${encodedTitle}`,
      "apple tv plus": `https://tv.apple.com/search?term=${encodedTitle}`,
      "apple tv+": `https://tv.apple.com/search?term=${encodedTitle}`,
      crunchyroll: `https://www.crunchyroll.com/search?q=${encodedTitle}`,
      funimation: `https://www.funimation.com/search/?q=${encodedTitle}`,
      starz: `https://www.starz.com/us/en/search?q=${encodedTitle}`,
      showtime: `https://www.showtime.com/search?q=${encodedTitle}`,
      "amc+": `https://www.amcplus.com/search?q=${encodedTitle}`,

      // Rental/Purchase services
      "apple itunes": `https://tv.apple.com/search?term=${encodedTitle}`,
      itunes: `https://tv.apple.com/search?term=${encodedTitle}`,
      "google play movies": `https://play.google.com/store/search?q=${encodedTitle}&c=movies`,
      "google play": `https://play.google.com/store/search?q=${encodedTitle}&c=movies`,
      youtube: `https://www.youtube.com/results?search_query=${encodedTitle}`,
      vudu: `https://www.vudu.com/content/search.html?q=${encodedTitle}`,
      "microsoft store": `https://www.microsoft.com/en-us/store/search?q=${encodedTitle}`,
      "amazon video": `https://www.amazon.com/s?k=${encodedTitle}&i=movies-tv`,
      amazon: `https://www.amazon.com/s?k=${encodedTitle}&i=movies-tv`,
      redbox: `https://www.redbox.com/search?q=${encodedTitle}`,
      "fandango now": `https://www.fandango.com/search?q=${encodedTitle}`,
      fandangonow: `https://www.fandango.com/search?q=${encodedTitle}`,
    };

    // Try exact match first
    if (providerLinks[providerName]) {
      return providerLinks[providerName];
    }

    // Try partial matches
    for (const [key, url] of Object.entries(providerLinks)) {
      if (providerName.includes(key) || key.includes(providerName)) {
        return url;
      }
    }

    // Fallback: Use JustWatch search (they have good platform links)
    if (tmdbId) {
      return `https://www.justwatch.com/us/movie/${encodedTitle.toLowerCase().replace(/\s+/g, "-")}`;
    }

    // Last resort: Google search
    return `https://www.google.com/search?q=${encodedTitle}+watch+online`;
  };

  return (
    <AppShell
      activeItem="Movies"
      backgroundColor="#0f1115"
      mainSx={{ display: "flex", flexDirection: "column" }}
    >
      {/* Back Button */}
      <Box sx={{ p: 3, pb: 0 }}>
        <IconButton
          onClick={() => navigate("/movies")}
          aria-label="Back to Movies"
          sx={{
            backgroundColor: "rgba(237, 28, 36, 0.1)",
            color: "#ed1c24",
            "&:hover": {
              backgroundColor: "rgba(237, 28, 36, 0.2)",
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Box>

      {/* Hero Section */}
      <Box sx={{ mb: 4, position: "relative" }}>
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 3,
            height: { xs: 400, md: 500 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            backgroundImage: backdropUrl
              ? `linear-gradient(0deg, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.2) 60%), url(${backdropUrl})`
              : "linear-gradient(0deg, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.2) 60%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transition: "transform 0.7s",
            "&:hover": {
              transform: "scale(1.02)",
            },
          }}
        >
          <Box
            sx={{
              position: "relative",
              p: 4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", md: "flex-end" },
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                {/* Classification and Genres */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1,
                    flexWrap: "wrap",
                    minWidth: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  <Chip
                    label="MOVIE"
                    size="small"
                    sx={{
                      backgroundColor: "#ed1c24",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      height: 20,
                    }}
                  />
                  {genres && (
                    <>
                      <Box
                        sx={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          backgroundColor: "#ed1c24",
                        }}
                      />
                      <Typography
                        sx={{
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {genres.toUpperCase()}
                      </Typography>
                    </>
                  )}
                </Box>

                {/* Movie Title */}
                <Typography
                  variant="h3"
                  sx={{
                    color: "#fff",
                    fontSize: {
                      xs: "clamp(28px, 9vw, 40px)",
                      md: "4rem",
                      lg: "4.5rem",
                    },
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    mb: 2,
                  }}
                >
                  {movieData.title.toUpperCase()}
                </Typography>

                {/* Details Row */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography
                      sx={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "#9ca3af",
                        mb: 0.5,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Release Year
                    </Typography>
                    <Typography
                      sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}
                    >
                      {movieData.year}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
                      pl: 4,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "#9ca3af",
                        mb: 0.5,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Director
                    </Typography>
                    <Typography
                      sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}
                    >
                      {director}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
                      pl: 4,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "#9ca3af",
                        mb: 0.5,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Runtime
                    </Typography>
                    <Typography
                      sx={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}
                    >
                      {runtime}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Rating Boxes */}
              <Box sx={{ display: "flex", gap: 2, ml: 4 }}>
                <Card
                  sx={{
                    backgroundColor: "rgba(26, 29, 35, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(42, 46, 55, 0.5)",
                    borderRadius: 2,
                    p: 2,
                    minWidth: 100,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#9ca3af",
                      mb: 1,
                      letterSpacing: "0.05em",
                    }}
                  >
                    Trakt Rating
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: "#ed1c24",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {traktRating}
                    </Typography>
                    <StarIcon sx={{ fontSize: 16, fill: "#ed1c24" }} />
                  </Box>
                </Card>
                <Card
                  sx={{
                    backgroundColor: "rgba(237, 28, 36, 0.1)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(237, 28, 36, 0.5)",
                    borderRadius: 2,
                    p: 2,
                    minWidth: 100,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#9ca3af",
                      mb: 1,
                      letterSpacing: "0.05em",
                    }}
                  >
                    Your Rating
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: "#fff",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {userRating}
                    </Typography>
                    <StarIcon sx={{ fontSize: 16, fill: "#fff" }} />
                  </Box>
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Grid container spacing={6}>
          {/* Left Column */}
          <Grid size={{ xs: 12, lg: 9 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Synopsis */}
              {tmdbDetails?.overview && (
                <Box>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#ed1c24",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      mb: 2,
                    }}
                  >
                    Synopsis
                  </Typography>
                  <Typography
                    sx={{
                      color: "#9ca3af",
                      lineHeight: 1.75,
                      fontSize: "1.125rem",
                      maxWidth: "64rem",
                    }}
                  >
                    {tmdbDetails.overview}
                  </Typography>
                </Box>
              )}

              {/* Cast & Crew */}
              {cast.length > 0 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 3,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#ed1c24",
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                      }}
                    >
                      Cast & Crew
                    </Typography>
                    <Button
                      onClick={() => setCastOpen(true)}
                      aria-haspopup="dialog"
                      sx={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        "&:hover": {
                          color: "#fff",
                        },
                      }}
                    >
                      Full Cast
                    </Button>
                  </Box>
                  <Grid container spacing={3}>
                    {cast.map((actor) => (
                      <Grid size={{ xs: 6, sm: 4, md: 2 }} key={actor.id}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Box
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: "50%",
                              overflow: "hidden",
                              mb: 1.5,
                              border: "2px solid transparent",
                              transition: "border-color 0.2s",
                              "&:hover": {
                                borderColor: "#ed1c24",
                              },
                            }}
                          >
                            {actor.profile_path ? (
                              <Box
                                component="img"
                                src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                alt={actor.name}
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: "#27272a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Typography
                                  sx={{ color: "#6b7280", fontSize: "10px" }}
                                >
                                  No Image
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "14px",
                              fontWeight: 700,
                              mb: 0.5,
                              "&:hover": { color: "#ed1c24" },
                              transition: "color 0.2s",
                            }}
                          >
                            {actor.name}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "10px",
                              color: "#6b7280",
                              textTransform: "uppercase",
                              fontWeight: 500,
                            }}
                          >
                            {actor.character}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Personal Progress */}
              <Card
                sx={{
                  backgroundColor: "#15181e",
                  border: "1px solid #2a2e37",
                  borderRadius: 3,
                  p: 4,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    p: 4,
                    opacity: 0.2,
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 96, color: "#ed1c24" }} />
                </Box>
                <Box sx={{ position: "relative", zIndex: 10 }}>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#ed1c24",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      mb: 3,
                    }}
                  >
                    Personal Progress
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          backgroundColor: "rgba(237, 28, 36, 0.1)",
                          border: "1px solid rgba(237, 28, 36, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircleIcon
                          sx={{ fontSize: 32, color: "#ed1c24" }}
                        />
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: "#6b7280",
                            mb: 0.5,
                          }}
                        >
                          Status
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          {movieDetails?.last_watched_at
                            ? "Watched"
                            : "Not Watched"}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "#6b7280",
                          mb: 0.5,
                        }}
                      >
                        Total Plays
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1.875rem",
                          fontWeight: 900,
                          color: "#fff",
                        }}
                      >
                        {movieDetails?.plays || 0}{" "}
                        <Typography
                          component="span"
                          sx={{
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            color: "#6b7280",
                            textTransform: "uppercase",
                            ml: 0.5,
                          }}
                        >
                          {(movieDetails?.plays || 0) === 1 ? "play" : "plays"}
                        </Typography>
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "#6b7280",
                          mb: 0.5,
                        }}
                      >
                        Last watched
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1.125rem",
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        {formatDate(movieDetails?.last_watched_at ?? null)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Card>

              {/* Where to Watch */}
              {watchProviders &&
                (watchProviders.flatrate?.length ||
                  watchProviders.rent?.length ||
                  watchProviders.buy?.length) && (
                  <Card
                    sx={{
                      backgroundColor: "#15181e",
                      border: "1px solid #2a2e37",
                      borderRadius: 3,
                      p: 4,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#ed1c24",
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        mb: 3,
                      }}
                    >
                      Where to Watch
                    </Typography>

                    {watchProviders.flatrate &&
                      watchProviders.flatrate.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#9ca3af",
                              mb: 2,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Stream
                          </Typography>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}
                          >
                            {watchProviders.flatrate.map((provider) => (
                              <Box
                                key={provider.provider_id}
                                component="a"
                                href={getProviderLink(
                                  provider,
                                  movieData?.title || "",
                                  movieData?.ids?.tmdb,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  p: 1.5,
                                  borderRadius: 2,
                                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  textDecoration: "none",
                                  transition: "all 0.2s",
                                  cursor: "pointer",
                                  "&:hover": {
                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                    borderColor: "#ed1c24",
                                    transform: "translateY(-2px)",
                                  },
                                }}
                              >
                                {provider.logo_path ? (
                                  <Box
                                    component="img"
                                    src={`https://image.tmdb.org/t/p/w154${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    sx={{
                                      width: 60,
                                      height: 60,
                                      objectFit: "contain",
                                      backgroundColor: "#fff",
                                      borderRadius: 1,
                                      p: 0.5,
                                    }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: 60,
                                      height: 60,
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.1)",
                                      borderRadius: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "10px",
                                        color: "#9ca3af",
                                        textAlign: "center",
                                        px: 0.5,
                                      }}
                                    >
                                      {provider.provider_name}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                    {watchProviders.rent && watchProviders.rent.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          sx={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#9ca3af",
                            mb: 2,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Rent
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {watchProviders.rent.map((provider) => (
                            <Box
                              key={provider.provider_id}
                              component="a"
                              href={getProviderLink(
                                provider,
                                movieData?.title || "",
                                movieData?.ids?.tmdb,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                p: 1.5,
                                borderRadius: 2,
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                textDecoration: "none",
                                transition: "all 0.2s",
                                cursor: "pointer",
                                "&:hover": {
                                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                                  borderColor: "#ed1c24",
                                  transform: "translateY(-2px)",
                                },
                              }}
                            >
                              {provider.logo_path ? (
                                <Box
                                  component="img"
                                  src={`https://image.tmdb.org/t/p/w154${provider.logo_path}`}
                                  alt={provider.provider_name}
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    objectFit: "contain",
                                    backgroundColor: "#fff",
                                    borderRadius: 1,
                                    p: 0.5,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                    borderRadius: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "10px",
                                      color: "#9ca3af",
                                      textAlign: "center",
                                      px: 0.5,
                                    }}
                                  >
                                    {provider.provider_name}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {watchProviders.buy && watchProviders.buy.length > 0 && (
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#9ca3af",
                            mb: 2,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Buy
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {watchProviders.buy.map((provider) => (
                            <Box
                              key={provider.provider_id}
                              component="a"
                              href={getProviderLink(
                                provider,
                                movieData?.title || "",
                                movieData?.ids?.tmdb,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                p: 1.5,
                                borderRadius: 2,
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                textDecoration: "none",
                                transition: "all 0.2s",
                                cursor: "pointer",
                                "&:hover": {
                                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                                  borderColor: "#ed1c24",
                                  transform: "translateY(-2px)",
                                },
                              }}
                            >
                              {provider.logo_path ? (
                                <Box
                                  component="img"
                                  src={`https://image.tmdb.org/t/p/w154${provider.logo_path}`}
                                  alt={provider.provider_name}
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    objectFit: "contain",
                                    backgroundColor: "#fff",
                                    borderRadius: 1,
                                    p: 0.5,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                    borderRadius: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "10px",
                                      color: "#9ca3af",
                                      textAlign: "center",
                                      px: 0.5,
                                    }}
                                  >
                                    {provider.provider_name}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Card>
                )}

              {/* Related Movies */}
              {similarMovies.length > 0 && (
                <Box>
                  <Dialog
                    open={castOpen}
                    onClose={() => setCastOpen(false)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                      sx: {
                        backgroundColor: "#1a1d23",
                        color: "#fff",
                        border: "1px solid #2a2e37",
                      },
                    }}
                  >
                    <DialogTitle sx={{ fontWeight: 700 }}>
                      Full Cast
                    </DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: "#15181d" }}>
                      <Grid container spacing={3}>
                        {allCast.map((actor) => (
                          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={actor.id}>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                mb: 2,
                              }}
                            >
                              {actor.profile_path ? (
                                <Box
                                  component="img"
                                  src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                  alt={actor.name}
                                  sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    mb: 1.5,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: "50%",
                                    backgroundColor: "#27272a",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    mb: 1.5,
                                  }}
                                >
                                  <Typography
                                    sx={{ color: "#6b7280", fontSize: "10px" }}
                                  >
                                    {actor.name?.charAt(0)}
                                  </Typography>
                                </Box>
                              )}
                              <Typography
                                sx={{ fontWeight: 600, fontSize: "12px" }}
                              >
                                {actor.name}
                              </Typography>
                              {actor.character && (
                                <Typography
                                  sx={{ color: "#9ca3af", fontSize: "11px" }}
                                >
                                  {actor.character}
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </DialogContent>
                  </Dialog>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 3,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#ed1c24",
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                      }}
                    >
                      Related Movies
                    </Typography>
                  </Box>
                  <Grid container spacing={3}>
                    {similarMovies.map((movie) => (
                      <Grid size={{ xs: 6, sm: 4, md: 2 }} key={movie.id}>
                        <Box
                          component="a"
                          href={`/movies/${movie.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            openRelatedMovie(movie);
                          }}
                          sx={{
                            display: "block",
                            cursor: "pointer",
                            textDecoration: "none",
                            color: "inherit",
                            '&:focus-visible': {
                              outline: '2px solid #22D3EE',
                              outlineOffset: '2px',
                              borderRadius: 2,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              position: "relative",
                              aspectRatio: "2/3",
                              borderRadius: 2,
                              overflow: "hidden",
                              mb: 1.5,
                              border: "1px solid #2a2e37",
                              transition: "transform 0.5s",
                              "&:hover": {
                                transform: "scale(1.05)",
                              },
                            }}
                          >
                            {movie.poster_path ? (
                              <Box
                                component="img"
                                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                alt={movie.title}
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: "#27272a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Typography
                                  sx={{ color: "#6b7280", fontSize: "10px" }}
                                >
                                  No Image
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "14px",
                              fontWeight: 700,
                              mb: 0.5,
                              "&:hover": { color: "#ed1c24" },
                              transition: "color 0.2s",
                            }}
                          >
                            {movie.title}
                          </Typography>
                          {movie.release_date && (
                            <Typography
                              sx={{
                                fontSize: "10px",
                                color: "#6b7280",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              {new Date(movie.release_date).getFullYear()}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Right Sidebar */}
          <Grid size={{ xs: 12, lg: 3 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Trakt Stats */}
              <Card
                sx={{
                  backgroundColor: "#15181e",
                  border: "1px solid #2a2e37",
                  borderRadius: 2,
                  p: 3,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#ed1c24",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    mb: 3,
                  }}
                >
                  Trakt Stats
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {statsState === "loading" && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                      <CircularProgress size={24} sx={{ color: "#ed1c24" }} />
                    </Box>
                  )}
                  {statsState === "error" && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1.5,
                        py: 2,
                      }}
                    >
                      <Typography sx={{ fontSize: "12px", color: "#d1d5db" }}>
                        Stats temporarily unavailable
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={fetchStats}
                        sx={{ color: "#ed1c24", borderColor: "rgba(237, 28, 36, 0.4)", textTransform: "none" }}
                      >
                        Retry
                      </Button>
                    </Box>
                  )}
                  {statsState !== "loading" && statsState !== "error" && (
                    <>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1.5,
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      borderRadius: 2,
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <ScheduleIcon sx={{ color: "#9ca3af", fontSize: 16 }} />
                      <Typography
                        sx={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#d1d5db",
                        }}
                      >
                        Total Plays
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {traktStats?.plays
                        ? traktStats.plays.toLocaleString()
                        : "N/A"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1.5,
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      borderRadius: 2,
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <StarIcon sx={{ color: "#9ca3af", fontSize: 16 }} />
                      <Typography
                        sx={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#d1d5db",
                        }}
                      >
                        Watchers
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {traktStats?.watchers
                        ? traktStats.watchers.toLocaleString()
                        : "N/A"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1.5,
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      borderRadius: 2,
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <CheckCircleIcon
                        sx={{ color: "#9ca3af", fontSize: 16 }}
                      />
                      <Typography
                        sx={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#d1d5db",
                        }}
                      >
                        Collectors
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {traktStats?.collectors
                        ? traktStats.collectors.toLocaleString()
                        : "N/A"}
                    </Typography>
                  </Box>
                    </>
                  )}
                </Box>
              </Card>

              {/* Sync Card */}
              <Card
                sx={{
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, rgba(237, 28, 36, 0.3) 0%, transparent 100%)",
                  border: "1px solid rgba(237, 28, 36, 0.2)",
                  p: 2.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}
                    >
                      Trakt Sync
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "10px",
                        color: "#b99d9d",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {traktConnected
                        ? "Connected account"
                        : traktExpired
                          ? "Needs attention"
                          : traktLoading
                            ? "Checking…"
                            : "Unavailable"}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: traktConnected
                        ? "#22c55e"
                        : traktExpired
                          ? "#f59e0b"
                          : "#71717a",
                      boxShadow: traktConnected ? "0 0 8px #22c55e" : "none",
                    }}
                  />
                </Box>
                {!traktConnected && (
                  <Typography
                    sx={{
                      fontSize: "11px",
                      color: "#b99d9d",
                      mb: 1.5,
                      lineHeight: 1.6,
                    }}
                  >
                    {traktExpired
                      ? "Your Trakt session expired. Reconnect Trakt in Connections & account to resume sync."
                      : "Checking your Trakt connection…"}
                  </Typography>
                )}
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={
                    syncing ? (
                      <CircularProgress size={16} sx={{ color: "#fff" }} />
                    ) : (
                      <SyncIcon />
                    )
                  }
                  onClick={handleSync}
                  disabled={syncing || !traktConnected}
                  sx={{
                    backgroundColor: "#ed1c24",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    py: 1,
                    borderRadius: 2,
                    "&:hover": {
                      backgroundColor: "rgba(237, 28, 36, 0.8)",
                    },
                  }}
                >
                  Force Update
                </Button>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </AppShell>
  );
}

export default MovieDetails;
