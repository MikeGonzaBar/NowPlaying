import { Box, Card, Typography, IconButton, LinearProgress } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

interface Season {
    id: number;
    season_number: number;
    show__id: number;
    show__title: string;
    show__trakt_id: string;
}

interface Episode {
    id: number;
    episode_number: number;
    title: string | null;
    image_url: string | null;
    rating: number | null;
    overview: string | null;
    season__id: number;
    season__season_number: number;
    show__id: number;
    show__title: string;
    show__trakt_id: string;
    last_watched_at: string | null;
    progress: number | null;
}

interface SeasonProgressProps {
    seasons: Season[];
    episodesBySeason: Record<number, Episode[]>;
    expandedSeasons: Set<number>;
    onToggleSeason: (seasonNumber: number) => void;
}

function SeasonProgress({ seasons, episodesBySeason, expandedSeasons, onToggleSeason }: SeasonProgressProps) {
    const getSeasonProgress = (seasonNumber: number) => {
        const episodes = episodesBySeason[seasonNumber] || [];
        if (episodes.length === 0) return { watched: 0, total: 0, percentage: 0 };

        const watched = episodes.filter((ep) => ep.last_watched_at).length;
        const total = episodes.length;
        const percentage = total > 0 ? Math.round((watched / total) * 100) : 0;

        return { watched, total, percentage };
    };

    const isSeasonCompleted = (seasonNumber: number) => {
        const { watched, total } = getSeasonProgress(seasonNumber);
        return total > 0 && watched === total;
    };

    const isSeasonLocked = (seasonNumber: number) => {
        // A season is locked if previous seasons aren't completed
        // For simplicity, we'll mark seasons as locked if they're significantly higher than completed ones
        const completedSeasons = seasons.filter((s) => isSeasonCompleted(s.season_number));
        const maxCompleted = completedSeasons.length > 0
            ? Math.max(...completedSeasons.map((s) => s.season_number))
            : 0;
        return seasonNumber > maxCompleted + 1;
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography
                    sx={{
                        color: "#fff",
                        fontSize: "22px",
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                    }}
                >
                    Season Progress
                </Typography>
                <Typography
                    component="button"
                    onClick={() => {
                        // Expand all logic could go here
                    }}
                    sx={{
                        color: "#ed1c24",
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        "&:hover": {
                            textDecoration: "underline",
                        },
                    }}
                >
                    Expand All <ExpandMoreIcon sx={{ fontSize: 16 }} />
                </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {seasons.map((season) => {
                    const { watched, total, percentage } = getSeasonProgress(season.season_number);
                    const completed = isSeasonCompleted(season.season_number);
                    const locked = isSeasonLocked(season.season_number);
                    const expanded = expandedSeasons.has(season.season_number);
                    const episodes = episodesBySeason[season.season_number] || [];
                    const sortedEpisodes = [...episodes].sort((a, b) => a.episode_number - b.episode_number);

                    return (
                        <Card
                            key={season.id}
                            sx={{
                                backgroundColor: "rgba(34, 16, 17, 0.6)",
                                backdropFilter: "blur(12px)",
                                border: "1px solid rgba(238, 32, 39, 0.1)",
                                borderLeft: `4px solid ${completed ? "#ed1c24" : locked ? "rgba(255, 255, 255, 0.1)" : "rgba(237, 28, 36, 0.3)"}`,
                                borderRadius: 3,
                                p: 2,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                                opacity: locked ? 0.5 : 1,
                                filter: locked ? "grayscale(100%)" : "none",
                            }}
                        >
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 2,
                                            backgroundImage: episodes[0]?.image_url
                                                ? `url(${episodes[0].image_url})`
                                                : "none",
                                            backgroundColor: episodes[0]?.image_url ? "transparent" : "#27272a",
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                        }}
                                    />
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, color: "#fff" }}>
                                            Season {season.season_number}
                                        </Typography>
                                        <Typography sx={{ color: "#b99d9d", fontSize: "12px" }}>
                                            {total} Episode{total !== 1 ? "s" : ""} • {completed ? "Completed" : locked ? "Locked" : `${watched} Watched`}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Typography
                                        sx={{
                                            color: completed ? "#ed1c24" : "#fff",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            textAlign: "right",
                                        }}
                                    >
                                        {percentage}%
                                    </Typography>
                                    {locked ? (
                                        <IconButton
                                            size="small"
                                            disabled
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                color: "#6b7280",
                                            }}
                                        >
                                            <LockIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    ) : (
                                        <IconButton
                                            size="small"
                                            onClick={() => onToggleSeason(season.season_number)}
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                color: "#fff",
                                                "&:hover": {
                                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                },
                                            }}
                                        >
                                            {expanded ? (
                                                <ExpandLessIcon sx={{ fontSize: 18 }} />
                                            ) : (
                                                <ExpandMoreIcon sx={{ fontSize: 18 }} />
                                            )}
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>

                            {/* Progress Bar */}
                            <LinearProgress
                                variant="determinate"
                                value={percentage}
                                sx={{
                                    height: 6,
                                    borderRadius: "9999px",
                                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                                    "& .MuiLinearProgress-bar": {
                                        backgroundColor: completed ? "#ed1c24" : locked ? "rgba(255, 255, 255, 0.2)" : "rgba(237, 28, 36, 0.6)",
                                    },
                                }}
                            />

                            {/* Expanded Episode List */}
                            {expanded && !locked && sortedEpisodes.length > 0 && (
                                <Box sx={{ pt: 2, borderTop: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", flexDirection: "column", gap: 1.5 }}>
                                    {sortedEpisodes.map((episode) => {
                                        const isWatched = !!episode.last_watched_at;
                                        return (
                                            <Box
                                                key={episode.id || `s${season.season_number}e${episode.episode_number}`}
                                                sx={{
                                                    display: "flex",
                                                    gap: 1.5,
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                                                    border: "1px solid rgba(255, 255, 255, 0.05)",
                                                    "&:hover": {
                                                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                        borderColor: "rgba(237, 28, 36, 0.3)",
                                                    },
                                                }}
                                            >
                                                {/* Episode Image */}
                                                {episode.image_url ? (
                                                    <Box
                                                        sx={{
                                                            width: 120,
                                                            height: 67,
                                                            minWidth: 120,
                                                            borderRadius: 1.5,
                                                            overflow: "hidden",
                                                            backgroundColor: "#27272a",
                                                            backgroundImage: `url(${episode.image_url})`,
                                                            backgroundSize: "cover",
                                                            backgroundPosition: "center",
                                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                                        }}
                                                    />
                                                ) : (
                                                    <Box
                                                        sx={{
                                                            width: 120,
                                                            height: 67,
                                                            minWidth: 120,
                                                            borderRadius: 1.5,
                                                            backgroundColor: "#27272a",
                                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                        }}
                                                    >
                                                        <Typography sx={{ color: "#6b7280", fontSize: "10px" }}>
                                                            No Image
                                                        </Typography>
                                                    </Box>
                                                )}

                                                {/* Episode Info */}
                                                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                                        <Typography
                                                            sx={{
                                                                color: isWatched ? "#b99d9d" : "#fff",
                                                                fontStyle: !isWatched ? "italic" : "normal",
                                                                fontWeight: !isWatched ? 500 : 600,
                                                                fontSize: "13px",
                                                            }}
                                                        >
                                                            E{episode.episode_number.toString().padStart(2, "0")} • {episode.title || `Episode ${episode.episode_number}`}
                                                        </Typography>
                                                        {isWatched ? (
                                                            <CheckCircleIcon sx={{ color: "#ed1c24", fontSize: 18, flexShrink: 0 }} />
                                                        ) : (
                                                            <RadioButtonUncheckedIcon sx={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 18, flexShrink: 0 }} />
                                                        )}
                                                    </Box>
                                                    {episode.overview && (
                                                        <Typography
                                                            sx={{
                                                                color: "#9ca3af",
                                                                fontSize: "11px",
                                                                lineHeight: 1.5,
                                                                display: "-webkit-box",
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: "vertical",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                            }}
                                                        >
                                                            {episode.overview}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </Card>
                    );
                })}
            </Box>
        </Box>
    );
}

export default SeasonProgress;
