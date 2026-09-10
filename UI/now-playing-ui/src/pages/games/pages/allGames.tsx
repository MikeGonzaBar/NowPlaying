import React, { useMemo, useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Button,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Stack,
    Chip,
}
    from '@mui/material';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import AppShell from '../../../components/AppShell';
import { useGameData } from '../hooks/useGameData';
import { Game } from '../utils/types';
import { zincColors } from '../../../theme';
import { API_CONFIG } from '../../../config/api';
import { formatMinutesCompact } from '../utils/utils';

const PAGE_SIZE = 24;

type SortKey = 'recently_played' | 'most_played' | 'completion' | 'title' | 'recently_earned_achievement';

interface CountedGame {
    game: Game;
    playtimeMinutes: number;
    hasPlaytime: boolean;
    totalAchievements: number;
    unlockedAchievements: number;
    completionPct: number;
    lastPlayed: Date | null;
}

/** Aggregates one canonical Game (possibly several providers) into counts
 *  the list can sort/filter and display consistently (audit #1, #3). */
const countGame = (game: Game): CountedGame => {
    let playtimeMinutes = 0;
    let hasPlaytime = false;
    let total = 0;
    let unlocked = 0;

    game.sources.forEach((source) => {
        if (source.hasPlaytime && source.playtimeMinutes > 0) {
            playtimeMinutes += source.playtimeMinutes;
            hasPlaytime = true;
        }
        const achievements = (source.raw as unknown as { achievements?: Array<Record<string, unknown>> }).achievements || [];
        if (achievements.length > 0) {
            total += achievements.length;
            unlocked += achievements.filter((a) => a.achieved === true || a.unlocked === true).length;
        } else {
            total += source.totalAchievements;
            unlocked += source.unlockedAchievements;
        }
    });

    return {
        game,
        playtimeMinutes,
        hasPlaytime,
        totalAchievements: total,
        unlockedAchievements: unlocked,
        completionPct: total > 0 ? (unlocked / total) * 100 : 0,
        lastPlayed: game.lastPlayed,
    };
};

const getLatestAchievementDate = (game: Game): Date => {
    let latest: Date | null = null;
    game.sources.forEach((source) => {
        const raw = source.raw as unknown as { achievements?: Array<{ unlock_time?: string; unlockDate?: string; unlocked_at?: string }> };
        (raw.achievements || []).forEach((achievement) => {
            const value = achievement.unlock_time || achievement.unlockDate || achievement.unlocked_at;
            if (!value) return;
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime()) && (!latest || parsed > latest)) latest = parsed;
        });
    });
    return latest || new Date(1970, 0, 1);
};

