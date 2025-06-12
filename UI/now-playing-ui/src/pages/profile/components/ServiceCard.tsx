import React from 'react';
import {
    Paper,
    Box,
    Typography,
    TextField,
    Button,
    Chip,
    IconButton,
    Tooltip,
    CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { ServiceConfig, ApiKey, NewApiKey, TraktAuthStatus } from '../types';
import { getServiceTooltipContent } from '../utils/serviceConfig';

interface ServiceCardProps {
    service: ServiceConfig;
    existingApiKey?: ApiKey;
    newKeyData: NewApiKey;
    onNewKeyChange: (field: 'userId' | 'apiKey', value: string) => void;
    onSave: () => Promise<void>;
    onDelete: () => Promise<void>;

    // PSN specific props
    isPSNEditing?: boolean;
    psnNPSSO?: string;
    psnUpdating?: boolean;
    onPSNEdit?: () => void;
    onPSNCancel?: () => void;
    onPSNSave?: () => Promise<void>;
    onPSNChange?: (value: string) => void;

    // Trakt specific props
    traktAuthStatus?: TraktAuthStatus | null;
    traktLoading?: boolean;
    onTraktOAuth?: () => Promise<void>;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
    service,
    existingApiKey,
    newKeyData,
    onNewKeyChange,
    onSave,
    onDelete,
    isPSNEditing = false,
    psnNPSSO = '',
    psnUpdating = false,
    onPSNEdit,
    onPSNCancel,
    onPSNSave,
    onPSNChange,
    traktAuthStatus,
    traktLoading = false,
    onTraktOAuth
}) => {
    const handleSave = async () => {
        try {
            await onSave();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to save API key');
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete the ${service.displayName} API key?`)) {
            return;
        }

        try {
            await onDelete();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to delete API key');
        }
    };

    // Special handling for Trakt OAuth
    if (service.requiresOAuth && service.name === 'trakt') {
        return (
            <Paper
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
                            onClick={handleDelete}
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
                                    onChange={(e) => onNewKeyChange('userId', e.target.value)}
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
                                    onChange={(e) => onNewKeyChange('apiKey', e.target.value)}
                                    placeholder="Your Trakt Client Secret"
                                    size="small"
                                />
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                            <Button
                                variant="contained"
                                onClick={handleSave}
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
                                    Click the button below to start the OAuth process.
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={onTraktOAuth}
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
                                <Typography variant="body2" sx={{ color: '#4caf50' }}>
                                    ✅ Successfully authenticated with Trakt!
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </Paper>
        );
    }

    // Regular API key handling
    return (
        <Paper
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
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {service.name === 'psn' && !isPSNEditing && (
                            <IconButton
                                onClick={onPSNEdit}
                                sx={{
                                    color: '#00a8cc',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 168, 204, 0.1)',
                                    },
                                }}
                                size="small"
                            >
                                <EditIcon />
                            </IconButton>
                        )}
                        {service.name === 'psn' && isPSNEditing && (
                            <>
                                <IconButton
                                    onClick={onPSNSave}
                                    disabled={psnUpdating}
                                    sx={{
                                        color: '#4caf50',
                                        '&:hover': {
                                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                        },
                                    }}
                                    size="small"
                                >
                                    <SaveIcon />
                                </IconButton>
                                <IconButton
                                    onClick={onPSNCancel}
                                    sx={{
                                        color: '#ff9800',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                        },
                                    }}
                                    size="small"
                                >
                                    <CancelIcon />
                                </IconButton>
                            </>
                        )}
                        <IconButton
                            onClick={handleDelete}
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
                    </Box>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Box sx={{ flex: 1 }}>
                    <TextField
                        fullWidth
                        label="User ID"
                        value={existingApiKey ? existingApiKey.service_user_id : newKeyData.userId}
                        onChange={(e) => onNewKeyChange('userId', e.target.value)}
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
                        value={
                            existingApiKey
                                ? (service.name === 'psn' && isPSNEditing ? psnNPSSO : 'loremipsumdolorsitamet')
                                : newKeyData.apiKey
                        }
                        onChange={(e) => {
                            if (service.name === 'psn' && isPSNEditing) {
                                onPSNChange?.(e.target.value);
                            } else {
                                onNewKeyChange('apiKey', e.target.value);
                            }
                        }}
                        disabled={existingApiKey ? !(service.name === 'psn' && isPSNEditing) : false}
                        placeholder={service.name === 'psn' && isPSNEditing ? "Enter new NPSSO token" : "Enter API Key"}
                        size="small"
                    />
                </Box>
            </Box>

            {!existingApiKey && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={handleSave}
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
                    {service.name === 'psn' && isPSNEditing && psnUpdating && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CircularProgress size={16} sx={{ color: '#00a8cc', mr: 1 }} />
                            <Typography variant="caption" sx={{ color: '#00a8cc' }}>
                                Updating NPSSO token...
                            </Typography>
                        </Box>
                    )}
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Added: {existingApiKey && new Date(existingApiKey.created_at).toLocaleDateString()}
                        {existingApiKey?.last_used && (
                            <> • Last used: {new Date(existingApiKey.last_used).toLocaleDateString()}</>
                        )}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
}; 