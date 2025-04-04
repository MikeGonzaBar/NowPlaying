export interface MovieIds {
    trakt: number;
    slug: string;
    tmdb: number;
    imdb: string;
}
export interface MovieType {
    title: string;
    year: number;
    ids: MovieIds;
}
export interface Movie {
    plays: number;
    last_watched_at: string;
    last_updated_at: string;
    movie: MovieType;
}

export interface ShowIds {
    trakt: string;
    tmdb: string;
}

export interface ShowType {
    id: number;
    title: string;
    year: number;
    image_url: string | null;
    ids: ShowIds;
}

export interface Show {
    last_watched_at: string;
    show: ShowType;
}

export interface TraktDetails {
    certification?: string;
    title?: string;
    year?: number;
    // Add other properties as needed
}