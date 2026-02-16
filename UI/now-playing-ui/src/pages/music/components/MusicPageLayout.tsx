import { Box } from "@mui/material";
import SideBar from "../../../components/sideBar";

interface MusicPageLayoutProps {
    children: React.ReactNode;
    maxWidth?: string;
    paddingX?: object;
    paddingY?: object;
    paddingBottom?: object;
}

export function MusicPageLayout({
    children,
    maxWidth = "1280px",
    paddingX = { xs: 2, md: 6, lg: 12 },
    paddingY = { xs: 4, md: 8 },
    paddingBottom,
}: MusicPageLayoutProps) {
    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#0A0A0B", color: "#f4f4f5" }}>
            <SideBar activeItem="Music" />
            <Box
                sx={{
                    flexGrow: 1,
                    maxWidth,
                    mx: "auto",
                    px: paddingX,
                    py: paddingBottom ? undefined : paddingY,
                    pt: paddingBottom ? paddingY : undefined,
                    pb: paddingBottom || paddingY,
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
