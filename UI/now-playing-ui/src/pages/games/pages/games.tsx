import {
    Box,
    Grid,
    Skeleton,
    Typography,
    Snackbar,
    Button,
    IconButton,
    Alert,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SideBar from "../../../components/sideBar";
import { SteamGame, PsnGame } from "../utils/types"; // Import interfaces
import GameCard from "../components/gameCard";
import {
    parseDate,
    getPlaytime,
    calculateAchievementPercentage,
} from "../utils/utils";

import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function Games() {
    const drawerWidth = 160;

    const [steamGames, setSteamGames] = useState<SteamGame[]>([]);
    const [psnGames, setPsnGames] = useState<PsnGame[]>([]);
    const [latestPlayedGames, setMergedGames] = useState<(SteamGame | PsnGame)[]>(
        []
    );
    const [mostPlayed, setMostPlayed] = useState<(SteamGame | PsnGame)[]>([]);
    const [mostAchieved, setMostAchieved] = useState<(SteamGame | PsnGame)[]>([]);

    const [loading, setLoading] = useState(true);
    const [snackbarOpen, setSnackbarOpen] = useState(false); // State to control the snackbar visibility
    const [error, setError] = useState<string | null>(null); // Error state

    function mergeAndSortGames(
        steamArray: SteamGame[],
        psnArray: PsnGame[]
    ): (SteamGame | PsnGame)[] {
        const invalidTimestamp = new Date(1970, 0, 1).getTime();
        const mergedGames = [...steamArray, ...psnArray]
            .map((game) => ({
                ...game,
                lastPlayed: parseDate(game.last_played),
            }))
            .filter((game) => game.lastPlayed.getTime() !== invalidTimestamp)
            .sort((a, b) => b.lastPlayed.getTime() - a.lastPlayed.getTime());
        return mergedGames;
    }

    const fetchGameData = async (url: string): Promise<any> => {
        const res = await fetch(url);
        const data = await res.json();
        return Object.values(data.result);
    };

    const fetchLatestPlayedGames = async () => {
        try {
            setSnackbarOpen(true);
            const res = await fetch("http://localhost:8000/steam/get-game-list/");

            if (!res.ok) {
                setError("Failed to fetch recently played steam games.");
                setLoading(false);
                setSnackbarOpen(false); // Hide snackbar when fetch fails
                return;
            }
            const resPSN = await fetch("http://localhost:8000/psn/get-game-list/");

            if (!resPSN.ok) {
                setError("Failed to fetch recently played PSN games.");
                setLoading(false);
                setSnackbarOpen(false); // Hide snackbar when fetch fails
                return;
            }
            await fetchGames();

            setError(null);
            setLoading(false);
            setSnackbarOpen(false);
        } catch (error) {
            console.error("Error fetching recently played games:", error);
            setError("An error occurred while fetching recently played games");
            setLoading(false);
            setSnackbarOpen(false); // Hide snackbar when an error occurs
        }
    };
    const fetchGames = async () => {
        try {
            setLoading(true);
            const [
                steamArray,
                psnArray,
                steamPlaytimeArray,
                psnPlaytimeArray,
                steamMostAchievedArray,
                psnMostAchievedArray,
            ] = await Promise.all([
                fetchGameData("http://localhost:8000/steam/get-game-list-stored/"),
                fetchGameData("http://localhost:8000/psn/get-game-list-stored/"),
                fetchGameData("http://localhost:8000/steam/get-game-list-total-playtime/"),
                fetchGameData("http://localhost:8000/psn/get-game-list-total-playtime/"),
                fetchGameData("http://localhost:8000/steam/get-game-list-most-achieved/"),
                fetchGameData("http://localhost:8000/psn/get-game-list-most-achieved/"),
            ]);

            setSteamGames(steamArray);
            setPsnGames(psnArray);
            const merged = mergeAndSortGames(steamArray, psnArray);

            setMergedGames(merged);

            const mergedPlaytimeGames = [...steamPlaytimeArray, ...psnPlaytimeArray]
                .filter((game) => {
                    return getPlaytime(game);
                })
                .sort((a, b) => {
                    return getPlaytime(b) - getPlaytime(a);
                });
            setMostPlayed(mergedPlaytimeGames);

            const mergedMostAchievedGames = [
                ...steamMostAchievedArray,
                ...psnMostAchievedArray,
            ]
                .map((game) => {
                    return {
                        ...game,
                        achievementPercentage: calculateAchievementPercentage(game),
                    };
                })
                .filter((game) => {
                    const percentage = game.achievementPercentage;
                    return !isNaN(percentage) && percentage > 0;
                })
                .sort((a, b) => b.achievementPercentage - a.achievementPercentage);
            setMostAchieved(mergedMostAchievedGames);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchGames();
    }, []);

    const renderLoadingSkeletons = (count = 10) =>
        Array.from(new Array(count)).map((_, i) => (
            <Grid component="div" key={i}>
                <Skeleton variant="rectangular" height={200} />
                <Skeleton variant="text" />
                <Skeleton variant="text" width="60%" />
            </Grid>
        ));

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };
    return (
        <div>
            <Box sx={{ display: "flex", paddingLeft: 2.5 }}>
                <SideBar activeItem="Games" />
                <Box component="main" sx={{ width: "89vw" }}>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography
                            variant="h5"
                            sx={{
                                mt: 2,
                                ml: 1,
                                fontFamily: "Inter, sans-serif",
                                fontWeight: 700,
                            }}
                        >
                            Now Playing 🎮
                        </Typography>
                        <IconButton
                            onClick={fetchLatestPlayedGames}
                            color="secondary"
                            sx={{ mb: -2 }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                    {/* Display error banner if there is an error */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box
                        sx={{
                            display: "flex",
                            overflowX: "auto",
                            gap: 32,
                            py: 1,
                            px: 1,
                        }}
                    >
                        {loading
                            ? renderLoadingSkeletons()
                            : latestPlayedGames.map((game) => (
                                <Grid key={game.appid}>
                                    <Link
                                        to={`/game/${game.appid}`}
                                        state={{ game }} // Pass the game object here
                                        style={{ textDecoration: "none" }}
                                    >
                                        <GameCard game={game} />
                                    </Link>
                                </Grid>
                            ))}
                    </Box>
                    <Typography
                        variant="h5"
                        sx={{
                            mt: 2,
                            ml: 1,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 700,
                        }}
                    >
                        Most Played ⌛
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            overflowX: "auto",
                            gap: 32,
                            py: 1,
                            px: 1,
                        }}
                    >
                        {loading
                            ? renderLoadingSkeletons()
                            : mostPlayed!.map((game) => (
                                <Grid key={game.appid}>
                                    <Link
                                        to={`/game/${game.appid}`}
                                        state={{ game }} // Pass the game object here
                                        style={{ textDecoration: "none" }}
                                    >
                                        <GameCard game={game} />
                                    </Link>
                                </Grid>
                            ))}
                    </Box>
                    <Typography
                        variant="h5"
                        sx={{
                            mt: 2,
                            ml: 1,
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 700,
                        }}
                    >
                        Most Achieved 🏆
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            overflowX: "auto",
                            gap: 32,
                            py: 1,
                            px: 1,
                        }}
                    >
                        {loading
                            ? renderLoadingSkeletons()
                            : mostAchieved!.map((game) => (
                                <Grid key={game.appid}>
                                    <Link
                                        to={`/game/${game.appid}`}
                                        state={{ game }} // Pass the game object here
                                        style={{ textDecoration: "none" }}
                                    >
                                        <GameCard game={game} />
                                    </Link>
                                </Grid>
                            ))}
                    </Box>
                </Box>
            </Box>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={null} // Snackbar will stay open until closed manually
                onClose={handleSnackbarClose}
                message="Updating info..."
                action={
                    <Button color="secondary" size="small" onClick={handleSnackbarClose}>
                        Close
                    </Button>
                }
            />
        </div>
    );
}

export default Games;
