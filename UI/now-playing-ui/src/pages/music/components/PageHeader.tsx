import { Box, Typography } from "@mui/material";
import { BackButton } from "./BackButton";

interface PageHeaderProps {
    title: string;
    description: string;
    filterButtons?: React.ReactNode;
}

export function PageHeader({ title, description, filterButtons }: PageHeaderProps) {
    return (
        <Box sx={{ mb: 6, display: "flex", flexDirection: { xs: "column", md: "row" }, md: { alignItems: "flex-end" }, justifyContent: "space-between", gap: 4 }}>
            <Box>
                <BackButton />
                <Typography variant="h1" sx={{ fontSize: { xs: "32px", md: "48px" }, fontWeight: 700, mb: 1 }}>
                    {title}
                </Typography>
                <Typography sx={{ color: "#71717a", fontWeight: 500 }}>
                    {description}
                </Typography>
            </Box>
            {filterButtons && (
                <Box sx={{ display: "flex", gap: 1.5 }}>
                    {filterButtons}
                </Box>
            )}
        </Box>
    );
}
