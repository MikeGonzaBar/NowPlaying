import { useEffect, useMemo, useState, ReactNode, useRef } from "react";
import { Box, Typography, Alert, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, IconButton, Button, LinearProgress, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Settings, Trophy, Clock, TrendingUp, RefreshCw, X, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import SideBar from "../../../components/sideBar";
import { useGameData } from "../hooks/useGameData";
import { authenticatedFetch } from "../../../utils/auth";
import { API_CONFIG, getApiUrl } from "../../../config/api";
import { zincColors, categoryColors } from "../../../theme";
import { calculateAchievementPercentage, formatPlaytime, parseDate } from "../utils/utils";
import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame, SteamAchievement, PsnAchievement, RetroAchievementsAchievement, XboxAchievement } from "../utils/types";
import { isPsnGame, isXboxGame, isRetroAchievementsGame, isSteamGame } from "../utils/typeGuards";

function Games() {
    const beBaseUrl = `http://${window.location.hostname}:8080`;
    const navigate = useNavigate();
    const [reconnectOpen, setReconnectOpen] = useState(false);
    const [npsso, setNpsso] = useState("");
    const [saving, setSaving] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const recentlyPlayedScrollRef = useRef<HTMLDivElement>(null);
    const recent100ScrollRef = useRef<HTMLDivElement>(null);
    const [recentlyPlayedScrollIndex, setRecentlyPlayedScrollIndex] = useState(0);
    const [recent100ScrollIndex, setRecent100ScrollIndex] = useState(0);
    const [needsCarouselRecentlyPlayed, setNeedsCarouselRecentlyPlayed] = useState(false);
    const [needsCarouselRecent100, setNeedsCarouselRecent100] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

    const {
        latestPlayedGames,
        mostPlayed,
        loading,
        error,
        clearError,
        refreshSteam,
        refreshPSN,
        refreshXbox,
        refreshRetroAchievements,
        configuredServices,
        updatingPlatforms,
        getGamePlatform,
    } = useGameData(beBaseUrl);

    // Get recently played (top 10)
    const recentlyPlayed = useMemo(() => latestPlayedGames.slice(0, 10), [latestPlayedGames]);

    // Filter games by platform when a platform is selected
    const filteredGames = useMemo(() => {
        if (!selectedPlatform) return latestPlayedGames;
        return latestPlayedGames.filter((game) => getGamePlatform(game) === selectedPlatform);
    }, [latestPlayedGames, selectedPlatform, getGamePlatform]);

    // Get recent 100% completed games (last 10)
    const recent100Percent = useMemo(() => {
        return latestPlayedGames
            .filter((game) => {
                const percentage = calculateAchievementPercentage(game);
                return percentage >= 100;
            })
            .slice(0, 10);
    }, [latestPlayedGames]);

    // Check if carousel is needed after content loads
    useEffect(() => {
        const checkCarouselNeeds = () => {
            if (recentlyPlayedScrollRef.current) {
                const container = recentlyPlayedScrollRef.current;
                // Add a small threshold to account for rounding
                const needsCarousel = container.scrollWidth > container.clientWidth + 5;
                setNeedsCarouselRecentlyPlayed(needsCarousel);
            }
            if (recent100ScrollRef.current) {
                const container = recent100ScrollRef.current;
                const needsCarousel = container.scrollWidth > container.clientWidth + 5;
                setNeedsCarouselRecent100(needsCarousel);
            }
        };

        // Check multiple times to ensure DOM is fully rendered
        const timers = [
            setTimeout(checkCarouselNeeds, 50),
            setTimeout(checkCarouselNeeds, 200),
            setTimeout(checkCarouselNeeds, 500),
        ];

        // Also check on window resize
        window.addEventListener('resize', checkCarouselNeeds);

        // Use ResizeObserver for more reliable detection
        const observers: ResizeObserver[] = [];
        if (recentlyPlayedScrollRef.current) {
            const observer = new ResizeObserver(checkCarouselNeeds);
            observer.observe(recentlyPlayedScrollRef.current);
            observers.push(observer);
        }
        if (recent100ScrollRef.current) {
            const observer = new ResizeObserver(checkCarouselNeeds);
            observer.observe(recent100ScrollRef.current);
            observers.push(observer);
        }

        return () => {
            timers.forEach(timer => clearTimeout(timer));
            window.removeEventListener('resize', checkCarouselNeeds);
            observers.forEach(observer => observer.disconnect());
        };
    }, [recentlyPlayed, recent100Percent, loading]);

    // Extract recent achievements from all games
    const recentAchievements = useMemo(() => {
        const allAchievements: Array<{
            game: string;
            name: string;
            description: string;
            image: string;
            unlockTime: string;
            platform: string;
            appid: number | string;
            rawGame: SteamGame | PsnGame | XboxGame | RetroAchievementsGame;
        }> = [];

        latestPlayedGames.forEach((game) => {
            if (isSteamGame(game) && game.achievements) {
                game.achievements
                    .filter((a: SteamAchievement) => a.unlocked && a.unlock_time)
                    .forEach((a: SteamAchievement) => {
                        allAchievements.push({
                            game: game.name,
                            name: a.name,
                            description: a.description || "",
                            image: a.image || "",
                            unlockTime: a.unlock_time || "",
                            platform: "steam",
                            appid: game.appid,
                            rawGame: game,
                        });
                    });
            } else if (isPsnGame(game) && game.achievements) {
                game.achievements
                    .filter((a: PsnAchievement) => a.unlocked && a.unlock_time)
                    .forEach((a: PsnAchievement) => {
                        allAchievements.push({
                            game: game.name,
                            name: a.name,
                            description: a.description || "",
                            image: a.image || "",
                            unlockTime: a.unlock_time || "",
                            platform: "psn",
                            appid: game.appid,
                            rawGame: game,
                        });
                    });
            } else if (isXboxGame(game) && game.achievements) {
                game.achievements
                    .filter((a: XboxAchievement) => a.unlocked && a.unlock_time)
                    .forEach((a: XboxAchievement) => {
                        allAchievements.push({
                            game: game.name,
                            name: a.name,
                            description: a.description || "",
                            image: a.image || "",
                            unlockTime: a.unlock_time || "",
                            platform: "xbox",
                            appid: game.appid,
                            rawGame: game,
                        });
                    });
            } else if (isRetroAchievementsGame(game) && game.achievements) {
                game.achievements
                    .filter((a: RetroAchievementsAchievement) => a.unlocked && a.unlock_time)
                    .forEach((a: RetroAchievementsAchievement) => {
                        allAchievements.push({
                            game: game.name,
                            name: a.name,
                            description: a.description || "",
                            image: a.image || "",
                            unlockTime: a.unlock_time || "",
                            platform: "retroachievements",
                            appid: game.appid,
                            rawGame: game,
                        });
                    });
            }
        });

        return allAchievements
            .sort((a, b) => {
                const dateA = parseDate(a.unlockTime).getTime();
                const dateB = parseDate(b.unlockTime).getTime();
                return dateB - dateA;
            })
            .slice(0, 5);
    }, [latestPlayedGames]);

    // Calculate average achievement percentage per platform
    const platformAchievements = useMemo(() => {
        const platforms: Record<string, {
            percentage: number;
            psnTrophies?: {
                bronze: { unlocked: number; total: number };
                silver: { unlocked: number; total: number };
                gold: { unlocked: number; total: number };
                platinum: { unlocked: number; total: number };
            };
        }> = {
            steam: { percentage: 0 },
            psn: { percentage: 0, psnTrophies: { bronze: { unlocked: 0, total: 0 }, silver: { unlocked: 0, total: 0 }, gold: { unlocked: 0, total: 0 }, platinum: { unlocked: 0, total: 0 } } },
            xbox: { percentage: 0 },
            retroachievements: { percentage: 0 },
        };

        const platformCounts: Record<string, number> = {
            steam: 0,
            psn: 0,
            xbox: 0,
            retroachievements: 0,
        };

        latestPlayedGames.forEach((game) => {
            const platform = getGamePlatform(game);
            if (!platforms[platform]) return;

            const percentage = calculateAchievementPercentage(game);

            // Only count games with valid percentages (not NaN and > 0 or has achievement data)
            if (!isNaN(percentage) && isFinite(percentage)) {
                platforms[platform].percentage += percentage;
                platformCounts[platform]++;
            }

            // For PSN, aggregate trophy counts (only if game has trophy data)
            if (platform === "psn" && isPsnGame(game) && platforms.psn.psnTrophies) {
                platforms.psn.psnTrophies.bronze.unlocked += game.unlocked_achievements?.bronze || 0;
                platforms.psn.psnTrophies.bronze.total += game.total_achievements?.bronze || 0;
                platforms.psn.psnTrophies.silver.unlocked += game.unlocked_achievements?.silver || 0;
                platforms.psn.psnTrophies.silver.total += game.total_achievements?.silver || 0;
                platforms.psn.psnTrophies.gold.unlocked += game.unlocked_achievements?.gold || 0;
                platforms.psn.psnTrophies.gold.total += game.total_achievements?.gold || 0;
                platforms.psn.psnTrophies.platinum.unlocked += game.unlocked_achievements?.platinum || 0;
                platforms.psn.psnTrophies.platinum.total += game.total_achievements?.platinum || 0;
            }
        });

        // Calculate averages
        Object.keys(platforms).forEach((platform) => {
            if (platformCounts[platform] > 0) {
                const avg = platforms[platform].percentage / platformCounts[platform];
                platforms[platform].percentage = isNaN(avg) || !isFinite(avg) ? 0 : Math.round(avg);
            } else {
                platforms[platform].percentage = 0;
            }
        });

        return platforms;
    }, [latestPlayedGames, getGamePlatform]);

    // Get top played games (top 5)
    const topPlayedGames = useMemo(() => mostPlayed.slice(0, 5), [mostPlayed]);

    // Platform configuration
    const platformConfig = {
        steam: { name: "Steam", color: "#1b2838" },
        psn: { name: "PlayStation", color: "#003791" },
        xbox: { name: "Xbox", color: "#107c10" },
        retroachievements: { name: "RetroAchievements", color: "#ff6b35" },
    };

    const getGameImageUrl = (game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame): string => {
        if (isPsnGame(game) && game.img_icon_url) return game.img_icon_url;
        if (isRetroAchievementsGame(game) && game.image_title) return game.image_title;
        if (game.img_icon_url) return game.img_icon_url;
        return `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
    };


    const isPsnError = useMemo(() => {
        if (!error) return false;
        const msg = error.toLowerCase();
        return msg.includes("npsso") || msg.includes("playstation");
    }, [error]);

    useEffect(() => {
        if (isPsnError) {
            setReconnectOpen(true);
        }
    }, [isPsnError]);

    const handleReconnect = async () => {
        try {
            setSaving(true);
            const resp = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.PSN_ENDPOINT}/exchange-npsso/`),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ npsso: npsso.trim() }),
                }
            );
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                throw new Error(data?.error || data?.detail || "Failed to store NPSSO");
            }
            await refreshPSN();
            clearError();
            setReconnectOpen(false);
            setNpsso("");
            setSnackbarOpen(true);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to reconnect PlayStation";
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const getPlatformIcon = (platformKey: string): string => {
        switch (platformKey) {
            case "steam": return "/Platforms/steam.webp";
            case "psn": return "/Platforms/playstation.webp";
            case "xbox": return "/Platforms/xbox.svg";
            case "retroachievements": return "/Platforms/retroachievements.png";
            default: return "/Platforms/steam.webp";
        }
    };

    const getPlatformIconSize = (platformKey: string): number => {
        // Xbox icon needs to be bigger
        return platformKey === "xbox" ? 60 : 24;
    };

    const getProgressBarColor = (percentage: number): string => {
        if (percentage >= 90) return categoryColors.music; // Green for high completion
        if (percentage >= 70) return "#f59e0b"; // Orange/Amber for good progress
        if (percentage >= 50) return categoryColors.games; // Blue for medium
        return zincColors.muted; // Gray for low
    };

    const getAchievementDisplay = (game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame): ReactNode => {
        if (isSteamGame(game)) {
            return (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: "11px",
                        color: zincColors.muted,
                    }}
                >
                    {`${game.unlocked_achievements_count || 0}/${game.total_achievements || 0}`}
                </Typography>
            );
        } else if (isPsnGame(game)) {
            return (
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
                    {game.total_achievements?.platinum !== undefined && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Box
                                component="img"
                                src="/PSN_Trophies/PSN_platinum.png"
                                alt="Platinum"
                                sx={{ width: 14, height: 14, objectFit: "contain" }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: "11px",
                                    color: zincColors.muted,
                                }}
                            >
                                {`${game.unlocked_achievements?.platinum || 0}/${game.total_achievements.platinum}`}
                            </Typography>
                        </Box>
                    )}
                    {game.total_achievements?.gold !== undefined && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Box
                                component="img"
                                src="/PSN_Trophies/PSN_gold.png"
                                alt="Gold"
                                sx={{ width: 14, height: 14, objectFit: "contain" }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: "11px",
                                    color: zincColors.muted,
                                }}
                            >
                                {`${game.unlocked_achievements?.gold || 0}/${game.total_achievements.gold}`}
                            </Typography>
                        </Box>
                    )}
                    {game.total_achievements?.silver !== undefined && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Box
                                component="img"
                                src="/PSN_Trophies/PSN_silver.png"
                                alt="Silver"
                                sx={{ width: 14, height: 14, objectFit: "contain" }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: "11px",
                                    color: zincColors.muted,
                                }}
                            >
                                {`${game.unlocked_achievements?.silver || 0}/${game.total_achievements.silver}`}
                            </Typography>
                        </Box>
                    )}
                    {game.total_achievements?.bronze !== undefined && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                            <Box
                                component="img"
                                src="/PSN_Trophies/PSN_bronze.png"
                                alt="Bronze"
                                sx={{ width: 14, height: 14, objectFit: "contain" }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: "11px",
                                    color: zincColors.muted,
                                }}
                            >
                                {`${game.unlocked_achievements?.bronze || 0}/${game.total_achievements.bronze}`}
                            </Typography>
                        </Box>
                    )}
                </Box>
            );
        } else if (isXboxGame(game)) {
            return (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: "11px",
                        color: zincColors.muted,
                    }}
                >
                    {`${game.unlocked_achievements || 0}/${game.total_achievements || 0}`}
                </Typography>
            );
        } else if (isRetroAchievementsGame(game)) {
            return (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: "11px",
                        color: zincColors.muted,
                    }}
                >
                    {`${game.unlocked_achievements || 0}/${game.total_achievements || 0}`}
                </Typography>
            );
        }
        return null;
    };

    const CARD_WIDTH = 180;
    const CARD_GAP = 16; // gap: 2 = 16px
    const CARDS_PER_VIEW = 5;
    const SCROLL_AMOUNT = CARD_WIDTH + CARD_GAP;

    const scrollRecentlyPlayed = (direction: "left" | "right") => {
        if (!recentlyPlayedScrollRef.current) return;
        const container = recentlyPlayedScrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;
        const newScroll = direction === "right"
            ? Math.min(currentScroll + SCROLL_AMOUNT * CARDS_PER_VIEW, maxScroll)
            : Math.max(currentScroll - SCROLL_AMOUNT * CARDS_PER_VIEW, 0);
        container.scrollTo({ left: newScroll, behavior: "smooth" });
        setRecentlyPlayedScrollIndex(Math.round(newScroll / SCROLL_AMOUNT));
    };

    const scrollRecent100 = (direction: "left" | "right") => {
        if (!recent100ScrollRef.current) return;
        const container = recent100ScrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;
        const newScroll = direction === "right"
            ? Math.min(currentScroll + SCROLL_AMOUNT * CARDS_PER_VIEW, maxScroll)
            : Math.max(currentScroll - SCROLL_AMOUNT * CARDS_PER_VIEW, 0);
        container.scrollTo({ left: newScroll, behavior: "smooth" });
        setRecent100ScrollIndex(Math.round(newScroll / SCROLL_AMOUNT));
    };

    const canScrollLeftRecentlyPlayed = needsCarouselRecentlyPlayed && recentlyPlayedScrollIndex > 0;
    const canScrollRightRecentlyPlayed = needsCarouselRecentlyPlayed &&
        recentlyPlayedScrollRef.current &&
        recentlyPlayedScrollRef.current.scrollLeft < (recentlyPlayedScrollRef.current.scrollWidth - recentlyPlayedScrollRef.current.clientWidth - 10);

    const canScrollLeftRecent100 = needsCarouselRecent100 && recent100ScrollIndex > 0;
    const canScrollRightRecent100 = needsCarouselRecent100 &&
        recent100ScrollRef.current &&
        recent100ScrollRef.current.scrollLeft < (recent100ScrollRef.current.scrollWidth - recent100ScrollRef.current.clientWidth - 10);

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: zincColors.background }}>
            <SideBar activeItem="Games" />
            <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflowX: "hidden" }}>
                {error && (
                    <Alert
                        severity="error"
                        sx={{
                            m: 2,
                            backgroundColor: zincColors.card,
                            border: `1px solid ${zincColors.border}`,
                            color: zincColors.white,
                        }}
                        onClose={clearError}
                    >
                        {error}
                    </Alert>
                )}

                {/* Main Content */}
                <Box sx={{ display: "flex", flex: 1, gap: 4, p: 3 }}>
                    {/* Left Side */}
                    <Box sx={{ flex: "0 0 20%", display: "flex", flexDirection: "column", gap: 3, width: "76%" }}>
                        {/* Recently Played */}
                        <Card sx={{ width: "100%" }}>
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Clock size={16} strokeWidth={1.5} color={zincColors.muted} />
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontSize: "16px",
                                                fontWeight: 600,
                                                color: zincColors.white,
                                            }}
                                        >
                                            Recently Played
                                            {selectedPlatform && ` (${filteredGames.length})`}
                                        </Typography>
                                        {selectedPlatform && (
                                            <Button
                                                size="small"
                                                onClick={() => setSelectedPlatform(null)}
                                                sx={{
                                                    ml: 1,
                                                    fontSize: "11px",
                                                    textTransform: "none",
                                                    color: zincColors.muted,
                                                    "&:hover": {
                                                        color: zincColors.white,
                                                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                    },
                                                }}
                                            >
                                                Clear Filter
                                            </Button>
                                        )}
                                    </Box>
                                    <Button
                                        size="small"
                                        onClick={() => navigate('/games/all')}
                                        sx={{
                                            fontSize: "12px",
                                            textTransform: "none",
                                            color: zincColors.white,
                                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                                            border: "1px solid rgba(59, 130, 246, 0.5)",
                                            "&:hover": {
                                                backgroundColor: "rgba(59, 130, 246, 0.3)",
                                                border: "1px solid rgba(59, 130, 246, 0.7)",
                                            },
                                        }}
                                    >
                                        See All
                                    </Button>
                                </Box>
                                <Box sx={{ position: "relative", width: "100%" }}>
                                    {canScrollLeftRecentlyPlayed && (
                                        <IconButton
                                            onClick={() => scrollRecentlyPlayed("left")}
                                            sx={{
                                                position: "absolute",
                                                left: -16,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                zIndex: 2,
                                                backgroundColor: zincColors.card,
                                                border: `1px solid ${zincColors.border}`,
                                                color: zincColors.white,
                                                "&:hover": {
                                                    backgroundColor: zincColors.border,
                                                },
                                            }}
                                        >
                                            <ChevronLeft size={20} />
                                        </IconButton>
                                    )}
                                    <Box
                                        ref={recentlyPlayedScrollRef}
                                        sx={{
                                            display: "flex",
                                            gap: 2,
                                            overflowX: needsCarouselRecentlyPlayed ? "auto" : "visible",
                                            pb: 1,
                                            width: "100%",
                                            scrollBehavior: "smooth",
                                            ...(needsCarouselRecentlyPlayed && {
                                                scrollbarWidth: "none", // Firefox
                                                "&::-webkit-scrollbar": {
                                                    display: "none", // Chrome, Safari, Edge
                                                },
                                            }),
                                        }}
                                        onScroll={(e) => {
                                            const target = e.target as HTMLDivElement;
                                            setRecentlyPlayedScrollIndex(Math.round(target.scrollLeft / SCROLL_AMOUNT));
                                        }}
                                    >
                                        {loading
                                            ? Array.from({ length: 5 }).map((_, i) => (
                                                <Card
                                                    key={i}
                                                    sx={{
                                                        minWidth: 180,
                                                        height: 280,
                                                        backgroundColor: zincColors.border,
                                                    }}
                                                />
                                            ))
                                            : recentlyPlayed.map((game, index) => {
                                                const platform = getGamePlatform(game);
                                                const achievementPercentage = calculateAchievementPercentage(game);
                                                return (
                                                    <Card
                                                        key={`${game.appid}-${index}`}
                                                        onClick={(e) => {
                                                            // Capture card position for shared element transition
                                                            const cardElement = e.currentTarget;
                                                            const rect = cardElement.getBoundingClientRect();
                                                            const cardPosition = {
                                                                x: rect.left,
                                                                y: rect.top,
                                                                width: rect.width,
                                                                height: rect.height,
                                                            };
                                                            sessionStorage.setItem('gameCardPosition', JSON.stringify(cardPosition));
                                                            navigate(`/game/${game.appid}`, { state: { game } });
                                                        }}
                                                        sx={{
                                                            width: 180,
                                                            minWidth: 180,
                                                            flexShrink: 0,
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s",
                                                            backgroundColor: "#252529", // Lighter gray for better icon visibility
                                                            "&:hover": {
                                                                boxShadow: `0 0 20px ${categoryColors.games}40`,
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={getGameImageUrl(game)}
                                                            alt={game.name}
                                                            sx={{
                                                                width: "100%",
                                                                height: 200,
                                                                objectFit: "cover",
                                                                borderTopLeftRadius: 12,
                                                                borderTopRightRadius: 12,
                                                            }}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src =
                                                                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDE4MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMTgxODFiIi8+Cjwvc3ZnPg==";
                                                            }}
                                                        />
                                                        <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, p: 1.5 }}>
                                                            <Typography
                                                                variant="body1"
                                                                sx={{
                                                                    fontSize: "13px",
                                                                    fontWeight: 600,
                                                                    color: zincColors.white,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                            >
                                                                {game.name}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontSize: "12px",
                                                                    color: zincColors.muted,
                                                                }}
                                                            >
                                                                {formatPlaytime(game)}
                                                            </Typography>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={achievementPercentage}
                                                                sx={{
                                                                    height: 6,
                                                                    borderRadius: 3,
                                                                    backgroundColor: zincColors.border,
                                                                    "& .MuiLinearProgress-bar": {
                                                                        backgroundColor: getProgressBarColor(achievementPercentage),
                                                                    },
                                                                }}
                                                            />
                                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                                                                {getAchievementDisplay(game)}
                                                                <Box
                                                                    component="img"
                                                                    src={getPlatformIcon(platform)}
                                                                    alt={platform}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate('/games/all', { state: { platformFilter: platform } });
                                                                    }}
                                                                    sx={{
                                                                        width: getPlatformIconSize(platform),
                                                                        height: "auto",
                                                                        objectFit: "contain",
                                                                        mt: platform === "xbox" ? -0.5 : 0,
                                                                        cursor: "pointer",
                                                                        opacity: selectedPlatform === platform ? 1 : 0.7,
                                                                        transition: "opacity 0.2s, transform 0.2s",
                                                                        "&:hover": {
                                                                            opacity: 1,
                                                                            transform: "scale(1.1)",
                                                                        },
                                                                    }}
                                                                />
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                    </Box>
                                    {canScrollRightRecentlyPlayed && (
                                        <IconButton
                                            onClick={() => scrollRecentlyPlayed("right")}
                                            sx={{
                                                position: "absolute",
                                                right: -16,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                zIndex: 2,
                                                backgroundColor: zincColors.card,
                                                border: `1px solid ${zincColors.border}`,
                                                color: zincColors.white,
                                                "&:hover": {
                                                    backgroundColor: zincColors.border,
                                                },
                                            }}
                                        >
                                            <ChevronRight size={20} />
                                        </IconButton>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Recent Achievements */}
                        <Card>
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                                    <Trophy size={16} strokeWidth={1.5} color={zincColors.muted} />
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontSize: "16px",
                                            fontWeight: 600,
                                            color: zincColors.white,
                                        }}
                                    >
                                        Recent Achievements
                                    </Typography>
                                </Box>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                    {loading
                                        ? Array.from({ length: 5 }).map((_, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    height: 60,
                                                    backgroundColor: zincColors.border,
                                                    borderRadius: 1,
                                                }}
                                            />
                                        ))
                                        : recentAchievements.length > 0
                                            ? recentAchievements.map((achievement, index) => (
                                                <Card
                                                    key={index}
                                                    onClick={() => {
                                                        // Navigate directly to the game's detail view for this achievement
                                                        navigate(`/game/${achievement.appid}`, {
                                                            state: { game: achievement.rawGame },
                                                        });
                                                    }}
                                                    sx={{
                                                        backgroundColor: "#252529", // Lighter gray for better icon visibility
                                                        display: "flex",
                                                        gap: 2,
                                                        p: 1.5,
                                                        borderRadius: 1,
                                                        transition: "all 0.2s",
                                                        cursor: "pointer",
                                                        "&:hover": {
                                                            backgroundColor: zincColors.border,
                                                        },
                                                    }}
                                                >
                                                    {/* Left: Achievement Icon */}
                                                    <Box
                                                        component="img"
                                                        src={achievement.image || ""}
                                                        alt={achievement.name}
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 1,
                                                            objectFit: "cover",
                                                            flexShrink: 0,
                                                        }}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src =
                                                                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMTgxODFiIi8+Cjwvc3ZnPg==";
                                                        }}
                                                    />
                                                    {/* Center: Title and Description */}
                                                    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                fontSize: "13px",
                                                                fontWeight: 600,
                                                                color: zincColors.white,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {achievement.name}
                                                        </Typography>
                                                        {achievement.description && (
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontSize: "12px",
                                                                    color: zincColors.muted,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    display: "-webkit-box",
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: "vertical",
                                                                }}
                                                            >
                                                                {achievement.description}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    {/* Right: Game Name and Platform Icon */}
                                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-end", flexShrink: 0 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontSize: "12px",
                                                                color: zincColors.muted,
                                                                textAlign: "right",
                                                            }}
                                                        >
                                                            {achievement.game}
                                                        </Typography>
                                                        <Box
                                                            component="img"
                                                            src={getPlatformIcon(achievement.platform)}
                                                            alt={achievement.platform}
                                                            sx={{
                                                                width: getPlatformIconSize(achievement.platform),
                                                                height: "auto",
                                                                objectFit: "contain",
                                                            }}
                                                        />
                                                    </Box>
                                                </Card>
                                            ))
                                            : (
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontSize: "13px",
                                                        color: zincColors.muted,
                                                        textAlign: "center",
                                                        py: 2,
                                                    }}
                                                >
                                                    No recent achievements
                                                </Typography>
                                            )}
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Recent 100% */}
                        <Card>
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                                    <CheckCircle2 size={16} strokeWidth={1.5} color={zincColors.muted} />
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontSize: "16px",
                                            fontWeight: 600,
                                            color: zincColors.white,
                                        }}
                                    >
                                        Recent 100%
                                    </Typography>
                                </Box>
                                <Box sx={{ position: "relative", width: "100%" }}>
                                    {canScrollLeftRecent100 && (
                                        <IconButton
                                            onClick={() => scrollRecent100("left")}
                                            sx={{
                                                position: "absolute",
                                                left: -16,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                zIndex: 2,
                                                backgroundColor: zincColors.card,
                                                border: `1px solid ${zincColors.border}`,
                                                color: zincColors.white,
                                                "&:hover": {
                                                    backgroundColor: zincColors.border,
                                                },
                                            }}
                                        >
                                            <ChevronLeft size={20} />
                                        </IconButton>
                                    )}
                                    <Box
                                        ref={recent100ScrollRef}
                                        sx={{
                                            display: "flex",
                                            gap: 2,
                                            overflowX: needsCarouselRecent100 ? "auto" : "visible",
                                            pb: 1,
                                            width: "100%",
                                            scrollBehavior: "smooth",
                                            ...(needsCarouselRecent100 && {
                                                scrollbarWidth: "none", // Firefox
                                                "&::-webkit-scrollbar": {
                                                    display: "none", // Chrome, Safari, Edge
                                                },
                                            }),
                                        }}
                                        onScroll={(e) => {
                                            const target = e.target as HTMLDivElement;
                                            setRecent100ScrollIndex(Math.round(target.scrollLeft / SCROLL_AMOUNT));
                                        }}
                                    >
                                        {loading ? (
                                            Array.from({ length: 10 }).map((_, i) => (
                                                <Card
                                                    key={i}
                                                    sx={{
                                                        minWidth: 180,
                                                        height: 280,
                                                        backgroundColor: zincColors.border,
                                                    }}
                                                />
                                            ))
                                        ) : recent100Percent.length > 0 ? (
                                            recent100Percent.map((game, index) => {
                                                const platform = getGamePlatform(game);
                                                const achievementPercentage = calculateAchievementPercentage(game);
                                                return (
                                                    <Card
                                                        key={`${game.appid}-${index}`}
                                                        onClick={(e) => {
                                                            // Capture card position for shared element transition
                                                            const cardElement = e.currentTarget;
                                                            const rect = cardElement.getBoundingClientRect();
                                                            const cardPosition = {
                                                                x: rect.left,
                                                                y: rect.top,
                                                                width: rect.width,
                                                                height: rect.height,
                                                            };
                                                            sessionStorage.setItem('gameCardPosition', JSON.stringify(cardPosition));
                                                            navigate(`/game/${game.appid}`, { state: { game } });
                                                        }}
                                                        sx={{
                                                            width: 180,
                                                            minWidth: 180,
                                                            flexShrink: 0,
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s",
                                                            backgroundColor: "#252529",
                                                            "&:hover": {
                                                                boxShadow: `0 0 20px ${categoryColors.games}40`,
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={getGameImageUrl(game)}
                                                            alt={game.name}
                                                            sx={{
                                                                width: "100%",
                                                                height: 200,
                                                                objectFit: "cover",
                                                                borderTopLeftRadius: 12,
                                                                borderTopRightRadius: 12,
                                                            }}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src =
                                                                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDE4MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMTgxODFiIi8+Cjwvc3ZnPg==";
                                                            }}
                                                        />
                                                        <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, p: 1.5 }}>
                                                            <Typography
                                                                variant="body1"
                                                                sx={{
                                                                    fontSize: "13px",
                                                                    fontWeight: 600,
                                                                    color: zincColors.white,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                            >
                                                                {game.name}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontSize: "12px",
                                                                    color: zincColors.muted,
                                                                }}
                                                            >
                                                                {formatPlaytime(game)}
                                                            </Typography>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={achievementPercentage}
                                                                sx={{
                                                                    height: 6,
                                                                    borderRadius: 3,
                                                                    backgroundColor: zincColors.border,
                                                                    "& .MuiLinearProgress-bar": {
                                                                        backgroundColor: getProgressBarColor(achievementPercentage),
                                                                    },
                                                                }}
                                                            />
                                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                                                                {getAchievementDisplay(game)}
                                                                <Box
                                                                    component="img"
                                                                    src={getPlatformIcon(platform)}
                                                                    alt={platform}
                                                                    sx={{
                                                                        width: getPlatformIconSize(platform),
                                                                        height: "auto",
                                                                        objectFit: "contain",
                                                                        mt: platform === "xbox" ? -0.5 : 0,
                                                                    }}
                                                                />
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })
                                        ) : (
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: "13px",
                                                    color: zincColors.muted,
                                                    textAlign: "center",
                                                    py: 2,
                                                }}
                                            >
                                                No 100% completed games
                                            </Typography>
                                        )}
                                    </Box>
                                    {canScrollRightRecent100 && (
                                        <IconButton
                                            onClick={() => scrollRecent100("right")}
                                            sx={{
                                                position: "absolute",
                                                right: -16,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                zIndex: 2,
                                                backgroundColor: zincColors.card,
                                                border: `1px solid ${zincColors.border}`,
                                                color: zincColors.white,
                                                "&:hover": {
                                                    backgroundColor: zincColors.border,
                                                },
                                            }}
                                        >
                                            <ChevronRight size={20} />
                                        </IconButton>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Right Side */}
                    <Box sx={{ flex: "0 0 20%", display: "flex", flexDirection: "column", gap: 3 }}>
                        {/* Linked Platforms */}
                        <Card>
                            <CardContent>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontSize: "16px",
                                        fontWeight: 600,
                                        color: zincColors.white,
                                        mb: 2,
                                    }}
                                >
                                    Linked Platforms
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                    {["steam", "psn", "xbox", "retroachievements"].map((platform) => {
                                        const isConfigured = configuredServices.includes(platform);
                                        const config = platformConfig[platform as keyof typeof platformConfig];
                                        const isUpdating = updatingPlatforms[platform];

                                        const handleRefresh = () => {
                                            if (platform === "steam") refreshSteam();
                                            else if (platform === "psn") refreshPSN();
                                            else if (platform === "xbox") refreshXbox();
                                            else if (platform === "retroachievements") refreshRetroAchievements();
                                        };

                                        const handleConfigure = () => {
                                            navigate("/profile");
                                        };

                                        return (
                                            <Box
                                                key={platform}
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
                                                    p: 1.5,
                                                    borderRadius: 1,
                                                    backgroundColor: isConfigured
                                                        ? "#252529"
                                                        : "transparent",
                                                    "&:hover": {
                                                        backgroundColor: zincColors.border,
                                                    },
                                                }}
                                            >
                                                {/* Platform Icon */}
                                                <Box
                                                    component="img"
                                                    src={getPlatformIcon(platform)}
                                                    alt={config.name}
                                                    sx={{
                                                        width: getPlatformIconSize(platform),
                                                        height: "auto",
                                                        objectFit: "contain",
                                                        flexShrink: 0,
                                                    }}
                                                />

                                                {/* Platform Name */}
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        fontSize: "13px",
                                                        color: isConfigured
                                                            ? zincColors.white
                                                            : zincColors.muted,
                                                        flex: 1,
                                                    }}
                                                >
                                                    {config.name}
                                                </Typography>

                                                {/* Action Button */}
                                                {isConfigured ? (
                                                    <IconButton
                                                        onClick={handleRefresh}
                                                        disabled={isUpdating}
                                                        size="small"
                                                        sx={{
                                                            color: categoryColors.games,
                                                            "&:hover": {
                                                                backgroundColor: zincColors.border,
                                                                color: zincColors.white,
                                                            },
                                                            "&:disabled": {
                                                                color: zincColors.muted,
                                                            },
                                                        }}
                                                    >
                                                        {isUpdating ? (
                                                            <RefreshCw size={16} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
                                                        ) : (
                                                            <RefreshCw size={16} strokeWidth={1.5} />
                                                        )}
                                                    </IconButton>
                                                ) : (
                                                    <IconButton
                                                        onClick={handleConfigure}
                                                        size="small"
                                                        sx={{
                                                            color: categoryColors.movies,
                                                            "&:hover": {
                                                                backgroundColor: zincColors.border,
                                                                color: zincColors.white,
                                                            },
                                                        }}
                                                    >
                                                        <X size={16} strokeWidth={1.5} />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Average Achievement Percentage */}
                        <Card>
                            <CardContent>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontSize: "16px",
                                        fontWeight: 600,
                                        color: zincColors.white,
                                        mb: 2,
                                    }}
                                >
                                    Average Achievement
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                    {["steam", "psn", "xbox", "retroachievements"].map((platform) => {
                                        const isConfigured = configuredServices.includes(platform);
                                        if (!isConfigured) return null;

                                        const data = platformAchievements[platform];
                                        const config = platformConfig[platform as keyof typeof platformConfig];

                                        return (
                                            <Box key={platform} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
                                                <Box
                                                    component="img"
                                                    src={getPlatformIcon(platform)}
                                                    alt={config.name}
                                                    sx={{
                                                        width: 24,
                                                        height: "auto",
                                                        objectFit: "contain",
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontSize: "12px",
                                                        color: zincColors.white,
                                                        flex: 1,
                                                    }}
                                                >
                                                    {config.name}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: getProgressBarColor(data.percentage || 0),
                                                        minWidth: 45,
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    {isNaN(data.percentage) || data.percentage === 0 ? "—" : `${data.percentage}%`}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Top Played Games */}
                        <Card>
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                                    <TrendingUp size={16} strokeWidth={1.5} color={zincColors.muted} />
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontSize: "16px",
                                            fontWeight: 600,
                                            color: zincColors.white,
                                        }}
                                    >
                                        Top Played Games
                                    </Typography>
                                </Box>
                                {loading ? (
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    height: 50,
                                                    backgroundColor: zincColors.border,
                                                    borderRadius: 1,
                                                }}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    <Box sx={{ overflowX: "auto", width: "100%" }}>
                                        <Table sx={{
                                            width: "100%",
                                            "& .MuiTableCell-root": {
                                                borderColor: zincColors.border,
                                                whiteSpace: "nowrap",
                                            },
                                        }}>
                                            <TableBody>
                                                {topPlayedGames.map((game, index) => {
                                                    const platform = getGamePlatform(game);
                                                    const achievementPercentage = calculateAchievementPercentage(game);
                                                    return (
                                                        <TableRow
                                                            key={`${game.appid}-${index}`}
                                                            onClick={(e) => {
                                                                // Capture card position for shared element transition
                                                                const cardElement = e.currentTarget;
                                                                const rect = cardElement.getBoundingClientRect();
                                                                const cardPosition = {
                                                                    x: rect.left,
                                                                    y: rect.top,
                                                                    width: rect.width,
                                                                    height: rect.height,
                                                                };
                                                                sessionStorage.setItem('gameCardPosition', JSON.stringify(cardPosition));
                                                                navigate(`/game/${game.appid}`, { state: { game } });
                                                            }}
                                                            sx={{
                                                                cursor: "pointer",
                                                                transition: "background-color 0.2s",
                                                                "&:hover": {
                                                                    backgroundColor: zincColors.border,
                                                                },
                                                                "&:last-child td": { borderBottom: 0 },
                                                            }}
                                                        >
                                                            <TableCell
                                                                sx={{
                                                                    color: zincColors.muted,
                                                                    fontSize: "13px",
                                                                    width: 30,
                                                                    py: 1.5,
                                                                    px: 1,
                                                                }}
                                                            >
                                                                {index + 1}
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1.5, width: 50, px: 1 }}>
                                                                <Box
                                                                    component="img"
                                                                    src={getGameImageUrl(game)}
                                                                    alt={game.name}
                                                                    sx={{
                                                                        width: 40,
                                                                        height: 40,
                                                                        borderRadius: 1,
                                                                        objectFit: "cover",
                                                                    }}
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src =
                                                                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMTgxODFiIi8+Cjwvc3ZnPg==";
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1.5, px: 1, minWidth: 150, maxWidth: 200 }}>
                                                                <Typography
                                                                    variant="body1"
                                                                    sx={{
                                                                        fontSize: "13px",
                                                                        fontWeight: 600,
                                                                        color: zincColors.white,
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        whiteSpace: "nowrap",
                                                                    }}
                                                                >
                                                                    {game.name}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ color: zincColors.muted, fontSize: "12px", py: 1.5, px: 1, whiteSpace: "nowrap" }}>
                                                                {formatPlaytime(game)}
                                                            </TableCell>
                                                            <TableCell sx={{ py: 1.5, width: 50, px: 1, textAlign: "center" }}>
                                                                <Box
                                                                    component="img"
                                                                    src={getPlatformIcon(platform)}
                                                                    alt={platform}
                                                                    sx={{
                                                                        width: getPlatformIconSize(platform),
                                                                        height: "auto",
                                                                        objectFit: "contain",
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell
                                                                sx={{
                                                                    color: getProgressBarColor(achievementPercentage),
                                                                    fontSize: "12px",
                                                                    fontWeight: 600,
                                                                    py: 1.5,
                                                                    px: 1,
                                                                    whiteSpace: "nowrap",
                                                                    textAlign: "right",
                                                                }}
                                                            >
                                                                {isNaN(achievementPercentage) || !isFinite(achievementPercentage) ? "—" : `${Math.round(achievementPercentage)}%`}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                {/* Settings Dialog */}
                <Dialog
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    PaperProps={{
                        sx: {
                            backgroundColor: zincColors.card,
                            border: `1px solid ${zincColors.border}`,
                        },
                    }}
                >
                    <DialogTitle sx={{ color: zincColors.white, fontSize: "16px" }}>
                        Platform Settings
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
                            {["steam", "psn", "xbox", "retroachievements"].map((platform) => {
                                const config = platformConfig[platform as keyof typeof platformConfig];
                                const isUpdating = updatingPlatforms[platform];
                                return (
                                    <Box
                                        key={platform}
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            p: 2,
                                            borderRadius: 1,
                                            border: `1px solid ${zincColors.border}`,
                                        }}
                                    >
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                fontSize: "13px",
                                                color: zincColors.white,
                                            }}
                                        >
                                            {config.name}
                                        </Typography>
                                        <IconButton
                                            onClick={() => {
                                                if (platform === "steam") refreshSteam();
                                                else if (platform === "psn") refreshPSN();
                                                else if (platform === "xbox") refreshXbox();
                                                else if (platform === "retroachievements")
                                                    refreshRetroAchievements();
                                            }}
                                            disabled={isUpdating}
                                            sx={{
                                                color: categoryColors.games,
                                                "&:hover": {
                                                    backgroundColor: zincColors.border,
                                                },
                                            }}
                                        >
                                            <Settings
                                                size={16}
                                                strokeWidth={1.5}
                                                className={isUpdating ? "spin" : ""}
                                            />
                                        </IconButton>
                                    </Box>
                                );
                            })}
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, borderTop: `1px solid ${zincColors.border}` }}>
                        <Button
                            onClick={() => setSettingsOpen(false)}
                            sx={{
                                color: zincColors.muted,
                                "&:hover": {
                                    color: zincColors.white,
                                    backgroundColor: zincColors.border,
                                },
                            }}
                        >
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* PSN Reconnect Dialog */}
                <Dialog
                    open={reconnectOpen}
                    onClose={() => setReconnectOpen(false)}
                    PaperProps={{
                        sx: {
                            backgroundColor: zincColors.card,
                            border: `1px solid ${zincColors.border}`,
                        },
                    }}
                >
                    <DialogTitle sx={{ color: zincColors.white, fontSize: "16px" }}>
                        Reconnect PlayStation
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            fullWidth
                            label="NPSSO"
                            value={npsso}
                            onChange={(e) => setNpsso(e.target.value)}
                            placeholder="Paste your NPSSO"
                            disabled={saving}
                            sx={{
                                mt: 2,
                                "& .MuiInputBase-root": {
                                    color: zincColors.white,
                                },
                                "& .MuiInputLabel-root": {
                                    color: zincColors.muted,
                                },
                            }}
                        />
                        <Box sx={{ mt: 1 }}>
                            <Link
                                to="/profile"
                                style={{
                                    fontSize: "11px",
                                    color: categoryColors.games,
                                    textDecoration: "none",
                                }}
                            >
                                How to get your NPSSO
                            </Link>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, borderTop: `1px solid ${zincColors.border}` }}>
                        <Button
                            onClick={() => setReconnectOpen(false)}
                            disabled={saving}
                            sx={{
                                color: zincColors.muted,
                                "&:hover": {
                                    color: zincColors.white,
                                    backgroundColor: zincColors.border,
                                },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReconnect}
                            disabled={saving || npsso.trim().length < 10}
                            sx={{
                                color: categoryColors.games,
                                "&:hover": {
                                    color: zincColors.white,
                                    backgroundColor: zincColors.border,
                                },
                            }}
                        >
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={3000}
                    onClose={() => setSnackbarOpen(false)}
                    message="PlayStation reconnected"
                    sx={{
                        "& .MuiSnackbarContent-root": {
                            backgroundColor: zincColors.card,
                            border: `1px solid ${zincColors.border}`,
                            color: zincColors.white,
                        },
                    }}
                />
            </Box>
        </Box>
    );
}

export default Games;
