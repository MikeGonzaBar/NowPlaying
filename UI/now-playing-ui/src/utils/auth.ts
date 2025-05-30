import { getApiUrl, API_CONFIG } from '../config/api';

export const getAuthToken = () => {
    return localStorage.getItem('token') || null;
};

export const getRefreshToken = () => {
    return localStorage.getItem('refresh_token') || null;
};

export const setAuthToken = (token: string) => {
    localStorage.setItem('token', token);
};

export const setRefreshToken = (token: string) => {
    localStorage.setItem('refresh_token', token);
};

export const removeAuthToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
};

export const isAuthenticated = () => {
    const token = getAuthToken();
    if (!token) return false;

    // Check if token is expired
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        return payload.exp > currentTime;
    } catch (error) {
        // If token is malformed, consider it invalid
        return false;
    }
};

export const refreshAuthToken = async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch(getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/token/refresh/`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh: refreshToken,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            setAuthToken(data.access);
            return true;
        } else {
            // Refresh token is invalid, remove all tokens
            removeAuthToken();
            return false;
        }
    } catch (error) {
        removeAuthToken();
        return false;
    }
};

// API request wrapper that includes the auth token and handles token refresh
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let token = getAuthToken();

    // Check if token exists and is valid
    if (!token || !isAuthenticated()) {
        // Try to refresh the token
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
            // Redirect to auth page if refresh fails
            window.location.href = '/auth';
            throw new Error('Authentication failed');
        }
        token = getAuthToken();
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Try to refresh token once more
        const refreshed = await refreshAuthToken();
        if (refreshed) {
            // Retry the request with new token
            const newToken = getAuthToken();
            const retryResponse = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return retryResponse;
        } else {
            // Token refresh failed, redirect to auth
            removeAuthToken();
            window.location.href = '/auth';
            throw new Error('Authentication failed');
        }
    }

    return response;
}; 