import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerTimelineRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/rounds/:id/timeline - Returns chronological timeline events
  app.fastify.get('/api/rounds/:id/timeline', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Fetching timeline');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Check if user is member of round
      const userMembership = await app.db.query.roundMembers.findFirst({
        where: (members, { and, eq }) =>
          and(eq(members.roundId, id), eq(members.userId, userId)),
      });

      if (!userMembership) {
        app.logger.warn({ userId, roundId: id }, 'User not member of round');
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Get timeline events (limit to last 100)
      const events = await app.db.query.timelineEvents.findMany({
        where: eq(schema.timelineEvents.roundId, id),
        with: {
          user: true,
        },
        orderBy: desc(schema.timelineEvents.createdAt),
        limit: 100,
      });

      const eventsList = events.map(e => ({
        id: e.id,
        eventType: e.eventType,
        userName: e.user?.name || e.user?.email || null,
        eventData: e.eventData,
        createdAt: e.createdAt.toISOString(),
      }));

      app.logger.info({ roundId: id, eventCount: eventsList.length }, 'Timeline retrieved');
      return eventsList;
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to fetch timeline');
      throw error;
    }
  });

  // GET /api/rounds/:id/overview - Returns comprehensive round overview
  app.fastify.get('/api/rounds/:id/overview', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Fetching round overview');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get round with relations
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, id),
        with: {
          members: {
            with: {
              user: true,
            },
          },
          contributions: true,
          payouts: true,
          organizer: true,
        },
      });

      if (!round) {
        app.logger.warn({ roundId: id }, 'Round not found');
        return reply.status(404).send({ error: 'Round not found' });
      }

      // Check if user is member
      const userMember = round.members.find(m => m.userId === userId);
      if (!userMember) {
        app.logger.warn({ userId, roundId: id }, 'User not member of round');
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Calculate contribution progress
      const totalContributions = round.contributions.length;
      const paidContributions = round.contributions.filter(c => c.status === 'paid' || c.status === 'verified').length;
      const pendingContributions = round.contributions.filter(c => c.status === 'pending').length;
      const lateContributions = round.contributions.filter(c => c.status === 'late').length;

      // Get next payout info
      const nextPayout = round.payouts
        .filter(p => p.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];

      const nextPayoutRecipient = nextPayout
        ? round.members.find(m => m.id === nextPayout.recipientUserId)
        : null;

      // Calculate next important date and action
      let nextImportantDate: Date | null = null;
      let nextImportantAction: string | null = null;

      const userContributions = round.contributions.filter(c => c.userId === userId);
      const overdueContribution = userContributions.find(c => c.status === 'late');
      if (overdueContribution) {
        nextImportantDate = new Date(overdueContribution.dueDate);
        nextImportantAction = `Overdue contribution: ${round.currency} ${overdueContribution.amount}`;
      }

      const pendingContribution = userContributions
        .filter(c => c.status === 'pending')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
      if (pendingContribution && (!nextImportantDate || new Date(pendingContribution.dueDate) < nextImportantDate)) {
        nextImportantDate = new Date(pendingContribution.dueDate);
        nextImportantAction = `Contribution due: ${round.currency} ${pendingContribution.amount}`;
      }

      if (nextPayout && (!nextImportantDate || new Date(nextPayout.scheduledDate) < nextImportantDate)) {
        nextImportantDate = new Date(nextPayout.scheduledDate);
        nextImportantAction = `Payout scheduled: ${round.currency} ${nextPayout.amount}`;
      }

      const overview = {
        roundDetails: {
          id: round.id,
          name: round.name,
          description: round.description,
          currency: round.currency,
          status: round.status,
        },
        contributionProgress: {
          total: totalContributions,
          paid: paidContributions,
          pending: pendingContributions,
          late: lateContributions,
        },
        currentPayoutStatus: {
          nextPayoutDate: nextPayout?.scheduledDate.toISOString() || null,
          nextRecipient: nextPayoutRecipient ? (nextPayoutRecipient.user?.name || nextPayoutRecipient.user?.email) : null,
          position: nextPayout?.id ? round.members.find(m => m.id === nextPayout.id)?.payoutPosition : null,
        },
        nextImportantDate: nextImportantDate?.toISOString() || null,
        nextImportantAction,
        memberCount: {
          current: round.members.length,
          total: round.numberOfMembers,
        },
        userRole: userMember.role,
      };

      app.logger.info({ roundId: id }, 'Round overview retrieved');
      return overview;
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to fetch round overview');
      throw error;
    }
  });
}
