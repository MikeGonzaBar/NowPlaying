import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Container, Box, Typography, TextField, Button, Paper } from '@mui/material';
import nowPlayingIcon from '../../assets/now-playing-icon.png';
import { getApiUrl, API_CONFIG } from '../../config/api';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { authenticated, login } = useAuth();

    // Redirect if already authenticated
    useEffect(() => {
        if (authenticated) {
            navigate('/');
        }
    }, [authenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!isLogin && formData.password !== formData.password2) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const endpoint = isLogin
                ? getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/login/`)
                : getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/register/`);

            const payload = isLogin
                ? {
                    username: formData.username,
                    password: formData.password
                }
                : {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    password2: formData.password2
                };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific error messages from the API
                if (data.detail) {
                    throw new Error(data.detail);
                } else if (data.username) {
                    throw new Error(data.username[0]);
                } else if (data.email) {
                    throw new Error(data.email[0]);
                } else if (data.password) {
                    throw new Error(data.password[0]);
                } else if (data.password2) {
                    throw new Error(data.password2[0]);
                } else if (data.non_field_errors) {
                    throw new Error(data.non_field_errors[0]);
                } else {
                    throw new Error(isLogin ? 'Login failed' : 'Registration failed');
                }
            }

            // Use the login function from the auth hook
            login(data.access, data.refresh);

            // Redirect to landing page
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
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
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
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
                    )}

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
                            name="password2"
                            placeholder="Confirm Password"
                            value={formData.password2}
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
                        disabled={isLoading}
                        sx={{
                            mt: 2,
                            py: 1.5,
                            background: 'linear-gradient(45deg, #00a8cc 0%, #0097b2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #0097b2 0%, #008ba3 100%)',
                                transform: 'translateY(-2px)',
                            },
                            '&:disabled': {
                                background: 'rgba(255, 255, 255, 0.12)',
                                color: 'rgba(255, 255, 255, 0.3)',
                            },
                            transition: 'transform 0.2s ease',
                        }}
                    >
                        {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
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