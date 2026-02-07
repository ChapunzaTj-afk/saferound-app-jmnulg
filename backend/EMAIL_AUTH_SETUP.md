# Email Authentication Setup - SafeRound

## Overview

SafeRound now includes complete email/password authentication with validation and GitHub OAuth removal.

## Features Implemented

### ✅ Email Sign-Up & Sign-In Validation
- **Email format validation** - RFC 5322 simplified pattern matching
- **Password requirements** - Minimum 6 characters
- **Email uniqueness check** - Prevents duplicate accounts
- **Optional name field** - Defaults to email prefix if not provided
- **Proper error messages** - Clear validation feedback

### ✅ GitHub OAuth Removal
- GitHub provider completely disabled
- Only Google and Apple OAuth enabled
- Configuration supports custom credentials or proxy

### ✅ Authentication Endpoints

#### Email/Password Authentication
```
POST /api/auth/sign-up/email
  Request: {
    email: string (required, validated)
    password: string (required, min 6 chars)
    name?: string (optional, used as display name)
  }
  Response: { user: { ... }, session: { ... } }
  Errors:
    400: Email is required
    400: Invalid email format
    400: Password is required
    400: Password must be at least 6 characters
    409: Email already exists

POST /api/auth/sign-in/email
  Request: {
    email: string (required, validated)
    password: string (required)
  }
  Response: { user: { ... }, session: { ... } }
  Errors:
    400: Email is required
    400: Invalid email format
    400: Password is required
    401: Invalid email or password
```

#### OAuth Authentication
```
POST /api/auth/sign-in/social
  Request: {
    provider: "google" | "apple"
    redirect_to?: string
  }

GET /api/auth/oauth-callback/google?code=...&state=...
GET /api/auth/oauth-callback/apple?code=...&state=...
```

#### Session Management
```
GET /api/auth/get-session - Get current session
POST /api/auth/sign-out - Sign out
GET /api/auth/ok - Health check
```

## Validation Rules

### Email Validation
- Must be in valid email format (user@domain.com)
- Case-insensitive (normalized to lowercase)
- Whitespace trimmed
- Must be unique in database

### Password Validation
- Minimum 6 characters
- No maximum length enforced
- All characters allowed
- Case-sensitive

### Name Validation
- Optional field
- If not provided, email prefix is used as default
- Trimmed of whitespace

## OAuth Provider Configuration

### Enabled Providers
- **Google** - Via OAuth proxy or custom credentials
- **Apple** - Via OAuth proxy or custom credentials

### Disabled Providers
- **GitHub** - Explicitly disabled, not available

## Files Modified

### src/index.ts
- Added `registerEmailAuthRoutes` import
- Configured OAuth with only Google and Apple
- GitHub provider explicitly not included
- Email authentication routes registered

### src/routes/emailAuth.ts (NEW)
- Email validation with regex pattern
- Password validation (minimum 6 characters)
- Database email uniqueness checks
- Validation hooks for sign-up and sign-in
- Comprehensive error handling
- Request/response logging

### src/routes/auth.ts (UPDATED)
- Updated status endpoint showing GitHub disabled
- Added email/password endpoint documentation
- Improved OAuth provider information display

## Error Messages

### Sign-Up Errors
- `Email is required` - Empty email field (400)
- `Invalid email format` - Malformed email (400)
- `Password is required` - Empty password field (400)
- `Password must be at least 6 characters` - Short password (400)
- `Email already exists` - Duplicate email (409)

### Sign-In Errors
- `Email is required` - Empty email field (400)
- `Invalid email format` - Malformed email (400)
- `Password is required` - Empty password field (400)
- `Invalid email or password` - Wrong credentials (401)

## Testing Email Authentication

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Sign In
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Check Auth Status
```bash
curl http://localhost:3000/api/auth/status
```

Should show GitHub disabled:
```json
{
  "providers": {
    "google": { "enabled": true },
    "apple": { "enabled": true },
    "github": { "enabled": false, "note": "GitHub OAuth provider is disabled" },
    "emailPassword": { "enabled": true }
  }
}
```

## Database

User accounts are stored in the Better Auth schema with fields:
- `id` - Unique user identifier
- `email` - User email (unique)
- `name` - Display name
- `emailVerified` - Email verification status
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

Passwords are hashed and stored securely by Better Auth.

## Security

✅ Implemented security features:
- Email format validation
- Password minimum length enforcement
- Email uniqueness verification
- Password hashing by Better Auth
- No sensitive data logged
- Validation hooks intercept requests before processing

## Next Steps

1. Run database migrations
2. Test email sign-up with validation
3. Test email sign-in
4. Verify GitHub OAuth is not available
5. Test Google and Apple OAuth still work
