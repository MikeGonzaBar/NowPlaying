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
            pb: { xs: "calc(60px + env(safe-area-inset-bottom))", sm: 0 },
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
