# Email Authentication - Quick Reference

## Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John"
  }'
```

**Success (200)**: Returns user object and session token

**Errors**:
- `400` - Email is required
- `400` - Invalid email format
- `400` - Password is required
- `400` - Password must be at least 6 characters
- `409` - Email already exists

## Sign In
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Success (200)**: Returns user object and session token

**Errors**:
- `400` - Email is required
- `400` - Invalid email format
- `400` - Password is required
- `401` - Invalid email or password

## Validation Rules

### Email
- Format: `user@domain.com`
- Normalized: lowercase, trimmed
- Unique: no duplicates allowed

### Password
- Minimum: 6 characters
- Maximum: unlimited
- Allowed: all characters
- Required: yes

### Name
- Required: no
- Default: email prefix (e.g., "user" from "user@example.com")
- Type: string

## OAuth Providers

### Enabled
- ✅ Google - `/api/auth/sign-in/social?provider=google`
- ✅ Apple - `/api/auth/sign-in/social?provider=apple`

### Disabled
- ❌ GitHub - Not available

## Check Status
```bash
curl http://localhost:3000/api/auth/status
```

Shows all enabled/disabled providers and endpoints.

## Implementation Details

| Feature | Status |
|---------|--------|
| Email validation | ✅ Enabled |
| Password validation | ✅ Enabled |
| Email uniqueness | ✅ Enabled |
| GitHub OAuth | ❌ Disabled |
| Google OAuth | ✅ Enabled |
| Apple OAuth | ✅ Enabled |
| Session management | ✅ Enabled |
| Error messages | ✅ Enabled |
| Request logging | ✅ Enabled |

## Files
- `src/routes/emailAuth.ts` - Validation logic
- `src/index.ts` - OAuth configuration
- `src/routes/auth.ts` - Status endpoints

## Database
- Users stored in `user` table
- Passwords hashed and stored securely
- Sessions managed by Better Auth

---
See `EMAIL_AUTH_IMPLEMENTATION.md` for detailed documentation.
