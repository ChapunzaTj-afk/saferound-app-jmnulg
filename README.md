# SafeRound - Community Savings Platform

SafeRound is a non-custodial platform for organizing and tracking informal community savings rounds (ROSCAs / money rounds).

## 🚀 Backend Integration Complete ✅

The backend API has been **fully integrated** into the frontend. All endpoints are now connected and functional.

### Backend URL
```
https://qay72mfwqc3zgjnmvchaxjbdj3jy8gkp.app.specular.dev
```

## 🧪 Complete Testing Guide

### 1. Authentication Flow ✅

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

**Session Persistence:**
- Refresh the page/restart the app
- You should remain logged in
- No redirect loop to auth screen

### 2. Dashboard ✅

**Expected Behavior:**
- Shows global status (healthy/action-needed)
- Displays next important date and action
- Lists all active rounds you're part of
- Shows unread notification count
- "Create Round" and "Join Round" buttons
- Pull to refresh to reload data
- Auto-refreshes every 30 seconds

**API Call:** `GET /api/dashboard`

### 3. Profile Management ✅

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

### 4. Create Round (Multi-Step Wizard) ✅

**Step 1 - Basics:**
1. From Dashboard, tap "Create Round"
2. Enter:
   - Round Name: "Family Savings"
   - Description: "Monthly family savings circle"
   - Currency: USD
   - Contribution Amount: 100
3. Tap "Continue"

**Step 2 - Schedule:**
1. Select Start Type: "Start Immediately" / "Start on Future Date" / "Already in Progress"
2. If future/in-progress, select a date using the date picker
3. Choose Frequency: "Monthly"
4. Enter Number of Members: 10
5. Select Payout Order: "Fixed Order"
6. Tap "Continue"

**Step 3 - Rules:**
1. Set Grace Period: 3 days
2. Enable Conflict Resolution: ON
3. Payment Verification: "Optional" or "Mandatory"
4. Tap "Review"

**Step 4 - Review & Confirm:**
1. Review all details
2. Tap "Create Round"
3. You should be redirected to the round detail page
4. Round should appear in Dashboard

**API Call:** `POST /api/rounds`

### 5. Round Details (Tabbed Interface) ✅

**Overview Tab:**
- Contribution progress bar
- Next important date
- Round details (amount, frequency, start date, members, payout order)
- "Share Invite Link" button (organizer only)

**Contributions Tab:** ✅ NEW
- **Your Contributions:**
  - View all your contributions with status (paid/pending/late)
  - "Mark as Paid" button
  - "Upload Proof" button (if verification enabled)
  - "View Proofs" button (if proofs exist)
- **All Contributions (Organizer Only):**
  - View all members' contributions
  - "Review Proof" button for pending proofs

**Members Tab:**
- List of all members
- Shows role (organizer/member)
- Contribution status
- Payout position
- Join date

**Timeline Tab:**
- Chronological log of all events:
  - Member joined
  - Contribution recorded
  - Proof uploaded
  - Proof approved/rejected
  - Round created/updated

**Settings Tab (Organizer Only):**
- View round settings
- "Archive Round" button

**API Calls:**
- `GET /api/rounds/:id` - Load round details
- `GET /api/rounds/:id/overview` - Load overview data
- `GET /api/rounds/:id/contributions` - Load contributions ✅ NEW
- `GET /api/rounds/:id/members` - Load members
- `GET /api/rounds/:id/timeline` - Load timeline
- `GET /api/rounds/:id/invite-link` - Get invite link
- `DELETE /api/rounds/:id/archive` - Archive round

### 6. Contributions Management ✅ NEW

**Mark Contribution as Paid:**
1. Go to Round Details → Contributions tab
2. Find your pending contribution
3. Tap "Mark as Paid"
4. Status should update to "Paid"
5. Timeline should show new event

**Upload Payment Proof:**
1. Go to Round Details → Contributions tab
2. Find your contribution
3. Tap "Upload Proof"
4. Select proof type: Reference / Image / File
5. Enter reference text (e.g., "Transaction ID: ABC123")
6. Tap "Upload"
7. Proof status should show "pending"

**View Payment Proofs:**
1. Tap "View Proofs" on any contribution with proofs
2. Modal shows all uploaded proofs
3. Each proof shows:
   - Type (reference/image/file)
   - Status (pending/approved/rejected)
   - Upload date
   - Review date (if reviewed)
   - Rejection reason (if rejected)

**Approve/Reject Proof (Organizer Only):**
1. Go to Contributions tab
2. Tap "Review Proof" on a member's contribution
3. View the proof details
4. Tap "Approve" or "Reject"
5. Status updates immediately
6. Member receives notification

**API Calls:**
- `POST /api/contributions/:id/mark-paid` - Mark as paid ✅
- `POST /api/contributions/:id/upload-proof` - Upload proof ✅
- `GET /api/contributions/:id/proofs` - Get proofs ✅
- `POST /api/payment-proofs/:id/approve` - Approve proof ✅
- `POST /api/payment-proofs/:id/reject` - Reject proof ✅

### 7. Join Round via Invite Link ✅

**Join Flow:**
1. From Dashboard, tap "Join Round"
2. Enter invite code (e.g., "ABC12345")
3. Tap "Continue"
4. Round preview loads showing:
   - Round name and description
   - Contribution amount and frequency
   - Start date
   - Number of members (current/total)
   - Organizer name
   - Rules summary
   - Important disclaimer
