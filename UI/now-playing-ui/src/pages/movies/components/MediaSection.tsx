import { Box, IconButton, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import MediaCard from "./mediaCard";
import { Movie, Show } from "../utils/types";

interface MediaSectionProps {
    title: string;
    media: (Movie | Show)[];
    mediaType: "movie" | "show";
    onLoadMore: () => void;
}

const MediaSection = ({ title, media, mediaType, onLoadMore }: MediaSectionProps) => {
    return (
        <>
            <Typography
                variant="h5"
                sx={{
                    mt: 2,
                    ml: 1,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    width: "100%",
                    overflowX: "scroll",
                    gap: 2,
                    py: 1,
                    px: 1,
                }}
            >
                {media && media.length > 0 ? (
                    media.map((item) => (
                        <MediaCard
                            media={item}
                            mediaType={mediaType}
                            key={mediaType === "movie"
                                ? (item as Movie).movie.ids.tmdb
                                : (item as Show).show.ids.tmdb}
                        />
                    ))
                ) : (
                    <Typography variant="body1" sx={{ ml: 1 }}>
                        No {mediaType}s available.
                    </Typography>
                )}
                <IconButton onClick={onLoadMore} sx={{ alignSelf: "center" }}>
                    <AddCircleOutlineIcon fontSize="large" />
                </IconButton>
            </Box>
        </>
    );
};

export default MediaSection; 