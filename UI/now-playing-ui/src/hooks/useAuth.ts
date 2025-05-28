import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

    const checkAuthStatus = async () => {
        setIsLoading(true);
        if (isAuthenticated()) {
            setAuthenticated(true);
        } else {
            const refreshed = await refreshAuthToken();
            setAuthenticated(refreshed);
        }
        setIsLoading(false);
    };

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
    }, []);

    return {
        authenticated,
        isLoading,
        logout,
        login,
        checkAuthStatus,
        token: getAuthToken(),
    };
}; 