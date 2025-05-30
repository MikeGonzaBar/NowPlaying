// API Configuration
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    USERS_ENDPOINT: '/users',
    MUSIC_ENDPOINT: '/music',
    TRAKT_ENDPOINT: '/trakt',
    TIMEOUT: 10000, // 10 seconds
};

export const getApiUrl = (endpoint: string) => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
}; 