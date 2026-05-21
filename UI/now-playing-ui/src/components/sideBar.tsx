import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import HeadsetIcon from '@mui/icons-material/Headset';
import PersonIcon from '@mui/icons-material/Person';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import LogoutIcon from '@mui/icons-material/Logout';
import { removeAuthToken } from '../utils/auth';

interface SideBarProps {
    activeItem: string;
}

export const DRAWER_WIDTH = 160;

function SideBar({ activeItem }: SideBarProps) {
    const navigate = useNavigate();

    const handleLogout = () => {
        removeAuthToken();
        navigate('/auth', { replace: true });
    };

    const navButtonStyles = {
        borderRadius: '8px',
        px: 1.5,
        py: 1.1,
        mt: 1.25,
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
    };

    const drawer =
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <List sx={{ px: 1, py: 1.5, flexGrow: 1 }}>
                <ListItem key="now-playing" disablePadding>
                    <ListItemButton
                        component={Link}
                        to="/"
                        sx={{
                            justifyContent: 'center',
                            padding: 0,
                        }}
                    >
                        <Box
                            component="img"
                            src={'/nowPlaying.svg'}
                            alt="Now Playing Icon"
                            sx={{
                                width: 104,
                                height: 104,
                            }}
                        />
                    </ListItemButton>
                </ListItem>

                {[
                    { text: 'Games', icon: <SportsEsportsIcon />, route: '/games' },
                    { text: 'Movies', icon: <OndemandVideoIcon />, route: '/movies' },
                    { text: 'Music', icon: <HeadsetIcon />, route: '/music' },
                    { text: 'Analytics', icon: <AnalyticsIcon />, route: '/analytics' },
                    { text: 'Profile', icon: <PersonIcon />, route: '/profile' },
                ].map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={Link}
                            to={item.route}
                            sx={{
                                ...navButtonStyles,
                                backgroundColor: activeItem === item.text ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 'auto',
                                    mr: 1.5,
                                    svg: { fontSize: 32, color: '#ffffff' },
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{
                                    fontSize: 14,
                                    fontWeight: activeItem === item.text ? 700 : 500,
                                    color: '#ffffff',
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))
                }
            </List>

            <Box sx={{ px: 1, pb: 1.5 }}>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            ...navButtonStyles,
                            mt: 0,
                            color: '#ffffff',
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 'auto',
                                mr: 1.5,
                                svg: { fontSize: 30, color: '#ffffff' },
                            }}
                        >
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary="Sign out"
                            primaryTypographyProps={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#ffffff',
                            }}
                        />
                    </ListItemButton>
                </ListItem>
            </Box>
        </Box>

    return (
        <Box
            component="nav"
            sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
            aria-label="sidebar btns"
        >
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: DRAWER_WIDTH,
                        backgroundColor: '#0E0022',
                        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    },
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
}

export default SideBar;
