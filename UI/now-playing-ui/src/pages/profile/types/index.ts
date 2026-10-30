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
  sync_enabled: boolean;
  sync_time: string | null;
  sync_timezone: string;
  sync_state: {
    status: "never" | "queued" | "running" | "succeeded" | "failed";
    last_sync_at: string | null;
    next_sync_at: string | null;
    error: string;
  };
}

export interface SyncSchedule {
  sync_enabled: boolean;
  sync_time: string;
  sync_timezone: string;
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
  category: "Gaming" | "Movies" | "Music";
  placeholder: string;
  imagePath: string;
  requiresOAuth?: boolean;
  notice?: string;
  userIdLabel?: string;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  saveButtonLabel?: string;
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
