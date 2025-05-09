import { Box, Typography, Chip } from '@mui/material';
import GradeIcon from '@mui/icons-material/Grade';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReplayIcon from '@mui/icons-material/Replay';

interface InfoChipProps {
    items: { id: number; name: string }[];
    title: string;
}

export const InfoChipSection = ({ items, title }: InfoChipProps) => (
    <Box>
        <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
            <b>{title}</b>
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {items?.map((item) => (
                <Chip
                    key={item.id}
                    label={item.name}
                    sx={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 400,
                        backgroundColor: '#f5f5f5',
                        color: '#333',
                    }}
                />
            ))}
        </Box>
    </Box>
);

interface MediaStatsProps {
    voteAverage?: number;
    runtime?: number;
    lastWatchedAt: string;
    plays?: number;
}

export const MediaStats = ({ voteAverage, runtime, lastWatchedAt, plays }: MediaStatsProps) => (
    <Box sx={{ display: 'flex', gap: 10, marginTop: 2 }}>
        {voteAverage !== undefined && (
            <Box sx={{ display: 'flex', marginTop: 0.5, marginBottom: 0.5 }}>
                <GradeIcon sx={{ fontSize: 21, marginTop: 0.4, marginRight: 0.5 }} />
                <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 20 }}>
                    {voteAverage || 'N/A'}
                </Typography>
            </Box>
        )}
        {runtime && (
            <Box sx={{ display: 'flex', marginTop: 0.5, marginBottom: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 21, marginTop: 0.8, marginRight: 0.5 }} />
                <Typography variant="subtitle1" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                    {runtime} minutes
                </Typography>
            </Box>
        )}
        <Box>
            <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                <b>Last time watched</b>
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                {new Date(lastWatchedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })}
            </Typography>
        </Box>
        {plays !== undefined && (
            <Box>
                <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                    <b>Replays</b>
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
                    <ReplayIcon sx={{ fontSize: 19, mb: -0.25 }} /> {plays}
                </Typography>
            </Box>
        )}
    </Box>
);

interface TrailerSectionProps {
    trailerKey: string | null;
}

export const TrailerSection = ({ trailerKey }: TrailerSectionProps) => {
    if (!trailerKey) return null;

    return (
        <Box sx={{ marginTop: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, marginBottom: 1 }}>
                Watch Trailer
            </Typography>
            <Box
                component="iframe"
                src={`https://www.youtube.com/embed/${trailerKey}`}
                title="YouTube Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    border: 'none',
                    borderRadius: '8px',
                    maxWidth: '800px',
                }}
            />
        </Box>
    );
}; 