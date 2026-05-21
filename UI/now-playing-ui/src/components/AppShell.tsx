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
                overflowX: "hidden",
            }}
        >
            <SideBar activeItem={activeItem} />
            <Box
                component="main"
                sx={[
                    {
                        flexGrow: 1,
                        minWidth: 0,
                        overflowX: "hidden",
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
