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
import { Artist } from "../types";

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

function TopArtists() {
    const [period, setPeriod] = useState("all");
    const [source, setSource] = useState("all");
    const [periodAnchor, setPeriodAnchor] = useState<null | HTMLElement>(null);
    const [sourceAnchor, setSourceAnchor] = useState<null | HTMLElement>(null);
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
    const periodLabel = PERIOD_OPTIONS.find((option) => option.value === period)?.label || "All time";
    const sourceLabel = SOURCE_OPTIONS.find((option) => option.value === source)?.label || "All sources";

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
                        <>
                            <FilterButton
                                icon="calendar_today"
                                label={periodLabel}
                                active={period !== "all"}
                                onClick={(event) => setPeriodAnchor(event.currentTarget)}
                                ariaLabel="Choose artist period"
                            />
                            <FilterButton
                                icon="filter_list"
                                label={sourceLabel}
                                active={source !== "all"}
                                onClick={(event) => setSourceAnchor(event.currentTarget)}
                                ariaLabel="Choose artist source"
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
