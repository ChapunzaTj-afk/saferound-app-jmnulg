import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createTimelineEvent, notifyRoundMembers } from '../utils/helpers.js';

export function registerRoundSettingsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // PUT /api/rounds/:id/settings - Update round settings (organizer only)
  app.fastify.put('/api/rounds/:id/settings', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      description?: string;
      gracePeriodDays?: number;
      paymentVerification?: string;
      conflictResolutionEnabled?: boolean;
    };

    app.logger.info({ roundId: id, body }, 'Updating round settings');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Check if user is organizer
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, id),
      });

      if (!round) {
        app.logger.warn({ roundId: id }, 'Round not found');
        return reply.status(404).send({ error: 'Round not found' });
      }

      if (round.organizerId !== userId) {
        app.logger.warn({ userId, roundId: id }, 'User is not organizer');
        return reply.status(403).send({ error: 'Only organizer can update round settings' });
      }

      // Prepare update data
      const updateData: Record<string, any> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.gracePeriodDays !== undefined) updateData.gracePeriodDays = body.gracePeriodDays;
      if (body.paymentVerification !== undefined) updateData.paymentVerification = body.paymentVerification;
      if (body.conflictResolutionEnabled !== undefined) updateData.conflictResolutionEnabled = body.conflictResolutionEnabled;

      // Update round
      const [updatedRound] = await app.db.update(schema.rounds)
        .set(updateData)
        .where(eq(schema.rounds.id, id))
        .returning();

      // Create timeline event
      await createTimelineEvent(
        app,
        id,
        'round_updated',
        userId,
        { changedFields: Object.keys(updateData) }
      );

      // Notify all members
      await notifyRoundMembers(
        app,
        id,
        userId,
        'round_updated',
        'Round settings updated',
        `Round "${updatedRound.name}" settings have been updated`,
        'information'
      );

      app.logger.info({ roundId: id }, 'Round settings updated');

      return {
        id: updatedRound.id,
        name: updatedRound.name,
        description: updatedRound.description,
        currency: updatedRound.currency,
        gracePeriodDays: updatedRound.gracePeriodDays,
        paymentVerification: updatedRound.paymentVerification,
        conflictResolutionEnabled: updatedRound.conflictResolutionEnabled,
        status: updatedRound.status,
        updatedAt: updatedRound.updatedAt.toISOString(),
      };
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to update round settings');
      throw error;
    }
  });

  // DELETE /api/rounds/:id/archive - Archive round (organizer only)
  app.fastify.delete('/api/rounds/:id/archive', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Archiving round');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Check if user is organizer
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, id),
      });

      if (!round) {
        app.logger.warn({ roundId: id }, 'Round not found');
        return reply.status(404).send({ error: 'Round not found' });
      }

      if (round.organizerId !== userId) {
        app.logger.warn({ userId, roundId: id }, 'User is not organizer');
        return reply.status(403).send({ error: 'Only organizer can archive round' });
      }

      // Update round status to archived
      await app.db.update(schema.rounds)
        .set({ status: 'archived' })
        .where(eq(schema.rounds.id, id));

      // Create timeline event
      await createTimelineEvent(
        app,
        id,
        'round_updated',
        userId,
        { action: 'archived' }
      );

      // Notify all members
      await notifyRoundMembers(
        app,
        id,
        userId,
        'round_updated',
        'Round archived',
        `Round "${round.name}" has been archived`,
        'information'
      );

      app.logger.info({ roundId: id }, 'Round archived');

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to archive round');
      throw error;
    }
  });
}
