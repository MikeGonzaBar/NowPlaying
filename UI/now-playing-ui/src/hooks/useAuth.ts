import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    isAuthenticated,
    refreshAuthToken,
    removeAuthToken,
    getAuthToken
} from '../utils/auth';

export const useAuth = () => {
    const [authenticated, setAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    const checkAuthStatus = useCallback(async () => {
        setIsLoading(true);
        // Don't try to refresh tokens if we're already on the auth page
        const isOnAuthPage = location.pathname === '/auth' || location.pathname.startsWith('/auth');

        if (isAuthenticated()) {
            setAuthenticated(true);
        } else if (!isOnAuthPage) {
            // Only try to refresh token if we're not on the auth page
            const refreshed = await refreshAuthToken();
            setAuthenticated(refreshed);
        } else {
            // On auth page, just set authenticated to false
            setAuthenticated(false);
        }
        setIsLoading(false);
    }, [location.pathname]);

    const logout = () => {
        removeAuthToken();
        setAuthenticated(false);
        navigate('/auth');
    };

    const login = (token: string, refreshToken: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('refresh_token', refreshToken);
        setAuthenticated(true);
    };

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    return {
        authenticated,
        isLoading,
        logout,
        login,
        checkAuthStatus,
        token: getAuthToken(),
    };
}; 