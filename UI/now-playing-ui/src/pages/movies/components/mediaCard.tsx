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

  const mediaTitle =
    mediaType === "movie"
      ? (media as Movie).movie.title
      : (media as Show).show.title;
  const mediaYear =
    mediaType === "movie"
      ? (media as Movie).movie.year
      : (media as Show).show.year;
  const mediaImage = mediaDetails?.poster_path
    ? `https://image.tmdb.org/t/p/w780${mediaDetails.poster_path}`
    : "";

  const handleCardClick = () => {
    const id = mediaType === "movie"
      ? (media as Movie).movie.ids.tmdb
      : (media as Show).show.ids.trakt;
    navigate(
      mediaType === "movie" ? `/movies/${id}` : `/shows/${id}`,
      {
        state: {
          media,
          mediaType,
          mediaDetails,
        },
      },
    );
  };

  return (
    <Box
      component="a"
      href={
        mediaType === "movie"
          ? `/movies/${(media as Movie).movie.ids.tmdb}`
          : `/shows/${(media as Show).show.ids.trakt}`
      }
      onClick={(event) => {
        event.preventDefault();
        handleCardClick();
      }}
      aria-label={`Open ${mediaTitle}${mediaYear ? `, ${mediaYear}` : ""}`}
      sx={{
        display: "block",
        backgroundColor: "#FFFFFF",
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: 6,
        transition: "transform 0.2s ease-in-out",
        textDecoration: "none",
        color: "inherit",
        "&:hover": { transform: "scale(1.03)" },
        minWidth: "250px",
        maxWidth: "250px",
        minHeight: "400px",
        maxHeight: "400px",
        "&:focus-visible": {
          outline: "2px solid #22D3EE",
          outlineOffset: "2px",
        },
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
