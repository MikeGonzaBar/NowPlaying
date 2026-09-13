import { Box, Tooltip, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { avatarUrl } from "../../../utils/avatars";
import { RankingBadge } from "./RankingBadge";
import { TopTracksList } from "./TopTracksList";
import { TopTrack } from "../types";

interface MusicItemCardProps {
  rank: number;
  isFirst: boolean;
  thumbnail: string | null;
  name: string;
  subtitle?: string;
  count: number;
  countLabel: string;
  topTracks: TopTrack[];
  /** Internal route for the canonical entity detail page. */
  to?: string;
  onClick?: () => void;
  url: string | null;
  imageShape?: "circle" | "square";
}

export function MusicItemCard({
  rank,
  isFirst,
  thumbnail,
  name,
  subtitle,
  count,
  countLabel,
  topTracks,
  to,
  onClick,
  url,
  imageShape = "circle",
}: MusicItemCardProps) {
  const borderRadius = imageShape === "circle" ? "50%" : "16px";
  const pulseBorderRadius = imageShape === "circle" ? "50%" : "16px";
  const interactive = Boolean(to || url);

  const linkProps = to
    ? { component: RouterLink, to }
    : url
      ? {
          component: "a" as const,
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
        }
      : {};

  return (
    <Box
      {...linkProps}
      onClick={onClick}
      aria-label={interactive ? `${name} - view details` : undefined}
      sx={{
        position: "relative",
        bgcolor: "#161618",
        borderRadius: "24px",
        p: 3,
        border: "1px solid #262626",
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        gap: 4,
        alignItems: "center",
        cursor: url ? "pointer" : "default",
        transition: "all 0.3s",
        ...(isFirst
          ? {
            borderColor: "rgba(239, 68, 68, 0.5)",
            boxShadow: "0 0 15px rgba(239, 68, 68, 0.15)",
          }
          : {
            "&:hover": {
              borderColor: "#3f3f46",
            },
          }),
        opacity: rank > 10 ? 0.9 : 1,
        "&:focus-visible": {
          outline: "2px solid #f43f5e",
          outlineOffset: 3,
        },
      }}
    >
      {/* Ranking Badge */}
      <RankingBadge rank={rank} isFirst={isFirst} />

      {/* Item Info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          width: { xs: "100%", lg: "33.333%" },
        }}
      >
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          {isFirst && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: pulseBorderRadius,
                border: "2px solid #EF4444",
                animation: "pulse 2s infinite",
                opacity: 0.5,
              }}
            />
          )}
          <Box
            component="img"
            src={
              thumbnail || avatarUrl(name)
            }
            alt={name}
            sx={{
              width: { xs: 96, md: 128 },
              height: { xs: 96, md: 128 },
              borderRadius: borderRadius,
              objectFit: "cover",
              border: "4px solid #0A0A0B",
              filter: isFirst ? "none" : "grayscale(100%)",
              transition: "all 0.3s",
              "&:hover": {
                filter: "grayscale(0%)",
              },
            }}
          />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Tooltip title={name} placement="top" enterDelay={400}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "24px", md: "32px" },
                fontWeight: 700,
                mb: 0.5,
                transition: "color 0.2s",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                "&:hover": {
                  color: "#EF4444",
                },
              }}
            >
              {name}
            </Typography>
          </Tooltip>
          {subtitle && (
            <Tooltip title={subtitle} placement="top" enterDelay={400}>
              <Typography
                sx={{
                  fontSize: "14px",
                  color: "#71717a",
                  mb: 0.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {subtitle}
              </Typography>
            </Tooltip>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <Typography
              sx={{
                color: isFirst ? "#EF4444" : "#e4e4e7",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              {count}
            </Typography>
            <Typography
              sx={{
                color: "#71717a",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 600,
              }}
            >
              {countLabel}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Top Tracks */}
      <TopTracksList tracks={topTracks} isFirst={isFirst} />
    </Box>
  );
}
