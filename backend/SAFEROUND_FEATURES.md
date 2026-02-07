# SafeRound - Comprehensive Feature Implementation

## Overview

SafeRound backend has been extended with comprehensive functionality for member onboarding, contributions tracking, payment proof verification, timeline events, and notifications.

## Database Schema Additions

### 1. Timeline Events Table (`timeline_events`)
Tracks all activities in a round for audit and activity history.

**Columns:**
- `id` (uuid) - Primary key
- `round_id` (uuid) - Foreign key to rounds
- `user_id` (text, nullable) - Foreign key to users (null for system events)
- `event_type` (text) - Event type (member_joined, contribution_recorded, proof_uploaded, proof_approved, proof_rejected, round_created, round_updated, payout_scheduled, payout_completed)
- `event_data` (jsonb, nullable) - Event-specific data
- `created_at` (timestamptz) - Event timestamp

### 2. Payment Proofs Table (`payment_proofs`)
Stores payment proof submissions and verification status.

**Columns:**
- `id` (uuid) - Primary key
- `contribution_id` (uuid) - Foreign key to contributions
- `round_id` (uuid) - Foreign key to rounds
- `user_id` (text) - Foreign key to users (proof uploader)
- `proof_type` (text) - Type: 'image', 'file', or 'reference'
- `proof_url` (text, nullable) - URL to uploaded image/file
- `reference_text` (text, nullable) - Text reference (e.g., transaction ID)
- `status` (text) - Status: 'pending', 'approved', 'rejected'
- `reviewed_by` (text, nullable) - Organizer who reviewed
- `reviewed_at` (timestamptz, nullable) - Review timestamp
- `rejection_reason` (text, nullable) - Reason if rejected
- `created_at` (timestamptz) - Submission timestamp

### 3. Notifications Table (`notifications`)
Stores user notifications with categories and read status.

**Columns:**
- `id` (uuid) - Primary key
- `user_id` (text) - Foreign key to users
- `round_id` (uuid, nullable) - Foreign key to rounds
- `type` (text) - Notification type
- `title` (text) - Notification title
- `message` (text) - Notification message
- `category` (text) - Category: 'action_required', 'upcoming', 'information'
- `read` (boolean) - Read status (default false)
- `created_at` (timestamptz) - Creation timestamp

### 4. Invite Links Table (`invite_links`)
Manages shareable invite codes for rounds.

**Columns:**
- `id` (uuid) - Primary key
- `round_id` (uuid) - Foreign key to rounds
- `code` (text, unique) - Short shareable code (8 characters, URL-safe)
- `created_by` (text) - Organizer user_id
- `expires_at` (timestamptz, nullable) - Expiration time
- `max_uses` (integer, nullable) - Maximum uses (null for unlimited)
- `use_count` (integer) - Current use count (default 0)
- `created_at` (timestamptz) - Creation timestamp

## API Endpoints

### Round Creation & Management

#### POST /api/rounds
Creates a new round with automatic invite link generation.

**Request Body:**
```json
{
  "name": "Q1 Savings Round",
  "description": "Q1 group savings",
  "currency": "USD",
  "contributionAmount": "100",
  "contributionFrequency": "monthly",
  "numberOfMembers": 10,
  "payoutOrder": "fixed",
  "startType": "immediate|future|in-progress",
  "startDate": "2024-01-15T10:30:00Z",
  "gracePeriodDays": 5,
  "conflictResolutionEnabled": true,
  "paymentVerification": "mandatory"
}
```

**Response:**
```json
{
  "id": "round-uuid",
  "name": "Q1 Savings Round",
  "inviteCode": "ABC12345",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Features:**
- Automatically sets `start_date` based on `startType`:
  - `immediate`: Current timestamp
  - `future`: Uses provided `startDate`
  - `in-progress`: Uses provided `startDate`
- Creates organizer as first member
- Generates unique invite code
- Creates `round_created` timeline event

#### PUT /api/rounds/:id/settings
Updates round settings (organizer only).

**Request Body:**
```json
{
  "name": "Updated Round Name",
  "description": "Updated description",
  "gracePeriodDays": 7,
  "paymentVerification": "optional",
  "conflictResolutionEnabled": false
}
```

**Features:**
- Requires organizer role
- Creates `round_updated` timeline event
- Notifies all members of changes

#### DELETE /api/rounds/:id/archive
Archives round (organizer only).

**Features:**
- Changes status to `archived`
- Creates timeline event
- Notifies all members

### Member Onboarding

#### GET /api/rounds/preview/:code
Preview round before joining (public endpoint, no auth required).

**Response:**
```json
{
  "roundId": "uuid",
  "name": "Round Name",
  "description": "Round Description",
  "currency": "USD",
  "contributionAmount": "100",
  "contributionFrequency": "monthly",
  "startDate": "2024-01-15T10:30:00Z",
  "payoutOrder": "fixed",
  "numberOfMembers": 10,
  "currentMemberCount": 5,
  "gracePeriodDays": 5,
  "paymentVerification": "mandatory",
  "organizerName": "John Doe"
}
```

**Features:**
- Validates invite code exists
- Checks expiration
- Checks max uses not reached

#### POST /api/rounds/join/:code
Join round via invite code.

**Response:**
```json
{
  "success": true,
  "roundId": "uuid",
  "round": {
    "id": "uuid",
    "name": "Round Name",
    "status": "active"
  }
}
```

**Features:**
- Validates invite code
- Checks round not full
- Checks user not already member
- Assigns payout position
- Increments use count
- Creates `member_joined` timeline event
- Notifies organizer

#### GET /api/rounds/:id/invite-link
Get invite link for round (organizer only).

**Response:**
```json
{
  "code": "ABC12345",
  "expiresAt": "2024-02-15T10:30:00Z",
  "useCount": 3,
  "maxUses": 20
}
```

### Contributions & Payment Proofs

#### POST /api/contributions/:id/mark-paid
Mark contribution as paid by member.

**Request Body:** {} (empty)

**Features:**
- Requires contribution ownership
- Updates status to `paid`
- Sets `paid_date` to current timestamp
- Creates `contribution_recorded` timeline event

#### GET /api/rounds/:id/contributions
Get all contributions for round.

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "user-id",
    "userName": "John Doe",
    "amount": "100",
    "dueDate": "2024-01-15T10:30:00Z",
    "paidDate": "2024-01-14T10:30:00Z",
    "status": "paid",
    "proofStatus": "approved",
    "createdAt": "2024-01-10T10:30:00Z"
  }
]
```

