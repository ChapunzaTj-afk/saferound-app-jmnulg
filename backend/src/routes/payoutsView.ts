import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerPayoutsViewRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/rounds/:id/payouts - Returns payout schedule for the round
  app.fastify.get('/api/rounds/:id/payouts', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Fetching payouts');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get round with payouts and members
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, id),
        with: {
          payouts: {
            with: {
              recipient: true,
            },
          },
          members: true,
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

      const isOrganizer = round.organizerId === userId;

      // Filter payouts based on role
      const payoutsList = round.payouts.map(p => ({
        recipientUserId: p.recipientUserId,
        recipientName: p.recipient.name || p.recipient.email,
        payoutPosition: round.members.find(m => m.userId === p.recipientUserId)?.payoutPosition,
        scheduledDate: p.scheduledDate.toISOString(),
        completedDate: p.completedDate ? p.completedDate.toISOString() : null,
        status: p.status,
        amount: p.amount.toString(),
      }));

      // For non-organizers, only show their own payout
      const filteredPayouts = isOrganizer
        ? payoutsList
        : payoutsList.filter(p => p.recipientUserId === userId);

      app.logger.info({ roundId: id, payoutCount: filteredPayouts.length }, 'Payouts retrieved');
      return filteredPayouts;
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to fetch payouts');
      throw error;
    }
  });
}
