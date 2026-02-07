import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerContributionsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/rounds/:id/contributions - Returns contributions for the round
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
        where: eq(schema.roundMembers.roundId, id),
      });

      if (!userMembership || userMembership.userId !== userId) {
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

      const contributionsList = contributions.map(c => ({
        id: c.id,
        roundId: c.roundId,
        userId: c.userId,
        userName: c.user.name || c.user.email,
        amount: c.amount.toString(),
        dueDate: c.dueDate.toISOString(),
        paidDate: c.paidDate ? c.paidDate.toISOString() : null,
        status: c.status,
        proofUrl: c.proofUrl,
        createdAt: c.createdAt.toISOString(),
      }));

      app.logger.info({ roundId: id, contributionCount: contributionsList.length }, 'Contributions retrieved');
      return contributionsList;
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to fetch contributions');
      throw error;
    }
  });

  // POST /api/rounds/:id/contributions/:contributionId/proof - Uploads payment proof image
  app.fastify.post('/api/rounds/:id/contributions/:contributionId/proof', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; proofUrl: string } | void> => {
    const { id: roundId, contributionId } = request.params as { id: string; contributionId: string };
    app.logger.info({ roundId, contributionId }, 'Uploading payment proof');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get contribution
      const contribution = await app.db.query.contributions.findFirst({
        where: eq(schema.contributions.id, contributionId),
      });

      if (!contribution) {
        app.logger.warn({ contributionId }, 'Contribution not found');
        return reply.status(404).send({ error: 'Contribution not found' });
      }

      if (contribution.roundId !== roundId) {
        app.logger.warn({ contributionId, roundId }, 'Contribution does not belong to round');
        return reply.status(400).send({ error: 'Contribution does not belong to round' });
      }

      if (contribution.userId !== userId) {
        app.logger.warn({ userId, contributionId }, 'User is not contribution owner');
        return reply.status(403).send({ error: 'Only contribution owner can upload proof' });
      }

      // Get file from request
      const file = await request.file();
      if (!file) {
        app.logger.warn({ contributionId }, 'No file provided');
        return reply.status(400).send({ error: 'No file provided' });
      }

      let buffer: Buffer;
      try {
        buffer = await file.toBuffer();
      } catch (err) {
        app.logger.error({ err, contributionId }, 'File size limit exceeded');
        return reply.status(413).send({ error: 'File too large' });
      }

      // Upload to storage
      const key = `proof/${roundId}/${contributionId}/${Date.now()}-${file.filename}`;
      const uploadedKey = await app.storage.upload(key, buffer);

      // Get signed URL
      const { url } = await app.storage.getSignedUrl(uploadedKey);

      // Update contribution with proof URL
      const [updatedContribution] = await app.db.update(schema.contributions)
        .set({ proofUrl: url })
        .where(eq(schema.contributions.id, contributionId))
        .returning();

      app.logger.info({ contributionId, proofUrl: url }, 'Payment proof uploaded successfully');

      return {
        success: true,
        proofUrl: url,
      };
    } catch (error) {
      app.logger.error({ err: error, contributionId }, 'Failed to upload payment proof');
      throw error;
    }
  });
}
