import { useState, useEffect, useCallback } from 'react';
import { ApiKey, ApiKeysResponse, NewApiKey } from '../types';
import { authenticatedFetch } from '../../../utils/auth';
import { getApiUrl, API_CONFIG } from '../../../config/api';

const REQUIRED_FIELD_LABELS: Record<string, { userId: string; apiKey: string }> = {
    steam: { userId: 'Steam ID', apiKey: 'Steam API Key' },
    psn: { userId: 'PSN User ID', apiKey: 'NPSSO Token' },
    xbox: { userId: 'XUID', apiKey: 'OpenXBL API Key' },
    retroachievements: { userId: 'RetroAchievements Username', apiKey: 'RetroAchievements API Key' },
    trakt: { userId: 'Client ID', apiKey: 'Client Secret' },
    lastfm: { userId: 'Last.fm Username', apiKey: 'Last.fm API Key' },
};

const getRequiredFieldsMessage = (serviceName: string) => {
    const labels = REQUIRED_FIELD_LABELS[serviceName] ?? { userId: 'User ID', apiKey: 'API Key' };
    return `Please fill in both ${labels.userId} and ${labels.apiKey}`;
};

export const useApiKeys = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newApiKeys, setNewApiKeys] = useState<Record<string, NewApiKey>>({});

    const fetchApiKeys = useCallback(async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/`)
            );

            if (response.ok) {
                const apiKeysData: ApiKeysResponse = await response.json();
                setApiKeys(apiKeysData.results);
            } else {
                throw new Error('Failed to fetch API keys');
            }
        } catch (err) {
            console.error('Error fetching API keys:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchApiKeys();
    }, [fetchApiKeys]);

    const getApiKeyForService = (serviceName: string) => {
        return apiKeys.find(key => key.service_name === serviceName);
    };

    const handleNewApiKeyChange = (serviceName: string, field: 'userId' | 'apiKey', value: string) => {
        setNewApiKeys(prev => ({
            ...prev,
            [serviceName]: {
                ...prev[serviceName],
                [field]: value
            }
        }));
    };

    const saveApiKey = async (serviceName: string, keyData?: NewApiKey) => {
        const newKey = keyData ?? newApiKeys[serviceName];
        const serviceUserId = newKey?.userId?.trim() ?? '';
        const apiKey = newKey?.apiKey?.trim() ?? '';

        if (!serviceUserId || !apiKey) {
            throw new Error(getRequiredFieldsMessage(serviceName));
        }

        const response = await authenticatedFetch(
            getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/`),
            {
                method: 'POST',
                body: JSON.stringify({
                    service_name: serviceName,
                    service_user_id: serviceUserId,
                    api_key: apiKey
                })
            }
        );

        if (response.ok) {
            await fetchApiKeys();
            setNewApiKeys(prev => ({
                ...prev,
                [serviceName]: { userId: '', apiKey: '' }
            }));
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Unknown error');
        }
    };

    const deleteApiKey = async (apiKeyId: number) => {
        const response = await authenticatedFetch(
            getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/${apiKeyId}/`),
            {
                method: 'DELETE'
            }
        );

        if (response.ok) {
            await fetchApiKeys();
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Unknown error');
        }
    };

    const updateApiKey = async (apiKeyId: number, updateData: { api_key?: string }) => {
        const response = await authenticatedFetch(
            getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/${apiKeyId}/`),
            {
                method: 'PATCH',
                body: JSON.stringify(updateData)
            }
        );

        if (response.ok) {
            await fetchApiKeys();
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Unknown error');
        }
    };

    return {
        apiKeys,
        loading,
        newApiKeys,
        getApiKeyForService,
        handleNewApiKeyChange,
        saveApiKey,
        deleteApiKey,
        updateApiKey,
        refetchApiKeys: fetchApiKeys
    };
}; 
