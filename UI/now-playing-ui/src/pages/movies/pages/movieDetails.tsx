import { useLocation } from "react-router-dom";
import { Box, Grid } from "@mui/material";
import SideBar from "../../../components/sideBar";
import MovieHeader from "../components/movieHeader";

const MovieDetails: React.FC = () => {
    const location = useLocation();
    const { media, mediaType, mediaDetails } = location.state || {};

    return (
        <Box sx={{ paddingLeft: 2.5 }}>
            <SideBar activeItem="Games" />
            <Box
                component="main"
                sx={{ marginLeft: 20, mt: 2, display: 'flex', height: '98vh', width: '85vw' }}
            >
                <Grid sx={{ display: 'flex' }}>
                    <MovieHeader media={media} mediaType={mediaType} mediaDetails={mediaDetails}></MovieHeader>
                </Grid>
                <Grid sx={{ width: '70vw', ml: 4 }}>
                </Grid>
            </Box >
        </Box >
    );
};

export default MovieDetails;