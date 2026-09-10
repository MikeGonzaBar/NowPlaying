import React from "react";
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { ServiceConfig, ApiKey, NewApiKey, TraktAuthStatus } from "../types";
import { getServiceTooltipContent } from "../utils/serviceConfig";
import { zincColors } from "../../../theme";
import { formatShortDate } from "../../../utils/dates";

interface ServiceCardProps {
  service: ServiceConfig;
  existingApiKey?: ApiKey;
  newKeyData: NewApiKey;
  onNewKeyChange: (field: "userId" | "apiKey", value: string) => void;
  onSave: (keyData?: NewApiKey) => Promise<void>;
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
  psnNPSSO = "",
  psnUpdating = false,
  onPSNEdit,
  onPSNCancel,
  onPSNSave,
  onPSNChange,
  traktAuthStatus,
  traktLoading = false,
  onTraktOAuth,
}) => {
  const userIdInputRef = React.useRef<HTMLInputElement>(null);
  const apiKeyInputRef = React.useRef<HTMLInputElement>(null);
  const isPSN = service.name === "psn";
  const showUserIdField = !isPSN || !!existingApiKey;
  const userIdLabel =
    service.userIdLabel ?? (service.requiresOAuth ? "Client ID" : "User ID");
  const apiKeyLabel =
    service.apiKeyLabel ??
    (service.requiresOAuth ? "Client Secret" : "API Key");
  const apiKeyPlaceholder =
    service.apiKeyPlaceholder ??
    (service.requiresOAuth ? "Client Secret" : "Enter API Key");
  const saveButtonLabel =
    service.saveButtonLabel ??
    (service.requiresOAuth ? "Save Credentials" : "Save API Key");
  const playstationSignInUrl = "https://www.playstation.com/";
  const playstationNpssoUrl = "https://ca.account.sony.com/api/v1/ssocookie";

  const handleSave = async () => {
    try {
      const keyData = {
        userId: userIdInputRef.current?.value ?? newKeyData.userId,
        apiKey: apiKeyInputRef.current?.value ?? newKeyData.apiKey,
      };

      await onSave(keyData);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save API key");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete the ${service.displayName} API key?`,
      )
    ) {
      return;
    }

    try {
      await onDelete();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete API key",
      );
    }
  };

  const [revealUserId, setRevealUserId] = React.useState(false);

  const maskIdentifier = (value: string): string => {
    if (!value) return "";
    if (value.length <= 8) return `${value.slice(0, 2)}••••${value.slice(-2)}`;
    return `${value.slice(0, 4)}••••${value.slice(-4)}`;
  };
  // Special handling for Trakt OAuth
  if (service.requiresOAuth && service.name === "trakt") {
    return (
      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 1.5,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 2,
          boxShadow: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            <Box
              component="img"
              src={service.imagePath}
              alt={service.displayName}
              sx={{
                width: 32,
                height: 32,
                mr: 2,
                borderRadius: 1,
                objectFit: "contain",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <Typography variant="h5" sx={{ fontWeight: "bold", mr: 2 }}>
              {service.displayName}
            </Typography>
            <Tooltip
              title={getServiceTooltipContent(service.name)}
              placement="top"
              sx={{ mr: 1 }}
            >
              <IconButton
                aria-label={`${service.displayName} setup help`}
                size="small"
                sx={{
                  width: 44,
                  height: 44,
                  color: "#00a8cc",
                  "&:hover": {
                    color: "#0097b2",
                    backgroundColor: "rgba(0, 168, 204, 0.1)",
                  },
                }}
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {traktAuthStatus?.token_expired ? (
              <Chip
                label="Needs attention"
                size="small"
                sx={{
                  backgroundColor: "#f59e0b",
                  color: "#1a1a1a",
                  fontWeight: 700,
                }}
              />
            ) : traktAuthStatus?.authenticated ? (
              <Chip
                label="Connected"
                size="small"
                sx={{
                  backgroundColor: "#22c55e",
                  color: "#052e16",
                  fontWeight: 700,
                }}
              />
            ) : (
              <Chip label="Not connected" size="small" variant="outlined" />
            )}
          </Box>

          {existingApiKey && (
            <IconButton
              onClick={handleDelete}
              aria-label={`Remove ${service.displayName} connection`}
              size="small"
              sx={{
                width: 32,
                height: 32,
                color: "#6b7280",
                "&:hover": {
                  color: "#ff5757",
                  backgroundColor: "rgba(255, 87, 87, 0.1)",
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Step 1: API Credentials */}
        {!existingApiKey && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 2, color: "#00a8cc" }}>
              Step 1: Enter your Trakt API credentials
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexDirection: { xs: "column", md: "row" },
                mb: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label={userIdLabel}
                  value={newKeyData.userId}
                  onChange={(e) => onNewKeyChange("userId", e.target.value)}
                  placeholder="Your Trakt Client ID"
                  name={`${service.name}-user-id`}
                  autoComplete="off"
                  inputRef={userIdInputRef}
                  size="small"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label={apiKeyLabel}
                  type="password"
                  value={newKeyData.apiKey}
                  onChange={(e) => onNewKeyChange("apiKey", e.target.value)}
                  placeholder={apiKeyPlaceholder}
                  name={`${service.name}-api-key`}
                  autoComplete="new-password"
                  inputRef={apiKeyInputRef}
                  size="small"
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                sx={{
                  backgroundColor: "#00a8cc",
                  "&:hover": {
                    backgroundColor: "#0097b2",
                  },
                }}
              >
                {saveButtonLabel}
              </Button>
            </Box>
          </>
        )}

        {/* Connection status & actions */}
        {existingApiKey && (
          <>
            {traktAuthStatus?.token_expired ? (
              <Box
                role="status"
                aria-live="polite"
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  backgroundColor: "rgba(245, 158, 11, 0.12)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#fbbf24", fontWeight: 700, mb: 0.5 }}
                >
                  Connection needs attention
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255, 255, 255, 0.85)", mb: 1.5 }}
                >
                  Your Trakt session expired. Reconnect to resume sync.
                </Typography>
                <Button
                  variant="contained"
                  onClick={onTraktOAuth}
                  disabled={traktLoading}
                  startIcon={
                    traktLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <OpenInNewIcon />
                    )
                  }
                  sx={{
                    backgroundColor: "#00a8cc",
                    "&:hover": {
                      backgroundColor: "#0097b2",
                    },
                  }}
                >
                  {traktLoading ? "Reconnecting…" : "Reconnect Trakt"}
                </Button>
              </Box>
            ) : traktAuthStatus?.authenticated ? (
              <Box role="status" aria-live="polite" sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#4ade80",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CheckCircleIcon fontSize="small" /> Connected to Trakt. Sync
                  is active.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 2, color: "rgba(255, 255, 255, 0.7)" }}
                >
                  Click the button below to start the OAuth process.
                </Typography>
                <Button
                  variant="contained"
                  onClick={onTraktOAuth}
                  disabled={traktLoading}
                  startIcon={
                    traktLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <OpenInNewIcon />
                    )
                  }
                  sx={{
                    backgroundColor: "#00a8cc",
                    "&:hover": {
                      backgroundColor: "#0097b2",
                    },
                  }}
                >
                  {traktLoading ? "Starting…" : "Authenticate with Trakt"}
                </Button>
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
        p: { xs: 2, md: 2.5 },
        mb: 1.5,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 2,
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          <Box
            component="img"
            src={service.imagePath}
            alt={service.displayName}
            sx={{
              width: 32,
              height: 32,
              mr: 2,
              borderRadius: 1,
              objectFit: "contain",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: "bold", mr: 2 }}>
            {service.displayName}
          </Typography>
          <Tooltip
            title={getServiceTooltipContent(service.name)}
            placement="top"
            sx={{ mr: 1 }}
          >
            <IconButton
              aria-label={`${service.displayName} setup help`}
              size="small"
              sx={{
                width: 44,
                height: 44,
                color: "#00a8cc",
                "&:hover": {
                  color: "#0097b2",
                  backgroundColor: "rgba(0, 168, 204, 0.1)",
                },
              }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {existingApiKey && (
            <Chip
              label="Connected"
              color="success"
              size="small"
              sx={{ backgroundColor: "#4caf50" }}
            />
          )}
        </Box>

        {existingApiKey && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {service.name === "psn" && !isPSNEditing && (
              <IconButton
                onClick={onPSNEdit}
                aria-label="Edit PlayStation connection"
                sx={{
                  width: 44,
                  height: 44,
                  color: "#00a8cc",
                  "&:hover": {
                    backgroundColor: "rgba(0, 168, 204, 0.1)",
                  },
                }}
              >
                <EditIcon />
              </IconButton>
            )}
            {service.name === "psn" && isPSNEditing && (
              <>
                <IconButton
                  onClick={onPSNSave}
                  disabled={psnUpdating || psnNPSSO.trim().length < 10}
                  sx={{
                    color: "#4caf50",
                    "&:hover": {
                      backgroundColor: "rgba(76, 175, 80, 0.1)",
                    },
                  }}
                  size="small"
                >
                  <SaveIcon />
                </IconButton>
                <IconButton
                  onClick={onPSNCancel}
                  aria-label="Cancel editing PlayStation"
                  sx={{
                    width: 44,
                    height: 44,
                    color: "#ff9800",
                    "&:hover": {
                      backgroundColor: "rgba(255, 152, 0, 0.1)",
                    },
                  }}
                >
                  <CancelIcon />
                </IconButton>
              </>
            )}
            <IconButton
              onClick={handleDelete}
              aria-label={`Remove ${service.displayName} connection`}
              sx={{
                width: 40,
                height: 40,
                color: "#cbd5e1",
                border: "1px solid rgba(255,255,255,0.08)",
                "&:hover": {
                  backgroundColor: "rgba(255, 87, 87, 0.12)",
                  color: "#ff7b7b",
                },
              }}
              size="small"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {isPSN && (!existingApiKey || isPSNEditing) && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            sx={{ mb: 1, color: "rgba(255, 255, 255, 0.7)" }}
          >
            Sign in to PlayStation, open the NPSSO JSON page in the same
            browser, then paste the npsso value here.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              component="a"
              href={playstationSignInUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              sx={{ borderColor: "#00a8cc", color: "#00a8cc" }}
            >
              Sign in
            </Button>
            <Button
              component="a"
              href={playstationNpssoUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              sx={{ borderColor: "#00a8cc", color: "#00a8cc" }}
            >
              Open NPSSO JSON
            </Button>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {showUserIdField && (
          <Box sx={{ flex: 1 }}>
            {existingApiKey ? (
              <Box sx={{ position: "relative", width: "100%" }}>
                <Typography
                  variant="caption"
                  sx={{ color: zincColors.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {userIdLabel}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 600, fontFamily: "monospace" }}>
                    {revealUserId
                      ? existingApiKey.service_user_id
                      : maskIdentifier(existingApiKey.service_user_id)}
                  </Typography>
                  <IconButton
                    aria-label={`${revealUserId ? "Hide" : "Reveal"} ${service.displayName} identifier`}
                    onClick={() => setRevealUserId((v) => !v)}
                    size="small"
                    sx={{ width: 32, height: 32, color: "#00a8cc" }}
                  >
                    {revealUserId ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </Box>
              </Box>
            ) : (
              <TextField
                fullWidth
                label={userIdLabel}
                value={newKeyData.userId}
                onChange={(e) => onNewKeyChange("userId", e.target.value)}
                placeholder={service.placeholder}
                name={`${service.name}-user-id`}
                autoComplete="off"
                inputRef={userIdInputRef}
                size="small"
              />
            )}
          </Box>
        )}
        <Box sx={{ flex: showUserIdField ? 1 : 2 }}>
          {existingApiKey && !(service.name === "psn" && isPSNEditing) ? (
            <Box sx={{ position: "relative", width: "100%" }}>
              <Typography
                variant="caption"
                sx={{ color: zincColors.muted, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                {apiKeyLabel}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Typography sx={{ fontSize: "14px", fontWeight: 600, fontFamily: "monospace", color: zincColors.muted }}>
                  ••••••••••••••••••••
                </Typography>
                <Typography sx={{ fontSize: "11px", color: zincColors.muted }}>
                  saved (encrypted)
                </Typography>
              </Box>
            </Box>
          ) : (
            <TextField
              fullWidth
              label={apiKeyLabel}
              type="password"
              value={
                service.name === "psn" && isPSNEditing
                  ? psnNPSSO
                  : newKeyData.apiKey
              }
              onChange={(e) => {
                if (service.name === "psn" && isPSNEditing) {
                  onPSNChange?.(e.target.value);
                } else {
                  onNewKeyChange("apiKey", e.target.value);
                }
              }}
              placeholder={
                service.name === "psn" && isPSNEditing
                  ? "Enter new NPSSO token"
                  : apiKeyPlaceholder
              }
              name={`${service.name}-api-key`}
              autoComplete="new-password"
              inputRef={apiKeyInputRef}
              size="small"
            />
          )}
        </Box>
      </Box>

      {!existingApiKey && (
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isPSN && newKeyData.apiKey.trim().length < 10}
            sx={{
              backgroundColor: "#00a8cc",
              "&:hover": {
                backgroundColor: "#0097b2",
              },
            }}
          >
            {saveButtonLabel}
          </Button>
        </Box>
      )}

      {existingApiKey && (
        <Box sx={{ mt: 2 }}>
          {service.name === "psn" && isPSNEditing && psnUpdating && (
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <CircularProgress size={16} sx={{ color: "#00a8cc", mr: 1 }} />
              <Typography variant="caption" sx={{ color: "#00a8cc" }}>
                Updating NPSSO token...
              </Typography>
            </Box>
          )}
          <Typography
            variant="caption"
            sx={{ color: "rgba(255, 255, 255, 0.6)" }}
          >
            Added:{" "}
            {existingApiKey &&
              formatShortDate(existingApiKey.created_at)}
            {existingApiKey?.last_used && (
              <>
                {" "}
                • Last used:{" "}
                {formatShortDate(existingApiKey.last_used)}
              </>
            )}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
