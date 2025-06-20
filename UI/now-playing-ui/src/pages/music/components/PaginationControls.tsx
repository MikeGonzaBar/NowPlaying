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
                color="text.secondary"
                sx={{ fontFamily: 'Inter, sans-serif' }}
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
                        color: 'rgba(255, 255, 255, 0.8)',
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&:disabled': {
                            color: 'rgba(255, 255, 255, 0.4)',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
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