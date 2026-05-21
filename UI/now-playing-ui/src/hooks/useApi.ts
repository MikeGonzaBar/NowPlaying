import { useState, useCallback } from 'react';
import { authenticatedFetch } from '../utils/auth';

interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

interface BackendError {
    detail?: string;
    error?: string;
}

const isBackendError = (value: unknown): value is BackendError => (
    typeof value === 'object' && value !== null &&
    ('detail' in value || 'error' in value)
);

export function useApi<T>() {
    const [state, setState] = useState<ApiResponse<T>>({
        data: null,
        error: null,
        loading: false,
    });

    const request = useCallback(async <R = T>(url: string, options: RequestInit = {}): Promise<R> => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await authenticatedFetch(url, options);

            // Try to parse JSON, even on non-OK responses
            let data: unknown = null;
            try {
                data = await response.json();
            } catch (_e) {
                data = null;
            }

            if (!response.ok) {
                let backendMessage = `Request failed with status ${response.status}`;
                if (isBackendError(data)) {
                    backendMessage = data.detail ?? data.error ?? backendMessage;
                }
                setState({ data: null, error: backendMessage, loading: false });
                throw new Error(backendMessage);
            }

            const typedData = data as R;
            setState({ data: typedData as unknown as T, error: null, loading: false });
            return typedData;
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
