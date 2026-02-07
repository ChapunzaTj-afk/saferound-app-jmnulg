import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createTimelineEvent } from '../utils/helpers.js';

export function registerContributionsTrackingRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/rounds/:id/contributions - Returns contributions for the round with member details
  app.fastify.get('/api/rounds/:id/contributions', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Fetching contributions');

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

      // Get all contributions for the round
      const contributions = await app.db.query.contributions.findMany({
        where: eq(schema.contributions.roundId, id),
        with: {
          user: true,
        },
      });

      // Get proofs for each contribution
      const proofs = await app.db.query.paymentProofs.findMany({
        where: eq(schema.paymentProofs.roundId, id),
      });

      const contributionsList = contributions.map(c => {
        const latestProof = proofs
          .filter(p => p.contributionId === c.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        return {
          id: c.id,
          roundId: c.roundId,
          userId: c.userId,
          userName: c.user.name || c.user.email,
          amount: c.amount.toString(),
          dueDate: c.dueDate.toISOString(),
          paidDate: c.paidDate ? c.paidDate.toISOString() : null,
          status: c.status,
          proofStatus: latestProof?.status || null,
          createdAt: c.createdAt.toISOString(),
        };
      });

      app.logger.info({ roundId: id, contributionCount: contributionsList.length }, 'Contributions retrieved');
      return contributionsList;
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to fetch contributions');
      throw error;
    }
  });

  // POST /api/contributions/:id/mark-paid - Mark contribution as paid
  app.fastify.post('/api/contributions/:id/mark-paid', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ contributionId: id }, 'Marking contribution as paid');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get contribution
      const contribution = await app.db.query.contributions.findFirst({
        where: eq(schema.contributions.id, id),
      });

      if (!contribution) {
        app.logger.warn({ contributionId: id }, 'Contribution not found');
        return reply.status(404).send({ error: 'Contribution not found' });
      }

      // Check if user owns this contribution
      if (contribution.userId !== userId) {
        app.logger.warn({ userId, contributionId: id }, 'User does not own contribution');
        return reply.status(403).send({ error: 'Only contribution owner can mark as paid' });
      }

      // Update contribution
      const [updatedContribution] = await app.db.update(schema.contributions)
        .set({
          status: 'paid',
          paidDate: new Date(),
        })
        .where(eq(schema.contributions.id, id))
        .returning();

      // Create timeline event
      await createTimelineEvent(
        app,
        contribution.roundId,
        'contribution_recorded',
        userId,
        {
          contributionAmount: contribution.amount.toString(),
          currency: await app.db.query.rounds.findFirst({
            where: eq(schema.rounds.id, contribution.roundId),
          }).then(r => r?.currency),
        }
      );

      app.logger.info({ contributionId: id, userId }, 'Contribution marked as paid');

      return {
        id: updatedContribution.id,
        roundId: updatedContribution.roundId,
        userId: updatedContribution.userId,
        amount: updatedContribution.amount.toString(),
        dueDate: updatedContribution.dueDate.toISOString(),
        paidDate: updatedContribution.paidDate?.toISOString(),
        status: updatedContribution.status,
        createdAt: updatedContribution.createdAt.toISOString(),
      };
    } catch (error) {
      app.logger.error({ err: error, contributionId: id }, 'Failed to mark contribution as paid');
      throw error;
    }
  });
}
