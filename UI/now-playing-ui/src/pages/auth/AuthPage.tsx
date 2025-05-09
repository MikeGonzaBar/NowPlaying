import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '../../utils/auth';
import { Container, Box, Typography, TextField, Button, Paper } from '@mui/material';
import nowPlayingIcon from '../../assets/now-playing-icon.png';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isLogin && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            // For development, we'll use a dummy successful response
            // TODO: Replace with actual API call when backend is ready
            const dummyResponse = {
                ok: true,
                json: () => Promise.resolve({
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
                })
            };

            const data = await dummyResponse.json();

            if (!dummyResponse.ok) {
                throw new Error('Authentication failed');
            }

            // Store the token
            setAuthToken(data.token);

            // Redirect to landing page
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <Container
            maxWidth="md"
            sx={{
                textAlign: 'center',
                pt: 4,
                alignItems: 'center',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                minWidth: '100vw',
                backgroundColor: '#0E0022',
            }}
        >
            <Box
                component="img"
                src={nowPlayingIcon}
                alt="Now Playing Icon"
                sx={{
                    width: 235,
                    height: 235,
                    mb: 2,
                }}
            />

            <Typography variant="h3" sx={{
                color: '#fff',
                mb: 1,
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 'bold',
            }}>
                Now Playing
            </Typography>

            <Paper
                sx={{
                    p: 4,
                    mt: 4,
                    maxWidth: 400,
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
            >
                <Typography variant="h5" sx={{ color: '#fff', mb: 3, fontFamily: 'Montserrat, sans-serif' }}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </Typography>

                {error && (
                    <Typography sx={{ color: '#ff5757', mb: 2, backgroundColor: 'rgba(255, 87, 87, 0.1)', p: 1, borderRadius: 1 }}>
                        {error}
                    </Typography>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: '#fff',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.23)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#00a8cc',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                            },
                        }}
                    />

                    <TextField
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: '#fff',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.23)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#00a8cc',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                            },
                        }}
                    />

                    {!isLogin && (
                        <TextField
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            required
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                    '& fieldset': {
                                        borderColor: 'rgba(255, 255, 255, 0.23)',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#00a8cc',
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                },
                            }}
                        />
                    )}

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        sx={{
                            mt: 2,
                            py: 1.5,
                            background: 'linear-gradient(45deg, #00a8cc 0%, #0097b2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #0097b2 0%, #008ba3 100%)',
                                transform: 'translateY(-2px)',
                            },
                            transition: 'transform 0.2s ease',
                        }}
                    >
                        {isLogin ? 'Login' : 'Register'}
                    </Button>

                    <Typography sx={{ color: '#b3b3b3', mt: 2 }}>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <Button
                            onClick={() => setIsLogin(!isLogin)}
                            sx={{
                                color: '#00a8cc',
                                ml: 1,
                                '&:hover': {
                                    textDecoration: 'underline',
                                },
                            }}
                        >
                            {isLogin ? 'Register' : 'Login'}
                        </Button>
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default AuthPage; 