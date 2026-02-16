import { Link, useNavigate } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import { Gamepad2, Film, Music, BarChart3, Search, User } from 'lucide-react';
import { zincColors, categoryColors } from '../theme';

interface CategoryTileProps {
    title: string;
    icon: React.ReactNode;
    color: string;
    route: string;
    lastPlayed?: string;
}

const CategoryTile: React.FC<CategoryTileProps> = ({ title, icon, color, route, lastPlayed }) => {
    const navigate = useNavigate();

    return (
        <Box
            component="div"
            onClick={() => navigate(route)}
            sx={{
                width: 200,
                height: 140,
                backgroundColor: zincColors.card,
                border: `1px solid ${zincColors.border}`,
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                '&:hover': {
                    borderColor: color,
                    boxShadow: `0 0 20px ${color}20`,
                },
            }}
        >
            <Box sx={{ color: zincColors.muted, mb: 1 }}>
                {icon}
            </Box>
            <Typography
                variant="h6"
                sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: zincColors.white,
                    mb: 0.5,
                }}
            >
                {title}
            </Typography>
            {lastPlayed && (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: '11px',
                        color: zincColors.muted,
                        position: 'absolute',
                        bottom: 12,
                    }}
                >
                    {lastPlayed}
                </Typography>
            )}
        </Box>
    );
};

function LandingPage() {
    const categories = [
        {
            title: 'Games',
            icon: <Gamepad2 size={32} strokeWidth={1.5} />,
            color: categoryColors.games,
            route: '/games',
            lastPlayed: 'Last played 2h ago',
        },
        {
            title: 'Movies & Shows',
            icon: <Film size={32} strokeWidth={1.5} />,
            color: categoryColors.movies,
            route: '/movies',
            lastPlayed: 'Last watched 1d ago',
        },
        {
            title: 'Music',
            icon: <Music size={32} strokeWidth={1.5} />,
            color: categoryColors.music,
            route: '/music',
            lastPlayed: 'Last played 30m ago',
        },
        {
            title: 'Analytics',
            icon: <BarChart3 size={32} strokeWidth={1.5} />,
            color: categoryColors.analytics,
            route: '/analytics',
        },
    ];

    return (
        <Container
            maxWidth={false}
            sx={{
                minHeight: '100vh',
                backgroundColor: zincColors.background,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            {/* Top Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 4,
                    py: 2,
                    borderBottom: `1px solid ${zincColors.border}`,
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: zincColors.white,
                    }}
                >
                    Now Playing
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box
                        component={Link}
                        to="/profile"
                        sx={{
                            color: zincColors.muted,
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            '&:hover': {
                                color: zincColors.white,
                            },
                        }}
                    >
                        <User size={20} strokeWidth={1.5} />
                    </Box>
                    <Box
                        sx={{
                            color: zincColors.muted,
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            '&:hover': {
                                color: zincColors.white,
                            },
                        }}
                    >
                        <Search size={20} strokeWidth={1.5} />
                    </Box>
                </Box>
            </Box>

            {/* Main Hub - Centered */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 8,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        gap: 3,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        maxWidth: '900px',
                        px: 4,
                    }}
                >
                    {categories.map((category, index) => (
                        <CategoryTile
                            key={index}
                            title={category.title}
                            icon={category.icon}
                            color={category.color}
                            route={category.route}
                            lastPlayed={category.lastPlayed}
                        />
                    ))}
                </Box>
            </Box>
        </Container>
    );
}

export default LandingPage;
