import { Box } from "@mui/material";

interface RankingBadgeProps {
    rank: number;
    isFirst?: boolean;
}

export function RankingBadge({ rank, isFirst = false }: RankingBadgeProps) {
    return (
        <Box
            sx={{
                position: "absolute",
                top: -12,
                left: -12,
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                border: "4px solid #0A0A0B",
                zIndex: 10,
                ...(isFirst ? {
                    bgcolor: "#EF4444",
                    color: "white",
                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)",
                } : {
                    bgcolor: "#262626",
                    color: "#71717a",
                }),
            }}
        >
            {rank}
        </Box>
    );
}
