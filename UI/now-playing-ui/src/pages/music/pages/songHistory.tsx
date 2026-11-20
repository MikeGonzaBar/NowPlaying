import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  TextField,
} from "@mui/material";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import { avatarUrl } from "../../../utils/avatars";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { format, parseISO } from "date-fns";

import { PageHeader } from "../components/PageHeader";
import { MusicPageLayout } from "../components/MusicPageLayout";
import {
  formatPlayedAt,
  formatDuration,
  formatDateLabel,
} from "../utils/dateUtils";

interface Song {
  id: number;
  title: string;
  artist: string;
  album: string | null;
  played_at: string;
  album_thumbnail: string | null;
  track_url: string | null;
  artist_lastfm_url: string | null;
  duration_ms: number | null;
  source: "spotify" | "lastfm";
  loved: boolean | null;
  streamable: boolean | null;
}

interface SongHistoryResponse {
  results: Song[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

function SongHistory() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "spotify" | "lastfm"
  >("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

  // Request ID guard to prevent stale responses from overwriting newer data
  const requestIdRef = React.useRef(0);

  const fetchSongs = async (pageNum: number, isInitial: boolean = false) => {
    const thisRequestId = ++requestIdRef.current;
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
        setInitialLoadError(null);
      } else {
        setLoadingMore(true);
      }

      const sourceParam =
        sourceFilter !== "all" ? `&source=${sourceFilter}` : "";
      const dateParam = dateFilter !== "all" ? `&date=${dateFilter}` : "";
      const searchParam = searchQuery
        ? `&search=${encodeURIComponent(searchQuery)}`
        : "";

      const response = await authenticatedFetch(
        getApiUrl(
          `${API_CONFIG.MUSIC_ENDPOINT}/get-stored-songs/?page=${pageNum}&page_size=50${sourceParam}${dateParam}${searchParam}`,
        ),
      );

      // Ignore stale responses from superseded requests
      if (thisRequestId !== requestIdRef.current) return;

      if (response.ok) {
        const data: SongHistoryResponse = await response.json();

        if (isInitial) {
          setSongs(data.results);
        } else {
          setSongs((prev) => [...prev, ...data.results]);
        }

        setHasMore(data.has_next);
        setTotalItems(data.total_items);
      } else {
        if (isInitial) {
          setInitialLoadError("Failed to fetch song history. Please try again.");
          setError(null);
        } else {
          setError("Failed to fetch more songs. Please try again.");
        }
      }
    } catch (error) {
      // Ignore abort/cancellation from superseded requests
      if (thisRequestId !== requestIdRef.current) return;
      console.error("Error fetching song history:", error);
      if (isInitial) {
        setInitialLoadError("Error loading history. Please try again.");
        setError(null);
      } else {
        setError("Error loading more songs. Please try again.");
      }
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    // Debounce typing so the list does not reset and refetch on every keystroke.
    const timer = setTimeout(
      () => {
        setPage(1);
        fetchSongs(1, true);
      },
      searchQuery ? 400 : 0,
    );

    return () => clearTimeout(timer);
  }, [sourceFilter, dateFilter, searchQuery]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSongs(nextPage, false);
    }
  };

  const handleSongClick = (song: Song) => {
    if (song.track_url) {
      window.open(song.track_url, "_blank");
    }
  };

  const handleArtistClick = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (song.artist_lastfm_url) {
      window.open(song.artist_lastfm_url, "_blank");
    }
  };

  const groupedSongs = songs.reduce(
    (acc, song) => {
      try {
        const date = parseISO(song.played_at);
        const dateKey = format(date, "yyyy-MM-dd");
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(song);
        return acc;
      } catch {
        const dateKey = "unknown";
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(song);
        return acc;
      }
    },
    {} as Record<string, Song[]>,
  );

  const sortedDates = Object.keys(groupedSongs).sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return b.localeCompare(a);
  });

  const filterBtnSx = (active: boolean) => ({
    mr: 1,
    fontSize: "12px",
    fontWeight: active ? 700 : 500,
    bgcolor: active ? "rgba(239, 68, 68, 0.15)" : "#161618",
    borderColor: active ? "rgba(239, 68, 68, 0.55)" : "#262626",
    color: active ? "#ef4444" : "#a1a1aa",
    transition: "all 0.15s ease",
    "&:hover": {
      bgcolor: active ? "rgba(239, 68, 68, 0.25)" : "#1f1f23",
      borderColor: active ? "#ef4444" : "#3f3f46",
      color: active ? "#ef4444" : "#f4f4f5",
    },
  });

  const dateSubtitle =
    dateFilter === "last7d"
      ? "Last 7 days"
      : dateFilter === "last30d"
        ? "Last 30 days"
        : dateFilter === "last90d"
          ? "Last 90 days"
          : dateFilter === "last365d"
            ? "Last 365 days"
            : "All time";

  const sourceSubtitle =
    sourceFilter === "spotify"
      ? "Spotify"
      : sourceFilter === "lastfm"
        ? "Last.fm"
        : null;

  const headerDescription = `${totalItems.toLocaleString()} scrobbles | ${dateSubtitle}${
    sourceSubtitle ? ` | ${sourceSubtitle}` : ""
  }`;

  // Only show header description after successful initial load
  const showHeader = page === 1 && !loading && !initialLoadError;

  return (
    <MusicPageLayout>
      {/* Header */}
      <PageHeader
        title="Song History"
        description={showHeader ? headerDescription : undefined}
      />

      {/* Filters */}
      <Box sx={{ mb: 4, px: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            <Button
              variant="outlined"
              sx={filterBtnSx(sourceFilter === "all")}
              onClick={() => setSourceFilter("all")}
              aria-pressed={sourceFilter === "all"}
            >
              All Sources
            </Button>
            <Button
              variant="outlined"
              sx={filterBtnSx(sourceFilter === "spotify")}
              onClick={() => setSourceFilter("spotify")}
              aria-pressed={sourceFilter === "spotify"}
            >
              Spotify
            </Button>
            <Button
              variant="outlined"
              sx={filterBtnSx(sourceFilter === "lastfm")}
              onClick={() => setSourceFilter("lastfm")}
              aria-pressed={sourceFilter === "lastfm"}
            >
              Last.fm
            </Button>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            <Button
              variant="outlined"
              sx={filterBtnSx(dateFilter === "all")}
              onClick={() => setDateFilter("all")}
              aria-pressed={dateFilter === "all"}
            >
              All Time
            </Button>
            <Button
              variant="outlined"
              sx={filterBtnSx(dateFilter === "last7d")}
              onClick={() => setDateFilter("last7d")}
              aria-pressed={dateFilter === "last7d"}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outlined"
              sx={filterBtnSx(dateFilter === "last30d")}
              onClick={() => setDateFilter("last30d")}
              aria-pressed={dateFilter === "last30d"}
            >
              Last 30 Days
            </Button>
            <Button
              variant="outlined"
              sx={filterBtnSx(dateFilter === "last90d")}
              onClick={() => setDateFilter("last90d")}
              aria-pressed={dateFilter === "last90d"}
            >
              Last 90 Days
            </Button>
            <Button
              variant="outlined"
              sx={filterBtnSx(dateFilter === "last365d")}
              onClick={() => setDateFilter("last365d")}
              aria-pressed={dateFilter === "last365d"}
            >
              Last 365 Days
            </Button>
          </Box>
          <TextField
            sx={{
              flex: 1,
              minWidth: 160,
              "& .MuiOutlinedInput-root": {
                fontSize: "12px",
                bgcolor: "#161618",
                "& fieldset": { borderColor: "#262626" },
                "&:hover fieldset": { borderColor: "#3f3f46" },
                "&.Mui-focused fieldset": { borderColor: "#ef4444" },
              },
              "& .MuiInputLabel-root": { fontSize: "12px", color: "#71717a" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#ef4444" },
              "& .MuiInputBase-input": { color: "#f4f4f5" },
            }}
            size="small"
            label="Search songs or artists"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Songs List */}
      {initialLoadError && songs.length === 0 ? (
        <Box role="alert" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 10 }}>
          <Typography sx={{ color: "#fca5a5" }}>{initialLoadError}</Typography>
          <Button
            variant="outlined"
            onClick={() => fetchSongs(1, true)}
            sx={{ textTransform: "none" }}
          >
            Retry
          </Button>
        </Box>
      ) : error && loadingMore ? (
        // Inline error for failed loadMore - keep loaded songs visible
        <Box role="alert" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 6 }}>
          <Typography sx={{ color: "#fca5a5" }}>{error}</Typography>
          <Button
            variant="outlined"
            onClick={loadMore}
            sx={{ textTransform: "none" }}
            disabled={loadingMore}
          >
            Retry
          </Button>
        </Box>
      ) : loading && songs.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress sx={{ color: "#EF4444" }} />
        </Box>
      ) : songs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10 }}>
          <Typography sx={{ color: "#71717a", fontSize: "14px" }}>
            No listening history found for the selected filters.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sortedDates.map((dateKey) => {
          const dateSongs = groupedSongs[dateKey];
          const dateLabel = formatDateLabel(dateKey);

          return (
            <Box key={dateKey}>
              <Typography
                sx={{
                  mb: 2,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#71717a",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {dateLabel}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {dateSongs.map((song) => {
                  return (
                    <Box
                      key={song.id}
                      onClick={() => handleSongClick(song)}
                      role={song.track_url ? "link" : undefined}
                      tabIndex={song.track_url ? 0 : undefined}
                      aria-label={song.track_url ? `${song.title} by ${song.artist}` : undefined}
                      onKeyDown={(event) => {
                        if (song.track_url && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          handleSongClick(song);
                        }
                      }}
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "stretch", sm: "center" },
                        gap: { xs: 1.5, sm: 2 },
                        p: 2,
                        bgcolor: "#161618",
                        border: "1px solid #262626",
                        borderRadius: "12px",
                        cursor: song.track_url ? "pointer" : "default",
                        transition: "all 0.2s",
                        "&:hover": {
                          bgcolor: "#1a1a1c",
                          borderColor: song.track_url ? "#EF4444" : "#262626",
                        },
                        "&:focus-visible": {
                          outline: "2px solid #f43f5e",
                          outlineOffset: 3,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Box
                          component="img"
                          src={
                            song.album_thumbnail || avatarUrl(song.title, 64)
                          }
                          alt={song.title}
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "8px",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#f4f4f5",
                              mb: 0.5,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {song.title}
                          </Typography>
                          <Typography
                            onClick={(e) => handleArtistClick(song, e)}
                            sx={{
                              fontSize: "12px",
                              color: song.artist_lastfm_url
                                ? "#EF4444"
                                : "#71717a",
                              cursor: song.artist_lastfm_url
                                ? "pointer"
                                : "default",
                              mb: 0.5,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {song.artist}
                          </Typography>
                          {song.album && (
                            <Typography
                              sx={{
                                fontSize: "10px",
                                color: "#71717a",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {song.album}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "row", sm: "column" },
                          alignItems: { xs: "center", sm: "flex-end" },
                          flexWrap: "wrap",
                          gap: { xs: 1.5, sm: 0.5 },
                          ml: { xs: 0, sm: 2 },
                          pl: { xs: 7, sm: 0 },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "12px",
                            color: "#71717a",
                          }}
                        >
                          {formatPlayedAt(song.played_at)}
                        </Typography>
                        {Boolean(song.duration_ms) && (
                          <Typography
                            sx={{
                              fontSize: "10px",
                              color: "#71717a",
                            }}
                          >
                            {formatDuration(song.duration_ms)}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            mt: { xs: 0, sm: 0.5 },
                          }}
                        >
                          {Boolean(song.loved) && (
                            <FavoriteIcon
                              sx={{ fontSize: 14, color: "#EF4444" }}
                            />
                          )}
                          <Typography
                            sx={{
                              fontSize: "9px",
                              color: "#71717a",
                              px: 1,
                              py: 0.25,
                              bgcolor: "#262626",
                              borderRadius: "4px",
                              textTransform: "uppercase",
                            }}
                          >
                            {song.source === "lastfm" ? "Last.fm" : "Spotify"}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
      </Box>

      {/* Load More Button */}
      {hasMore && (
        <Box sx={{ mt: 6, display: "flex", justifyContent: "center" }}>
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            endIcon={
              loadingMore ? <CircularProgress size={16} /> : <ExpandMoreIcon />
            }
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: "#161618",
              border: "1px solid #262626",
              borderRadius: "12px",
              fontWeight: 700,
              color: "#f4f4f5",
              textTransform: "none",
              "&:hover": {
                bgcolor: "#1a1a1c",
                borderColor: "rgba(239, 68, 68, 0.3)",
              },
              "&:disabled": {
                opacity: 0.5,
              },
              transition: "all 0.2s",
            }}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </Box>
      )}

      {/* Error state after load */}
      {error && songs.length > 0 && (
        <Box role="alert" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 6 }}>
          <Typography sx={{ color: "#fca5a5" }}>{error}</Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setError(null);
              fetchSongs(page, false);
            }}
            sx={{ textTransform: "none" }}
          >
            Retry
          </Button>
        </Box>
      )}

      {/* Footer */}
      <Box
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography
          sx={{ fontSize: "12px", color: "#71717a", fontWeight: 500 }}
        >
          Showing {songs.length.toLocaleString()} of{" "}
          {totalItems.toLocaleString()} listening events
        </Typography>
      </Box>
    </MusicPageLayout>
  );
}

export default SongHistory;