import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

interface BackButtonProps {
    to?: string;
}

export function BackButton({ to = "/music" }: BackButtonProps) {
    const navigate = useNavigate();

    return (
        <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(to)}
            sx={{
                mb: 2,
                px: 2,
                py: 1,
                bgcolor: "#161618",
                border: "1px solid #262626",
                borderRadius: "999px",
                color: "#f4f4f5",
                fontSize: "14px",
                fontWeight: 500,
                textTransform: "none",
                "&:hover": {
                    bgcolor: "#1a1a1c",
                    borderColor: "#EF4444",
                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.2)",
                },
            }}
        >
            Back to Dashboard
        </Button>
    );
}
