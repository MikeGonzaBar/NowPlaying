import { Box, Chip, Tooltip, Typography } from "@mui/material";
import EventIcon from '@mui/icons-material/Event';
import GradeIcon from '@mui/icons-material/Grade';

interface MediaImageProps {
    imageUrl: string;
    title: string;
}

export const MediaImage = ({ imageUrl, title }: MediaImageProps) => (
    imageUrl ? (
        <Box
            component="img"
            src={imageUrl}
            alt={title}
            sx={{
                width: '100%',
                height: '250px',
                objectFit: 'cover',
                display: 'block',
            }}
        />
    ) : null
);

interface MediaTitleProps {
    title: string;
    year: number | string;
}

export const MediaTitle = ({ title, year }: MediaTitleProps) => (
    <Box sx={{ paddingLeft: 2, paddingRight: 2, paddingBottom: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tooltip title={title} arrow>
            <Typography
                variant="h6"
                sx={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '70%',
                }}
            >
                {title}
            </Typography>
        </Tooltip>
        <Typography
            variant="body2"
            sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                color: 'gray',
            }}
        >
            {year || 'N/A'}
        </Typography>
    </Box>
);

interface MediaInfoProps {
    lastWatched: string;
    voteAverage?: number;
    genres?: { id: number; name: string }[];
}

export const MediaInfo = ({ lastWatched, voteAverage, genres }: MediaInfoProps) => (
    <Box sx={{ paddingLeft: 2, paddingRight: 2, borderTop: '1px solid #eee' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
            <EventIcon sx={{ fontSize: 16, color: 'gray', marginRight: 0.5 }} />
            <Typography
                variant="body2"
                sx={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    color: 'gray',
                    marginBottom: 0,
                }}
            >
                {new Date(lastWatched).toLocaleDateString() || 'N/A'}
            </Typography>
            <GradeIcon sx={{ ml: 11, fontSize: 16, color: 'gray', marginRight: 0.5 }} />
            <Typography
                variant="body2"
                sx={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    color: 'gray',
                }}
            >
                {voteAverage?.toFixed(2) || 'N/A'}
            </Typography>
        </Box>
        {genres && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginTop: 1 }}>
                {genres.map((genre) => (
                    <Chip
                        key={genre.id}
                        label={genre.name}
                        sx={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 400,
                            fontSize: '0.600rem',
                            backgroundColor: '#f5f5f5',
                            color: '#333',
                        }}
                    />
                ))}
            </Box>
        )}
    </Box>
); 