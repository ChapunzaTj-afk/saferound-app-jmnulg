import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { createTimelineEvent, createNotification } from '../utils/helpers.js';

export function registerContributionsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/contributions/:id/upload-proof - Upload payment proof (image, file, or reference)
  app.fastify.post('/api/contributions/:id/upload-proof', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ contributionId: id }, 'Uploading payment proof');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const body = request.body as {
      proofType: string; // 'image', 'file', 'reference'
      proofUrl?: string;
      referenceText?: string;
    };

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
        app.logger.warn({ userId, contributionId: id }, 'User is not contribution owner');
        return reply.status(403).send({ error: 'Only contribution owner can upload proof' });
      }

      // Create payment proof record
      const [proof] = await app.db.insert(schema.paymentProofs).values({
        contributionId: id,
        roundId: contribution.roundId,
        userId,
        proofType: body.proofType,
        proofUrl: body.proofUrl,
        referenceText: body.referenceText,
        status: 'pending',
      }).returning();

      // Create timeline event
      await createTimelineEvent(
        app,
        contribution.roundId,
        'proof_uploaded',
        userId,
        { proofType: body.proofType }
      );

      // Get round organizer and notify
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, contribution.roundId),
      });

      if (round) {
        await createNotification(
          app,
          round.organizerId,
          'proof_uploaded',
          'Payment proof submitted',
          `${session.user.name || session.user.email} submitted a payment proof for ${round.name}`,
          'action_required',
          contribution.roundId
        );
      }

      app.logger.info({ contributionId: id, proofId: proof.id }, 'Payment proof uploaded successfully');

      return {
        success: true,
        proofId: proof.id,
      };
    } catch (error) {
      app.logger.error({ err: error, contributionId: id }, 'Failed to upload payment proof');
      throw error;
    }
  });

  // GET /api/contributions/:id/proofs - Get all proofs for a contribution
  app.fastify.get('/api/contributions/:id/proofs', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ contributionId: id }, 'Fetching proofs');

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

      // Check authorization (contribution owner or round organizer)
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, contribution.roundId),
      });

      if (!round) {
        return reply.status(404).send({ error: 'Round not found' });
      }

      const isOwner = contribution.userId === userId;
      const isOrganizer = round.organizerId === userId;

      if (!isOwner && !isOrganizer) {
        app.logger.warn({ userId, contributionId: id }, 'User not authorized');
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Get all proofs
      const proofs = await app.db.query.paymentProofs.findMany({
        where: eq(schema.paymentProofs.contributionId, id),
        with: {
          reviewer: true,
        },
      });

      const proofsList = proofs.map(p => ({
        id: p.id,
        proofType: p.proofType,
        proofUrl: p.proofUrl,
        referenceText: p.referenceText,
        status: p.status,
        reviewedBy: p.reviewer?.name || p.reviewer?.email,
        reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt.toISOString(),
      }));

      app.logger.info({ contributionId: id, proofCount: proofsList.length }, 'Proofs retrieved');
      return proofsList;
    } catch (error) {
      app.logger.error({ err: error, contributionId: id }, 'Failed to fetch proofs');
      throw error;
    }
  });

  // POST /api/payment-proofs/:id/approve - Approve a payment proof (organizer only)
  app.fastify.post('/api/payment-proofs/:id/approve', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ proofId: id }, 'Approving payment proof');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get proof
      const proof = await app.db.query.paymentProofs.findFirst({
        where: eq(schema.paymentProofs.id, id),
        with: {
          contribution: true,
        },
      });

      if (!proof) {
        app.logger.warn({ proofId: id }, 'Proof not found');
        return reply.status(404).send({ error: 'Proof not found' });
      }

      // Check if user is organizer
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, proof.roundId),
      });

      if (!round) {
        return reply.status(404).send({ error: 'Round not found' });
      }

      if (round.organizerId !== userId) {
        app.logger.warn({ userId, proofId: id }, 'User is not organizer');
        return reply.status(403).send({ error: 'Only organizer can approve proofs' });
      }

      // Update proof status
      await app.db.update(schema.paymentProofs)
        .set({
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date(),
        })
        .where(eq(schema.paymentProofs.id, id));

      // Update contribution status to verified
      await app.db.update(schema.contributions)
        .set({ status: 'verified' })
        .where(eq(schema.contributions.id, proof.contributionId));

      // Create timeline event
      await createTimelineEvent(
        app,
        proof.roundId,
        'proof_approved',
        userId,
        { proofId: id }
      );

      // Notify member
      await createNotification(
        app,
        proof.userId,
        'proof_approved',
        'Payment proof approved',
        'Your payment proof has been approved',
        'information',
        proof.roundId
      );

      app.logger.info({ proofId: id }, 'Payment proof approved');

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, proofId: id }, 'Failed to approve payment proof');
      throw error;
    }
  });

  // POST /api/payment-proofs/:id/reject - Reject a payment proof (organizer only)
  app.fastify.post('/api/payment-proofs/:id/reject', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    const body = request.body as { reason: string };

    app.logger.info({ proofId: id }, 'Rejecting payment proof');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get proof
      const proof = await app.db.query.paymentProofs.findFirst({
        where: eq(schema.paymentProofs.id, id),
      });

      if (!proof) {
        app.logger.warn({ proofId: id }, 'Proof not found');
        return reply.status(404).send({ error: 'Proof not found' });
      }

      // Check if user is organizer
      const round = await app.db.query.rounds.findFirst({
        where: eq(schema.rounds.id, proof.roundId),
      });

      if (!round) {
        return reply.status(404).send({ error: 'Round not found' });
      }

      if (round.organizerId !== userId) {
        app.logger.warn({ userId, proofId: id }, 'User is not organizer');
        return reply.status(403).send({ error: 'Only organizer can reject proofs' });
      }

      // Update proof status
      await app.db.update(schema.paymentProofs)
        .set({
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionReason: body.reason,
        })
        .where(eq(schema.paymentProofs.id, id));

      // Create timeline event
      await createTimelineEvent(
        app,
        proof.roundId,
        'proof_rejected',
        userId,
        { proofId: id, reason: body.reason }
      );

      // Notify member
      await createNotification(
        app,
        proof.userId,
        'proof_rejected',
        'Payment proof rejected',
        `Your payment proof was rejected: ${body.reason}`,
        'action_required',
        proof.roundId
      );

      app.logger.info({ proofId: id }, 'Payment proof rejected');

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, proofId: id }, 'Failed to reject payment proof');
      throw error;
    }
  });
}
