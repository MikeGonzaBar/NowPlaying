import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { getApiUrl, API_CONFIG } from "../../config/api";

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
  password2?: string;
}

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    "& fieldset": {
      borderColor: "rgba(255, 255, 255, 0.23)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255, 255, 255, 0.5)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#00a8cc",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.7)",
  },
};

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { authenticated, login } = useAuth();

  useEffect(() => {
    if (!isLogin || !sessionEnded) return;
    const authFailure = sessionStorage.getItem("auth_failure") === "true";
    if (authFailure) {
      setSessionEnded(true);
      sessionStorage.removeItem("auth_failure");
    }
  }, [isLogin, sessionEnded]);

  useEffect(() => {
    if (authenticated) {
      navigate("/");
    }
  }, [authenticated, navigate]);

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    setError("");
    setFieldErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (e.target.name && fieldErrors[e.target.name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!formData.username.trim()) {
      errors.username = "Enter your username.";
    }
    if (!isLogin) {
      if (!formData.email.trim()) {
        errors.email = "Enter your email address.";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = "Enter a valid email address.";
      }
      if (formData.password.length < 8) {
        errors.password = "Use at least 8 characters.";
      }
      if (formData.password2 !== formData.password) {
        errors.password2 = "Passwords do not match.";
      }
    } else if (!formData.password) {
      errors.password = "Enter your password.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) {
      return;
    }
    setIsLoading(true);

    try {
      const endpoint = isLogin
        ? getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/login/`)
        : getApiUrl(`${API_CONFIG.USERS_ENDPOINT}/register/`);

      const payload = isLogin
        ? {
            username: formData.username,
            password: formData.password,
          }
        : {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            password2: formData.password2,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
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
          throw new Error(isLogin ? "Login failed" : "Registration failed");
        }
      }

      login(data.access, data.refresh);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container
      maxWidth="md"
      sx={{
        textAlign: "center",
        pt: { xs: 3, md: 5 },
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        backgroundColor: "#0c0c0f",
      }}
    >
      <Box
        component="img"
        src={"/nowPlaying.svg"}
        alt="Now Playing icon"
        sx={{
          width: { xs: 140, md: 170 },
          height: { xs: 140, md: 170 },
          mb: 1.5,
        }}
      />

      <Typography
        variant="h3"
        sx={{
          color: "#fff",
          fontWeight: 800,
          fontSize: "clamp(26px, 4vw, 34px)",
        }}
      >
        Now Playing
      </Typography>
      <Typography sx={{ color: "#a1a1aa", mb: 3, maxWidth: 420 }}>
        Your games, movies, and music — tracked in one place.
      </Typography>

      <Paper
        sx={{
          p: { xs: 2.5, sm: 4 },
          maxWidth: 400,
          width: "100%",
          backgroundColor: "#18181b",
          borderRadius: 2,
          border: "1px solid #27272a",
          textAlign: "left",
        }}
      >
        <Typography variant="h5" sx={{ color: "#fff", mb: 2, fontWeight: 700 }}>
          {isLogin ? "Sign in" : "Create account"}
        </Typography>

        {sessionEnded && isLogin && (
          <Alert
            severity="warning"
            role="status"
            sx={{
              mb: 2,
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              color: "#fbbf24",
              "& .MuiAlert-icon": { color: "#fbbf24" },
            }}
          >
            Your session ended for security. Sign in to continue.
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            role="alert"
            sx={{
              mb: 2,
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#fca5a5",
              "& .MuiAlert-icon": { color: "#fca5a5" },
            }}
          >
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            value={formData.username}
            onChange={handleInputChange}
            error={!!fieldErrors.username}
            helperText={fieldErrors.username ?? " "}
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            inputProps={{
              "aria-describedby": fieldErrors.username
                ? "auth-username-error"
                : undefined,
            }}
            sx={fieldSx}
          />

          {!isLogin && (
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleInputChange}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email ?? " "}
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                "aria-describedby": fieldErrors.email
                  ? "auth-email-error"
                  : undefined,
              }}
              sx={fieldSx}
            />
          )}

          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={formData.password}
            onChange={handleInputChange}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password ?? " "}
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            inputProps={{
              "aria-describedby": fieldErrors.password
                ? "auth-password-error"
                : undefined,
            }}
            sx={fieldSx}
          />

          {!isLogin && (
            <>
              <TextField
                label="Confirm password"
                type="password"
                name="password2"
                autoComplete="new-password"
                value={formData.password2}
                onChange={handleInputChange}
                error={!!fieldErrors.password2}
                helperText={fieldErrors.password2 ?? " "}
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  "aria-describedby": fieldErrors.password2
                    ? "auth-password2-error"
                    : undefined,
                }}
                sx={fieldSx}
              />
              <Typography
                variant="caption"
                sx={{ color: "rgba(255, 255, 255, 0.55)", mt: -0.5 }}
              >
                Password: at least 8 characters. Your credentials only connect
                your own services and are never shared publicly.
              </Typography>
            </>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isLoading}
            sx={{
              mt: 1,
              py: 1.5,
              backgroundColor: "#00a8cc",
              color: "#0e1518",
              fontWeight: 700,
              "&:hover": {
                backgroundColor: "#0097b2",
              },
              "&:disabled": {
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                color: "rgba(255, 255, 255, 0.3)",
              },
            }}
          >
            {isLoading
              ? "Please wait…"
              : isLogin
                ? "Sign in"
                : "Create account"}
          </Button>

          <Typography sx={{ color: "#a1a1aa", mt: 1, textAlign: "center" }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <Button
              onClick={switchMode}
              sx={{
                color: "#00a8cc",
                ml: 1,
                textTransform: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {isLogin ? "Create account" : "Sign in"}
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthPage;