#### POST /api/contributions/:id/upload-proof
Upload payment proof (image, file, or reference).

**Request Body:**
```json
{
  "proofType": "image|file|reference",
  "proofUrl": "https://storage.example.com/proof.jpg",
  "referenceText": "Transaction ID: TXN123456"
}
```

**Response:**
```json
{
  "success": true,
  "proofId": "uuid"
}
```

**Features:**
- Supports image, file, or text reference
- Creates `payment_proof` record with `pending` status
- Creates `proof_uploaded` timeline event
- Notifies organizer

#### GET /api/contributions/:id/proofs
Get all proofs for a contribution.

**Response:**
```json
[
  {
    "id": "uuid",
    "proofType": "image",
    "proofUrl": "https://storage.example.com/proof.jpg",
    "referenceText": null,
    "status": "approved",
    "reviewedBy": "Jane Smith",
    "reviewedAt": "2024-01-14T15:30:00Z",
    "rejectionReason": null,
    "createdAt": "2024-01-14T10:30:00Z"
  }
]
```

#### POST /api/payment-proofs/:id/approve
Approve payment proof (organizer only).

**Features:**
- Updates proof status to `approved`
- Sets `reviewed_by` and `reviewed_at`
- Updates contribution status to `verified`
- Creates `proof_approved` timeline event
- Notifies member

#### POST /api/payment-proofs/:id/reject
Reject payment proof (organizer only).

**Request Body:**
```json
{
  "reason": "Transaction amount doesn't match"
}
```

**Features:**
- Updates proof status to `rejected`
- Stores rejection reason
- Creates `proof_rejected` timeline event
- Notifies member with reason

### Timeline & Overview

#### GET /api/rounds/:id/timeline
Get chronological timeline events (last 100).

