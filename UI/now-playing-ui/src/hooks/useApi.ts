import { useState, useCallback } from "react";
import { authenticatedFetch } from "../utils/auth";

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface BackendError {
  detail?: string;
  error?: string;
  request_id?: string;
  retryable?: boolean;
}

const isBackendError = (value: unknown): value is BackendError =>
  typeof value === "object" &&
  value !== null &&
  ("detail" in value || "error" in value || "request_id" in value || "retryable" in value);

const formatBackendError = (data: unknown, status: number): string => {
  const defaultMessage = `Request failed with status ${status}`;
  if (!isBackendError(data)) {
    return defaultMessage;
  }

  const backendMessage = data.detail ?? data.error ?? defaultMessage;
  const requestId = data.request_id ? String(data.request_id) : null;
  const retryable = data.retryable === true;

  if (requestId) {
    return `${backendMessage} (request_id=${requestId}${retryable ? ", retryable=true" : ""})`;
  }

  if (retryable) {
    return `${backendMessage} (retryable=true)`;
  }

  return backendMessage;
};

export function useApi<T>() {
  const [state, setState] = useState<ApiResponse<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const request = useCallback(
    async <R = T>(url: string, options: RequestInit = {}): Promise<R> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

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
          const backendMessage = formatBackendError(data, response.status);
          setState({ data: null, error: backendMessage, loading: false });
          throw new Error(backendMessage);
        }

        const typedData = data as R;
        setState({
          data: typedData as unknown as T,
          error: null,
          loading: false,
        });
        return typedData;
      } catch (error) {
        let errorMessage = "An error occurred";

        if (error instanceof TypeError && error.message === "Failed to fetch") {
          errorMessage =
            "Unable to connect to the server. Please ensure the backend server is running.";
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setState({ data: null, error: errorMessage, loading: false });
        throw new Error(errorMessage);
      }
    },
    [],
  );

  return {
    ...state,
    request,
  };
}
