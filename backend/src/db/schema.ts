import { pgTable, text, timestamp, uuid, integer, decimal, boolean, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

// Rounds table: group savings cycles with recurring contributions and rotating payouts
export const rounds = pgTable('rounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  currency: text('currency').notNull(),
  contributionAmount: decimal('contribution_amount', { precision: 12, scale: 2 }).notNull(),
  contributionFrequency: text('contribution_frequency').notNull(), // 'weekly', 'monthly', etc
  numberOfMembers: integer('number_of_members').notNull(),
  payoutOrder: text('payout_order').notNull(), // 'fixed' or 'random'
  startType: text('start_type').notNull(), // 'immediate', 'future', 'in-progress'
  startDate: timestamp('start_date', { withTimezone: true }),
  gracePeriodDays: integer('grace_period_days').default(0).notNull(),
  conflictResolutionEnabled: boolean('conflict_resolution_enabled').default(false).notNull(),
  paymentVerification: text('payment_verification').notNull(), // 'optional' or 'mandatory'
  organizerParticipates: boolean('organizer_participates').default(true).notNull(), // whether organizer is also a member
  organizerId: text('organizer_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').default('active').notNull(), // 'active', 'completed', 'cancelled'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index('rounds_organizer_id_idx').on(table.organizerId),
  index('rounds_status_idx').on(table.status),
]);

// Round members table: tracks participation roles and payout positions
export const roundMembers = pgTable('round_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'organizer' or 'member'
  payoutPosition: integer('payout_position'), // position in payout order (nullable if random)
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('round_members_round_id_idx').on(table.roundId),
  index('round_members_user_id_idx').on(table.userId),
]);

// Contributions table: tracks payment obligations and status
export const contributions = pgTable('contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  paidDate: timestamp('paid_date', { withTimezone: true }),
  status: text('status').notNull(), // 'pending', 'paid', 'late', 'verified'
  proofUrl: text('proof_url'), // URL to payment proof image
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('contributions_round_id_idx').on(table.roundId),
  index('contributions_user_id_idx').on(table.userId),
  index('contributions_status_idx').on(table.status),
  index('contributions_due_date_idx').on(table.dueDate),
]);

// Payouts table: tracks scheduled and completed payouts to members
export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  recipientUserId: text('recipient_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
  completedDate: timestamp('completed_date', { withTimezone: true }),
  status: text('status').notNull(), // 'scheduled', 'completed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('payouts_round_id_idx').on(table.roundId),
  index('payouts_recipient_user_id_idx').on(table.recipientUserId),
  index('payouts_status_idx').on(table.status),
]);

// Timeline events table: tracks all activities in a round
export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // null for system events
  eventType: text('event_type').notNull(), // member_joined, contribution_recorded, proof_uploaded, proof_approved, proof_rejected, round_created, round_updated, payout_scheduled, payout_completed
  eventData: jsonb('event_data'), // event-specific data
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('timeline_events_round_id_idx').on(table.roundId),
  index('timeline_events_user_id_idx').on(table.userId),
  index('timeline_events_created_at_idx').on(table.createdAt),
]);

// Payment proofs table: tracks payment proof uploads and verification
export const paymentProofs = pgTable('payment_proofs', {
  id: uuid('id').primaryKey().defaultRandom(),
  contributionId: uuid('contribution_id').notNull().references(() => contributions.id, { onDelete: 'cascade' }),
  roundId: uuid('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  proofType: text('proof_type').notNull(), // image, file, reference
  proofUrl: text('proof_url'), // URL to uploaded image/file
  referenceText: text('reference_text'), // text reference (e.g., transaction ID)
  status: text('status').notNull().default('pending'), // pending, approved, rejected
  reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }), // organizer who reviewed
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('payment_proofs_contribution_id_idx').on(table.contributionId),
  index('payment_proofs_round_id_idx').on(table.roundId),
  index('payment_proofs_user_id_idx').on(table.userId),
  index('payment_proofs_status_idx').on(table.status),
]);

// Notifications table: tracks user notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  roundId: uuid('round_id').references(() => rounds.id, { onDelete: 'cascade' }), // nullable for non-round notifications
  type: text('type').notNull(), // contribution_due, payout_upcoming, proof_approved, proof_rejected, member_joined, round_updated
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull(), // action_required, upcoming, information
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('notifications_user_id_idx').on(table.userId),
  index('notifications_round_id_idx').on(table.roundId),
  index('notifications_read_idx').on(table.read),
]);

// Invite links table: tracks shareable invite codes for rounds
export const inviteLinks = pgTable('invite_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(), // short shareable code
  createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'cascade' }), // organizer user_id
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxUses: integer('max_uses'), // nullable for unlimited
  useCount: integer('use_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('invite_links_round_id_idx').on(table.roundId),
  index('invite_links_code_idx').on(table.code),
]);

// Relations
export const roundsRelations = relations(rounds, ({ many, one }) => ({
  members: many(roundMembers),
  contributions: many(contributions),
  payouts: many(payouts),
  timelineEvents: many(timelineEvents),
  paymentProofs: many(paymentProofs),
  notifications: many(notifications),
  inviteLinks: many(inviteLinks),
  organizer: one(user, {
    fields: [rounds.organizerId],
    references: [user.id],
  }),
}));

export const roundMembersRelations = relations(roundMembers, ({ one }) => ({
  round: one(rounds, {
    fields: [roundMembers.roundId],
    references: [rounds.id],
  }),
  user: one(user, {
    fields: [roundMembers.userId],
    references: [user.id],
  }),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  round: one(rounds, {
    fields: [contributions.roundId],
    references: [rounds.id],
  }),
  user: one(user, {
    fields: [contributions.userId],
    references: [user.id],
  }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  round: one(rounds, {
    fields: [payouts.roundId],
    references: [rounds.id],
  }),
  recipient: one(user, {
    fields: [payouts.recipientUserId],
    references: [user.id],
  }),
}));

export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({
  round: one(rounds, {
    fields: [timelineEvents.roundId],
    references: [rounds.id],
  }),
  user: one(user, {
    fields: [timelineEvents.userId],
    references: [user.id],
  }),
}));

export const paymentProofsRelations = relations(paymentProofs, ({ one }) => ({
  contribution: one(contributions, {
    fields: [paymentProofs.contributionId],
    references: [contributions.id],
  }),
  round: one(rounds, {
    fields: [paymentProofs.roundId],
    references: [rounds.id],
  }),
  user: one(user, {
    fields: [paymentProofs.userId],
    references: [user.id],
  }),
  reviewer: one(user, {
    fields: [paymentProofs.reviewedBy],
    references: [user.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
  round: one(rounds, {
    fields: [notifications.roundId],
    references: [rounds.id],
  }),
}));

export const inviteLinksRelations = relations(inviteLinks, ({ one }) => ({
  round: one(rounds, {
    fields: [inviteLinks.roundId],
    references: [rounds.id],
  }),
  creator: one(user, {
    fields: [inviteLinks.createdBy],
    references: [user.id],
  }),
}));
