import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Card, CardContent, Avatar } from '@mui/material';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GradeIcon from '@mui/icons-material/Grade';
import EventIcon from '@mui/icons-material/Event';

interface Episode {
    id: number;
    episode_number: number;
    title: string;
    season__id: number;
    overview: string;
    rating: number;
    progress: number;
    last_watched_at: string;
    image_url: string;
}

interface Season {
    id: number;
    season_number: number;
}

interface ShowEpisodesProps {
    seasons: Season[];
    episodes: Episode[];
}

export const ShowEpisodes = ({ seasons, episodes }: ShowEpisodesProps) => (
    <Box sx={{ width: '60%' }}>
        <Typography variant="body2" sx={{ fontSize: '20px', fontFamily: 'Inter, sans-serif' }}>
            <b>Episodes watched</b>
        </Typography>

        {seasons.map((season) => (
            <Accordion key={season.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 600 }}>
                        Season {season.season_number}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {episodes
                        .filter((episode) => episode.season__id === season.id)
                        .sort((a, b) => new Date(a.last_watched_at).getTime() - new Date(b.last_watched_at).getTime())
                        .map((episode) => (
                            <Card key={episode.id} sx={{ display: "flex", marginBottom: 2 }}>
                                <Avatar
                                    variant="square"
                                    src={episode.image_url}
                                    alt={episode.title}
                                    sx={{ width: 150, height: 150 }}
                                />
                                <CardContent sx={{ flex: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Episode {episode.episode_number}: {episode.title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "gray", marginBottom: 1 }}>
                                        {episode.overview}
                                    </Typography>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            <GradeIcon sx={{ mb: -1 }} /> {episode.rating.toFixed(2)}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            Progress: {episode.progress}%
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            <EventIcon sx={{ mb: -1 }} />
                                            {new Date(episode.last_watched_at).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                </AccordionDetails>
            </Accordion>
        ))}
    </Box>
); 