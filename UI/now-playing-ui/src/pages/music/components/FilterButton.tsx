import { Box, Typography } from "@mui/material";

interface FilterButtonProps {
    icon: string;
    label: string;
    onClick?: () => void;
}

export function FilterButton({ icon, label, onClick }: FilterButtonProps) {
    return (
        <Box
            onClick={onClick}
            sx={{
                px: 2,
                py: 1,
                bgcolor: "#161618",
                border: "1px solid #262626",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: onClick ? "pointer" : "default",
                "&:hover": onClick ? { bgcolor: "#1a1a1c" } : {},
                transition: "all 0.2s",
            }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#71717a" }}>
                {icon}
            </span>
            <Typography sx={{ fontSize: "14px", fontWeight: 500 }}>{label}</Typography>
        </Box>
    );
}
