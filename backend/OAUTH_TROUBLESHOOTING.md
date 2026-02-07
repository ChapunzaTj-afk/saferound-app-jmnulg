# OAuth Troubleshooting Guide

## Quick Diagnostics

Run these commands to verify OAuth setup:

```bash
# 1. Check if auth service is running
curl http://localhost:3000/api/auth/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-01-15T10:30:00Z",
#   "message": "Authentication service is operational",
#   "environment": {
#     "nodeEnv": "production",
#     "hasGoogleCredentials": true/false,
#     "hasAppleCredentials": true/false
#   }
# }

# 2. Check OAuth provider configuration
curl http://localhost:3000/api/auth/status

# 3. Get full debug information
curl http://localhost:3000/api/auth/debug
```

## 500 Errors on OAuth Callback

### Symptom
```
GET /api/auth/oauth-callback/apple?code=XXX&state=YYY
Response: 500 Internal Server Error
```

### Checklist

#### 1. ✅ Database Connection
**Check**: Is the database running and accessible?

```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection (if using Neon)
curl -I https://your-neon-database.com
```

**Solution**: Ensure `DATABASE_URL` environment variable is correctly set:
```bash
# For Neon (production)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.neon.tech/saferound

# For PGlite (local development)
# DATABASE_URL should not be set for PGlite
```

#### 2. ✅ Database Tables Exist
**Check**: Are the auth tables created?

The required tables are:
- `user` - User accounts
- `session` - User sessions
- `account` - OAuth account links
- `verification` - Email verification tokens

**Solution**: Run database migrations:
```bash
npm run db:push  # or however migrations are applied in your setup
```

#### 3. ✅ OAuth Provider Credentials
**Check**: Are credentials correct for the provider?

**For Google OAuth**:
```bash
# These should be set if using custom credentials
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# Or the proxy will be used (no credentials needed)
```

**For Apple OAuth**:
```bash
# These should be set if using custom credentials
echo $APPLE_TEAM_ID
echo $APPLE_KEY_ID
echo $APPLE_PRIVATE_KEY

# Or the proxy will be used (no credentials needed)
```

**Solution**:
- If using proxy (recommended): No credentials needed, ensure they're not conflicting
- If using custom credentials: Verify they're set correctly in your environment

#### 4. ✅ Session Table Structure
**Check**: Is the session table properly configured?

Required columns in `session` table:
- `id` (text, primary key)
- `expiresAt` (timestamp)
- `token` (text, unique)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `ipAddress` (text, nullable)
- `userAgent` (text, nullable)
- `userId` (text, foreign key to user)

**Solution**: Verify schema in `src/db/auth-schema.ts`

#### 5. ✅ Origin/CORS Configuration
**Check**: Is the request coming from an allowed origin?

By default, all origins are allowed (`["*"]`). If restricted, check:

```typescript
// In src/index.ts
app.withAuth({
  trustedOrigins: ["https://myapp.com"],  // Only these origins allowed
});
```

**Check logs**:
```bash
# Look for request headers in logs
# [INFO] Auth request received
#   headers: {
#     origin: "https://myapp.com",
#     referer: "...",
#   }
```

**Solution**:
- If using custom origins, ensure frontend URL is in `trustedOrigins`
- If you don't restrict origins, comment out the trustedOrigins configuration

## Error Messages & Solutions

### "Invalid state parameter"
**Cause**: State value from OAuth provider doesn't match what we sent

**Solution**:
1. Check that the same origin is initiating and handling the callback
2. Verify state isn't being modified in transit
3. Check browser cookies are enabled (for CSRF token storage)

### "User creation failed"
**Cause**: Error while creating user in database

**Solution**:
1. Check `user` table has correct schema
2. Verify `email` column is unique and not null
3. Check database has capacity (disk space, connection limit)

### "Session creation failed"
**Cause**: Error while creating session

**Solution**:
1. Check `session` table exists and has proper schema
2. Verify `token` column is unique
3. Check foreign key to `user` table is correct

### "Invalid authorization code"
**Cause**: Code from OAuth provider is invalid or expired

**Solution**:
1. Authorization codes expire quickly (usually 10 minutes)
2. Ensure callback is processed immediately after redirect
3. Check clock skew (server time vs provider time)

## Detailed Logging

All OAuth requests are logged. Check logs for detailed information:

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
    code: "[REDACTED]",
    state: "abc123...",
    redirect_to: "https://yourapp.com/dashboard"
  }

[INFO] Auth request successful (on success)
[ERROR] OAuth callback server error (on failure)
  statusCode: 500
  errorName: "Error",
  errorCode: "...",
  stack: "..."
```

## Network & Connectivity

### OAuth Provider Unreachable
**Symptom**: Timeout when exchanging code for token

**Check**: Can the server reach the OAuth provider?

```bash
# For Google
curl -I https://oauth2.googleapis.com/token

# For Apple
curl -I https://appleid.apple.com/auth/token
```

**Solution**: Check firewall/proxy rules, ensure server can make HTTPS requests

## Testing the OAuth Flow Manually

### 1. Start the Flow
```bash
# Frontend would make this request
curl -X POST http://localhost:3000/api/auth/sign-in/social \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "redirect_to": "http://localhost:3000/dashboard"
  }'

# Response includes OAuth provider URL to redirect to
```

### 2. Simulate Provider Redirect (After User Approves)

Use a temporary auth code from the provider:

```bash
# Simulate the callback (use real code from provider)
curl "http://localhost:3000/api/auth/oauth-callback/google?code=REAL_AUTH_CODE&state=REAL_STATE"
```

### 3. Verify Session Created
```bash
# Get the session cookie/token
curl -b "session_token=..." http://localhost:3000/api/users/me
```

## Environment Variable Checklist

```bash
# Required
DATABASE_URL=postgresql://...              # Or unset for PGlite

# Optional (if using custom OAuth credentials)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=...

# Optional (if restricting origins)
TRUSTED_ORIGINS=https://myapp.com

# Application
NODE_ENV=production
```

## Getting Help

When reporting OAuth issues, include:

1. **Error logs** from server with:
   - Timestamp
   - Full error message and stack
   - Request details (method, path, headers)

2. **Configuration check** output from:
   ```bash
   curl http://localhost:3000/api/auth/health
   curl http://localhost:3000/api/auth/status
   ```

3. **Database status**:
   - Is database running?
   - Are migration tables present?
   - Can you query the `user` table?

4. **Environment variables**:
   - Is DATABASE_URL set correctly?
   - If using custom OAuth, are credentials set?

5. **Browser console errors**:
   - Any CORS errors?
   - Network errors in dev tools?

## OAuth Proxy vs Custom Credentials

### Using OAuth Proxy (Recommended)
- ✅ No credentials needed
- ✅ Simplified setup
- ✅ Automatic configuration
- ❌ Less control

```typescript
app.withAuth();  // Uses proxy by default
```

### Using Custom Credentials
- ✅ Full control
- ✅ Custom branding
- ❌ More configuration needed
- ❌ Credentials must be kept secure

```typescript
app.withAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    apple: {
      teamId: process.env.APPLE_TEAM_ID!,
      keyId: process.env.APPLE_KEY_ID!,
      privateKey: process.env.APPLE_PRIVATE_KEY!,
    },
  },
});
```

## More Resources

- Better Auth Documentation: https://better-auth.com/docs
- OAuth 2.0 Specification: https://tools.ietf.org/html/rfc6749
- Apple Sign In: https://developer.apple.com/sign-in-with-apple/
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
