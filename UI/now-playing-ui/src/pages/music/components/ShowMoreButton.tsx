import { Box, Button, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface ShowMoreButtonProps {
  showAll: boolean;
  totalItems: number;
  onShowMore: () => void;
  itemType: string;
  syncLabel?: string;
  lastUpdatedLabel?: string;
}

export function ShowMoreButton({
  showAll,
  totalItems,
  onShowMore,
  itemType,
  syncLabel = "Last.fm",
  lastUpdatedLabel,
}: ShowMoreButtonProps) {
  // Never claim a freshness we cannot verify. Callers that know a real sync
  // timestamp can pass it explicitly via `lastUpdatedLabel`.
  const sourceText = lastUpdatedLabel
    ? `Synced from ${syncLabel} • ${lastUpdatedLabel}`
    : `Synced from ${syncLabel}`;
  if (showAll || totalItems <= 10) {
    return (
      <Box
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography
          sx={{ fontSize: "12px", color: "#71717a", fontWeight: 500 }}
        >
          {sourceText}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Button
        onClick={onShowMore}
        endIcon={<ExpandMoreIcon />}
        sx={{
          px: 4,
          py: 1.5,
          bgcolor: "#161618",
          border: "1px solid #262626",
          borderRadius: "12px",
          fontWeight: 700,
          color: "#f4f4f5",
          textTransform: "none",
          "&:hover": {
            bgcolor: "#1a1a1c",
            borderColor: "rgba(239, 68, 68, 0.3)",
          },
          transition: "all 0.2s",
        }}
      >
        Show More {itemType}
      </Button>
      <Typography sx={{ fontSize: "12px", color: "#71717a", fontWeight: 500 }}>
        {sourceText}
      </Typography>
    </Box>
  );
}
