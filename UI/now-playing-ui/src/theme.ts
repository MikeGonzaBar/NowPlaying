import { createTheme } from "@mui/material/styles";

const zincColors = {
  background: "#09090b",
  card: "#18181b",
  border: "#27272a",
  muted: "#a1a1aa",
  white: "#ffffff",
};

const categoryColors = {
  games: "#3b82f6",
  movies: "#ef4444",
  music: "#10b981",
  analytics: "#8b5cf6",
};
const statusColors = {
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#00a8cc",
  muted: "#71717a",
};

export const theme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  palette: {
    mode: "dark",
    primary: {
      main: "#00a8cc",
    },
    background: {
      default: zincColors.background,
      paper: zincColors.card,
    },
    text: {
      primary: zincColors.white,
      secondary: zincColors.muted,
    },
    divider: zincColors.border,
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    h1: {
      fontSize: "clamp(28px, 3.4vw, 42px)",
      fontWeight: 700,
      color: zincColors.white,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "24px",
      fontWeight: 700,
      color: zincColors.white,
      lineHeight: 1.25,
    },
    h3: {
      fontSize: "20px",
      fontWeight: 600,
      color: zincColors.white,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: "18px",
      fontWeight: 600,
      color: zincColors.white,
    },
    h5: {
      fontSize: "16px",
      fontWeight: 600,
      color: zincColors.white,
    },
    h6: {
      fontSize: "14px",
      fontWeight: 600,
      color: zincColors.white,
    },
    body1: {
      fontSize: "14px",
      color: zincColors.muted,
    },
    body2: {
      fontSize: "13px",
      color: zincColors.muted,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { colorScheme: "dark" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: zincColors.card,
          border: `1px solid ${zincColors.border}`,
          borderRadius: 12,
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: "none",
          transition:
            "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease",
          "&:focus-visible": {
            outline: "2px solid #00a8cc",
            outlineOffset: "2px",
          },
        },
        contained: {
          backgroundColor: zincColors.card,
          color: zincColors.white,
          border: `1px solid ${zincColors.border}`,
          "&:hover": {
            backgroundColor: "#27272a",
            borderColor: "#3f3f46",
          },
        },
        outlined: {
          backgroundColor: "transparent",
          color: zincColors.white,
          border: `1px solid ${zincColors.border}`,
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            borderColor: "#3f3f46",
          },
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: zincColors.card,
          border: `1px solid ${zincColors.border}`,
          borderRadius: 12,
        },
      },
    },
  },
});

export { zincColors, categoryColors, statusColors };
