import { useState } from "react";
import { Box } from "@mui/material";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { FilterButton } from "../components/FilterButton";
import { MusicItemCard } from "../components/MusicItemCard";
import { ShowMoreButton } from "../components/ShowMoreButton";
import { PulseAnimation } from "../components/PulseAnimation";
import { MusicPageLayout } from "../components/MusicPageLayout";
import { useMusicFetch } from "../hooks/useMusicFetch";
import { Artist } from "../types";

function TopArtists() {
    const { data: artists, loading } = useMusicFetch<Artist>({
        endpoint: "top-artists/?limit=100",
        dataKey: "artists",
    });
    const [showAll, setShowAll] = useState(false);

    const displayedArtists = showAll ? artists : artists.slice(0, 10);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <MusicPageLayout>
                {/* Header */}
                <PageHeader
                    title="Top Artists"
                    description={`Showing top ${artists.length} based on scrobbles | All time`}
                    filterButtons={
                        <>
                            <FilterButton icon="calendar_today" label="Last 30 Days" />
                            <FilterButton icon="filter_list" label="Filters" />
                        </>
                    }
                />

                {/* Artists List */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {displayedArtists.map((artist, idx) => {
                        const handleClick = () => {
                            if (artist.artist_lastfm_url) {
                                window.open(artist.artist_lastfm_url, "_blank");
                            }
                        };

                        return (
                            <MusicItemCard
                                key={idx}
                                rank={idx + 1}
                                isFirst={idx === 0}
                                thumbnail={artist.thumbnail}
                                name={artist.name}
                                count={artist.count}
                                countLabel="Total Scrobbles"
                                topTracks={artist.top_tracks}
                                onClick={handleClick}
                                url={artist.artist_lastfm_url}
                                imageShape="circle"
                            />
                        );
                    })}
                </Box>

                {/* Footer */}
                <ShowMoreButton
                    showAll={showAll}
                    totalItems={artists.length}
                    onShowMore={() => setShowAll(true)}
                    itemType="Artists"
                />
            <PulseAnimation />
        </MusicPageLayout>
    );
}

export default TopArtists;
