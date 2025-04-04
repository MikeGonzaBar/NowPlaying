import React, { useEffect, useState } from 'react';
import { Box, Typography, Divider, Card, List } from '@mui/material';
interface NewsSectionProps {
    gameName: string;
}

const NewsSection: React.FC<NewsSectionProps> = ({ gameName }) => {
    const [newsItems, setNewsItems] = useState<any[]>([]);

    const fetchNews = async () => {
        try {
            const apiKey = import.meta.env.VITE_REACT_APP_NEWS_API_KEY;
            const today = new Date();
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(today.getMonth() - 1);
            const fromDate = oneMonthAgo.toISOString().split('T')[0];
            const userLanguage = navigator.language.split('-')[0];

            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
                gameName
            )}&from=${fromDate}&sortBy=publishedAt&language=${userLanguage}&apiKey=${apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'ok') {
                setNewsItems(data.articles);
            } else {
                console.error('Error fetching news:', data);
                return [];
            }
        } catch (error) {
            console.error('Error fetching news:', error);
            return [];
        }
    }
    useEffect(() => {
        fetchNews();
    }, []);
    return (
        <Box>

            <Typography variant="h6" sx={{ mb: 1 }}>
                <b>News about the game </b>
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {newsItems.length > 0 ? (
                <List>
                    {newsItems.map((news, index) => (
                        <Card
                            key={index}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                mb: 2,
                                boxShadow: 3,
                                cursor: 'pointer',
                                textDecoration: 'none',
                                '&:hover': { boxShadow: 6 },
                            }}
                            onClick={() => window.open(news.url, '_blank')}
                        >
                            {news.urlToImage && (
                                <Box
                                    component="img"
                                    src={news.urlToImage}
                                    alt={news.title}
                                    sx={{
                                        width: '100%',
                                        height: 150,
                                        objectFit: 'cover',
                                        borderTopLeftRadius: '4px',
                                        borderTopRightRadius: '4px',
                                    }}
                                />
                            )}
                            <Box sx={{ padding: 2 }}>
                                <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', mb: 1 }}>
                                    {news.description || 'No description available.'}
                                </Typography>

                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontFamily: 'Inter, sans-serif',
                                        fontWeight: 'bold',
                                        textAlign: 'right',
                                        color: 'text.secondary',
                                    }}
                                >
                                    {news.source?.name || 'Unknown Source'}
                                </Typography>
                            </Box>
                        </Card>
                    ))}
                </List>
            ) : (
                <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', color: 'text.secondary', mt: 2 }}>
                    No news at the moment.
                </Typography>
            )}
        </Box>
    );
};
export default NewsSection;