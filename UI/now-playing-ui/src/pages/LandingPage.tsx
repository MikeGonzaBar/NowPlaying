import { Link } from 'react-router-dom';
import { Container, Box, Typography, Paper, Button } from '@mui/material';
import Grid from '@mui/material/Grid';
import PersonIcon from '@mui/icons-material/Person';
import nowPlayingIcon from '../assets/now-playing-icon.png';
import { useAuth } from '../hooks/useAuth';

interface CategoryCardProps {
    title: string;
    emoji: string;
    gradient: string;
    route: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, emoji, gradient, route }) => (
    <Paper
        component={Link}
        to={route}
        sx={{
            width: 350,
            height: 193,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: gradient,
            color: '#ffffff',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease',
            '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 3,
                color: '#FFFFFF',
            },
        }}
    >
        <Typography variant="h6" sx={{ fontSize: '45px' }}>
            {title}
        </Typography>
        <Typography variant="body1" sx={{ fontSize: '45px' }}>
            {emoji}
        </Typography>
    </Paper>
);

function LandingPage() {
    const { logout } = useAuth();

    const categories = [
        {
            title: 'Games',
            emoji: '🎮',
            gradient: 'linear-gradient(to bottom, #101B2F, #1782B3)',
            route: '/games',
        },
        {
            title: 'Movies & Shows',
            emoji: '📺',
            gradient: 'linear-gradient(to bottom, #9e43c6, #e40e31)',
            route: '/movies',
        },
        {
            title: 'Music',
            emoji: '🎧',
            gradient: 'linear-gradient(to bottom, #1ED760, #107132)',
            route: '/music',
        },
    ];

    return (
        <Container
            maxWidth="md"
            sx={{
                textAlign: 'center',
                pt: 4,
                alignItems: 'center',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                minWidth: '100vw',
                backgroundColor: '#0E0022',
                position: 'relative',
            }}
        >
            {/* Top right buttons */}
            <Box sx={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 2 }}>
                <Button
                    component={Link}
                    to="/profile"
                    startIcon={<PersonIcon />}
                    sx={{
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                        },
                    }}
                >
                    Profile
                </Button>
                <Button
                    onClick={logout}
                    sx={{
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                        },
                    }}
                >
                    Logout
                </Button>
            </Box>

            <Box
                component="img"
                src={nowPlayingIcon}
                alt="Now Playing Icon"
                sx={{
                    width: 235,
                    height: 235,
                    mb: 2,
                }}
            />

            <Typography variant="h3" sx={{
                color: '#fff', mb: 1, fontFamily: 'Montserrat, sans-serif',
                fontWeight: 'bold',
            }}>
                Now Playing
            </Typography>

            <Typography variant="subtitle1" sx={{ color: '#ccc', fontSize: '20px', fontFamily: 'Montserrat, sans-serif', maxWidth: 420, }}>
                Your recently played games, streamed songs, and watched movies & series—
                all in one place.
            </Typography>

            <Grid container spacing={8} justifyContent="center" sx={{ mt: 4 }}>
                {categories.map((category, index) => (
                    <Grid component="div" key={index}>
                        <CategoryCard
                            title={category.title}
                            emoji={category.emoji}
                            gradient={category.gradient}
                            route={category.route}
                        />
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

export default LandingPage;