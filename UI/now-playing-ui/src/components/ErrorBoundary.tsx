import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

/**
 * Catches render-time exceptions so a broken module can never collapse an
 * entire route into a blank page (audit finding: Analytics blank page).
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Safe operational log: message + component stack only.
    console.error(
      `ui_render_error error=${error.message} component_stack=${info.componentStack ?? "unknown"}`,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
          <Alert
            severity="error"
            sx={{ maxWidth: 560 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => window.location.reload()}
              >
                Reload
              </Button>
            }
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2">
              This section failed to render. Reload the page to try again.
            </Typography>
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}
