import { Button, Typography } from "@mui/material";
import type { MouseEventHandler } from "react";

interface FilterButtonProps {
    icon: string;
    label: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    active?: boolean;
    ariaLabel?: string;
    disabled?: boolean;
}

export function FilterButton({ icon, label, onClick, active = false, ariaLabel, disabled = false }: FilterButtonProps) {
    return (
        <Button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel || label}
            sx={{
                px: 2,
                py: 1,
                bgcolor: active ? "rgba(239, 68, 68, 0.15)" : "#161618",
                border: "1px solid #262626",
                borderColor: active ? "rgba(239, 68, 68, 0.55)" : "#262626",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "#e4e4e7",
                alignSelf: "center",
                minHeight: 40,
                height: 40,
                textTransform: "none",
                "&:hover": {
                    bgcolor: active ? "rgba(239, 68, 68, 0.22)" : "#1a1a1c",
                    borderColor: active ? "rgba(239, 68, 68, 0.8)" : "#3f3f46",
                },
                transition: "all 0.2s",
            }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: active ? "#ef4444" : "#71717a" }}>
                {icon}
            </span>
            <Typography sx={{ fontSize: "14px", fontWeight: 500 }}>{label}</Typography>
        </Button>
    );
}
