import { Box, Button, Typography } from "@mui/material";
import type { MouseEventHandler, ReactNode } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FilterListIcon from "@mui/icons-material/FilterList";

interface FilterButtonProps {
  icon: string;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Legacy callers pass Material ligature names; map them to the SVG icon set
 * so raw ligature strings ("calendar_today") never render as text.
 */
const ICON_MAP: Record<string, ReactNode> = {
  calendar_today: <CalendarTodayIcon sx={{ fontSize: 20 }} />,
  filter_list: <FilterListIcon sx={{ fontSize: 20 }} />,
};

export function FilterButton({
  icon,
  label,
  onClick,
  active = false,
  ariaLabel,
  disabled = false,
}: FilterButtonProps) {
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
        minHeight: 44,
        height: 44,
        textTransform: "none",
        "&:hover": {
          bgcolor: active ? "rgba(239, 68, 68, 0.22)" : "#1a1a1c",
          borderColor: active ? "rgba(239, 68, 68, 0.8)" : "#3f3f46",
        },
        transition: "all 0.2s",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: active ? "#ef4444" : "#71717a",
        }}
      >
        {ICON_MAP[icon] ?? null}
      </Box>
      <Typography sx={{ fontSize: "14px", fontWeight: 500 }}>
        {label}
      </Typography>
    </Button>
  );
}
