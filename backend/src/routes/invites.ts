import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createTimelineEvent, createNotification, getRoundMemberCount } from '../utils/helpers.js';

export function registerInvitesRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/rounds/preview/:code - Preview round before joining (no auth required)
  app.fastify.get('/api/rounds/preview/:code', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { code } = request.params as { code: string };
    app.logger.info({ code }, 'Round preview requested');

    try {
      // Find invite link
      const inviteLink = await app.db.query.inviteLinks.findFirst({
        where: eq(schema.inviteLinks.code, code),
        with: {
          round: {
            with: {
              organizer: true,
              members: true,
            },
          },
        },
      });

      if (!inviteLink) {
        app.logger.warn({ code }, 'Invite code not found');
        return reply.status(404).send({ error: 'Invite code not found' });
      }

      const { round } = inviteLink;

      // Check if expired
      if (inviteLink.expiresAt && new Date(inviteLink.expiresAt) < new Date()) {
        app.logger.warn({ code }, 'Invite code expired');
        return reply.status(410).send({ error: 'Invite code has expired' });
      }

      // Check if max uses reached
      if (inviteLink.maxUses && inviteLink.useCount >= inviteLink.maxUses) {
        app.logger.warn({ code }, 'Invite code max uses reached');
        return reply.status(410).send({ error: 'Invite code max uses reached' });
      }

      const preview = {
        roundId: round.id,
        name: round.name,
        description: round.description,
        currency: round.currency,
        contributionAmount: round.contributionAmount.toString(),
        contributionFrequency: round.contributionFrequency,
        startDate: round.startDate ? round.startDate.toISOString() : null,
        payoutOrder: round.payoutOrder,
        numberOfMembers: round.numberOfMembers,
        currentMemberCount: round.members.length,
        gracePeriodDays: round.gracePeriodDays,
        paymentVerification: round.paymentVerification,
        organizerName: round.organizer.name || round.organizer.email,
      };

      app.logger.info({ code, roundId: round.id }, 'Round preview retrieved');
      return preview;
    } catch (error) {
      app.logger.error({ err: error, code }, 'Failed to get round preview');
      throw error;
    }
  });

  // POST /api/rounds/join/:code - Join round via invite code
  app.fastify.post('/api/rounds/join/:code', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { code } = request.params as { code: string };
    app.logger.info({ code }, 'User joining round via invite code');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Find invite link
      const inviteLink = await app.db.query.inviteLinks.findFirst({
        where: eq(schema.inviteLinks.code, code),
        with: {
          round: {
            with: {
              members: true,
              organizer: true,
            },
          },
        },
      });

      if (!inviteLink) {
        app.logger.warn({ code }, 'Invite code not found');
        return reply.status(404).send({ error: 'Invite code not found' });
      }

      const { round } = inviteLink;

      // Check if expired
      if (inviteLink.expiresAt && new Date(inviteLink.expiresAt) < new Date()) {
        app.logger.warn({ code }, 'Invite code expired');
        return reply.status(410).send({ error: 'Invite code has expired' });
      }

      // Check if max uses reached
      if (inviteLink.maxUses && inviteLink.useCount >= inviteLink.maxUses) {
        app.logger.warn({ code }, 'Invite code max uses reached');
        return reply.status(410).send({ error: 'Invite code max uses reached' });
      }

      // Check if user already a member
      const existingMember = round.members.find(m => m.userId === userId);
      if (existingMember) {
        app.logger.warn({ userId, code }, 'User already member of round');
        return reply.status(409).send({ error: 'User already member of round' });
      }

      // Check if round is full
      if (round.members.length >= round.numberOfMembers) {
        app.logger.warn({ code }, 'Round is full');
        return reply.status(409).send({ error: 'Round is full' });
      }

      // Add user as member
      const nextPayoutPosition = round.members.length + 1;
      const [newMember] = await app.db.insert(schema.roundMembers).values({
        roundId: round.id,
        userId,
        role: 'member',
        payoutPosition: round.payoutOrder === 'fixed' ? nextPayoutPosition : null,
      }).returning();

      // Increment invite use count
      await app.db.update(schema.inviteLinks)
        .set({ useCount: inviteLink.useCount + 1 })
        .where(eq(schema.inviteLinks.id, inviteLink.id));

      // Create timeline event: member_joined
      await createTimelineEvent(
        app,
        round.id,
        'member_joined',
        userId,
        { memberName: session.user.name || session.user.email }
      );

      // Notify organizer
      await createNotification(
        app,
        round.organizerId,
        'member_joined',
        'New member joined',
        `${session.user.name || session.user.email} joined ${round.name}`,
        'information',
        round.id
      );

      app.logger.info(
        { userId, roundId: round.id, code },
        'User joined round successfully'
      );

      return {
        success: true,
        roundId: round.id,
        round: {
          id: round.id,
          name: round.name,
          description: round.description,
          currency: round.currency,
          status: round.status,
        },
      };
    } catch (error) {
      app.logger.error({ err: error, code, userId }, 'Failed to join round');
      throw error;
    }
  });

  // GET /api/rounds/:id/invite-link - Get invite link (organizer only)
  app.fastify.get('/api/rounds/:id/invite-link', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ roundId: id }, 'Fetching invite link');

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
        return reply.status(403).send({ error: 'Only organizer can view invite link' });
      }

      // Get existing invite link
      let inviteLink = await app.db.query.inviteLinks.findFirst({
        where: eq(schema.inviteLinks.roundId, id),
      });

      // If no invite link exists, create one
      if (!inviteLink) {
        const { generateInviteCode } = await import('../utils/helpers.js');
        const code = generateInviteCode();
        const [newLink] = await app.db.insert(schema.inviteLinks).values({
          roundId: id,
          code,
          createdBy: userId,
        }).returning();
        inviteLink = newLink;
      }

      const response = {
        code: inviteLink.code,
        expiresAt: inviteLink.expiresAt ? inviteLink.expiresAt.toISOString() : null,
        useCount: inviteLink.useCount,
        maxUses: inviteLink.maxUses,
      };

      app.logger.info({ roundId: id }, 'Invite link retrieved');
      return response;
    } catch (error) {
      app.logger.error({ err: error, roundId: id }, 'Failed to get invite link');
      throw error;
    }
  });
}
