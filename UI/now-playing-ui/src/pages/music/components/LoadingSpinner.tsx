import { Box, CircularProgress } from "@mui/material";
import SideBar from "../../../components/sideBar";

export function LoadingSpinner() {
    return (
        <Box sx={{ display: "flex" }}>
            <SideBar activeItem="Music" />
            <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                <CircularProgress />
            </Box>
        </Box>
    );
}
