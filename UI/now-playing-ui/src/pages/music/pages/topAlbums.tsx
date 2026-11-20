import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { RankingFilters } from "../components/RankingFilters";
import {
  getRankingPeriodLabel,
  getRankingSourceLabel,
} from "../utils/rankingFilters";
import { MusicItemCard } from "../components/MusicItemCard";
import { ShowMoreButton } from "../components/ShowMoreButton";
import { PulseAnimation } from "../components/PulseAnimation";
import { MusicPageLayout } from "../components/MusicPageLayout";
import { useMusicFetch } from "../hooks/useMusicFetch";
import { Album } from "../types";

function TopAlbums() {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get("period") || searchParams.get("days") || "all";
  const source = searchParams.get("source") || "all";
  const [showAll, setShowAll] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (period !== "all") params.set("days", period);
    if (source !== "all") params.set("source", source);
    return `top-albums/?${params.toString()}`;
  }, [period, source]);

  const { data: albums, loading } = useMusicFetch<Album>({
    endpoint,
    dataKey: "albums",
  });

  const displayedAlbums = showAll ? albums : albums.slice(0, 10);
  const periodLabel = getRankingPeriodLabel(period);
  const sourceLabel = getRankingSourceLabel(source);
  const periodParam =
    period !== "all" ? `?period=${encodeURIComponent(period)}` : "";

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <MusicPageLayout>
      {/* Header */}
      <PageHeader
        title="Top Albums"
        description={`Showing top ${albums.length} based on plays | ${periodLabel} | ${sourceLabel}`}
        filterButtons={
          <RankingFilters
            period={period}
            source={source}
            entityLabel="album"
            onPeriodChange={(value) => {
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (value === "all") {
                    next.delete("period");
                    next.delete("days");
                  } else {
                    next.set("period", value);
                  }
                  return next;
                },
                { replace: true },
              );
              setShowAll(false);
            }}
            onSourceChange={(value) => {
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (value === "all") {
                    next.delete("source");
                  } else {
                    next.set("source", value);
                  }
                  return next;
                },
                { replace: true },
              );
              setShowAll(false);
            }}
          />
        }
      />

      {/* Albums List */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {displayedAlbums.map((album, idx) => (
            <MusicItemCard
              key={idx}
              rank={idx + 1}
              isFirst={idx === 0}
              thumbnail={album.thumbnail}
              name={album.name}
              subtitle={album.artist}
              count={album.count}
              countLabel="Total Plays"
              topTracks={album.top_tracks}
              to={`/music/albums/${encodeURIComponent(album.name)}${periodParam}`}
              imageShape="square"
            />
          ))}
      </Box>

      {/* Footer */}
      {source === "spotify" && albums.length === 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 6,
            textAlign: "center",
          }}
        >
          <Typography sx={{ color: "#e4e4e7", fontWeight: 600 }}>
            No Spotify listening data is available for this period.
          </Typography>
          <Typography sx={{ color: "#71717a", fontSize: "12px" }}>
            Connect Spotify to compare listening sources, or try another
            period.
          </Typography>
          <Button
            size="small"
            onClick={() =>
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("source");
                  return next;
                },
                { replace: true },
              )
            }
            sx={{ color: "#ef4444", textTransform: "none" }}
          >
            Show all sources
          </Button>
        </Box>
      )}
      <ShowMoreButton
        showAll={showAll}
        totalItems={albums.length}
        onShowMore={() => setShowAll(true)}
        itemType="Albums"
        syncLabel={sourceLabel}
      />
      <PulseAnimation />
    </MusicPageLayout>
  );
}

export default TopAlbums;