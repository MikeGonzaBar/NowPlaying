import { createTheme } from '@mui/material/styles';

// Dark Mode Zinc Color Palette
const zincColors = {
    background: '#09090b',
    card: '#18181b',
    border: '#27272a',
    muted: '#a1a1aa', // zinc-400
    white: '#ffffff',
};

// Category colors for glows
const categoryColors = {
    games: '#3b82f6', // blue
    movies: '#ef4444', // red
    music: '#10b981', // green
    analytics: '#8b5cf6', // purple
};

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: zincColors.white,
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
            fontSize: '16px',
            fontWeight: 600,
            color: zincColors.white,
        },
        h2: {
            fontSize: '16px',
            fontWeight: 600,
            color: zincColors.white,
        },
        h3: {
            fontSize: '16px',
            fontWeight: 600,
            color: zincColors.white,
        },
        h4: {
            fontSize: '16px',
            fontWeight: 600,
            color: zincColors.white,
        },
        h5: {
            fontSize: '16px',
            fontWeight: 600,
            color: zincColors.white,
        },
        h6: {
            fontSize: '16px',
            fontWeight: 600,
            color: zincColors.white,
        },
        body1: {
            fontSize: '13px',
            color: zincColors.muted,
        },
        body2: {
            fontSize: '13px',
            color: zincColors.muted,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: zincColors.card,
                    border: `1px solid ${zincColors.border}`,
                    borderRadius: 12,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    textTransform: 'none',
                    border: `1px solid ${zincColors.border}`,
                    backgroundColor: zincColors.card,
                    color: zincColors.white,
                    '&:hover': {
                        backgroundColor: zincColors.card,
                        borderColor: zincColors.border,
                    },
                },
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

export { zincColors, categoryColors };
