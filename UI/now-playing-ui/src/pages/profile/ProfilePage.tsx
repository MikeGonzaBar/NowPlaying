import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    TextField,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SideBar from '../../components/sideBar';
import { authenticatedFetch } from '../../utils/auth';
import { getApiUrl, API_CONFIG } from '../../config/api';

interface UserProfile {
    id: number;
    username: string;
    email: string;
}

interface ApiKey {
    id: number;
    service_name: string;
    service_user_id: string;
    created_at: string;
    updated_at: string;
    last_used: string | null;
}

interface ApiKeysResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ApiKey[];
}

interface ServiceConfig {
    name: string;
    displayName: string;
    category: 'Gaming' | 'Movies' | 'Music';
    placeholder: string;
    imagePath: string;
    requiresOAuth?: boolean;
}

interface TraktAuthStatus {
    authenticated: boolean;
    token_expired?: boolean;
    expires_at?: string;
    auth_url?: string;
}

const SERVICES: ServiceConfig[] = [
    {
        name: 'steam',
        displayName: 'Steam',
        category: 'Gaming',
        placeholder: 'Steam User ID',
        imagePath: '/Platforms/steam.webp'
    },
    {
        name: 'psn',
        displayName: 'PlayStation Network',
        category: 'Gaming',
        placeholder: 'PSN User ID',
        imagePath: '/Platforms/playstation.webp'
    },
    {
        name: 'xbox',
        displayName: 'Xbox',
        category: 'Gaming',
        placeholder: 'Xbox User ID',
        imagePath: '/Platforms/xbox.svg'
    },
    {
        name: 'retroachievements',
        displayName: 'RetroAchievements',
        category: 'Gaming',
        placeholder: 'RetroAchievements Username',
        imagePath: '/Platforms/retroachievements.png'
    },
    {
        name: 'trakt',
        displayName: 'Trakt',
        category: 'Movies',
        placeholder: 'Client ID',
        imagePath: '/Platforms/trakt.png',
        requiresOAuth: true
    },
    {
        name: 'lastfm',
        displayName: 'Last.fm',
        category: 'Music',
        placeholder: 'Last.fm Username',
        imagePath: '/Platforms/lastfm.png'
    },
];

const getServiceTooltipContent = (serviceName: string): string => {
    const tooltips: { [key: string]: string } = {
        steam: `Steam Setup:
• API Key: steamcommunity.com/dev/apikey
• Steam ID: Use steamidfinder.com to find your 64-bit ID`,

        psn: `PlayStation Setup:
• NPSSO Token: Login to PlayStation.com → F12 Dev Tools → Find NPSSO cookie
• User ID: Your PSN username (optional)`,

        xbox: `Xbox Setup:
• API Key: Get from OpenXBL.com
• XUID: Your Xbox Live User ID (find via OpenXBL tools)`,

        retroachievements: `RetroAchievements Setup:
• Create account at RetroAchievements.org
• API Key: Control Panel → API Settings → Generate key
• Username: Your RetroAchievements username`,

        trakt: `Trakt Setup:
• Go to trakt.tv/oauth/applications
• Create new app with redirect: localhost:8080/trakt/oauth-callback/
• Copy Client ID and Client Secret`,

        spotify: `Spotify Setup:
• Visit developer.spotify.com/dashboard
• Create app → Get Client ID/Secret
• Generate OAuth2 access token`,

        lastfm: `Last.fm Setup:
• API Key: last.fm/api → Create account
• Username: Your Last.fm username`
    };

    return (tooltips as any)[serviceName] || 'No guidance available for this service.';
};

