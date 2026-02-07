import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

/**
 * Calculate contribution dates based on round start date and frequency
 */
function calculateContributionDates(
  startDate: Date,
  frequency: string,
  numberOfMembers: number,
  cyclesToGenerate: number = 5
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

  // Generate contribution dates for multiple cycles
  for (let cycle = 0; cycle < cyclesToGenerate; cycle++) {
    for (let member = 0; member < numberOfMembers; member++) {
      const contributionDate = new Date(currentDate);
      contributionDate.setDate(currentDate.getDate() + cycle * intervalDays * numberOfMembers + member * intervalDays);
      dates.push(contributionDate);
    }
  }

  return dates;
}

/**
 * Calculate payout dates based on round parameters
 */
function calculatePayoutDates(
  startDate: Date,
  frequency: string,
  numberOfMembers: number,
  cyclesToGenerate: number = 5
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
  for (let i = 0; i < numberOfMembers * cyclesToGenerate; i++) {
    const payoutDate = new Date(currentDate);
    payoutDate.setDate(payoutDate.getDate() + i * intervalDays);
    dates.push(payoutDate);
  }

  return dates;
}

export function registerCalendarRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/calendar/payouts - Get calendar events (payouts for organizers, contributions + payouts for members)
  app.fastify.get('/api/calendar/payouts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const query = request.query as { filter?: 'all' | 'organized' | 'joined' };
    const filter = query.filter || 'all';

    app.logger.info({ filter }, 'Fetching calendar events');

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
              members: {
                with: {
                  user: true,
                },
              },
              contributions: true,
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

      const events: any[] = [];
      const now = new Date();

      // For each round, add appropriate events based on user's role
      for (const membership of filteredMemberships) {
        const round = membership.round;
        const isOrganizerOfRound = round.organizerId === userId;

        // Skip if no start_date
        if (!round.startDate) {
          app.logger.warn({ roundId: round.id }, 'Round has no start date');
          continue;
        }

        if (isOrganizerOfRound) {
          // ORGANIZER VIEW: Show all member payouts
          const payoutDates = calculatePayoutDates(
            round.startDate,
            round.contributionFrequency,
            round.numberOfMembers
          );

          // For each payout date, determine which member receives it
          for (let i = 0; i < payoutDates.length; i++) {
            const payoutDate = payoutDates[i];

            // Only include future payouts
            if (payoutDate < now) {
              continue;
            }

            // Find which member receives payout at position i
            const memberIndex = i % round.numberOfMembers;
            let recipientMember = null;

            if (round.payoutOrder === 'fixed') {
              // Fixed payout order: use payoutPosition
              recipientMember = round.members.find(m => m.payoutPosition === memberIndex + 1);
            } else {
              // Random/sequential payout order: use join order
              const sortedMembers = round.members
                .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
              recipientMember = sortedMembers[memberIndex];
            }

            if (recipientMember) {
              const event = {
                id: `payout-${round.id}-${recipientMember.userId}-${i}`,
                roundId: round.id,
                roundName: round.name,
                date: payoutDate.toISOString(),
                eventType: 'payout',
                isOrganizer: true,
                recipientName: recipientMember.user.name || recipientMember.user.email,
                amount: Number(round.contributionAmount),
                currency: round.currency,
              };
              events.push(event);
            }
          }
        } else {
          // MEMBER VIEW: Show contribution dates and payout dates
          const userMember = round.members.find(m => m.userId === userId);
          if (!userMember) continue;

          // Add contribution dates for this member
          const contributionDates = calculateContributionDates(
            round.startDate,
            round.contributionFrequency,
            round.numberOfMembers
          );

          for (const contribDate of contributionDates) {
            // Only include future contributions
            if (contribDate < now) {
              continue;
            }

            // Check if already has a contribution for this date
            const existingContrib = round.contributions.find(
              c => c.userId === userId &&
                   new Date(c.dueDate).toDateString() === contribDate.toDateString()
            );

            if (!existingContrib) {
              const event = {
                id: `contribution-${round.id}-${userId}-${contribDate.getTime()}`,
                roundId: round.id,
                roundName: round.name,
                date: contribDate.toISOString(),
                eventType: 'contribution',
                isOrganizer: false,
                amount: Number(round.contributionAmount),
                currency: round.currency,
              };
              events.push(event);
            }
          }

          // Add payout dates for this member
          const payoutDates = calculatePayoutDates(
            round.startDate,
            round.contributionFrequency,
            round.numberOfMembers
          );

          // Determine member's payout position
          let payoutPositionIndex = 0;
          if (round.payoutOrder === 'fixed' && userMember.payoutPosition) {
            payoutPositionIndex = userMember.payoutPosition - 1;
          } else {
            // For random order, use membership order
            const sortedMembers = round.members
              .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
            payoutPositionIndex = sortedMembers.findIndex(m => m.userId === userId);
          }

          // Find payout dates for this member
          for (let i = payoutPositionIndex; i < payoutDates.length; i += round.numberOfMembers) {
            const payoutDate = payoutDates[i];

            // Only include future payouts
            if (payoutDate < now) {
              continue;
            }

            const event = {
              id: `payout-${round.id}-${userId}-${i}`,
              roundId: round.id,
              roundName: round.name,
              date: payoutDate.toISOString(),
              eventType: 'payout',
              isOrganizer: false,
              amount: Number(round.contributionAmount),
              currency: round.currency,
            };
            events.push(event);
          }
        }
      }

      // Sort by date ascending
      events.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      app.logger.info(
        { userId, eventCount: events.length, filter },
        'Calendar events retrieved'
      );

      return {
        events,
      };
    } catch (error) {
      app.logger.error({ err: error, userId, filter }, 'Failed to fetch calendar events');
      throw error;
    }
  });
}
