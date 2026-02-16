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
import { Album } from "../types";

function TopAlbums() {
    const { data: albums, loading } = useMusicFetch<Album>({
        endpoint: "top-albums/?limit=100",
        dataKey: "albums",
    });
    const [showAll, setShowAll] = useState(false);

    const displayedAlbums = showAll ? albums : albums.slice(0, 10);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <MusicPageLayout>
            {/* Header */}
            <PageHeader
                title="Top Albums"
                description={`Showing top ${albums.length} based on plays | All time`}
                filterButtons={
                    <>
                        <FilterButton icon="calendar_today" label="Last 30 Days" />
                        <FilterButton icon="filter_list" label="Filters" />
                    </>
                }
            />

            {/* Albums List */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {displayedAlbums.map((album, idx) => {
                    const handleClick = () => {
                        if (album.track_url) {
                            window.open(album.track_url, "_blank");
                        }
                    };

                    return (
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
                            onClick={handleClick}
                            url={album.track_url}
                            imageShape="square"
                        />
                    );
                })}
            </Box>

            {/* Footer */}
            <ShowMoreButton
                showAll={showAll}
                totalItems={albums.length}
                onShowMore={() => setShowAll(true)}
                itemType="Albums"
            />
            <PulseAnimation />
        </MusicPageLayout>
    );
}

export default TopAlbums;
