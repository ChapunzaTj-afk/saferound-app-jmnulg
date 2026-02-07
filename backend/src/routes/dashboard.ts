import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerDashboardRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/dashboard - Returns dashboard summary
  app.fastify.get('/api/dashboard', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info('Fetching dashboard summary');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get all rounds user is part of
      const userRounds = await app.db.query.roundMembers.findMany({
        where: eq(schema.roundMembers.userId, userId),
        with: {
          round: {
            with: {
              members: true,
              contributions: true,
              payouts: true,
            },
          },
        },
      });

      // Get unread notifications
      const unreadNotifications = await app.db.query.notifications.findMany({
        where: (notif, { and, eq }) =>
          and(eq(notif.userId, userId), eq(notif.read, false)),
      });

      if (!userRounds || userRounds.length === 0) {
        app.logger.info({ userId }, 'No active rounds found');
        return {
          globalStatus: 'healthy',
          nextImportantDate: null,
          nextImportantAction: null,
          roundsCount: 0,
          unreadNotificationCount: unreadNotifications.length,
          actionItems: [],
          activeRounds: [],
        };
      }

      // Calculate dashboard metrics
      let nextImportantDate: Date | null = null;
      let nextImportantAction: string | null = null;
      let globalStatus = 'healthy';

      const activeRounds = userRounds
        .filter(ur => ur.round.status === 'active')
        .map(ur => {
          const round = ur.round;

          // Find next due contribution or scheduled payout
          const upcomingContributions = round.contributions.filter(
            c => c.userId === userId && c.status === 'pending' && new Date(c.dueDate) > new Date()
          );
          const overdueContributions = round.contributions.filter(
            c => c.userId === userId && c.status === 'late'
          );

          const nextContribution = upcomingContributions.length > 0
            ? upcomingContributions.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
            : null;

          // Check for scheduled payouts
          const scheduledPayouts = round.payouts.filter(
            p => p.recipientUserId === userId && p.status === 'scheduled'
          );
          const nextPayout = scheduledPayouts.length > 0
            ? scheduledPayouts.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0]
            : null;

          // Determine next important date
          let roundNextDate: Date | null = null;
          let roundNextAction: string | null = null;

          if (overdueContributions.length > 0) {
            globalStatus = 'action-needed';
            roundNextDate = new Date();
            roundNextAction = `${overdueContributions.length} overdue contribution(s)`;
          } else if (nextContribution) {
            roundNextDate = new Date(nextContribution.dueDate);
            roundNextAction = `Contribution due: ${round.currency} ${nextContribution.amount}`;
          } else if (nextPayout) {
            roundNextDate = new Date(nextPayout.scheduledDate);
            roundNextAction = `Payout scheduled: ${round.currency} ${nextPayout.amount}`;
          }

          // Update global next important date
          if (roundNextDate && (!nextImportantDate || roundNextDate < nextImportantDate)) {
            nextImportantDate = roundNextDate;
            nextImportantAction = roundNextAction;
          }

          return {
            id: round.id,
            name: round.name,
            description: round.description,
            currency: round.currency,
            contributionAmount: round.contributionAmount.toString(),
            numberOfMembers: round.numberOfMembers,
            startDate: round.startDate ? round.startDate.toISOString() : null,
            status: round.status,
            nextImportantDate: roundNextDate ? roundNextDate.toISOString() : null,
            nextImportantAction: roundNextAction,
          };
        });

      // Collect action items (pending proofs, overdue contributions)
      const actionItems: any[] = [];
      for (const ur of userRounds) {
        const round = ur.round;
        // Get pending proofs
        const pendingProofs = await app.db.query.paymentProofs.findMany({
          where: (proof, { and, eq }) =>
            and(eq(proof.roundId, round.id), eq(proof.status, 'pending')),
        });
        if (pendingProofs.length > 0 && ur.role === 'organizer') {
          actionItems.push({
            type: 'pending_proofs',
            roundId: round.id,
            roundName: round.name,
            count: pendingProofs.length,
          });
        }

        // Get overdue contributions
        const overdueContributions = ur.round.contributions.filter(
          c => c.userId === userId && c.status === 'late'
        );
        if (overdueContributions.length > 0) {
          actionItems.push({
            type: 'overdue_contributions',
            roundId: round.id,
            roundName: round.name,
            count: overdueContributions.length,
          });
        }
      }

      app.logger.info(
        { userId, roundsCount: activeRounds.length, globalStatus, unreadNotifications: unreadNotifications.length },
        'Dashboard summary retrieved'
      );

      return {
        globalStatus,
        nextImportantDate: nextImportantDate ? nextImportantDate.toISOString() : null,
        nextImportantAction,
        roundsCount: activeRounds.length,
        unreadNotificationCount: unreadNotifications.length,
        actionItems,
        activeRounds,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch dashboard summary');
      throw error;
    }
  });
}
