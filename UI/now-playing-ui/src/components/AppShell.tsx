import { Box } from "@mui/material";
import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import SideBar from "./sideBar";
import { zincColors } from "../theme";

interface AppShellProps {
  activeItem: string;
  children: ReactNode;
  backgroundColor?: string;
  mainSx?: SxProps<Theme>;
}

function AppShell({
  activeItem,
  children,
  backgroundColor = zincColors.background,
  mainSx,
}: AppShellProps) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: backgroundColor,
        color: "#fff",
      }}
    >
      <Box
        component="a"
        href="#main"
        sx={{
          position: "fixed",
          top: 8,
          left: 8,
          zIndex: 1500,
          px: 2,
          py: 1,
          borderRadius: 1,
          border: `1px solid ${zincColors.border}`,
          bgcolor: zincColors.card,
          color: zincColors.white,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          transform: "translateY(-200%)",
          transition: "transform 0.15s ease",
          "&:focus": { transform: "translateY(0)" },
          "&:focus-visible": {
            outline: "2px solid #00a8cc",
            outlineOffset: 2,
          },
        }}
      >
        Skip to main content
      </Box>
      <SideBar activeItem={activeItem} />
      <Box
        component="main"
        id="main"
        tabIndex={-1}
        sx={[
          {
            flexGrow: 1,
            minWidth: 0,
            bgcolor: backgroundColor,
          },
          ...(Array.isArray(mainSx) ? mainSx : mainSx ? [mainSx] : []),
        ]}
      >
        {children}
      </Box>
    </Box>
  );
}

export default AppShell;
