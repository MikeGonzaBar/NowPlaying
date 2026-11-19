import {
  Alert,
  Box,
  FormControlLabel,
  Paper,
  Switch,
  Typography,
} from "@mui/material";
import { useSections } from "../../../preferences/SectionsContext";
import {
  SECTION_KEYS,
  SECTION_LABELS,
  type SectionKey,
} from "../../../preferences/types";

const SECTION_DESCRIPTIONS: Record<SectionKey, string> = {
  games: "Playtime, achievements and trophies",
  movies: "Watch history and progress",
  music: "Scrobbles, artists and albums",
};

function PreferencesSection() {
  const { hidden, visibleCount, error, setSectionHidden } = useSections();

  return (
    <Paper
      component="section"
      aria-labelledby="preferences-heading"
      sx={{
        p: { xs: 2, md: 3 },
        backgroundColor: "rgba(255, 255, 255, 0.07)",
        backdropFilter: "blur(10px)",
        borderRadius: 2,
        border: "1px solid rgba(255, 255, 255, 0.14)",
      }}
    >
      <Typography
        id="preferences-heading"
        variant="h5"
        sx={{
          mb: 1,
          fontFamily: "Montserrat, sans-serif",
          fontWeight: "bold",
        }}
      >
        Home &amp; navigation
      </Typography>
      <Typography sx={{ mb: 2, fontSize: 14, color: "text.secondary" }}>
        Choose which sections appear in the sidebar, on the home page and in
        analytics. Hiding a section leaves its data untouched.
      </Typography>

      {error && (
        <Alert severity="error" role="status" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {SECTION_KEYS.map((section) => {
          const checked = !hidden.includes(section);
          // The server enforces the same rule; disabling here explains it.
          const isLastVisible = checked && visibleCount === 1;

          return (
            <Box key={section}>
              <FormControlLabel
                control={
                  <Switch
                    checked={checked}
                    disabled={isLastVisible}
                    onChange={(event) =>
                      void setSectionHidden(section, !event.target.checked)
                    }
                    slotProps={{
                      input: {
                        "aria-describedby": `section-${section}-help`,
                      },
                    }}
                  />
                }
                label={SECTION_LABELS[section]}
              />
              <Typography
                id={`section-${section}-help`}
                sx={{ fontSize: 12, color: "text.secondary", ml: 6 }}
              >
                {isLastVisible
                  ? "At least one section must stay visible."
                  : SECTION_DESCRIPTIONS[section]}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export default PreferencesSection;