const AllGames: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const beBaseUrl = API_CONFIG.BASE_URL;
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(searchParams.get('provider') || null);
    const [sortKey, setSortKey] = useState<SortKey>(searchParams.get('sort') as SortKey || 'recently_played');
    const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
    const [debouncedSearch, setDebouncedSearch] = useState<string>(searchQuery);
    const [crossPlatformOnly, setCrossPlatformOnly] = useState<boolean>(searchParams.get('crossPlatform') === 'cross_platform');
    const [completionFilter, setCompletionFilter] = useState<string>(searchParams.get('completion') || 'all');
    const [playedFilter, setPlayedFilter] = useState<string>(searchParams.get('played') || 'all');
    const [page, setPage] = useState<number>(Math.max(1, Number(searchParams.get('page') || 1)));

    useEffect(() => {
        const platformFilter = location.state?.platformFilter;
        if (platformFilter) {
            setSelectedPlatform(platformFilter);
        }
    }, [location.state]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 250);
        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    // Persist the exact view state in the URL so filters, sort, and page are
    // shareable and recoverable on refresh (audit #1, item 6).
    useEffect(() => {
        const next = new URLSearchParams();
        if (selectedPlatform) next.set('provider', selectedPlatform);
        if (sortKey && sortKey !== 'recently_played') next.set('sort', sortKey);
        if (debouncedSearch) next.set('q', debouncedSearch);
        if (crossPlatformOnly) next.set('crossPlatform', 'cross_platform');
        if (completionFilter && completionFilter !== 'all') next.set('completion', completionFilter);
        if (playedFilter && playedFilter !== 'all') next.set('played', playedFilter);
        if (page > 1) next.set('page', String(page));
        const params = next.toString();
        if (params !== searchParams.toString()) {
            setSearchParams(next, { replace: true });
        }
    }, [selectedPlatform, sortKey, debouncedSearch, crossPlatformOnly, completionFilter, playedFilter, page, searchParams, setSearchParams]);

    const {
        completeConsolidatedGames: library,
        loading,
    } = useGameData(beBaseUrl);

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
        return platformKey === "xbox" ? 60 : 24;
    };

    const availablePlatforms = useMemo(() => {
        const platforms = new Set<string>();
        library.forEach((game) => {
            game.platforms.forEach((platform) => platforms.add(platform.key));
        });
        // Keep the canonical hub ordering.
        const order = ['steam', 'psn', 'xbox', 'retroachievements'];
        return order.filter((key) => platforms.has(key));
    }, [library]);

    const providerFilteredGames = useMemo(() => {
        return library.filter((game) => {
            if (selectedPlatform && !game.sources.some((source) => source.platform === selectedPlatform)) return false;
            if (crossPlatformOnly && !game.isCrossPlatform) return false;
            return true;
        });
    }, [library, selectedPlatform, crossPlatformOnly]);

    const countedGames = useMemo(() => providerFilteredGames.map(countGame), [providerFilteredGames]);

    const visibleGames = useMemo(() => {
        const q = debouncedSearch;
        let filtered = countedGames;
        if (q) {
            filtered = filtered.filter((item) => item.game.title.toLowerCase().includes(q));
        }

        filtered = filtered.filter((item) => {
            if (completionFilter === 'all') return true;
            if (completionFilter === 'completed') return item.completionPct >= 80;
            if (completionFilter === 'in_progress') return item.completionPct > 0 && item.completionPct < 80;
            if (completionFilter === 'unplayed') return item.completionPct === 0;
            return true;
        });

        filtered = filtered.filter((item) => {
            if (playedFilter === 'all') return true;
            const hasPlayed = item.hasPlaytime || Boolean(item.lastPlayed);
            return playedFilter === 'played' ? hasPlayed : !hasPlayed;
        });

        const sorted = [...filtered].sort((a, b) => {
            if (sortKey === 'title') return a.game.title.localeCompare(b.game.title);
            if (sortKey === 'most_played') return b.playtimeMinutes - a.playtimeMinutes;
            if (sortKey === 'completion') {
                const byPct = b.completionPct - a.completionPct;
                return byPct !== 0 ? byPct : b.unlockedAchievements - a.unlockedAchievements;
            }
            if (sortKey === 'recently_earned_achievement') {
                return getLatestAchievementDate(b.game).getTime() - getLatestAchievementDate(a.game).getTime();
            }
            // recently_played: titles without a timestamp sort last.
            const aTime = a.lastPlayed ? a.lastPlayed.getTime() : 0;
            const bTime = b.lastPlayed ? b.lastPlayed.getTime() : 0;
            return bTime - aTime;
        });

        return sorted;
    }, [countedGames, debouncedSearch, sortKey, completionFilter, playedFilter]);

    const totalPages = Math.max(1, Math.ceil(visibleGames.length / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages);
    const pageStart = (clampedPage - 1) * PAGE_SIZE;
    const pageGames = visibleGames.slice(pageStart, pageStart + PAGE_SIZE);

    const activeFilterCount = Number(Boolean(selectedPlatform)) + Number(crossPlatformOnly) +
        Number(completionFilter !== 'all') + Number(playedFilter !== 'all') + Number(Boolean(debouncedSearch));

    const clearFilters = () => {
        setSelectedPlatform(null);
        setCrossPlatformOnly(false);
        setCompletionFilter('all');
        setPlayedFilter('all');
        setSearchQuery('');
        setDebouncedSearch('');
        setPage(1);
    };

    const handleGameClick = (game: Game, event: React.MouseEvent<HTMLElement>) => {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        sessionStorage.setItem('gameCardPosition', JSON.stringify({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        }));
        navigate(`/games/title/${encodeURIComponent(game.title)}`);
    };

    const [isCompact, setIsCompact] = useState(false);
    useEffect(() => {
        const update = () => {
            setIsCompact(window.innerWidth > 0 && window.innerWidth <= 640);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const gameLink = (game: Game) => `/games/title/${encodeURIComponent(game.title)}`;

    const renderProviderGroup = (game: Game) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {game.platforms.slice(0, 4).map((platform) => (
                <img
                    key={platform.key}
                    src={platform.icon}
                    alt={platform.displayName}
                    title={platform.displayName}
                    loading="lazy"
                    width={platform.key === 'xbox' ? 18 : 14}
                    height={14}
                    style={{ objectFit: 'contain' }}
                />
            ))}
            {game.platforms.length > 4 && (
                <Typography variant="caption" sx={{ color: zincColors.muted, fontSize: '0.7rem' }}>
                    +{game.platforms.length - 4}
                </Typography>
            )}
        </Box>
    );

return (
        <AppShell activeItem="Games" mainSx={{ p: { xs: 2, md: 4 } }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2, marginBottom: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                    <IconButton onClick={() => navigate('/games')} aria-label="Back to all games" sx={{ color: zincColors.white, backgroundColor: 'rgba(39, 39, 42, 0.5)', border: '1px solid #27272a', '&:hover': { backgroundColor: 'rgba(39, 39, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.3)' } }}>
                        <ArrowLeft size={20} />
                    </IconButton>
                    <Typography variant="h1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: zincColors.white, fontSize: { xs: '1.5rem', md: '1.75rem' }, overflowWrap: 'anywhere' }}>
                        All Games
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                    <Button size="small" onClick={() => { setSelectedPlatform(null); setPage(1); }} variant={selectedPlatform === null ? 'contained' : 'outlined'} aria-pressed={selectedPlatform === null} sx={{ fontSize: '12px', textTransform: 'none', fontFamily: 'Inter, sans-serif', py: 1.25, backgroundColor: selectedPlatform === null ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: '1px solid rgba(59, 130, 246, 0.5)', color: zincColors.white, '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.3)' } }}>
                        All
                    </Button>
                    {availablePlatforms.map((platform) => (
                        <Button key={platform} size="small" onClick={() => { setSelectedPlatform(platform); setPage(1); }} variant={selectedPlatform === platform ? 'contained' : 'outlined'} startIcon={<Box component="img" src={getPlatformIcon(platform)} alt={`${platform} icon`} sx={{ width: getPlatformIconSize(platform) * 0.5, height: 'auto' }} />} aria-pressed={selectedPlatform === platform} sx={{ fontSize: '12px', textTransform: 'none', fontFamily: 'Inter, sans-serif', py: 1.25, backgroundColor: selectedPlatform === platform ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: '1px solid rgba(59, 130, 246, 0.5)', color: zincColors.white, '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.3)' } }}>
                            {platform === 'retroachievements' ? 'RetroAchievements' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </Button>
                    ))}
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2, justifyContent: 'space-between' }}>
                <TextField
                    size="small"
                    placeholder="Search by title"
                    value={searchQuery}
                    onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
                    InputProps={{ startAdornment: <Box component='span' sx={{ mr: 1, color: zincColors.muted }}>⌕</Box> }}
                    sx={{ minWidth: { xs: '100%', sm: 260 }, backgroundColor: 'rgba(255,255,255,0.03)', color: zincColors.white }}
                />
                <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControl size='small' sx={{ minWidth: 170 }}>
                        <InputLabel id='sort-label' sx={{ color: zincColors.white }}>Sort</InputLabel>
                        <Select labelId='sort-label' label='Sort' value={sortKey} onChange={(event) => { setSortKey(String(event.target.value) as SortKey); setPage(1); }} sx={{ color: zincColors.white, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}>
                            <MenuItem value='recently_played'>Recently played</MenuItem>
                            <MenuItem value='most_played'>Most played</MenuItem>
                            <MenuItem value='completion'>Completion</MenuItem>
                            <MenuItem value='title'>Title</MenuItem>
                            <MenuItem value='recently_earned_achievement'>Recently earned achievement</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

<Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
                <Button size='small' variant={crossPlatformOnly ? 'contained' : 'outlined'} onClick={() => { setCrossPlatformOnly(!crossPlatformOnly); setPage(1); }} aria-pressed={crossPlatformOnly} sx={{ color: zincColors.white, borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', py: 1.25 }}>Cross-platform only</Button>
                <Button size='small' variant={completionFilter === 'completed' ? 'contained' : 'outlined'} onClick={() => { setCompletionFilter(completionFilter === 'completed' ? 'all' : 'completed'); setPage(1); }} aria-pressed={completionFilter === 'completed'} sx={{ color: zincColors.white, borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', py: 1.25 }}>Completed</Button>
                <Button size='small' variant={completionFilter === 'in_progress' ? 'contained' : 'outlined'} onClick={() => { setCompletionFilter(completionFilter === 'in_progress' ? 'all' : 'in_progress'); setPage(1); }} aria-pressed={completionFilter === 'in_progress'} sx={{ color: zincColors.white, borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', py: 1.25 }}>In progress</Button>
                <Button size='small' variant={playedFilter === 'played' ? 'contained' : 'outlined'} onClick={() => { setPlayedFilter(playedFilter === 'played' ? 'all' : 'played'); setPage(1); }} aria-pressed={playedFilter === 'played'} sx={{ color: zincColors.white, borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', py: 1.25 }}>Played</Button>
                <Button size='small' variant={playedFilter === 'unplayed' ? 'contained' : 'outlined'} onClick={() => { setPlayedFilter(playedFilter === 'unplayed' ? 'all' : 'unplayed'); setPage(1); }} aria-pressed={playedFilter === 'unplayed'} sx={{ color: zincColors.white, borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', py: 1.25 }}>Unplayed</Button>
                {activeFilterCount > 0 && (
                    <Button size='small' variant='text' onClick={clearFilters} sx={{ color: zincColors.muted, textTransform: 'none', py: 1.25 }}>
                        Clear filters ({activeFilterCount})
                    </Button>
                )}
            </Box>

            {/* Sticky summary bar: active-filter count + result count stay
                visible while scrolling (audit #10). */}
            <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'rgba(15, 17, 21, 0.92)', borderBottom: '1px solid rgba(255,255,255,0.08)', px: 1, py: 0.75, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Chip size="small" label={`${pageGames.length} of ${visibleGames.length} games`} sx={{ color: zincColors.white, bgcolor: 'rgba(39,39,42,0.6)', fontSize: '0.75rem' }} />
                {activeFilterCount > 0 && <Chip size="small" label={`${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`} sx={{ color: '#facc15', bgcolor: 'rgba(250, 204, 21, 0.12)', fontSize: '0.75rem' }} />}
                {crossPlatformOnly && <Chip size="small" label="Cross-platform" sx={{ color: zincColors.white, bgcolor: 'rgba(139,92,246,0.15)', fontSize: '0.75rem' }} />}
                <Box sx={{ flex: 1 }} />
                {visibleGames.length > 0 && (
                    <Button size="small" startIcon={<ArrowUp size={14} />} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} sx={{ color: zincColors.muted, textTransform: 'none', fontSize: '12px', py: 1 }}>
                        Back to top
                    </Button>
                )}
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', color: zincColors.muted }}>
                        Loading games...
                    </Typography>
                </Box>
            ) : visibleGames.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', color: zincColors.muted }}>
                        {activeFilterCount > 0
                            ? "No games match the current filters."
                            : "No games found yet. Connect a provider on the Games page."}
                    </Typography>
                </Box>
            ) : isCompact ? (
/* Compact list rows below the card breakpoint (audit #10). */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {pageGames.map((item) => (
                        <Box key={item.game.id} component='a' href={gameLink(item.game)} onClick={(e) => handleGameClick(item.game, e as any)} aria-label={`Open ${item.game.title}`} sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, minHeight: 44,
                            bgcolor: 'rgba(24, 24, 27, 0.4)', borderRadius: 1,
                            border: '1px solid rgba(255, 255, 255, 0.06)', color: 'inherit', textDecoration: 'none',
                            cursor: 'pointer', '&:hover': { bgcolor: 'rgba(24, 24, 27, 0.7)', borderColor: 'rgba(59, 130, 246, 0.5)' },
                            '&:focus-visible': { outline: '2px solid #facc15', outlineOffset: 2 },
                        }}>
                            {item.game.imageUrl ? (
                                <img src={item.game.imageUrl} alt="" loading="lazy" width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />
                            ) : (
                                <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ color: '#6b7280', fontSize: '10px' }}>No image</Typography>
                                </Box>
                            )}
                            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                <Typography sx={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: zincColors.white }}>
                                    {item.game.title}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    {renderProviderGroup(item.game)}
                                    {item.game.isCrossPlatform && (
                                        <Chip size="small" label="Cross-platform" sx={{ height: 20, fontSize: '0.65rem', color: '#c4b5fd', bgcolor: 'rgba(139,92,246,0.18)' }} />
                                    )}
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
                                <Typography sx={{ fontSize: '12px', color: zincColors.muted, whiteSpace: 'nowrap' }}>
                                    {item.hasPlaytime ? formatMinutesCompact(item.playtimeMinutes) : '—'}
                                </Typography>
                                {item.totalAchievements > 0 && (
                                    <Typography sx={{ fontSize: '12px', color: item.completionPct >= 80 ? '#22c55e' : zincColors.muted, whiteSpace: 'nowrap' }}>
                                        {item.unlockedAchievements}/{item.totalAchievements}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>
            ) : (
<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: { sm: 2, md: 3 }, alignItems: 'start', minWidth: 0 }}>
                    {pageGames.map((item) => (
                        <Box key={item.game.id} component='a' href={gameLink(item.game)} onClick={(e) => handleGameClick(item.game, e as any)} aria-label={`Open ${item.game.title}`} sx={{ cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' }, '&:focus-visible': { outline: '2px solid #facc15', outlineOffset: 2 }, color: 'inherit', textDecoration: 'none' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'rgba(24, 24, 27, 0.4)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
                                {item.game.imageUrl ? (
                                    <img src={item.game.imageUrl} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                    <Box sx={{ width: '100%', height: 120, bgcolor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography sx={{ color: '#6b7280', fontSize: '12px' }}>No image</Typography>
                                    </Box>
                                )}
                                <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: zincColors.white, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.game.title}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        {renderProviderGroup(item.game)}
                                        {item.game.isCrossPlatform && (
                                            <Chip size="small" label="Cross-platform" sx={{ height: 20, fontSize: '0.65rem', color: '#c4b5fd', bgcolor: 'rgba(139,92,246,0.18)' }} />
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                        <Typography sx={{ fontSize: '12px', color: zincColors.muted }}>
                                            {item.hasPlaytime ? `Playtime ${formatMinutesCompact(item.playtimeMinutes)}` : 'Playtime N/A'}
                                        </Typography>
                                        {item.totalAchievements > 0 && (
                                            <Typography sx={{ fontSize: '12px', color: zincColors.muted }}>
                                                {item.unlockedAchievements}/{item.totalAchievements} achievements
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}

            {/* Pagination */}
            {visibleGames.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button size='small' disabled={clampedPage <= 1} onClick={() => setPage(Math.max(1, clampedPage - 1))}>Previous</Button>
                    <Typography sx={{ alignSelf: 'center', color: zincColors.muted }}>{clampedPage} / {totalPages}</Typography>
                    <Button size='small' disabled={clampedPage >= totalPages} onClick={() => setPage(Math.min(totalPages, clampedPage + 1))}>Next</Button>
                </Box>
            )}
        </AppShell>
    );
};

export default AllGames;
