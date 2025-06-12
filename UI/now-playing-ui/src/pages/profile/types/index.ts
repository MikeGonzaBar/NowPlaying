export interface UserProfile {
    id: number;
    username: string;
    email: string;
}

export interface ApiKey {
    id: number;
    service_name: string;
    service_user_id: string;
    created_at: string;
    updated_at: string;
    last_used: string | null;
}

export interface ApiKeysResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ApiKey[];
}

export interface ServiceConfig {
    name: string;
    displayName: string;
    category: 'Gaming' | 'Movies' | 'Music';
    placeholder: string;
    imagePath: string;
    requiresOAuth?: boolean;
}

export interface TraktAuthStatus {
    authenticated: boolean;
    token_expired?: boolean;
    expires_at?: string;
    auth_url?: string;
}

export interface NewApiKey {
    userId: string;
    apiKey: string;
}

export interface PSNEditState {
    isEditing: boolean;
    npssoToken: string;
    isUpdating: boolean;
} 