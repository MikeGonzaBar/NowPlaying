import { useMemo, useState } from "react";
import { Box, Menu, MenuItem } from "@mui/material";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { FilterButton } from "../components/FilterButton";
import { MusicItemCard } from "../components/MusicItemCard";
import { ShowMoreButton } from "../components/ShowMoreButton";
import { PulseAnimation } from "../components/PulseAnimation";
import { MusicPageLayout } from "../components/MusicPageLayout";
import { useMusicFetch } from "../hooks/useMusicFetch";
import { Album } from "../types";

const PERIOD_OPTIONS = [
    { label: "All time", value: "all" },
    { label: "Last 365 days", value: "365" },
    { label: "Last 90 days", value: "90" },
    { label: "Last 30 days", value: "30" },
];

const SOURCE_OPTIONS = [
    { label: "All sources", value: "all" },
    { label: "Last.fm", value: "lastfm" },
    { label: "Spotify", value: "spotify" },
];

function TopAlbums() {
    const [period, setPeriod] = useState("all");
    const [source, setSource] = useState("all");
    const [periodAnchor, setPeriodAnchor] = useState<null | HTMLElement>(null);
    const [sourceAnchor, setSourceAnchor] = useState<null | HTMLElement>(null);
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
    const periodLabel = PERIOD_OPTIONS.find((option) => option.value === period)?.label || "All time";
    const sourceLabel = SOURCE_OPTIONS.find((option) => option.value === source)?.label || "All sources";

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
                    <>
                        <FilterButton
                            icon="calendar_today"
                            label={periodLabel}
                            active={period !== "all"}
                            onClick={(event) => setPeriodAnchor(event.currentTarget)}
                            ariaLabel="Choose album period"
                        />
                        <FilterButton
                            icon="filter_list"
                            label={sourceLabel}
                            active={source !== "all"}
                            onClick={(event) => setSourceAnchor(event.currentTarget)}
                            ariaLabel="Choose album source"
                        />
                    </>
                }
            />
            <Menu
                anchorEl={periodAnchor}
                open={Boolean(periodAnchor)}
                onClose={() => setPeriodAnchor(null)}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: "#161618",
                            color: "#e4e4e7",
                            border: "1px solid #262626",
                        },
                    },
                }}
            >
                {PERIOD_OPTIONS.map((option) => (
                    <MenuItem
                        key={option.value}
                        selected={period === option.value}
                        onClick={() => {
                            setPeriod(option.value);
                            setShowAll(false);
                            setPeriodAnchor(null);
                        }}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </Menu>
            <Menu
                anchorEl={sourceAnchor}
                open={Boolean(sourceAnchor)}
                onClose={() => setSourceAnchor(null)}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: "#161618",
                            color: "#e4e4e7",
                            border: "1px solid #262626",
                        },
                    },
                }}
            >
                {SOURCE_OPTIONS.map((option) => (
                    <MenuItem
                        key={option.value}
                        selected={source === option.value}
                        onClick={() => {
                            setSource(option.value);
                            setShowAll(false);
                            setSourceAnchor(null);
                        }}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </Menu>

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
