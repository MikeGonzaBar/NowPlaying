import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    TextField,
    CircularProgress
} from '@mui/material';

interface TraktOAuthDialogProps {
    open: boolean;
    onClose: () => void;
    authCode: string;
    onAuthCodeChange: (code: string) => void;
    onComplete: () => Promise<void>;
    loading: boolean;
}

export const TraktOAuthDialog: React.FC<TraktOAuthDialogProps> = ({
    open,
    onClose,
    authCode,
    onAuthCodeChange,
    onComplete,
    loading
}) => {
    const handleComplete = async () => {
        try {
            await onComplete();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to complete OAuth');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Complete Trakt Authentication</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    After authorizing the application in the opened window, copy the authorization code from the redirect page and paste it below:
                </Typography>
                <TextField
                    fullWidth
                    label="Authorization Code"
                    value={authCode}
                    onChange={(e) => onAuthCodeChange(e.target.value)}
                    placeholder="Paste the authorization code here"
                    multiline
                    rows={3}
                    sx={{ mt: 2 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleComplete}
                    variant="contained"
                    disabled={loading || !authCode.trim()}
                    startIcon={loading ? <CircularProgress size={16} /> : undefined}
                    sx={{
                        backgroundColor: '#e74c3c',
                        '&:hover': {
                            backgroundColor: '#c0392b',
                        },
                    }}
                >
                    {loading ? 'Completing...' : 'Complete Authentication'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}; 