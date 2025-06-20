import {
    Box,
    Button,
    CircularProgress,
    Typography,
} from "@mui/material";

interface PaginationControlsProps {
    tracksCount: number;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
    loadingMore: boolean;
    onLoadMore: () => void;
}

function PaginationControls({
    tracksCount,
    totalItems,
    totalPages,
    currentPage,
    hasMore,
    loadingMore,
    onLoadMore,
}: PaginationControlsProps) {
    if (tracksCount === 0) {
        return null;
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            mt: 4,
            mb: 2
        }}>
            {/* Pagination Info */}
            <Typography
                variant="body2"
                sx={{ fontFamily: 'Inter, sans-serif', color: '#666' }}
            >
                Showing {tracksCount} of {totalItems} tracks
                {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </Typography>

            {/* Load More Button */}
            {hasMore && (
                <Button
                    variant="outlined"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    startIcon={loadingMore ? <CircularProgress size={16} /> : null}
                    sx={{
                        color: '#333',
                        borderColor: '#666',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderColor: '#333',
                        },
                        '&:disabled': {
                            color: '#999',
                            borderColor: '#ccc',
                        },
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        textTransform: 'none',
                    }}
                >
                    {loadingMore ? 'Loading...' : 'Load More Songs'}
                </Button>
            )}
        </Box>
    );
}

export default PaginationControls; 