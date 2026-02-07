import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerRoundMembersRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/rounds/:id/join - Adds user as member to round
  app.fastify.post('/api/rounds/:id/join', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; member: any } | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'User joining round');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Check if round exists
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, id),
        with: {
          members: true,
        },
      });

      if (!round) {
        app.logger.warn({ roundId: id }, 'Round not found');
        return reply.status(404).send({ error: 'Round not found' });
      }

      // Check if user is already a member
      const existingMember = round.members.find(m => m.userId === userId);
      if (existingMember) {
        app.logger.warn({ userId, roundId: id }, 'User already member of round');
        return reply.status(400).send({ error: 'User already member of round' });
      }

      // Calculate payout position based on current members count
      const nextPayoutPosition = round.members.length + 1;

      // Add user as member
      const [newMember] = await app.db.insert(schema.roundMembers).values({
        roundId: id,
        userId: userId,
        role: 'member',
        payoutPosition: round.payoutOrder === 'fixed' ? nextPayoutPosition : null,
      }).returning();

      app.logger.info({ roundId: id, userId, payoutPosition: newMember.payoutPosition }, 'User joined round');

      return {
        success: true,
        member: {
          id: newMember.id,
          roundId: newMember.roundId,
          userId: newMember.userId,
          role: newMember.role,
          payoutPosition: newMember.payoutPosition,
          joinedAt: newMember.joinedAt.toISOString(),
        },
      };
    } catch (error) {
      app.logger.error({ err: error, roundId: id, userId }, 'Failed to join round');
      throw error;
    }
  });

  // GET /api/rounds/:id/members - Returns array of members
  app.fastify.get('/api/rounds/:id/members', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Fetching round members');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Check if user is member of round
      const userMembership = await app.db.query.roundMembers.findFirst({
        where: eq(schema.roundMembers.roundId, id),
      });

      if (!userMembership) {
        // If no members exist, just continue (round might be new)
      }

      // Get all members of the round
      const members = await app.db.query.roundMembers.findMany({
        where: eq(schema.roundMembers.roundId, id),
        with: {
          user: true,
        },
      });

      const membersList = members.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.name || m.user.email,
        role: m.role,
        payoutPosition: m.payoutPosition,
        joinedAt: m.joinedAt.toISOString(),
      }));

      app.logger.info({ roundId: id, memberCount: membersList.length }, 'Round members retrieved');
      return membersList;
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to fetch round members');
      throw error;
    }
  });

  // DELETE /api/rounds/:id/members/:userId - Removes member (only if requester is organizer)
  app.fastify.delete('/api/rounds/:id/members/:userId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean } | void> => {
    const { id, userId: memberToRemoveId } = request.params as { id: string; userId: string };
    app.logger.info({ roundId: id, memberToRemoveId }, 'Removing member from round');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const requesterId = session.user.id;

    try {
      // Check if round exists
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, id),
      });

      if (!round) {
        app.logger.warn({ roundId: id }, 'Round not found');
        return reply.status(404).send({ error: 'Round not found' });
      }

      // Check if requester is organizer
      if (round.organizerId !== requesterId) {
        app.logger.warn({ requesterId, roundId: id }, 'Requester is not organizer');
        return reply.status(403).send({ error: 'Only organizer can remove members' });
      }

      // Check if member exists
      const memberToRemove = await app.db.query.roundMembers.findFirst({
        where: eq(schema.roundMembers.userId, memberToRemoveId),
      });

      if (!memberToRemove || memberToRemove.roundId !== id) {
        app.logger.warn({ roundId: id, memberToRemoveId }, 'Member not found');
        return reply.status(404).send({ error: 'Member not found' });
      }

      // Remove member
      await app.db.delete(schema.roundMembers)
        .where(eq(schema.roundMembers.id, memberToRemove.id));

      app.logger.info({ roundId: id, memberToRemoveId }, 'Member removed from round');
      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, roundId: id, memberToRemoveId }, 'Failed to remove member');
      throw error;
    }
  });
}
