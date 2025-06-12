import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Alert
} from '@mui/material';

import SideBar from '../../components/sideBar';
import { useProfile, useApiKeys, useTraktAuth, usePSNEdit } from './hooks';
import { ServiceSection, TraktOAuthDialog } from './components';

function ProfilePage() {
    const { userProfile, loading: profileLoading, error } = useProfile();
    const {
        apiKeys,
        loading: apiKeysLoading,
        newApiKeys,
        handleNewApiKeyChange,
        saveApiKey,
        deleteApiKey,
        updateApiKey
    } = useApiKeys();

    const {
        traktAuthStatus,
        loading: traktLoading,
        oauthDialogOpen,
        authCode,
        setOauthDialogOpen,
        setAuthCode,
        startOAuth,
        completeOAuth,
        refetchAuthStatus
    } = useTraktAuth(userProfile);

    const {
        isEditingPSN,
        editingNPSSO,
        updatingPSN,
        setUpdatingPSN,
        startEditing: startPSNEditing,
        cancelEditing: cancelPSNEditing,
        setNPSSO
    } = usePSNEdit();

    // Handler functions
    const handleSaveApiKey = async (serviceName: string) => {
        try {
            await saveApiKey(serviceName);

            // If this was Trakt, refresh auth status
            if (serviceName === 'trakt') {
                setTimeout(() => refetchAuthStatus(), 1000);
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to save API key');
        }
    };

    const handleDeleteApiKey = async (apiKeyId: number, serviceName: string) => {
        try {
            await deleteApiKey(apiKeyId);

            // If this was Trakt, refresh auth status
            if (serviceName.toLowerCase() === 'trakt') {
                setTimeout(() => refetchAuthStatus(), 1000);
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to delete API key');
        }
    };

    const handlePSNSave = async (apiKeyId: number) => {
        try {
            setUpdatingPSN(true);
            await updateApiKey(apiKeyId, { api_key: editingNPSSO.trim() });
            cancelPSNEditing();
            alert('PlayStation NPSSO updated successfully!');
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to update NPSSO');
        } finally {
            setUpdatingPSN(false);
        }
    };

    const handleTraktOAuth = async () => {
        try {
            await startOAuth();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to start OAuth');
        }
    };

    const handleCompleteOAuth = async () => {
        try {
            const message = await completeOAuth();
            alert(message);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to complete OAuth');
        }
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

                    {profileLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress sx={{ color: '#00a8cc' }} />
                        </Box>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {userProfile && !profileLoading && (
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

                                {/* Gaming Section */}
                                <ServiceSection
                                    category="Gaming"
                                    title="Gaming"
                                    emoji="🎮"
                                    loading={apiKeysLoading}
                                    apiKeys={apiKeys}
                                    newApiKeys={newApiKeys}
                                    isPSNEditing={isEditingPSN}
                                    psnNPSSO={editingNPSSO}
                                    psnUpdating={updatingPSN}
                                    onNewKeyChange={handleNewApiKeyChange}
                                    onSaveApiKey={handleSaveApiKey}
                                    onDeleteApiKey={handleDeleteApiKey}
                                    onPSNEdit={startPSNEditing}
                                    onPSNCancel={cancelPSNEditing}
                                    onPSNSave={handlePSNSave}
                                    onPSNChange={setNPSSO}
                                />

                                {/* Movies Section */}
                                <ServiceSection
                                    category="Movies"
                                    title="Movies"
                                    emoji="📺"
                                    loading={apiKeysLoading}
                                    apiKeys={apiKeys}
                                    newApiKeys={newApiKeys}
                                    traktAuthStatus={traktAuthStatus}
                                    traktLoading={traktLoading}
                                    onNewKeyChange={handleNewApiKeyChange}
                                    onSaveApiKey={handleSaveApiKey}
                                    onDeleteApiKey={handleDeleteApiKey}
                                    onTraktOAuth={handleTraktOAuth}
                                />

                                {/* Music Section */}
                                <ServiceSection
                                    category="Music"
                                    title="Music"
                                    emoji="🎧"
                                    loading={apiKeysLoading}
                                    apiKeys={apiKeys}
                                    newApiKeys={newApiKeys}
                                    onNewKeyChange={handleNewApiKeyChange}
                                    onSaveApiKey={handleSaveApiKey}
                                    onDeleteApiKey={handleDeleteApiKey}
                                />
                            </Paper>
                        </>
                    )}
                </Box>
            </Box>

            {/* Trakt OAuth Dialog */}
            <TraktOAuthDialog
                open={oauthDialogOpen}
                onClose={() => setOauthDialogOpen(false)}
                authCode={authCode}
                onAuthCodeChange={setAuthCode}
                onComplete={handleCompleteOAuth}
                loading={traktLoading}
            />
        </div>
    );
}

export default ProfilePage; 