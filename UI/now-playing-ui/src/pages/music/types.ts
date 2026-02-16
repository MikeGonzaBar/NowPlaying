export interface TopTrack {
    title: string;
    count: number;
}

export interface Artist {
    name: string;
    count: number;
    thumbnail: string | null;
    artist_lastfm_url: string | null;
    top_tracks: TopTrack[];
}

export interface Album {
    name: string;
    artist: string;
    count: number;
    thumbnail: string | null;
    track_url: string | null;
    top_tracks: TopTrack[];
}

export interface Track {
    title: string;
    artist: string;
    album: string;
    count: number;
    thumbnail: string | null;
    track_url: string | null;
    artist_lastfm_url: string | null;
    loved: boolean;
    streamable: boolean;
    played_at: string | null;
    source: string;
}
