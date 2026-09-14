import { Box, Card, Typography, Button } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import SyncIcon from "@mui/icons-material/Sync";
import { useTraktConnection } from "../../../hooks/useTraktConnection";

interface MilestonesSidebarProps {
  masteryPercentage: number;
  watchedCount: number;
  totalEpisodes: number;
  onSync: () => void;
}

function MilestonesSidebar({
  watchedCount,
  totalEpisodes,
  onSync,
}: MilestonesSidebarProps) {
  const {
    connected: traktConnected,
    expired: traktExpired,
    loading: traktLoading,
  } = useTraktConnection();

  const seriesComplete =
    totalEpisodes > 0 && watchedCount >= totalEpisodes;
  const achievements =
    totalEpisodes === 0
      ? []
      : [
          {
            id: "series_finale",
            icon: LockIcon,
            title: "Series Finale",
            description: seriesComplete
              ? "Final episode watched — series complete."
              : `Watch the final episode to unlock this badge. (${watchedCount}/${totalEpisodes} episodes watched)`,
            unlocked: seriesComplete,
          },
        ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography
        sx={{
          color: "#fff",
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        Milestones
      </Typography>

      <Card
        sx={{
          backgroundColor: "rgba(34, 16, 17, 0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(238, 32, 39, 0.1)",
          borderRadius: 3,
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {achievements.map((achievement) => {
          const IconComponent = achievement.icon;
          const isUnlocked = achievement.unlocked;

          return (
            <Box
              key={achievement.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                opacity: isUnlocked ? 1 : 0.4,
                filter: isUnlocked ? "none" : "grayscale(100%)",
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: isUnlocked
                    ? "rgba(237, 28, 36, 0.2)"
                    : "rgba(255, 255, 255, 0.1)",
                  border: `2px solid ${isUnlocked ? "#ed1c24" : "rgba(255, 255, 255, 0.2)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isUnlocked
                    ? "0 0 10px rgba(237, 28, 36, 0.3)"
                    : "none",
                  flexShrink: 0,
                }}
              >
                <IconComponent
                  sx={{
                    color: isUnlocked ? "#ed1c24" : "rgba(255, 255, 255, 0.5)",
                    fontSize: 28,
                  }}
                />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#fff",
                  }}
                >
                  {achievement.title}
                </Typography>
                <Typography
                  sx={{
                    color: "#b99d9d",
                    fontSize: "11px",
                    lineHeight: 1.6,
                  }}
                >
                  {achievement.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Card>

      {/* Sync Card */}
      <Card
        sx={{
          borderRadius: 3,
          background:
            "linear-gradient(135deg, rgba(237, 28, 36, 0.3) 0%, transparent 100%)",
          border: "1px solid rgba(237, 28, 36, 0.2)",
          p: 2.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "14px",
                color: "#fff",
              }}
            >
              Trakt Sync
            </Typography>
            <Typography
              sx={{
                fontSize: "10px",
                color: "#b99d9d",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {traktConnected
                ? "Connected account"
                : traktExpired
                  ? "Needs attention"
                  : traktLoading
                    ? "Checking…"
                    : "Unavailable"}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: traktConnected
                ? "#22c55e"
                : traktExpired
                  ? "#f59e0b"
                  : "#71717a",
              boxShadow: traktConnected ? "0 0 8px #22c55e" : "none",
            }}
          />
        </Box>
        {!traktConnected && (
          <Typography
            sx={{
              fontSize: "11px",
              color: "#b99d9d",
              mb: 1.5,
              lineHeight: 1.6,
            }}
          >
            {traktExpired
              ? "Your Trakt session expired. Reconnect Trakt in Connections & account to resume sync."
              : "Checking your Trakt connection…"}
          </Typography>
        )}
        <Button
          fullWidth
          variant="contained"
          startIcon={<SyncIcon />}
          onClick={onSync}
          disabled={!traktConnected}
          title={
            traktConnected
              ? undefined
              : "Reconnect Trakt in Connections & account first"
          }
          sx={{
            backgroundColor: "#ed1c24",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            py: 1,
            borderRadius: 2,
            "&:hover": {
              backgroundColor: "rgba(237, 28, 36, 0.8)",
            },
          }}
        >
          Force Update
        </Button>
      </Card>
    </Box>
  );
}

export default MilestonesSidebar;
