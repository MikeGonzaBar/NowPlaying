import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { authenticatedFetch } from '../../../utils/auth';
import { getApiUrl, API_CONFIG } from '../../../config/api';

export const useProfile = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setLoading(true);
                const response = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/profile/`)
                );

                if (response.ok) {
                    const userData = await response.json();
                    setUserProfile(userData);
                } else {
                    throw new Error('Failed to fetch user profile');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    return { userProfile, loading, error };
}; 