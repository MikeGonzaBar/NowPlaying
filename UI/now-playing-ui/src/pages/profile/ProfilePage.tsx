import { useEffect } from "react";
import { Box, Typography, Paper, CircularProgress, Alert, Button } from "@mui/material";

import AppShell from "../../components/AppShell";
import {
  useProfile,
  useApiKeys,
  useTraktAuth,
  usePSNEdit,
  useEpicAuth,
} from "./hooks";
import { authenticatedFetch } from "../../utils/auth";
import { getApiUrl, API_CONFIG } from "../../config/api";
import { ServiceSection, TraktOAuthDialog } from "./components";

function ProfilePage() {
  const {
    userProfile,
    loading: profileLoading,
    error,
    refetchProfile,
  } = useProfile();
  const {
    apiKeys,
    loading: apiKeysLoading,
    error: apiKeysError,
    newApiKeys,
    handleNewApiKeyChange,
    saveApiKey,
    deleteApiKey,
    updateSyncSchedule,
    refetchApiKeys,
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
    refetchAuthStatus,
  } = useTraktAuth(userProfile);

  const {
    isEditingPSN,
    editingNPSSO,
    updatingPSN,
    setUpdatingPSN,
    startEditing: startPSNEditing,
    cancelEditing: cancelPSNEditing,
    setNPSSO,
  } = usePSNEdit();

  const {
    epicStatus,
    epicLoginUrl,
    epicConnecting,
    epicCode,
    setEpicCode,
    refetchEpicStatus,
    openEpicLogin,
    connectEpic,
  } = useEpicAuth();

  useEffect(() => {
    void refetchEpicStatus();
  }, [refetchEpicStatus]);

  const handleEpicLogin = async () => {
    try {
      await openEpicLogin();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to open Epic login",
      );
    }
  };

  const handleEpicConnect = async () => {
    try {
      const message = await connectEpic();
      alert(message);
      await refetchApiKeys();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to connect Epic Games",
      );
    }
  };

  const handleSaveApiKey = async (
    serviceName: string,
    keyData?: { userId: string; apiKey: string },
  ) => {
    try {
      await saveApiKey(serviceName, keyData);

      if (serviceName === "trakt") {
        setTimeout(() => refetchAuthStatus(), 1000);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save API key");
    }
  };

  const handleDeleteApiKey = async (apiKeyId: number, serviceName: string) => {
    try {
      await deleteApiKey(apiKeyId);

      if (serviceName.toLowerCase() === "trakt") {
        setTimeout(() => refetchAuthStatus(), 1000);
      }
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete API key",
      );
    }
  };

  const handlePSNSave = async (_apiKeyId: number) => {
    try {
      setUpdatingPSN(true);
      const body = { npsso: editingNPSSO.trim() };
      const response = await authenticatedFetch(
        getApiUrl(`${API_CONFIG.PSN_ENDPOINT}/exchange-npsso/`),
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to store NPSSO");
      }

      cancelPSNEditing();
      await refetchApiKeys();
      alert("PlayStation connected successfully!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update NPSSO");
    } finally {
      setUpdatingPSN(false);
    }
  };

  const handleTraktOAuth = async () => {
    try {
      await startOAuth();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to start OAuth");
    }
  };

  const handleCompleteOAuth = async () => {
    try {
      const message = await completeOAuth();
      alert(message);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to complete OAuth",
      );
    }
  };

  return (
    <>
      <AppShell activeItem="Profile" mainSx={{ p: { xs: 2, md: 3 } }}>
        <Typography
          variant="h4"
          sx={{
            mb: 2.5,
            fontFamily: "Montserrat, sans-serif",
            fontWeight: "bold",
          }}
        >
          Connections & account
        </Typography>

        {/* Profile and services load independently: a failed profile request
            must not hide the provider list, and each failure offers a retry. */}
        {profileLoading && !userProfile && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <CircularProgress size={18} sx={{ color: "#00a8cc" }} />
            <Typography sx={{ color: "text.secondary", fontSize: "14px" }}>
              Loading account details…
            </Typography>
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void refetchProfile()}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {userProfile && (
          <Typography
            variant="h5"
            sx={{
              mb: 2,
              fontFamily: "Montserrat, sans-serif",
              fontWeight: "bold",
            }}
          >
            Welcome, {userProfile.username}!
          </Typography>
        )}

        {apiKeysError && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void refetchApiKeys()}
              >
                Retry
              </Button>
            }
          >
            {apiKeysError}
          </Alert>
        )}

        {/* Services Section. Hide it when the request failed and there is no
            cached data, so a failed fetch is not rendered as every service
            being disconnected. */}
        {(!apiKeysError || apiKeys.length > 0) && (
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              backgroundColor: "rgba(255, 255, 255, 0.07)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              border: "1px solid rgba(255, 255, 255, 0.14)",
            }}
          >
          <Typography
            variant="h5"
            sx={{
              mb: 2,
              fontFamily: "Montserrat, sans-serif",
              fontWeight: "bold",
            }}
          >
            Services
          </Typography>

          {/* Gaming Section */}
          <ServiceSection
            category="Gaming"
            title="Gaming"
            loading={apiKeysLoading}
            apiKeys={apiKeys}
            newApiKeys={newApiKeys}
            isPSNEditing={isEditingPSN}
            psnNPSSO={editingNPSSO}
            psnUpdating={updatingPSN}
            onNewKeyChange={handleNewApiKeyChange}
            onSaveApiKey={handleSaveApiKey}
            onDeleteApiKey={handleDeleteApiKey}
            onScheduleSave={updateSyncSchedule}
            onPSNEdit={startPSNEditing}
            onPSNCancel={cancelPSNEditing}
            onPSNSave={handlePSNSave}
            onPSNChange={setNPSSO}
            epicStatus={epicStatus}
            epicLoginUrl={epicLoginUrl}
            epicConnecting={epicConnecting}
            epicCode={epicCode}
            onEpicCodeChange={setEpicCode}
            onEpicLogin={handleEpicLogin}
            onEpicConnect={handleEpicConnect}
          />

          {/* Movies Section */}
          <ServiceSection
            category="Movies"
            title="Movies"
            loading={apiKeysLoading}
            apiKeys={apiKeys}
            newApiKeys={newApiKeys}
            traktAuthStatus={traktAuthStatus}
            traktLoading={traktLoading}
            onNewKeyChange={handleNewApiKeyChange}
            onSaveApiKey={handleSaveApiKey}
            onDeleteApiKey={handleDeleteApiKey}
            onScheduleSave={updateSyncSchedule}
            onTraktOAuth={handleTraktOAuth}
          />

          {/* Music Section */}
          <ServiceSection
            category="Music"
            title="Music"
            loading={apiKeysLoading}
            apiKeys={apiKeys}
            newApiKeys={newApiKeys}
            onNewKeyChange={handleNewApiKeyChange}
            onSaveApiKey={handleSaveApiKey}
            onDeleteApiKey={handleDeleteApiKey}
            onScheduleSave={updateSyncSchedule}
          />
        </Paper>
        )}
      </AppShell>

      {/* Trakt OAuth Dialog */}
      <TraktOAuthDialog
        open={oauthDialogOpen}
        onClose={() => setOauthDialogOpen(false)}
        authCode={authCode}
        onAuthCodeChange={setAuthCode}
        onComplete={handleCompleteOAuth}
        loading={traktLoading}
      />
    </>
  );
}

export default ProfilePage;
