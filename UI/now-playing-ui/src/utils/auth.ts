// Dummy JWT token for development
const DUMMY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export const getAuthToken = () => {
    return localStorage.getItem('token') || null;
};

export const setAuthToken = (token: string) => {
    localStorage.setItem('token', token);
};

export const removeAuthToken = () => {
    localStorage.removeItem('token');
};

export const isAuthenticated = () => {
    return !!getAuthToken();
};

// API request wrapper that includes the auth token
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();

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
        // Token expired or invalid
        removeAuthToken();
        window.location.href = '/auth';
        throw new Error('Authentication failed');
    }

    return response;
}; 