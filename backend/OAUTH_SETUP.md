# SafeRound OAuth Configuration

## Overview

SafeRound uses Better Auth for OAuth provider support. The OAuth callback routes are automatically handled by the Better Auth framework and do not require custom implementation.

## OAuth Flow

### 1. User Initiates Sign-In
The frontend sends a POST request to `/api/auth/sign-in/social` with provider info:
```json
{
  "provider": "apple" | "google",
  "redirect_to": "https://yourapp.com/dashboard"
}
```

### 2. OAuth Callback
The OAuth provider redirects to `/api/auth/oauth-callback/{provider}?code=...&state=...`

Better Auth automatically:
- Validates the authorization code with the provider
- Exchanges the code for user information
- Creates or updates the user in the database
- Generates a session token
- Redirects to the `redirect_to` parameter with the session

### 3. Session Established
The session token is returned and the user is authenticated.

## Debugging OAuth Issues

### Check Service Status
```bash
# Verify authentication service is running
curl http://localhost:3000/api/auth/health

# Get OAuth configuration details
curl http://localhost:3000/api/auth/status

# Full debug information
curl http://localhost:3000/api/auth/debug
```

## Common Issues & Solutions

### 500 Error on OAuth Callback

**Symptom**: `GET /api/auth/oauth-callback/apple?code=...` returns 500 error

**Root Causes**:

1. **Missing Environment Variables**
   - Google OAuth needs: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - Apple OAuth needs: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`

   **Solution**: Ensure all required environment variables are set and accessible.

2. **Database Connection Issue**
   - OAuth callback requires database access to create/update sessions
   - Session creation requires `user`, `session`, and `account` tables

   **Solution**: Verify database is running and migrations are applied.

3. **Invalid State Parameter**
   - OAuth state parameter validation failed

   **Solution**: Ensure the same origin is making both the initial request and handling the callback.

4. **Trusted Origins Mismatch**
   - Frontend origin doesn't match `trustedOrigins` configuration

   **Solution**: Check index.ts for origin restrictions (currently allows all origins by default).

## Logging

All OAuth requests are logged with full context:

**Request Logging**:
```
[INFO] Auth request received
  method: GET
  path: /api/auth/oauth-callback/apple
  headers: {
    origin: "https://yourapp.com",
    referer: "https://yourapp.com/login",
    userAgent: "Mozilla/5.0..."
  }
  query: {
    code: "[REDACTED]",  // Sensitive data is redacted
    state: "state_value",
    redirect_to: "https://yourapp.com/dashboard"
  }
```

**Response Logging**:
```
[INFO] Auth request successful
  method: GET
  path: /api/auth/oauth-callback/apple
  statusCode: 302
```

**Error Logging**:
```
[ERROR] Server error in request
  method: GET
  path: /api/auth/oauth-callback/apple
  statusCode: 500
  errorName: "Error",
  errorCode: "..."
  query: { code: "[REDACTED]", state: "..." }
```

## OAuth Provider Configuration

### Google OAuth
- Uses proxy by default (no configuration needed)
- Optional: Set custom credentials via `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Callback URL: `/api/auth/oauth-callback/google`

### Apple OAuth
- Uses proxy by default (no configuration needed)
- Optional: Set custom credentials via `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
- Callback URL: `/api/auth/oauth-callback/apple`

### Email/Password Authentication
- Built-in support (no external provider needed)
- Sign up: `POST /api/auth/sign-up/email`
- Sign in: `POST /api/auth/sign-in/email`

## Framework Architecture

Better Auth is configured in `src/index.ts`:

```typescript
app.withAuth({
  // Optional: Restrict trusted origins
  // trustedOrigins: ["https://myapp.com", "https://*.myapp.com"],
});
```

The OAuth callback handler is automatically mounted at `/api/auth/oauth-callback/*` and processes:
1. Authorization code exchange
2. User profile retrieval
3. Session creation
4. Redirect with session token

## Testing OAuth Flow

### Test with cURL (Replace values with actual ones)

```bash
# 1. Check OAuth is working
curl http://localhost:3000/api/auth/status

# 2. Initiate sign-in (frontend would do this)
curl -X POST http://localhost:3000/api/auth/sign-in/social \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "redirect_to": "http://localhost:3000/dashboard"
  }'

# 3. The response includes the OAuth provider URL to redirect to
# 4. After user approves, OAuth provider redirects to:
#    /api/auth/oauth-callback/google?code=AUTH_CODE&state=STATE
# 5. Better Auth handles the callback automatically
```

## Session Token Handling

After successful OAuth authentication, the session token is:
1. Stored in HTTP-only cookies by the framework
2. Also available in the redirect URL or response
3. Used automatically in subsequent requests via cookies
4. Retrievable via: `GET /api/auth/get-session`

## Environment Variables Reference

```bash
# Optional: Google OAuth custom credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional: Apple OAuth custom credentials
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key

# Optional: Restrict trusted origins (comma-separated)
# TRUSTED_ORIGINS=https://myapp.com,https://app.myapp.com

# Database configuration
DATABASE_URL=postgresql://...

# Node environment
NODE_ENV=production
```

## Better Auth Documentation

For more information, visit: https://better-auth.com/docs

Key endpoints:
- Better Auth Open API spec: `GET /api/auth/open-api/generate-schema`
- Interactive documentation: `GET /api/auth/reference`
