import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';

interface AchievementFilterProps {
    selectedOption: string;
    onFilterChange: (event: SelectChangeEvent<string>) => void;
}

const AchievementFilter: React.FC<AchievementFilterProps> = ({
    selectedOption,
    onFilterChange
}) => (
    <FormControl
        fullWidth
        variant="outlined"
        size="small"
        sx={{ height: "40px" }}
    >
        <InputLabel id="dropdown-label" sx={{ fontSize: "14px" }}>
            Achievements filter
        </InputLabel>
        <Select
            labelId="dropdown-label"
            id="dropdown"
            value={selectedOption}
            onChange={onFilterChange}
            label="Achievements filter"
            sx={{
                fontSize: "14px",
                height: "40px",
            }}
        >
            <MenuItem value="All" sx={{ fontSize: "14px" }}>
                All achievements
            </MenuItem>
            <MenuItem value="Unlocked" sx={{ fontSize: "14px" }}>
                Unlocked
            </MenuItem>
            <MenuItem value="Locked" sx={{ fontSize: "14px" }}>
                Locked
            </MenuItem>
        </Select>
    </FormControl>
);

export default React.memo(AchievementFilter); 