5. Tap "Join This Round"
6. Success modal appears
7. Redirected to round detail page
8. Round appears in Dashboard

**API Calls:**
- `GET /api/rounds/preview/:code` - Preview round (public, no auth)
- `POST /api/rounds/join/:code` - Join round

### 8. Notifications ✅

**View Notifications:**
1. Tap bell icon in Dashboard header
2. Notifications grouped by category:
   - Action Required (red)
   - Upcoming (yellow)
   - Information (blue)
3. Unread notifications highlighted
4. Shows notification count badge

**Mark as Read:**
1. Tap any notification
2. Notification marked as read
3. If has roundId, navigates to round

**Mark All as Read:**
1. Tap "Mark all as read" button
2. All notifications marked as read

**API Calls:**
- `GET /api/notifications` - Get all notifications
- `POST /api/notifications/:id/mark-read` - Mark one as read
- `POST /api/notifications/mark-all-read` - Mark all as read

### 9. Sign Out ✅

1. Go to Profile tab
2. Tap "Sign Out"
3. Confirm in modal
4. You should be redirected to Sign In screen
5. Local auth state cleared immediately (even if API fails)

## 🔐 Demo Credentials

Create your own account using the Sign Up flow. Example:

**Email:** demo@saferound.com  
**Password:** SafeRound2024!

Or use any email/password combination - the backend will create a new account.

## 📱 Complete Feature List

✅ **Authentication:**
- Email/Password sign up and sign in
- Google OAuth (web)
- Apple OAuth (iOS/web)
- Session persistence across app reloads
- Secure token storage (SecureStore on native, localStorage on web)
- Auth bootstrap prevents redirect loops

✅ **Dashboard:**
- Global status indicator (healthy/action-needed)
- Next important date/action
- Active rounds list with role badges
- Unread notification count
- Pull to refresh
- Auto-refresh every 30 seconds

✅ **Profile Management:**
- View user profile
- Edit name, timezone, currency
- Sign out with confirmation modal

✅ **Round Creation:**
- 4-step wizard (Basics, Schedule, Rules, Review)
- Date selection with DateTimePicker
- Form validation
- Progress indicator
- All round settings configurable
- Immediate redirect to round after creation

✅ **Round Details (5 Tabs):**
- **Overview:** Progress, next dates, round info, invite sharing
- **Contributions:** Track payments, upload proofs, review proofs
- **Members:** View all members with status and roles
- **Timeline:** Chronological event log
- **Settings:** View/edit settings, archive round (organizer only)

✅ **Contributions Management:**
- Mark contributions as paid
- Upload payment proof (reference/image/file)
- View all proofs for a contribution
- Approve/reject proofs (organizer only)
- Real-time status updates

✅ **Member Onboarding:**
- Join via invite code
- Round preview before joining
- Automatic member addition
- Timeline event creation
- Organizer notification

✅ **Notifications:**
- Grouped by category (action/upcoming/info)
- Unread indicators
- Mark as read (single/all)
- Navigate to related round
- Badge count in dashboard

✅ **Timeline:**
- All major events logged
- User attribution
- Timestamps
- Event-specific icons

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
- Loading states for all async operations

### Date Handling

- All dates stored in ISO 8601 format
- Timezone-aware date calculations
- User-friendly date formatting
- DateTimePicker for date selection
- Support for past, present, and future dates

## 🎯 Testing Checklist

### Authentication
- [ ] Sign up with new account
- [ ] Sign in with existing account
- [ ] OAuth flow (web only)
- [ ] Session persists on reload
- [ ] Sign out clears session

### Dashboard
- [ ] Loads on first sign in
- [ ] Shows correct status
- [ ] Displays rounds
- [ ] Pull to refresh works
- [ ] Auto-refresh works
- [ ] Notification badge shows count

### Round Creation
- [ ] All 4 steps work
- [ ] Date picker works
- [ ] Form validation works
- [ ] Review shows correct data
- [ ] Round created successfully
- [ ] Redirects to round detail
- [ ] Appears in dashboard

### Round Details
- [ ] All 5 tabs load
- [ ] Overview shows correct data
- [ ] Contributions tab works
- [ ] Members list loads
- [ ] Timeline shows events
- [ ] Settings accessible (organizer)

### Contributions
- [ ] Mark as paid works
- [ ] Upload proof works
- [ ] View proofs works
- [ ] Approve proof works (organizer)
- [ ] Reject proof works (organizer)
- [ ] Status updates correctly

### Join Round
- [ ] Preview loads without auth
- [ ] Join requires auth
- [ ] Success modal appears
- [ ] Round appears in dashboard
- [ ] Timeline event created

### Notifications
- [ ] List loads
- [ ] Grouped correctly
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Navigation works
- [ ] Badge updates

### Profile
- [ ] Profile loads
- [ ] Edit works
- [ ] Save persists changes
- [ ] Sign out works

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

## 📝 Notes

- **File Upload:** Image/file upload UI is present but uses placeholder URLs. Implement actual file upload using `expo-image-picker` if needed.
- **Push Notifications:** In-app notifications work. Push notifications require additional setup with Expo Notifications.
- **Payout Management:** Payout visibility is shown in overview but detailed payout management UI can be added.

---

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.
