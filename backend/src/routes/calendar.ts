import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, gte, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

/**
 * Calculate payout dates based on round parameters
 */
function calculatePayoutDates(
  startDate: Date,
  frequency: string,
  numberOfMembers: number,
  payoutOrder: string
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  // Parse frequency to get interval in days
  let intervalDays = 7; // default to weekly
  if (frequency === 'monthly') {
    intervalDays = 30; // approximate
  } else if (frequency === 'bi-weekly') {
    intervalDays = 14;
  } else if (frequency === 'daily') {
    intervalDays = 1;
  }

  // Generate payout dates for each member
  for (let i = 0; i < numberOfMembers; i++) {
    const payoutDate = new Date(currentDate);
    payoutDate.setDate(payoutDate.getDate() + i * intervalDays);
    dates.push(payoutDate);
  }

  return dates;
}

export function registerCalendarRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/calendar/payouts - Get all future payout dates for user
  app.fastify.get('/api/calendar/payouts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const query = request.query as { filter?: 'all' | 'organized' | 'joined' };
    const filter = query.filter || 'all';

    app.logger.info({ filter }, 'Fetching calendar payouts');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get user's round memberships
      const memberships = await app.db.query.roundMembers.findMany({
        where: eq(schema.roundMembers.userId, userId),
        with: {
          round: {
            with: {
              members: true,
              organizer: true,
            },
          },
        },
      });

      // Filter rounds based on user's filter preference
      const filteredMemberships = memberships.filter(m => {
        const isOrganizer = m.round.organizerId === userId;
        if (filter === 'organized') {
          return isOrganizer;
        } else if (filter === 'joined') {
          return !isOrganizer;
        }
        return true;
      });

      const payoutList: any[] = [];
      const now = new Date();

      // For each round, calculate and add payout dates
      for (const membership of filteredMemberships) {
        const round = membership.round;

        // Skip if no start_date
        if (!round.startDate) {
          app.logger.warn({ roundId: round.id }, 'Round has no start date');
          continue;
        }

        // Calculate payout dates for this round
        const payoutDates = calculatePayoutDates(
          round.startDate,
          round.contributionFrequency,
          round.numberOfMembers,
          round.payoutOrder
        );

        // Determine user's payout position
        const userMember = round.members.find(m => m.userId === userId);
        if (!userMember) continue;

        // Get or calculate payout position (1-based index)
        let payoutPositionIndex = 0;
        if (round.payoutOrder === 'fixed' && userMember.payoutPosition) {
          payoutPositionIndex = userMember.payoutPosition - 1;
        } else {
          // For random order, use membership order
          const sortedMembers = round.members
            .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
          payoutPositionIndex = sortedMembers.findIndex(m => m.userId === userId);
        }

        // Get scheduled payouts from database for this round
        const existingPayouts = await app.db.query.payouts.findMany({
          where: eq(schema.payouts.roundId, round.id),
          with: {
            recipient: true,
          },
        });

        // Create payout entries for each member's scheduled payout
        for (let i = 0; i < payoutDates.length; i++) {
          const payoutDate = payoutDates[i];

          // Only include future payouts
          if (payoutDate < now) {
            continue;
          }

          // For each member, add a payout entry
          for (const member of round.members) {
            // Calculate which position this member receives payout
            let memberPayoutPositionIndex = 0;
            if (round.payoutOrder === 'fixed' && member.payoutPosition) {
              memberPayoutPositionIndex = member.payoutPosition - 1;
            } else {
              const sortedMembers = round.members
                .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
              memberPayoutPositionIndex = sortedMembers.findIndex(m => m.userId === member.userId);
            }

            // Check if this payout is for this member
            if (memberPayoutPositionIndex === i) {
              // Try to find existing payout record
              const existingPayout = existingPayouts.find(
                p => p.recipientUserId === member.userId &&
                     new Date(p.scheduledDate).toDateString() === payoutDate.toDateString()
              );

              // Get member user details
              const memberUser = await app.db.query.user.findFirst({
                where: eq(user.id, member.userId),
              });

              if (memberUser) {
                const payout = {
                  id: existingPayout?.id || `payout-${round.id}-${member.userId}-${i}`,
                  roundId: round.id,
                  roundName: round.name,
                  payoutDate: payoutDate.toISOString(),
                  recipientUserId: member.userId,
                  recipientName: memberUser.name || memberUser.email,
                  amount: Number(round.contributionAmount),
                  currency: round.currency,
                  userRole: round.organizerId === userId ? 'organizer' : 'member',
                  status: existingPayout?.status || 'scheduled',
                };

                // Only include if it's the user's payout or user is organizer
                if (member.userId === userId || round.organizerId === userId) {
                  payoutList.push(payout);
                }
              }
            }
          }
        }
      }

      // Sort by payout date ascending
      payoutList.sort((a, b) =>
        new Date(a.payoutDate).getTime() - new Date(b.payoutDate).getTime()
      );

      app.logger.info(
        { userId, payoutCount: payoutList.length, filter },
        'Calendar payouts retrieved'
      );

      return {
        payouts: payoutList,
      };
    } catch (error) {
      app.logger.error({ err: error, userId, filter }, 'Failed to fetch calendar payouts');
      throw error;
    }
  });
}
