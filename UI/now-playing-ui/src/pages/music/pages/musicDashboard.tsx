import { useEffect, useState, useRef } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SideBar from "../../../components/sideBar";
import { authenticatedFetch } from "../../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../../config/api";
import RefreshIcon from "@mui/icons-material/Refresh";

interface DashboardStats {
    user_info: {
        username: string;
        avatar: string | null;
        location: string | null;
        member_since: string | null;
    };
    total_scrobbles: number;
    artist_count: number;
    top_artists: Array<{
        name: string;
        count: number;
        percentage: number;
        thumbnail: string | null;
        artist_lastfm_url: string | null;
    }>;
    top_albums: Array<{
        name: string;
        artist: string;
        count: number;
        thumbnail: string | null;
        track_url: string | null;
        artist_lastfm_url: string | null;
    }>;
    top_tracks: Array<{
        title: string;
        artist: string;
        count: number;
        thumbnail: string | null;
        track_url: string | null;
        artist_lastfm_url: string | null;
    }>;
    listening_trends: {
        daily_data: Array<{ date: string; count: number }>;
        average_per_day: number;
    };
    recent_activity: Array<{
        title: string;
        artist: string;
        minutes_ago: number;
    }>;
    milestones: Array<{
        title: string;
        description: string;
        progress?: number;
        completed: boolean;
    }>;
    loved_highlight: {
        title: string;
        artist: string;
        thumbnail: string | null;
    } | null;
}

function MusicDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [timeRange, setTimeRange] = useState<"30D" | "90D" | "1Y" | "ALL">("30D");
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchDashboardData = async (showLoading: boolean = true) => {
        try {
            if (showLoading) {
                setLoading(true);
            }
            const days = timeRange === "30D" ? 30 : timeRange === "90D" ? 90 : timeRange === "1Y" ? 365 : 9999;
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/dashboard-stats/?days=${days}`)
            );

            if (response.ok) {
                const data = await response.json();
                setStats(data);
                return data;
            } else {
                console.error("Failed to fetch dashboard stats");
                return null;
            }
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
            return null;
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    const fetchAllData = async () => {
        // Prevent multiple simultaneous fetches
        if (fetching || pollingIntervalRef.current) {
            alert("Data fetch is already in progress. Please wait for it to complete.");
            return;
        }

        try {
            setFetching(true);

            // Store current stats to detect changes
            const initialStats = stats;
            const initialScrobbles = initialStats?.total_scrobbles || 0;

            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.MUSIC_ENDPOINT}/fetch-lastfm-recent/?async=true`)
            );

            if (response.ok) {
                const data = await response.json();
                alert(data.message || "Data fetch started in background. This may take several minutes. The dashboard will auto-refresh when complete.");

                // Start polling to check for updates
                let pollCount = 0;
                const maxPolls = 120; // Poll for up to 10 minutes (120 * 5 seconds)

                const pollForUpdates = async () => {
                    pollCount++;

                    // Stop polling after max attempts
                    if (pollCount > maxPolls) {
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        setFetching(false);
                        alert("Data fetch is taking longer than expected. Please refresh the page manually to see updates.");
                        return;
                    }

                    const newStats = await fetchDashboardData(false); // Don't show loading spinner during polling

                    // Check if scrobbles count has increased (indicating new data)
                    if (newStats && newStats.total_scrobbles > initialScrobbles) {
                        // Data has been updated, stop polling
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        setFetching(false);
                        alert(`Data fetch complete! Found ${newStats.total_scrobbles - initialScrobbles} new scrobbles.`);
                    }
                };

                // Start polling every 5 seconds
                const interval = setInterval(pollForUpdates, 5000);
                pollingIntervalRef.current = interval;

                // Also do an initial check after 10 seconds
                setTimeout(pollForUpdates, 10000);
            } else {
                const error = await response.json();
                alert(error.error || "Failed to start data fetch");
                setFetching(false);
            }
        } catch (error) {
            console.error("Error fetching all data:", error);
            alert("Failed to start data fetch. Please try again.");
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [timeRange]);

    // Cleanup polling interval on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    const formatTimeAgo = (minutes: number): string => {
        if (minutes < 1) return "JUST NOW";
        if (minutes < 60) return `${minutes} ${minutes === 1 ? "MIN" : "MINS"} AGO`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} ${hours === 1 ? "HR" : "HRS"} AGO`;
        const days = Math.floor(hours / 24);
        return `${days} ${days === 1 ? "DAY" : "DAYS"} AGO`;
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        return `${months[date.getMonth()]} ${date.getDate()}`;
    };

    // Generate trend line data
    const generateTrendPath = () => {
        if (!stats?.listening_trends.daily_data.length) {
            return { path: "M0,150 Q50,140 100,160 T200,120 T300,140 T400,80 T500,110 T600,60 T700,90 T800,40 T900,70 T1000,50", area: "M0,150 Q50,140 100,160 T200,120 T300,140 T400,80 T500,110 T600,60 T700,90 T800,40 T900,70 T1000,50 L1000,200 L0,200 Z" };
        }
        const data = stats.listening_trends.daily_data;
        const maxCount = Math.max(...data.map(d => d.count), 1);
        const step = 1000 / (data.length - 1 || 1);
        const points: number[] = [];

        data.forEach((d, i) => {
            const x = i * step;
            const y = 200 - (d.count / maxCount) * 150;
            points.push(x, y);
        });

        // Create smooth curve using quadratic bezier
        let path = `M${points[0]},${points[1]}`;
        let areaPath = `M${points[0]},${points[1]}`;

        for (let i = 2; i < points.length; i += 2) {
            const prevX = points[i - 2];
            const prevY = points[i - 1];
            const currX = points[i];
            const currY = points[i + 1];
            const midX = (prevX + currX) / 2;
            path += ` Q${prevX},${prevY} ${midX},${(prevY + currY) / 2} T${currX},${currY}`;
            areaPath += ` Q${prevX},${prevY} ${midX},${(prevY + currY) / 2} T${currX},${currY}`;
        }

        areaPath += ` L${points[points.length - 2]},200 L${points[0]},200 Z`;

        return { path, area: areaPath };
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex" }}>
                <SideBar activeItem="Music" />
                <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                    <CircularProgress />
                </Box>
            </Box>
        );
    }

    if (!stats) {
        return (
            <Box sx={{ display: "flex" }}>
                <SideBar activeItem="Music" />
                <Box sx={{ flexGrow: 1, p: 3 }}>
                    <p>No data available</p>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#09090b", color: "#f4f4f5" }}>
            <SideBar activeItem="Music" />
            <Box sx={{ flexGrow: 1, maxWidth: "1600px", mx: "auto", px: 3, py: 4 }}>
                {/* Header */}
                <Box
                    sx={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: "16px",
                        mb: 2,
                        p: 3,
                        background: "rgba(18, 18, 20, 0.8)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        borderLeft: "4px solid #e11d48",
                    }}
                >
                    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: "center", justifyContent: "space-between", gap: 2, position: "relative", zIndex: 10 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Box sx={{ position: "relative" }}>
                                <Box
                                    component="img"
                                    alt="User Avatar"
                                    src={stats.user_info.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(stats.user_info.username)}&size=96&background=e11d48&color=fff`}
                                    sx={{
                                        width: 96,
                                        height: 96,
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: "2px solid #e11d48",
                                        p: 0.5,
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: "absolute",
                                        bottom: -4,
                                        right: -4,
                                        bgcolor: "#e11d48",
                                        borderRadius: "50%",
                                        p: 0.5,
                                        border: "2px solid #09090b",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "white" }}>
                                        verified
                                    </span>
                                </Box>
                            </Box>
                            <Box>
                                <Box component="h1" sx={{ fontSize: "24px", fontWeight: 700, color: "white", mb: 0.5, m: 0 }}>
                                    {stats.user_info.username}
                                </Box>
                                <Box sx={{ color: "#a1a1aa", fontSize: "14px", display: "flex", alignItems: "center", gap: 1 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#71717a" }}>
                                        location_on
                                    </span>
                                    {stats.user_info.location || "Unknown"} • Since {stats.user_info.member_since || "N/A"}
                                </Box>
                            </Box>
                        </Box>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                            <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
                                <Box sx={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", mb: 0.5 }}>
                                    Total Scrobbles
                                </Box>
                                <Box sx={{ fontSize: "24px", fontWeight: 700, color: "white" }}>
                                    {stats.total_scrobbles.toLocaleString()}
                                </Box>
                            </Box>
                            <Box sx={{ height: 40, width: "1px", bgcolor: "#27272a", display: { xs: "none", md: "block" } }} />
                            <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
                                <Box sx={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", mb: 0.5 }}>
                                    Artist Count
                                </Box>
                                <Box sx={{ fontSize: "24px", fontWeight: 700, color: "white", textAlign: "center" }}>
                                    {stats.artist_count.toLocaleString()}
                                </Box>
                            </Box>
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, ml: 2 }}>
                                <Box sx={{ display: "flex", p: 0.5, bgcolor: "#18181b", borderRadius: "8px", border: "1px solid #27272a" }}>
                                    {(["30D", "90D", "1Y", "ALL"] as const).map((range) => (
                                        <Button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            sx={{
                                                px: 1.5,
                                                py: 0.5,
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                borderRadius: "4px",
                                                color: timeRange === range ? "white" : "#71717a",
                                                bgcolor: timeRange === range ? "#e11d48" : "transparent",
                                                minWidth: "auto",
                                                "&:hover": {
                                                    bgcolor: timeRange === range ? "#e11d48" : "rgba(255,255,255,0.1)",
                                                },
                                            }}
                                        >
                                            {range}
                                        </Button>
                                    ))}
                                </Box>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        onClick={() => navigate("/music/history")}
                                        sx={{
                                            bgcolor: "#161618",
                                            color: "white",
                                            fontSize: "12px",
                                            px: 2,
                                            py: 0.75,
                                            border: "1px solid #262626",
                                            "&:hover": { bgcolor: "#1a1a1c", borderColor: "#e11d48" },
                                        }}
                                    >
                                        View History
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={fetchAllData}
                                        disabled={fetching}
                                        startIcon={fetching ? <CircularProgress size={16} /> : <RefreshIcon />}
                                        sx={{
                                            bgcolor: "#e11d48",
                                            color: "white",
                                            fontSize: "12px",
                                            px: 2,
                                            py: 0.75,
                                            "&:hover": { bgcolor: "#be185d" },
                                            "&:disabled": { bgcolor: "#e11d48", opacity: 0.6 },
                                        }}
                                    >
                                        {fetching ? "Fetching..." : "Fetch All Data"}
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            width: 256,
                            height: 256,
                            bgcolor: "rgba(225, 29, 72, 0.1)",
                            filter: "blur(100px)",
                            pointerEvents: "none",
                        }}
                    />
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "3fr 1fr" }, gap: 2 }}>
                    {/* Main Content */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {/* Listening Trends */}
                        <Box
                            sx={{
                                background: "rgba(18, 18, 20, 0.8)",
                                backdropFilter: "blur(8px)",
                                border: "1px solid rgba(255, 255, 255, 0.05)",
                                borderRadius: "16px",
                                p: 2,
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                                <Box>
                                    <Box sx={{ fontSize: "18px", fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                                        <span className="material-symbols-outlined" style={{ color: "#e11d48", fontSize: "20px" }}>
                                            trending_up
                                        </span>
                                        Listening Trends
                                    </Box>
                                    <Box sx={{ fontSize: "12px", color: "#71717a" }}>
                                        Average: {stats.listening_trends.average_per_day} scrobbles per day
                                    </Box>
                                </Box>
                            </Box>
                            <Box sx={{ position: "relative", height: 250, width: "100%" }}>
                                {(() => {
                                    const trendPaths = generateTrendPath();
                                    return (
                                        <Box
                                            component="svg"
                                            sx={{
                                                width: "100%",
                                                height: "100%",
                                                filter: "drop-shadow(0 0 4px #e11d48)",
                                            }}
                                            preserveAspectRatio="none"
                                            viewBox="0 0 1000 200"
                                        >
                                            <defs>
                                                <linearGradient id="grad" x1="0%" x2="0%" y1="0%" y2="100%">
                                                    <stop offset="0%" style={{ stopColor: "rgba(225, 29, 72, 0.3)", stopOpacity: 1 }} />
                                                    <stop offset="100%" style={{ stopColor: "rgba(225, 29, 72, 0)", stopOpacity: 1 }} />
                                                </linearGradient>
                                            </defs>
                                            <path
                                                d={trendPaths.area}
                                                fill="url(#grad)"
                                            />
                                            <path
                                                d={trendPaths.path}
                                                fill="none"
                                                stroke="#e11d48"
                                                strokeWidth={3}
                                            />
                                        </Box>
                                    );
                                })()}
                                <Box
                                    sx={{
                                        position: "absolute",
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "10px",
                                        color: "#71717a",
                                        mt: 1,
                                        pt: 1,
                                        borderTop: "1px solid rgba(39, 39, 42, 0.5)",
                                    }}
                                >
                                    {stats.listening_trends.daily_data.length > 0 && (
                                        <>
                                            <span>{formatDate(stats.listening_trends.daily_data[0].date)}</span>
                                            {stats.listening_trends.daily_data.length > 1 && (
                                                <>
                                                    <span>{formatDate(stats.listening_trends.daily_data[Math.floor(stats.listening_trends.daily_data.length / 4)].date)}</span>
                                                    <span>{formatDate(stats.listening_trends.daily_data[Math.floor(stats.listening_trends.daily_data.length / 2)].date)}</span>
                                                    <span>{formatDate(stats.listening_trends.daily_data[Math.floor(stats.listening_trends.daily_data.length * 3 / 4)].date)}</span>
                                                </>
                                            )}
                                            <span>TODAY</span>
                                        </>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        {/* Top Artists, Albums, Tracks */}
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
                            {/* Top Artists */}
                            <Box
                                sx={{
                                    background: "rgba(18, 18, 20, 0.8)",
                                    backdropFilter: "blur(8px)",
                                    border: "1px solid rgba(255, 255, 255, 0.05)",
                                    borderRadius: "16px",
                                    p: 1.5,
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                                    <Box sx={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a1a1aa" }}>
                                        Top Artists
                                    </Box>
                                    <Button
                                        onClick={() => navigate("/music/artists")}
                                        sx={{ fontSize: "10px", color: "#e11d48", fontWeight: 700, minWidth: "auto", p: 0, "&:hover": { textDecoration: "underline" } }}
                                    >
                                        VIEW ALL
                                    </Button>
                                </Box>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                    {stats.top_artists.slice(0, 10).map((artist, idx) => {
                                        const handleClick = () => {
                                            if (artist.artist_lastfm_url) {
                                                window.open(artist.artist_lastfm_url, "_blank");
                                            }
                                        };
                                        return (
                                            <Box
                                                key={idx}
                                                onClick={handleClick}
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                    cursor: artist.artist_lastfm_url ? "pointer" : "default",
                                                    transition: "all 0.2s",
                                                    "&:hover": artist.artist_lastfm_url ? {
                                                        transform: "translateX(4px)",
                                                        opacity: 0.8
                                                    } : {}
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    alt="Artist"
                                                    src={artist.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&size=40&background=27272a&color=fff`}
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: "50%",
                                                        objectFit: "cover",
                                                        border: "1px solid #27272a",
                                                        filter: "grayscale(100%)",
                                                        "&:hover": { filter: "grayscale(0%)" },
                                                        transition: "all 0.3s",
                                                    }}
                                                />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Box sx={{ fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {artist.name}
                                                    </Box>
                                                    <Box sx={{ width: "100%", bgcolor: "#27272a", height: 4, borderRadius: "999px", mt: 0.5 }}>
                                                        <Box
                                                            sx={{
                                                                bgcolor: "#e11d48",
                                                                height: 4,
                                                                borderRadius: "999px",
                                                                width: `${artist.percentage}%`,
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                                <Box sx={{ fontSize: "12px", color: "#71717a" }}>
                                                    {artist.count > 1000 ? `${(artist.count / 1000).toFixed(1)}k` : artist.count}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>

                            {/* Top Albums */}
                            <Box
                                sx={{
                                    background: "rgba(18, 18, 20, 0.8)",
                                    backdropFilter: "blur(8px)",
                                    border: "1px solid rgba(255, 255, 255, 0.05)",
                                    borderRadius: "16px",
                                    p: 1.5,
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                                    <Box sx={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a1a1aa" }}>
                                        Top Albums
                                    </Box>
                                    <Button
                                        onClick={() => navigate("/music/albums")}
                                        sx={{ fontSize: "10px", color: "#e11d48", fontWeight: 700, minWidth: "auto", p: 0, "&:hover": { textDecoration: "underline" } }}
                                    >
                                        VIEW ALL
                                    </Button>
                                </Box>
                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0.75 }}>
                                    {stats.top_albums.slice(0, 4).map((album, idx) => {
                                        const handleClick = () => {
                                            if (album.track_url) {
                                                window.open(album.track_url, "_blank");
                                            } else if (album.artist_lastfm_url) {
                                                window.open(album.artist_lastfm_url, "_blank");
                                            }
                                        };
                                        return (
                                            <Box
                                                key={idx}
                                                onClick={handleClick}
                                                sx={{
                                                    position: "relative",
                                                    aspectRatio: "1",
                                                    borderRadius: "8px",
                                                    overflow: "hidden",
                                                    border: "1px solid #27272a",
                                                    cursor: (album.track_url || album.artist_lastfm_url) ? "pointer" : "default",
                                                    transition: "all 0.3s",
                                                    "&:hover": {
                                                        borderColor: (album.track_url || album.artist_lastfm_url) ? "#e11d48" : "#27272a",
                                                        transform: (album.track_url || album.artist_lastfm_url) ? "scale(1.05)" : "none",
                                                    },
                                                    "&:hover .album-overlay": { opacity: 1 },
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    alt="Album"
                                                    src={album.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(album.name)}&size=150&background=27272a&color=fff`}
                                                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                />
                                                <Box
                                                    className="album-overlay"
                                                    sx={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        bgcolor: "rgba(0,0,0,0.6)",
                                                        opacity: 0,
                                                        transition: "opacity 0.3s",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        p: 1,
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    <Box sx={{ fontSize: "10px", fontWeight: 700, lineHeight: 1.2, mb: 0.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                        {album.name}
                                                    </Box>
                                                    <Box sx={{ fontSize: "9px", color: "#e11d48" }}>{album.count} Plays</Box>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>

                            {/* Top Tracks */}
                            <Box
                                sx={{
                                    background: "rgba(18, 18, 20, 0.8)",
                                    backdropFilter: "blur(8px)",
                                    border: "1px solid rgba(255, 255, 255, 0.05)",
                                    borderRadius: "16px",
                                    p: 1.5,
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                                    <Box sx={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a1a1aa" }}>
                                        Top Tracks
                                    </Box>
                                    <Button
                                        onClick={() => navigate("/music/tracks")}
                                        sx={{ fontSize: "10px", color: "#e11d48", fontWeight: 700, minWidth: "auto", p: 0, "&:hover": { textDecoration: "underline" } }}
                                    >
                                        VIEW ALL
                                    </Button>
                                </Box>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                    {stats.top_tracks.slice(0, 10).map((track, idx) => {
                                        const handleClick = () => {
                                            if (track.track_url) {
                                                window.open(track.track_url, "_blank");
                                            } else if (track.artist_lastfm_url) {
                                                window.open(track.artist_lastfm_url, "_blank");
                                            }
                                        };
                                        return (
                                            <Box
                                                key={idx}
                                                onClick={handleClick}
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1,
                                                    cursor: (track.track_url || track.artist_lastfm_url) ? "pointer" : "default",
                                                    transition: "all 0.2s",
                                                    "&:hover": (track.track_url || track.artist_lastfm_url) ? {
                                                        transform: "translateX(4px)",
                                                        opacity: 0.8
                                                    } : {}
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    alt="Track"
                                                    src={track.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(track.title)}&size=40&background=27272a&color=fff`}
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: "8px",
                                                        objectFit: "cover",
                                                        border: "1px solid #27272a",
                                                    }}
                                                />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Box sx={{ fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {track.title}
                                                    </Box>
                                                    <Box sx={{ fontSize: "12px", color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {track.artist}
                                                    </Box>
                                                </Box>
                                                <Box sx={{ fontSize: "12px", color: "#71717a" }}>
                                                    {track.count}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* Sidebar */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {/* Milestones */}
                        <Box
                            sx={{
                                background: "rgba(18, 18, 20, 0.8)",
                                backdropFilter: "blur(8px)",
                                border: "1px solid rgba(255, 255, 255, 0.05)",
                                borderRadius: "16px",
                                p: 1.5,
                            }}
                        >
                            <Box sx={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                <span className="material-symbols-outlined" style={{ color: "#e11d48", fontSize: "16px" }}>
                                    emoji_events
                                </span>
                                Milestones
                            </Box>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                {stats.milestones.slice(0, 2).map((milestone, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            p: 1,
                                            bgcolor: "rgba(24, 24, 27, 0.5)",
                                            borderRadius: "12px",
                                            border: "1px solid #27272a",
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: 1,
                                            opacity: milestone.completed ? 1 : 0.6,
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ color: milestone.completed ? "#fbbf24" : "#71717a", fontSize: "20px", marginTop: 2 }}>
                                            {milestone.completed ? "military_tech" : "stars"}
                                        </span>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ fontSize: "14px", fontWeight: 700 }}>{milestone.title}</Box>
                                            <Box sx={{ fontSize: "11px", color: "#71717a" }}>{milestone.description}</Box>
                                            {milestone.progress !== undefined && (
                                                <Box sx={{ width: "100%", bgcolor: "#27272a", height: 6, borderRadius: "999px", mt: 1 }}>
                                                    <Box
                                                        sx={{
                                                            bgcolor: "#e11d48",
                                                            height: 6,
                                                            borderRadius: "999px",
                                                            width: `${milestone.progress}%`,
                                                        }}
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        {/* Recent Activity */}
                        <Box
                            sx={{
                                background: "rgba(18, 18, 20, 0.8)",
                                backdropFilter: "blur(8px)",
                                border: "1px solid rgba(255, 255, 255, 0.05)",
                                borderRadius: "16px",
                                p: 1.5,
                            }}
                        >
                            <Box sx={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a", mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span>Recent Activity</span>
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", animation: "pulse 2s infinite" }} />
                            </Box>
                            <Box sx={{ maxHeight: 400, overflowY: "auto", pr: 0.5 }}>
                                <style>
                                    {`
                                        @keyframes pulse {
                                            0%, 100% { opacity: 1; }
                                            50% { opacity: 0.5; }
                                        }
                                        ::-webkit-scrollbar { width: 4px; }
                                        ::-webkit-scrollbar-track { background: transparent; }
                                        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
                                    `}
                                </style>
                                {stats.recent_activity.map((activity, idx) => (
                                    <Box key={idx} sx={{ display: "flex", gap: 1, position: "relative", mb: idx < stats.recent_activity.length - 1 ? 1 : 0 }}>
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: "4px",
                                                    border: "1px solid #3f3f46",
                                                    bgcolor: "#18181b",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                                    play_arrow
                                                </span>
                                            </Box>
                                            {idx < stats.recent_activity.length - 1 && (
                                                <Box sx={{ width: "1px", height: "100%", bgcolor: "#18181b", my: 0.5 }} />
                                            )}
                                        </Box>
                                        <Box sx={{ pb: idx < stats.recent_activity.length - 1 ? 1 : 0 }}>
                                            <Box sx={{ fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {activity.title}
                                            </Box>
                                            <Box sx={{ fontSize: "10px", color: "#71717a" }}>{activity.artist}</Box>
                                            <Box sx={{ fontSize: "9px", color: "#52525b", mt: 0.5, textTransform: "uppercase" }}>
                                                {formatTimeAgo(activity.minutes_ago)}
                                            </Box>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        {/* Loved Highlights */}
                        {stats.loved_highlight && (
                            <Box
                                sx={{
                                    background: "rgba(18, 18, 20, 0.8)",
                                    backdropFilter: "blur(8px)",
                                    border: "1px solid rgba(255, 255, 255, 0.05)",
                                    borderTop: "2px solid #e11d48",
                                    borderRadius: "16px",
                                    p: 1.5,
                                }}
                            >
                                <Box sx={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                    <span className="material-symbols-outlined" style={{ color: "#e11d48", fontSize: "16px" }}>
                                        favorite
                                    </span>
                                    Loved Highlights
                                </Box>
                                <Box
                                    sx={{
                                        position: "relative",
                                        borderRadius: "12px",
                                        overflow: "hidden",
                                        border: "1px solid #27272a",
                                        "&:hover img": { transform: "scale(1.1)" },
                                    }}
                                >
                                    <Box
                                        component="img"
                                        alt="Loved Track"
                                        src={stats.loved_highlight.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(stats.loved_highlight.title)}&size=300&background=27272a&color=fff`}
                                        sx={{
                                            width: "100%",
                                            height: 128,
                                            objectFit: "cover",
                                            opacity: 0.5,
                                            transition: "transform 0.5s",
                                        }}
                                    />
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            inset: 0,
                                            p: 1.5,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "flex-end",
                                            background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
                                        }}
                                    >
                                        <Box sx={{ fontSize: "12px", fontWeight: 700 }}>{stats.loved_highlight.title}</Box>
                                        <Box sx={{ fontSize: "10px", color: "#a1a1aa" }}>{stats.loved_highlight.artist}</Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export default MusicDashboard;
