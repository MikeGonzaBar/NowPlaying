import { useState } from "react";
import { Menu, MenuItem } from "@mui/material";
import { FilterButton } from "./FilterButton";
import {
  RANKING_PERIOD_OPTIONS,
  RANKING_SOURCE_OPTIONS,
  getRankingPeriodLabel,
  getRankingSourceLabel,
} from "../utils/rankingFilters";

interface RankingFiltersProps {
  period: string;
  source: string;
  onPeriodChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  /** Used for accessible labels, e.g. "artist", "album", "track". */
  entityLabel: string;
}

/**
 * One filter control for every ranking page so periods and sources cannot
 * drift between Top Artists, Top Albums and Top Tracks.
 */
export function RankingFilters({
  period,
  source,
  onPeriodChange,
  onSourceChange,
  entityLabel,
}: RankingFiltersProps) {
  const [periodAnchor, setPeriodAnchor] = useState<null | HTMLElement>(null);
  const [sourceAnchor, setSourceAnchor] = useState<null | HTMLElement>(null);

  const periodLabel = getRankingPeriodLabel(period);
  const sourceLabel = getRankingSourceLabel(source);

  const menuPaperSx = {
    bgcolor: "#161618",
    color: "#e4e4e7",
    border: "1px solid #262626",
  };

  return (
    <>
      <FilterButton
        icon="calendar_today"
        label={periodLabel}
        active={period !== "all"}
        onClick={(event) => setPeriodAnchor(event.currentTarget)}
        ariaLabel={`Choose ${entityLabel} period`}
      />
      <FilterButton
        icon="filter_list"
        label={sourceLabel}
        active={source !== "all"}
        onClick={(event) => setSourceAnchor(event.currentTarget)}
        ariaLabel={`Choose ${entityLabel} source`}
      />
      <Menu
        anchorEl={periodAnchor}
        open={Boolean(periodAnchor)}
        onClose={() => setPeriodAnchor(null)}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        {RANKING_PERIOD_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={period === option.value}
            onClick={() => {
              onPeriodChange(option.value);
              setPeriodAnchor(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={sourceAnchor}
        open={Boolean(sourceAnchor)}
        onClose={() => setSourceAnchor(null)}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        {RANKING_SOURCE_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={source === option.value}
            onClick={() => {
              onSourceChange(option.value);
              setSourceAnchor(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
