import { ServiceConfig } from '../types';

export const SERVICES: ServiceConfig[] = [
    {
        name: 'steam',
        displayName: 'Steam',
        category: 'Gaming',
        placeholder: 'Steam User ID',
        imagePath: '/Platforms/steam.webp'
    },
    {
        name: 'psn',
        displayName: 'PlayStation Network',
        category: 'Gaming',
        placeholder: 'PSN User ID',
        imagePath: '/Platforms/playstation.webp'
    },
    {
        name: 'xbox',
        displayName: 'Xbox',
        category: 'Gaming',
        placeholder: 'Xbox User ID',
        imagePath: '/Platforms/xbox.svg'
    },
    {
        name: 'retroachievements',
        displayName: 'RetroAchievements',
        category: 'Gaming',
        placeholder: 'RetroAchievements Username',
        imagePath: '/Platforms/retroachievements.png'
    },
    {
        name: 'trakt',
        displayName: 'Trakt',
        category: 'Movies',
        placeholder: 'Client ID',
        imagePath: '/Platforms/trakt.png',
        requiresOAuth: true
    },
    {
        name: 'lastfm',
        displayName: 'Last.fm',
        category: 'Music',
        placeholder: 'Last.fm Username',
        imagePath: '/Platforms/lastfm.png'
    },
];

export const getServicesByCategory = (category: 'Gaming' | 'Movies' | 'Music'): ServiceConfig[] => {
    return SERVICES.filter(service => service.category === category);
};

export const getServiceTooltipContent = (serviceName: string): string => {
    const tooltips: { [key: string]: string } = {
        steam: `Steam Setup:
• API Key: steamcommunity.com/dev/apikey
• Steam ID: Use steamidfinder.com to find your 64-bit ID`,

        psn: `PlayStation Setup:
• NPSSO Token: Login to PlayStation.com → F12 Dev Tools → Find NPSSO cookie
• User ID: Your PSN username (optional)`,

        xbox: `Xbox Setup:
• API Key: Get from OpenXBL.com
• XUID: Your Xbox Live User ID (find via OpenXBL tools)`,

        retroachievements: `RetroAchievements Setup:
• Create account at RetroAchievements.org
• API Key: Control Panel → API Settings → Generate key
• Username: Your RetroAchievements username`,

        trakt: `Trakt Setup:
• Go to trakt.tv/oauth/applications
• Create new app with redirect: localhost:8080/trakt/oauth-callback/
• Copy Client ID and Client Secret`,

        spotify: `Spotify Setup:
• Visit developer.spotify.com/dashboard
• Create app → Get Client ID/Secret
• Generate OAuth2 access token`,

        lastfm: `Last.fm Setup:
• API Key: last.fm/api → Create account
• Username: Your Last.fm username`
    };

    return tooltips[serviceName] || 'No guidance available for this service.';
}; 