**Response:**
```json
[
  {
    "id": "uuid",
    "eventType": "member_joined",
    "userName": "John Doe",
    "eventData": { "memberName": "John Doe" },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### GET /api/rounds/:id/overview
Get comprehensive round overview.

**Response:**
```json
{
  "roundDetails": {
    "id": "uuid",
    "name": "Q1 Savings Round",
    "currency": "USD",
    "status": "active"
  },
  "contributionProgress": {
    "total": 30,
    "paid": 20,
    "pending": 8,
    "late": 2
  },
  "currentPayoutStatus": {
    "nextPayoutDate": "2024-02-15T10:30:00Z",
    "nextRecipient": "Jane Smith",
    "position": 3
  },
  "nextImportantDate": "2024-02-15T10:30:00Z",
  "nextImportantAction": "Contribution due: USD 100",
  "memberCount": {
    "current": 8,
    "total": 10
  },
  "userRole": "member"
}
```

### Payouts

#### GET /api/rounds/:id/payouts
Get payout schedule for round.

**Response:**
```json
[
  {
    "recipientUserId": "user-id",
    "recipientName": "John Doe",
    "payoutPosition": 3,
    "scheduledDate": "2024-02-15T10:30:00Z",
    "completedDate": null,
    "status": "scheduled",
    "amount": "800"
  }
]
```

**Features:**
- Members see only their own payout
- Organizers see full schedule

### Notifications

#### GET /api/notifications
Get user's notifications grouped by category.

**Response:**
```json
{
  "unreadCount": 3,
  "notifications": {
    "actionRequired": [
      {
        "id": "uuid",
        "roundId": "uuid",
        "roundName": "Q1 Savings Round",
        "type": "contribution_due",
        "title": "Contribution due",
        "message": "Your contribution is due today",
        "category": "action_required",
        "read": false,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "upcoming": [],
    "information": []
  }
}
```

#### POST /api/notifications/:id/mark-read
Mark notification as read.

**Request Body:** {} (empty)

#### POST /api/notifications/mark-all-read
Mark all user's notifications as read.

**Request Body:** {} (empty)

### Dashboard

#### GET /api/dashboard
Get dashboard summary with action items.

**Response:**
```json
{
  "globalStatus": "action-needed|healthy",
  "nextImportantDate": "2024-01-20T10:30:00Z",
  "nextImportantAction": "Contribution due: USD 100",
  "roundsCount": 3,
  "unreadNotificationCount": 2,
  "actionItems": [
    {
      "type": "pending_proofs|overdue_contributions",
      "roundId": "uuid",
      "roundName": "Q1 Savings Round",
      "count": 2
    }
  ],
  "activeRounds": [
    {
      "id": "uuid",
      "name": "Q1 Savings Round",
      "currency": "USD",
      "contributionAmount": "100",
      "numberOfMembers": 10,
      "status": "active",
      "nextImportantDate": "2024-01-20T10:30:00Z",
      "nextImportantAction": "Contribution due: USD 100"
    }
  ]
}
```

## Utility Helpers

### Helper Functions (`src/utils/helpers.ts`)

```typescript
// Generate short URL-safe invite code
generateInviteCode(): string

// Create timeline event
createTimelineEvent(
  app: App,
  roundId: string,
  eventType: string,
  userId?: string,
  eventData?: Record<string, any>
): Promise<void>

// Create single notification
createNotification(
  app: App,
  userId: string,
  type: string,
  title: string,
  message: string,
  category: string,
  roundId?: string
): Promise<void>

// Notify all round members
notifyRoundMembers(
  app: App,
  roundId: string,
  excludeUserId: string | null,
  type: string,
  title: string,
  message: string,
  category: string
): Promise<void>

// Get round member details
getRoundMember(
  app: App,
  roundId: string,
  userId: string
): Promise<RoundMember | undefined>

// Get current member count
getRoundMemberCount(app: App, roundId: string): Promise<number>
```

## Notification Types

**Event-based notifications automatically created:**
- `contribution_due` - When contribution is due
- `payout_upcoming` - When payout is upcoming
- `proof_approved` - When payment proof approved
- `proof_rejected` - When payment proof rejected
- `member_joined` - When new member joins (for organizer)
- `round_updated` - When round settings change

## Timeline Event Types

**Automatically created events:**
- `round_created` - Round created by organizer
- `round_updated` - Round settings updated
- `member_joined` - New member joined via invite
- `contribution_recorded` - Contribution marked as paid
- `proof_uploaded` - Payment proof submitted
- `proof_approved` - Payment proof approved by organizer
- `proof_rejected` - Payment proof rejected by organizer
- `payout_scheduled` - Payout scheduled
- `payout_completed` - Payout completed

## Security & Authorization

**Member-level authorization:**
- Members can mark their own contributions as paid
- Members can upload proofs for their contributions
- Members can view own payouts and timeline
- Members can view round details and contributions

**Organizer-level authorization:**
- Organizers can update round settings
- Organizers can archive rounds
- Organizers can approve/reject payment proofs
- Organizers can view all payouts
- Organizers can remove members

**Public endpoints:**
- GET /api/rounds/preview/:code - Preview before joining

## Timestamp Handling

- All timestamps use ISO 8601 format (e.g., "2024-01-15T10:30:00Z")
- All database timestamps stored with timezone info (timestamptz)
- Automatic timezone conversion via database type
- Client receives ISO 8601 strings for all dates

## Logging

All operations are logged with context:
- Timeline events logged when created
- Notifications logged when created
- All proof reviews logged with reviewer info
- Member joins logged with reason
- Settings changes logged with changed fields

## Testing Endpoints

1. **Create round:**
   ```
   POST /api/rounds
   ```

2. **Get invite code:**
   ```
   GET /api/rounds/:id/invite-link
   ```

3. **Preview round:**
   ```
   GET /api/rounds/preview/:code
   ```

4. **Join round:**
   ```
   POST /api/rounds/join/:code
   ```

5. **View contributions:**
   ```
   GET /api/rounds/:id/contributions
   ```

6. **Upload proof:**
   ```
   POST /api/contributions/:id/upload-proof
   ```

7. **Approve proof (organizer):**
   ```
   POST /api/payment-proofs/:id/approve
   ```

8. **View timeline:**
   ```
   GET /api/rounds/:id/timeline
   ```

9. **View notifications:**
   ```
   GET /api/notifications
   ```

10. **View dashboard:**
    ```
    GET /api/dashboard
    ```

## Performance Optimizations

- Indexed foreign keys on all tables
- Indexed status fields for quick filtering
- Indexed timestamps for sorting
- Relations defined for eager loading
- Timeline limited to 100 events

## Future Enhancements

- Automated contribution due date calculation
- Automated payout scheduling
- Email notifications
- SMS alerts for urgent items
- Activity feeds per member
- Audit trail export
- Contribution reminders
- Payout notifications
