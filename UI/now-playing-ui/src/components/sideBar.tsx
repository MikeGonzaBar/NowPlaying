import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Link } from 'react-router-dom';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import HeadsetIcon from '@mui/icons-material/Headset';
import nowPlayingIcon from '../assets/now-playing-icon.png';

interface SideBarProps {
    activeItem: string;
}
function SideBar({ activeItem }: SideBarProps) {
    const drawerWidth = 170
    const drawer =

        <List>
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
                        src={nowPlayingIcon}
                        alt="Now Playing Icon"
                        sx={{
                            width: 122,
                            height: 122,
                        }}
                    />
                </ListItemButton>
            </ListItem>

            {[
                { text: 'Games', icon: <SportsEsportsIcon />, route: '/page1' },
                { text: 'Movies', icon: <OndemandVideoIcon />, route: '/page2' },
                { text: 'Music', icon: <HeadsetIcon />, route: '/page3' },
            ].map((item) => (
                <ListItem key={item.text} disablePadding>
                    <ListItemButton
                        component={Link}
                        to={item.route} 
                        sx={{
                            backgroundColor: activeItem === item.text ? 'rgba(255, 255, 255, 0.2)' : 'transparent', 
                            borderRadius: '20px', 
                            paddingLeft: '20px', 
                            marginInline: '10px', 
                            marginTop: '15px',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                            },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 'auto', 
                                mr: 2, 
                                svg: { fontSize: 40, color: '#ffffff' }, 
                            }}
                        >
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={item.text}
                            sx={{
                                fontSize: 20, 
                                color: '#ffffff', 
                            }}
                        />
                    </ListItemButton>
                </ListItem>
            ))
            }
        </List >

    return (
        <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            aria-label="sidebar btns"
        >
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: '#0E0022' },
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
}

export default SideBar;