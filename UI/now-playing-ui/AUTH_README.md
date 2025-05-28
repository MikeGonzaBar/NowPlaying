# JWT Authentication Implementation

This document describes the JWT authentication system implemented in the Now Playing UI.

## Overview

The application uses JWT (JSON Web Tokens) for authentication with the following features:

- **Access Token**: Short-lived token for API requests
- **Refresh Token**: Long-lived token for obtaining new access tokens
- **Automatic Token Refresh**: Seamlessly refreshes expired tokens
- **Protected Routes**: Redirects unauthenticated users to login page

## Key Components

### 1. Authentication Utilities (`src/utils/auth.ts`)

- `getAuthToken()`: Retrieves access token from localStorage
- `getRefreshToken()`: Retrieves refresh token from localStorage
- `setAuthToken(token)`: Stores access token
- `removeAuthToken()`: Clears all tokens
- `isAuthenticated()`: Checks if user has valid token
- `refreshAuthToken()`: Refreshes expired access token
- `authenticatedFetch()`: Wrapper for API calls with automatic token refresh

### 2. Authentication Hook (`src/hooks/useAuth.ts`)

Provides authentication state management:

- `authenticated`: Boolean indicating auth status
- `isLoading`: Loading state during auth checks
- `login(token, refreshToken)`: Login function
- `logout()`: Logout function with redirect
- `checkAuthStatus()`: Manual auth status check

### 3. Protected Routes (`src/App.tsx`)

The `ProtectedRoute` component:

- Checks authentication status on mount
- Attempts token refresh if needed
- Shows loading state during checks
- Redirects to `/auth` if unauthenticated

### 4. Authentication Page (`src/pages/auth/AuthPage.tsx`)

Unified login/registration page:

- Toggle between login and registration modes
- Form validation
- Error handling
- Automatic redirect after successful auth

## API Endpoints

The authentication system connects to these backend endpoints:

- `POST /users/login/` - User login
  - Required fields: `username`, `password`
- `POST /users/register/` - User registration
  - Required fields: `username`, `email`, `password`, `password2`
- `POST /users/token/refresh/` - Token refresh

## Configuration

API base URL can be configured via environment variable:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Usage

### Login/Registration

Users are automatically redirected to `/auth` when not authenticated. The page provides both login and registration functionality.

**Login Form Fields:**

- Username
- Password

**Registration Form Fields:**

- Username
- Email (only shown during registration)
- Password
- Confirm Password (only shown during registration)

### Logout

Use the logout button on any protected page or call the `logout()` function from the `useAuth` hook.

### Making Authenticated API Calls

Use the `authenticatedFetch()` utility for API calls that require authentication:

```typescript
import { authenticatedFetch } from '../utils/auth';

const response = await authenticatedFetch('/api/some-endpoint', {
  method: 'GET',
});
```

## Security Features

- **Token Expiration**: Access tokens have short lifespans
- **Automatic Refresh**: Expired tokens are refreshed automatically
- **Secure Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
- **Route Protection**: All main routes require authentication
- **Error Handling**: Graceful handling of auth failures

## Development Notes

- The system automatically handles token refresh in the background
- Users are redirected to login if refresh fails
- Loading states prevent UI flicker during auth checks
- Error messages provide clear feedback to users