function ProfilePage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [apiKeysLoading, setApiKeysLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newApiKeys, setNewApiKeys] = useState<Record<string, { userId: string; apiKey: string }>>({});

    // Trakt OAuth specific state
    const [traktAuthStatus, setTraktAuthStatus] = useState<TraktAuthStatus | null>(null);
    const [traktLoading, setTraktLoading] = useState(false);
    const [oauthDialogOpen, setOauthDialogOpen] = useState(false);
    const [authCode, setAuthCode] = useState('');

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setLoading(true);
                const response = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/profile/`)
                );

                if (response.ok) {
                    const userData = await response.json();
                    setUserProfile(userData);
                } else {
                    throw new Error('Failed to fetch user profile');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        const fetchApiKeys = async () => {
            try {
                setApiKeysLoading(true);
                const response = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/`)
                );

                if (response.ok) {
                    const apiKeysData: ApiKeysResponse = await response.json();
                    setApiKeys(apiKeysData.results);
                } else {
                    throw new Error('Failed to fetch API keys');
                }
            } catch (err) {
                console.error('Error fetching API keys:', err);
            } finally {
                setApiKeysLoading(false);
            }
        };

        const fetchTraktAuthStatus = async () => {
            try {
                const response = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/auth-status/`)
                );

                if (response.ok) {
                    const authStatus: TraktAuthStatus = await response.json();
                    setTraktAuthStatus(authStatus);
                }
            } catch (err) {
                console.error('Error fetching Trakt auth status:', err);
            }
        };

        fetchUserProfile();
        fetchApiKeys();
        fetchTraktAuthStatus();
    }, []);

    const handleNewApiKeyChange = (serviceName: string, field: 'userId' | 'apiKey', value: string) => {
        setNewApiKeys(prev => ({
            ...prev,
            [serviceName]: {
                ...prev[serviceName],
                [field]: value
            }
        }));
    };

    const handleSaveApiKey = async (serviceName: string) => {
        const newKey = newApiKeys[serviceName];
        if (!newKey?.userId || !newKey?.apiKey) {
            alert('Please fill in both Client ID and Client Secret');
            return;
        }

        try {
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/`),
                {
                    method: 'POST',
                    body: JSON.stringify({
                        service_name: serviceName,
                        service_user_id: newKey.userId,
                        api_key: newKey.apiKey
                    })
                }
            );

            if (response.ok) {
                // Refresh API keys
                const apiKeysResponse = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/`)
                );
                if (apiKeysResponse.ok) {
                    const apiKeysData: ApiKeysResponse = await apiKeysResponse.json();
                    setApiKeys(apiKeysData.results);
                }

                // Clear the form
                setNewApiKeys(prev => ({
                    ...prev,
                    [serviceName]: { userId: '', apiKey: '' }
                }));

                // If this was Trakt, refresh auth status
                if (serviceName === 'trakt') {
                    setTimeout(() => {
                        const fetchTraktAuthStatus = async () => {
                            try {
                                const response = await authenticatedFetch(
                                    getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/auth-status/`)
                                );
                                if (response.ok) {
                                    const authStatus: TraktAuthStatus = await response.json();
                                    setTraktAuthStatus(authStatus);
                                }
                            } catch (err) {
                                console.error('Error fetching Trakt auth status:', err);
                            }
                        };
                        fetchTraktAuthStatus();
                    }, 1000);
                }
            } else {
                const errorData = await response.json();
                alert(`Failed to save API key: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Error saving API key');
        }
    };

    const handleDeleteApiKey = async (apiKeyId: number, serviceName: string) => {
        if (!confirm(`Are you sure you want to delete the ${serviceName} API key?`)) {
            return;
        }

        try {
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/${apiKeyId}/`),
                {
                    method: 'DELETE'
                }
            );

            if (response.ok) {
                // Refresh API keys
                const apiKeysResponse = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/api-keys/`)
                );
                if (apiKeysResponse.ok) {
                    const apiKeysData: ApiKeysResponse = await apiKeysResponse.json();
                    setApiKeys(apiKeysData.results);
                }

                // If this was Trakt, refresh auth status
                if (serviceName === 'trakt') {
                    setTimeout(() => {
                        const fetchTraktAuthStatus = async () => {
                            try {
                                const response = await authenticatedFetch(
                                    getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/auth-status/`)
                                );
                                if (response.ok) {
                                    const authStatus: TraktAuthStatus = await response.json();
                                    setTraktAuthStatus(authStatus);
                                }
                            } catch (err) {
                                console.error('Error fetching Trakt auth status:', err);
                            }
                        };
                        fetchTraktAuthStatus();
                    }, 1000);
                }
            } else {
                const errorData = await response.json();
                alert(`Failed to delete API key: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Error deleting API key');
        }
    };

    const handleTraktOAuth = async () => {
        try {
            setTraktLoading(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/authenticate/`)
            );

            if (response.ok) {
                const data = await response.json();
                // Open the auth URL in a new window
                window.open(data.auth_url, '_blank', 'width=600,height=700');
                // Show dialog for manual code entry
                setOauthDialogOpen(true);
            } else {
                const errorData = await response.json();
                alert(`Failed to start OAuth: ${errorData.error || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Error starting OAuth process');
        } finally {
            setTraktLoading(false);
        }
    };

    const handleCompleteOAuth = async () => {
        if (!authCode.trim()) {
            alert('Please enter the authorization code');
            return;
        }

        try {
            setTraktLoading(true);
            const response = await authenticatedFetch(
                getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/oauth-callback/`),
                {
                    method: 'POST',
                    body: JSON.stringify({
                        code: authCode.trim(),
                        state: userProfile?.id
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                alert(data.message || 'Successfully authenticated with Trakt!');
                setOauthDialogOpen(false);
                setAuthCode('');

                // Refresh auth status
                const authResponse = await authenticatedFetch(
                    getApiUrl(`${API_CONFIG.TRAKT_ENDPOINT}/auth-status/`)
                );
                if (authResponse.ok) {
                    const authStatus: TraktAuthStatus = await authResponse.json();
                    setTraktAuthStatus(authStatus);
                }
            } else {
                const errorData = await response.json();
                alert(`Failed to complete OAuth: ${errorData.error || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Error completing OAuth process');
        } finally {
            setTraktLoading(false);
        }
    };

    const getServicesByCategory = (category: 'Gaming' | 'Movies' | 'Music') => {
        return SERVICES.filter(service => service.category === category);
    };

    const getApiKeyForService = (serviceName: string) => {
        return apiKeys.find(key => key.service_name === serviceName);
    };

    const renderServiceSection = (service: ServiceConfig) => {
        const existingApiKey = getApiKeyForService(service.name);
        const newKeyData = newApiKeys[service.name] || { userId: '', apiKey: '' };

        // Special handling for Trakt OAuth
        if (service.requiresOAuth && service.name === 'trakt') {
            return (
                <Paper
                    key={service.name}
                    sx={{
                        p: 3,
                        mb: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box
                                component="img"
                                src={service.imagePath}
                                alt={service.displayName}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    mr: 2,
                                    borderRadius: 1,
                                    objectFit: 'contain',
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 2 }}>
                                {service.displayName}
                            </Typography>
                            <Tooltip
                                title={getServiceTooltipContent(service.name)}
                                placement="top"
                                sx={{ mr: 1 }}
                            >
                                <IconButton size="small" sx={{
                                    color: '#00a8cc',
                                    '&:hover': {
                                        color: '#0097b2',
                                        backgroundColor: 'rgba(0, 168, 204, 0.1)'
                                    }
                                }}>
                                    <HelpOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            {traktAuthStatus?.authenticated && !traktAuthStatus.token_expired && (
                                <Chip
                                    label="OAuth Connected"
                                    color="success"
                                    size="small"
                                    sx={{ backgroundColor: '#4caf50' }}
                                />
                            )}
                            {traktAuthStatus?.token_expired && (
                                <Chip
                                    label="Token Expired"
                                    color="warning"
                                    size="small"
                                    sx={{ backgroundColor: '#ff9800' }}
                                />
                            )}
                        </Box>

                        {existingApiKey && (
                            <IconButton
                                onClick={() => handleDeleteApiKey(existingApiKey.id, service.displayName)}
                                sx={{
                                    color: '#ff5757',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 87, 87, 0.1)',
                                    },
                                }}
                                size="small"
                            >
                                <DeleteIcon />
                            </IconButton>
                        )}
                    </Box>

                    {/* Step 1: API Credentials */}
                    {!existingApiKey && (
                        <>
                            <Typography variant="subtitle1" sx={{ mb: 2, color: '#00a8cc' }}>
                                Step 1: Enter your Trakt API credentials
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <TextField
                                        fullWidth
                                        label="Client ID"
                                        value={newKeyData.userId}
                                        onChange={(e) => handleNewApiKeyChange(service.name, 'userId', e.target.value)}
                                        placeholder="Your Trakt Client ID"
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <TextField
                                        fullWidth
                                        label="Client Secret"
                                        type="password"
                                        value={newKeyData.apiKey}
                                        onChange={(e) => handleNewApiKeyChange(service.name, 'apiKey', e.target.value)}
                                        placeholder="Your Trakt Client Secret"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                                <Button
                                    variant="contained"
                                    onClick={() => handleSaveApiKey(service.name)}
                                    sx={{
                                        backgroundColor: '#00a8cc',
                                        '&:hover': {
                                            backgroundColor: '#0097b2',
                                        },
                                    }}
                                >
                                    Save Credentials
                                </Button>
                            </Box>
                        </>
                    )}

                    {/* Step 2: OAuth Authentication */}
                    {existingApiKey && (
                        <>
                            <Typography variant="subtitle1" sx={{ mb: 2, color: '#00a8cc' }}>
                                Step 2: Complete OAuth Authentication
                            </Typography>

                            {!traktAuthStatus?.authenticated ? (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
                                        Click the button below to start the OAuth process. This will open a new window where you can authorize your Trakt account.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        onClick={handleTraktOAuth}
                                        disabled={traktLoading}
                                        startIcon={traktLoading ? <CircularProgress size={16} /> : <OpenInNewIcon />}
                                        sx={{
                                            backgroundColor: '#e74c3c',
                                            '&:hover': {
                                                backgroundColor: '#c0392b',
                                            },
                                        }}
                                    >
                                        {traktLoading ? 'Starting OAuth...' : 'Authenticate with Trakt'}
                                    </Button>
                                </Box>
                            ) : (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ color: '#4caf50', mb: 1 }}>
                                        ✅ Successfully authenticated with Trakt!
                                    </Typography>
                                    {traktAuthStatus.expires_at && (
                                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                            Token expires: {new Date(traktAuthStatus.expires_at).toLocaleString()}
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                Credentials added: {new Date(existingApiKey.created_at).toLocaleDateString()}
                                {existingApiKey.last_used && (
                                    <> • Last used: {new Date(existingApiKey.last_used).toLocaleDateString()}</>
                                )}
                            </Typography>
                        </>
                    )}
                </Paper>
            );
        }

        // Regular API key handling for non-OAuth services
        return (
            <Paper
                key={service.name}
                sx={{
                    p: 3,
                    mb: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                            component="img"
                            src={service.imagePath}
                            alt={service.displayName}
                            sx={{
                                width: 32,
                                height: 32,
                                mr: 2,
                                borderRadius: 1,
                                objectFit: 'contain',
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 2 }}>
                            {service.displayName}
                        </Typography>
                        <Tooltip
                            title={getServiceTooltipContent(service.name)}
                            placement="top"
                            sx={{ mr: 1 }}
                        >
                            <IconButton size="small" sx={{
                                color: '#00a8cc',
                                '&:hover': {
                                    color: '#0097b2',
                                    backgroundColor: 'rgba(0, 168, 204, 0.1)'
                                }
                            }}>
                                <HelpOutlineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {existingApiKey && (
                            <Chip
                                label="Connected"
                                color="success"
                                size="small"
                                sx={{ backgroundColor: '#4caf50' }}
                            />
                        )}
                    </Box>

                    {existingApiKey && (
                        <IconButton
                            onClick={() => handleDeleteApiKey(existingApiKey.id, service.displayName)}
                            sx={{
                                color: '#ff5757',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 87, 87, 0.1)',
                                },
                            }}
                            size="small"
                        >
                            <DeleteIcon />
                        </IconButton>
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            fullWidth
                            label="User ID"
                            value={existingApiKey ? existingApiKey.service_user_id : newKeyData.userId}
                            onChange={(e) => handleNewApiKeyChange(service.name, 'userId', e.target.value)}
                            disabled={!!existingApiKey}
                            placeholder={service.placeholder}
                            size="small"
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            fullWidth
                            label="API Key"
                            type="password"
                            value={existingApiKey ? 'loremipsumdolorsitamet' : newKeyData.apiKey}
                            onChange={(e) => handleNewApiKeyChange(service.name, 'apiKey', e.target.value)}
                            disabled={!!existingApiKey}
                            placeholder="Enter API Key"
                            size="small"
                        />
                    </Box>
                </Box>

                {!existingApiKey && (
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={() => handleSaveApiKey(service.name)}
                            sx={{
                                backgroundColor: '#00a8cc',
                                '&:hover': {
                                    backgroundColor: '#0097b2',
                                },
                            }}
                        >
                            Save API Key
                        </Button>
                    </Box>
                )}

                {existingApiKey && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Added: {new Date(existingApiKey.created_at).toLocaleDateString()}
                            {existingApiKey.last_used && (
                                <> • Last used: {new Date(existingApiKey.last_used).toLocaleDateString()}</>
                            )}
                        </Typography>
                    </Box>
                )}
            </Paper>
        );
    };

    return (
        <div>
            <Box sx={{ display: 'flex', paddingLeft: 2.5 }}>
                <SideBar activeItem="Profile" />
                <Box
                    component="main"
                    sx={{
                        width: '89vw',
                        minHeight: '100vh',
                        padding: 3
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            mb: 4,
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 'bold'
                        }}
                    >
                        Profile
                    </Typography>

                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress sx={{ color: '#00a8cc' }} />
                        </Box>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {userProfile && !loading && (
                        <>
                            {/* User Profile Section */}
                            <Typography
                                variant="h5"
                                sx={{
                                    mb: 3,
                                    fontFamily: 'Montserrat, sans-serif',
                                    fontWeight: 'bold'
                                }}
                            >
                                Welcome, {userProfile.username}!
                            </Typography>

                            {/* Services Section */}
                            <Paper
                                sx={{
                                    p: 4,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255, 255, 255, 0.18)',
                                }}
                            >
                                <Typography
                                    variant="h5"
                                    sx={{
                                        mb: 3,
                                        fontFamily: 'Montserrat, sans-serif',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Services
                                </Typography>

                                {apiKeysLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                        <CircularProgress sx={{ color: '#00a8cc' }} />
                                    </Box>
                                ) : (
                                    <>
                                        {/* Gaming Section */}
                                        <Accordion
                                            defaultExpanded
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                mb: 2
                                            }}
                                        >
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                    🎮 Gaming
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {getServicesByCategory('Gaming').map(renderServiceSection)}
                                            </AccordionDetails>
                                        </Accordion>

                                        {/* Movies Section */}
                                        <Accordion
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                mb: 2
                                            }}
                                        >
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                    📺 Movies
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {getServicesByCategory('Movies').map(renderServiceSection)}
                                            </AccordionDetails>
                                        </Accordion>

                                        {/* Music Section */}
                                        <Accordion
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                mb: 2
                                            }}
                                        >
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                    🎧 Music
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                {getServicesByCategory('Music').map(renderServiceSection)}
                                            </AccordionDetails>
                                        </Accordion>
                                    </>
                                )}
                            </Paper>
                        </>
                    )}
                </Box>
            </Box>

            {/* Trakt OAuth Dialog */}
            <Dialog open={oauthDialogOpen} onClose={() => setOauthDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Complete Trakt Authentication</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        After authorizing the application in the opened window, copy the authorization code from the redirect page and paste it below:
                    </Typography>
                    <TextField
                        fullWidth
                        label="Authorization Code"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        placeholder="Paste the authorization code here"
                        multiline
                        rows={3}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOauthDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleCompleteOAuth}
                        variant="contained"
                        disabled={traktLoading || !authCode.trim()}
                        sx={{
                            backgroundColor: '#e74c3c',
                            '&:hover': {
                                backgroundColor: '#c0392b',
                            },
                        }}
                    >
                        {traktLoading ? 'Completing...' : 'Complete Authentication'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default ProfilePage; 