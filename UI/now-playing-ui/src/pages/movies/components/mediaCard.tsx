import { Box } from "@mui/material";
import { Movie, Show } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { useMediaDetails } from "../hooks/useMediaDetails";
import { MediaImage, MediaTitle, MediaInfo } from "./MediaCardSections";

interface MediaCardProps {
    media: Movie | Show;
    mediaType: "movie" | "show";
}

const MediaCard: React.FC<MediaCardProps> = ({ media, mediaType }) => {
    const navigate = useNavigate();
    const mediaDetails = useMediaDetails(media, mediaType);

    const mediaTitle = mediaType === "movie" ? (media as Movie).movie.title : (media as Show).show.title;
    const mediaYear = mediaType === "movie" ? (media as Movie).movie.year : (media as Show).show.year;
    const mediaImage = mediaDetails?.poster_path
        ? `https://image.tmdb.org/t/p/w780${mediaDetails.poster_path}`
        : '';

    const handleCardClick = () => {
        navigate("/movieDetails", {
            state: {
                media,
                mediaType,
                mediaDetails,
            },
        });
    };

    return (
        <Box
            onClick={handleCardClick}
            sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 6,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': { transform: 'scale(1.03)' },
                minWidth: '250px',
                maxWidth: '250px',
                minHeight: '400px',
                maxHeight: '400px',
            }}
        >
            <MediaImage imageUrl={mediaImage} title={mediaTitle} />
            <MediaTitle title={mediaTitle} year={mediaYear} />
            <MediaInfo
                lastWatched={media.last_watched_at}
                voteAverage={mediaDetails?.vote_average}
                genres={mediaDetails?.genres}
            />
        </Box>
    );
};

export default MediaCard;