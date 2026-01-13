import { useState, useCallback } from 'react';
import { authenticatedFetch } from '../utils/auth';

interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

export function useApi<T>() {
    const [state, setState] = useState<ApiResponse<T>>({
        data: null,
        error: null,
        loading: false,
    });

    const request = useCallback(async (url: string, options: RequestInit = {}) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await authenticatedFetch(url, options);

            // Try to parse JSON, even on non-OK responses
            let data: any = null;
            try {
                data = await response.json();
            } catch (_e) {
                data = null;
            }

            if (!response.ok) {
                const backendMessage = (data && (data.detail || data.error)) ? (data.detail || data.error) : `Request failed with status ${response.status}`;
                setState({ data: null, error: backendMessage, loading: false });
                throw new Error(backendMessage);
            }

            setState({ data, error: null, loading: false });
            return data;
        } catch (error) {
            let errorMessage = 'An error occurred';

            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                errorMessage = 'Unable to connect to the server. Please ensure the backend server is running.';
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            setState({ data: null, error: errorMessage, loading: false });
            throw new Error(errorMessage);
        }
    }, []);

    return {
        ...state,
        request,
    };
} 