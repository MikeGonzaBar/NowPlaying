import { useMemo, useState } from "react";
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
import { Artist } from "../types";

function TopArtists() {
  const [period, setPeriod] = useState("all");
  const [source, setSource] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (period !== "all") params.set("days", period);
    if (source !== "all") params.set("source", source);
    return `top-artists/?${params.toString()}`;
  }, [period, source]);

  const { data: artists, loading } = useMusicFetch<Artist>({
    endpoint,
    dataKey: "artists",
  });

  const displayedArtists = showAll ? artists : artists.slice(0, 10);
  const periodLabel = getRankingPeriodLabel(period);
  const sourceLabel = getRankingSourceLabel(source);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <MusicPageLayout>
      {/* Header */}
      <PageHeader
        title="Top Artists"
        description={`Showing top ${artists.length} based on scrobbles | ${periodLabel} | ${sourceLabel}`}
        filterButtons={
          <RankingFilters
            period={period}
            source={source}
            entityLabel="artist"
            onPeriodChange={(value) => {
              setPeriod(value);
              setShowAll(false);
            }}
            onSourceChange={(value) => {
              setSource(value);
              setShowAll(false);
            }}
          />
        }
      />

      {/* Artists List */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {displayedArtists.map((artist, idx) => (
            <MusicItemCard
              key={idx}
              rank={idx + 1}
              isFirst={idx === 0}
              thumbnail={artist.thumbnail}
              name={artist.name}
              count={artist.count}
              countLabel="Total Scrobbles"
              topTracks={artist.top_tracks}
              to={`/music/artists/${encodeURIComponent(artist.name)}`}
              imageShape="circle"
            />
          ))}
      </Box>

      {/* Footer */}
      {source === "spotify" && artists.length === 0 && (
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
            period..
          </Typography>
          <Button
            size="small"
            onClick={() => setSource("all")}
            sx={{ color: "#ef4444", textTransform: "none" }}
          >
            Show all sources
          </Button>
        </Box>
      )}
      <ShowMoreButton
        showAll={showAll}
        totalItems={artists.length}
        onShowMore={() => setShowAll(true)}
        itemType="Artists"
        syncLabel={sourceLabel}
      />
      <PulseAnimation />
    </MusicPageLayout>
  );
}

export default TopArtists;