import { pgTable, text, timestamp, uuid, integer, decimal, boolean, index } from 'drizzle-orm/pg-core';
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

// Relations
export const roundsRelations = relations(rounds, ({ many, one }) => ({
  members: many(roundMembers),
  contributions: many(contributions),
  payouts: many(payouts),
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
