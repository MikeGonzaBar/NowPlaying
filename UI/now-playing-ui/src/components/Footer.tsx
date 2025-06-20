import { Box, Typography, Link, IconButton } from '@mui/material';
import { FaGithub, FaSteam, FaXbox, FaPlaystation, FaLastfm, FaDiscord } from 'react-icons/fa';
import { SiTrakt, SiRetroarch, SiEpicgames } from "react-icons/si";


const Footer = () => {
    const socialLinks = [
        { icon: <FaGithub />, href: 'https://github.com/MikeGonzaBar', name: 'GitHub' },
        { icon: <FaSteam />, href: 'https://steamcommunity.com/profiles/76561198138342078/', name: 'Steam' },
        { icon: <FaXbox />, href: 'https://account.xbox.com/en-us/profile?gamertag=Mr%20Mike%20Ock', name: 'Xbox' },
        { icon: <FaPlaystation />, href: 'https://psnprofiles.com/MrMaikOck', name: 'PSN' },
        { icon: <SiRetroarch />, href: 'https://retroachievements.org/user/mikegonza11', name: 'RetroAchievements' },
        { icon: <FaLastfm />, href: 'https://www.last.fm/user/mikegonza11', name: 'Last.fm' },
        { icon: <FaDiscord />, href: 'https://discordapp.com/users/maikock', name: 'Discord' },
        { icon: <SiEpicgames />, href: 'https://store.epicgames.com/es-ES/u/c6f20b3e0dbf48058bf6c1e3865c551es', name: 'Epic Games' },
        { icon: <SiTrakt />, href: 'https://trakt.tv/users/mikegonzalez', name: 'Trakt' },
    ];

    return (
        <Box
            component="footer"
            sx={{
                py: 3,
                px: 2,
                mt: 'auto',
                backgroundColor: (theme) =>
                    theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],
                color: (theme) => (theme.palette.mode === 'light' ? 'black' : 'white'),
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                {socialLinks.map((link) => (
                    <IconButton
                        key={link.name}
                        component={Link}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.name}
                        sx={{
                            color: 'inherit',
                            '&:hover': {
                                color: 'primary.main',
                                transform: 'scale(1.1)',
                            },
                            transition: 'color 0.2s, transform 0.2s',
                        }}
                    >
                        {link.icon}
                    </IconButton>
                ))}
            </Box>
            <Typography variant="body2" align="center">
                This project is a personal dashboard to track my gaming and media consumption.
            </Typography>
        </Box>
    );
};

export default Footer; 