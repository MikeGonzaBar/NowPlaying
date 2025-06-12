import { useState, useEffect, useCallback } from 'react';
import { TraktAuthStatus, UserProfile } from '../types';
import { authenticatedFetch } from '../../../utils/auth';
import { getApiUrl, API_CONFIG } from '../../../config/api';

export const useTraktAuth = (userProfile: UserProfile | null) => {
    const [traktAuthStatus, setTraktAuthStatus] = useState<TraktAuthStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [oauthDialogOpen, setOauthDialogOpen] = useState(false);
    const [authCode, setAuthCode] = useState('');

    const fetchTraktAuthStatus = useCallback(async () => {
        try {
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/auth-status/`)
            );

            if (response.ok) {
                const authStatus: TraktAuthStatus = await response.json();
                setTraktAuthStatus(authStatus);
            }
        } catch (err) {
            console.error('Error fetching Trakt auth status:', err);
        }
    }, []);

    useEffect(() => {
        fetchTraktAuthStatus();
    }, [fetchTraktAuthStatus]);

    const startOAuth = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/authenticate/`)
            );

            if (response.ok) {
                const data = await response.json();
                window.open(data.auth_url, '_blank', 'width=600,height=700');
                setOauthDialogOpen(true);
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Unknown error');
            }
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const completeOAuth = async () => {
        if (!authCode.trim()) {
            throw new Error('Please enter the authorization code');
        }

        try {
            setLoading(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/oauth-callback/`),
                {
                    method: 'POST',
                    body: JSON.stringify({
                        code: authCode.trim(),
                        state: userProfile?.id
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                setOauthDialogOpen(false);
                setAuthCode('');

                // Refresh auth status
                await fetchTraktAuthStatus();

                return data.message || 'Successfully authenticated with Trakt!';
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Unknown error');
            }
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        traktAuthStatus,
        loading,
        oauthDialogOpen,
        authCode,
        setOauthDialogOpen,
        setAuthCode,
        startOAuth,
        completeOAuth,
        refetchAuthStatus: fetchTraktAuthStatus
    };
}; 