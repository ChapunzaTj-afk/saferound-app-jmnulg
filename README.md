# SafeRound - Community Savings Platform

SafeRound is a non-custodial platform for organizing and tracking informal community savings rounds (ROSCAs / money rounds).

## 🚀 Backend Integration Complete

The backend API has been successfully integrated into the frontend. All endpoints are now connected and functional.

### Backend URL
```
https://qay72mfwqc3zgjnmvchaxjbdj3jy8gkp.app.specular.dev
```

## 🧪 Testing Guide

### 1. Authentication Flow

**Sign Up:**
1. Open the app - you'll see the Sign In screen
2. Tap "Don't have an account? Sign Up"
3. Enter:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
4. Tap "Sign Up"
5. You should be redirected to the Dashboard

**Sign In:**
1. If already signed up, enter your credentials
2. Tap "Sign In"
3. You should be redirected to the Dashboard

**OAuth (Web Only):**
1. Tap "Continue with Google" or "Continue with Apple"
2. A popup will open for authentication
3. Complete the OAuth flow
4. You'll be redirected back to the Dashboard

### 2. Dashboard

**Expected Behavior:**
- Shows global status (healthy/action-needed)
- Displays next important date and action
- Lists all active rounds you're part of
- Shows "Create Round" and "Join Round" buttons
- Pull to refresh to reload data

**API Call:** `GET /api/dashboard`

### 3. Profile Management

**View Profile:**
1. Tap the "Profile" tab
2. Your profile information should load
3. Shows: Name, Email, Timezone, Preferred Currency

**Edit Profile:**
1. Tap "Edit Profile"
2. Modify Name, Timezone, or Currency
3. Tap "Save"
4. Changes should be persisted

**API Calls:**
- `GET /api/users/me` - Load profile
- `PUT /api/users/me` - Save changes

### 4. Create Round (Multi-Step Wizard)

**Step 1 - Basics:**
1. From Dashboard, tap "Create Round"
2. Enter:
   - Round Name: "Family Savings"
   - Description: "Monthly family savings circle"
   - Currency: USD
   - Contribution Amount: 100
3. Tap "Continue"

**Step 2 - Schedule:**
1. Select Start Type: "Start Immediately"
2. Choose Frequency: "Monthly"
3. Enter Number of Members: 10
4. Select Payout Order: "Fixed Order"
5. Tap "Continue"

**Step 3 - Rules:**
1. Set Grace Period: 3 days
2. Enable Conflict Resolution: ON
3. Payment Verification: "Optional"
4. Tap "Review"

**Step 4 - Review & Confirm:**
1. Review all details
2. Tap "Create Round"
3. You should be redirected back to Dashboard
4. New round should appear in your rounds list

**API Call:** `POST /api/rounds`

### 5. Round Details

**View Round:**
1. From Dashboard, tap on any round card
2. Round details should load showing:
   - Round name and status
   - Contribution details
   - Number of members
   - Payout order
   - Grace period
   - Payment verification setting
   - List of members

**Delete Round (Organizer Only):**
1. If you're the organizer, you'll see "Delete Round" button
2. Tap "Delete Round"
3. Confirm deletion in modal
4. Round should be deleted and you'll return to Dashboard

**API Calls:**
- `GET /api/rounds/:id` - Load round details
- `GET /api/rounds/:id/members` - Load members
- `DELETE /api/rounds/:id` - Delete round

### 6. Sign Out

1. Go to Profile tab
2. Tap "Sign Out"
3. Confirm in modal
4. You should be redirected to Sign In screen
5. Local auth state should be cleared immediately

## 🔐 Demo Credentials

Create your own account using the Sign Up flow. Example:

**Email:** demo@saferound.com  
**Password:** SafeRound2024!

## 📱 Key Features Implemented

✅ **Authentication:**
- Email/Password sign up and sign in
- Google OAuth (web)
- Apple OAuth (iOS/web)
- Session persistence across app reloads
- Secure token storage (SecureStore on native, localStorage on web)

✅ **Dashboard:**
- Global status indicator
- Next important date/action
- Active rounds list with role badges
- Pull to refresh

✅ **Profile Management:**
- View user profile
- Edit name, timezone, currency
- Sign out with confirmation

✅ **Round Creation:**
- 4-step wizard (Basics, Schedule, Rules, Review)
- Form validation
- Progress indicator
- All round settings configurable

✅ **Round Details:**
- Full round information
- Members list with roles
- Delete round (organizer only)
- Confirmation modals

## 🛠️ Technical Implementation

### Architecture Decisions

1. **No Raw Fetch Rule:** All API calls use the centralized `utils/api.ts` wrapper
2. **Auth Bootstrap:** Root layout implements proper auth flow to prevent redirect loops
3. **No Alert() Rule:** Custom Modal components replace Alert.alert() for web compatibility
4. **Session Persistence:** Auth state is checked on app load and persisted across reloads

### API Integration

All endpoints are integrated using the authenticated API helpers:
- `authenticatedGet()` - GET requests with auth token
- `authenticatedPost()` - POST requests with auth token
- `authenticatedPut()` - PUT requests with auth token
- `authenticatedDelete()` - DELETE requests with auth token

### Error Handling

- All API calls wrapped in try-catch blocks
- Errors logged to console with `[Component]` prefix
- Fallback states for failed API calls
- User-friendly error messages in modals

## 🐛 Known Issues & Limitations

1. **Join Round:** Not yet implemented (button exists but no functionality)
2. **Payment Proof Upload:** Endpoint exists but UI not implemented
3. **Contributions Tracking:** Not yet implemented
4. **Payouts Management:** Not yet implemented

## 🚀 Get Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open in:
   - Web: Press `w`
   - iOS: Press `i`
   - Android: Press `a`

---

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.
