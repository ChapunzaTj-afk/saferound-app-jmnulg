import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { generateInviteCode, createTimelineEvent } from '../utils/helpers.js';

export function registerRoundsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/rounds - Returns array of rounds user is part of
  app.fastify.get('/api/rounds', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    app.logger.info('Fetching rounds list');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    // Get all rounds where user is a member or organizer
    const userRounds = await app.db.query.roundMembers.findMany({
      where: eq(schema.roundMembers.userId, userId),
      with: {
        round: true,
      },
    });

    const rounds = userRounds.map(rm => ({
      id: rm.round.id,
      name: rm.round.name,
      description: rm.round.description,
      currency: rm.round.currency,
      contributionAmount: rm.round.contributionAmount.toString(),
      contributionFrequency: rm.round.contributionFrequency,
      numberOfMembers: rm.round.numberOfMembers,
      organizerId: rm.round.organizerId,
      status: rm.round.status,
      role: rm.role,
      nextImportantDate: null, // Will be calculated from contributions/payouts
      nextImportantAction: null, // Will be determined based on round status
    }));

    app.logger.info({ userId, roundsCount: rounds.length }, 'Rounds list retrieved');
    return rounds;
  });

  // GET /api/rounds/:id - Returns full round details with members list
  app.fastify.get('/api/rounds/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Fetching round details');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    // Get round with all relations
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

    // Check if user is member of round
    const userMember = round.members.find(m => m.userId === userId);
    if (!userMember) {
      app.logger.warn({ userId, roundId: id }, 'User not member of round');
      return reply.status(403).send({ error: 'Access denied' });
    }

    const roundData = {
      id: round.id,
      name: round.name,
      description: round.description,
      currency: round.currency,
      contributionAmount: round.contributionAmount.toString(),
      contributionFrequency: round.contributionFrequency,
      numberOfMembers: round.numberOfMembers,
      payoutOrder: round.payoutOrder,
      startType: round.startType,
      startDate: round.startDate ? round.startDate.toISOString() : null,
      gracePeriodDays: round.gracePeriodDays,
      conflictResolutionEnabled: round.conflictResolutionEnabled,
      paymentVerification: round.paymentVerification,
      organizerId: round.organizerId,
      status: round.status,
      createdAt: round.createdAt.toISOString(),
      updatedAt: round.updatedAt.toISOString(),
      members: round.members.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.name || m.user.email,
        role: m.role,
        payoutPosition: m.payoutPosition,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };

    app.logger.info({ roundId: id }, 'Round details retrieved');
    return roundData;
  });

  // POST /api/rounds - Creates round with user as organizer
  app.fastify.post('/api/rounds', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const body = request.body as {
      name: string;
      description?: string;
      currency: string;
      contributionAmount: string | number;
      contributionFrequency: string;
      numberOfMembers: number;
      payoutOrder: string;
      startType: string;
      startDate?: string;
      gracePeriodDays?: number;
      conflictResolutionEnabled?: boolean;
      paymentVerification: string;
    };

    app.logger.info({ body }, 'Creating new round');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Calculate start_date based on startType
      let startDate: Date | null = null;
      if (body.startType === 'immediate') {
        startDate = new Date();
      } else if (body.startType === 'future' || body.startType === 'in-progress') {
        startDate = body.startDate ? new Date(body.startDate) : null;
      }

      // Create the round
      const [newRound] = await app.db.insert(schema.rounds).values({
        name: body.name,
        description: body.description || null,
        currency: body.currency,
        contributionAmount: body.contributionAmount.toString(),
        contributionFrequency: body.contributionFrequency,
        numberOfMembers: body.numberOfMembers,
        payoutOrder: body.payoutOrder,
        startType: body.startType,
        startDate,
        gracePeriodDays: body.gracePeriodDays || 0,
        conflictResolutionEnabled: body.conflictResolutionEnabled || false,
        paymentVerification: body.paymentVerification,
        organizerId: userId,
      }).returning();

      // Add organizer as a round member with organizer role
      await app.db.insert(schema.roundMembers).values({
        roundId: newRound.id,
        userId: userId,
        role: 'organizer',
        payoutPosition: 1,
      });

      // Create timeline event: round_created
      await createTimelineEvent(
        app,
        newRound.id,
        'round_created',
        userId,
        { roundName: newRound.name }
      );

      // Generate and create invite link
      const inviteCode = generateInviteCode();
      await app.db.insert(schema.inviteLinks).values({
        roundId: newRound.id,
        code: inviteCode,
        createdBy: userId,
      });

      app.logger.info(
        { roundId: newRound.id, organizerId: userId, inviteCode },
        'Round created successfully with invite link'
      );

      return {
        id: newRound.id,
        name: newRound.name,
        description: newRound.description,
        currency: newRound.currency,
        contributionAmount: newRound.contributionAmount.toString(),
        contributionFrequency: newRound.contributionFrequency,
        numberOfMembers: newRound.numberOfMembers,
        payoutOrder: newRound.payoutOrder,
        startType: newRound.startType,
        startDate: newRound.startDate ? newRound.startDate.toISOString() : null,
        gracePeriodDays: newRound.gracePeriodDays,
        conflictResolutionEnabled: newRound.conflictResolutionEnabled,
        paymentVerification: newRound.paymentVerification,
        organizerId: newRound.organizerId,
        status: newRound.status,
        inviteCode,
        createdAt: newRound.createdAt.toISOString(),
        updatedAt: newRound.updatedAt.toISOString(),
      };
    } catch (error) {
      app.logger.error({ err: error, body }, 'Failed to create round');
      throw error;
    }
  });

  // PUT /api/rounds/:id - Updates round (only if user is organizer)
  app.fastify.put('/api/rounds/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      description?: string;
      gracePeriodDays?: number;
      conflictResolutionEnabled?: boolean;
      paymentVerification?: string;
    };

    app.logger.info({ roundId: id, body }, 'Updating round');

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
        return reply.status(403).send({ error: 'Only organizer can update round' });
      }

      // Update only allowed fields
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.gracePeriodDays !== undefined) updateData.gracePeriodDays = body.gracePeriodDays;
      if (body.conflictResolutionEnabled !== undefined) updateData.conflictResolutionEnabled = body.conflictResolutionEnabled;
      if (body.paymentVerification !== undefined) updateData.paymentVerification = body.paymentVerification;

      const [updatedRound] = await app.db.update(schema.rounds)
        .set(updateData)
        .where(eq(schema.rounds.id, id))
        .returning();

      app.logger.info({ roundId: id }, 'Round updated successfully');

      return {
        id: updatedRound.id,
        name: updatedRound.name,
        description: updatedRound.description,
        currency: updatedRound.currency,
        contributionAmount: updatedRound.contributionAmount.toString(),
        contributionFrequency: updatedRound.contributionFrequency,
        numberOfMembers: updatedRound.numberOfMembers,
        organizerId: updatedRound.organizerId,
        status: updatedRound.status,
        createdAt: updatedRound.createdAt.toISOString(),
        updatedAt: updatedRound.updatedAt.toISOString(),
      };
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to update round');
      throw error;
    }
  });

  // DELETE /api/rounds/:id - Deletes round (only if user is organizer)
  app.fastify.delete('/api/rounds/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean } | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Deleting round');

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
        return reply.status(403).send({ error: 'Only organizer can delete round' });
      }

      // Delete round (cascade will delete members, contributions, payouts)
      await app.db.delete(schema.rounds).where(eq(schema.rounds.id, id));

      app.logger.info({ roundId: id }, 'Round deleted successfully');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to delete round');
      throw error;
    }
  });
}
