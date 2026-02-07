import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerNotificationsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/notifications - Returns user's notifications grouped by category
  app.fastify.get('/api/notifications', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info('Fetching notifications');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get all notifications for user
      const notifications = await app.db.query.notifications.findMany({
        where: eq(schema.notifications.userId, userId),
        with: {
          round: true,
        },
        orderBy: desc(schema.notifications.createdAt),
      });

      // Group by category
      const grouped = notifications.reduce((acc, notif) => {
        if (!acc[notif.category]) {
          acc[notif.category] = [];
        }
        acc[notif.category].push({
          id: notif.id,
          roundId: notif.roundId,
          roundName: notif.round?.name || null,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          category: notif.category,
          read: notif.read,
          createdAt: notif.createdAt.toISOString(),
        });
        return acc;
      }, {} as Record<string, any[]>);

      const result = {
        actionRequired: grouped['action_required'] || [],
        upcoming: grouped['upcoming'] || [],
        information: grouped['information'] || [],
      };

      const unreadCount = notifications.filter(n => !n.read).length;

      app.logger.info({ userId, unreadCount }, 'Notifications retrieved');

      return {
        unreadCount,
        notifications: result,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch notifications');
      throw error;
    }
  });

  // POST /api/notifications/:id/mark-read - Mark notification as read
  app.fastify.post('/api/notifications/:id/mark-read', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { id } = request.params as { id: string };
    app.logger.info({ notificationId: id }, 'Marking notification as read');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Get notification
      const notification = await app.db.query.notifications.findFirst({
        where: eq(schema.notifications.id, id),
      });

      if (!notification) {
        app.logger.warn({ notificationId: id }, 'Notification not found');
        return reply.status(404).send({ error: 'Notification not found' });
      }

      // Check if user owns notification
      if (notification.userId !== userId) {
        app.logger.warn({ userId, notificationId: id }, 'User does not own notification');
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Update notification
      await app.db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, id));

      app.logger.info({ notificationId: id }, 'Notification marked as read');

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, notificationId: id }, 'Failed to mark notification as read');
      throw error;
    }
  });

  // POST /api/notifications/mark-all-read - Mark all user's notifications as read
  app.fastify.post('/api/notifications/mark-all-read', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info('Marking all notifications as read');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      // Update all notifications for user
      await app.db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.userId, userId));

      app.logger.info({ userId }, 'All notifications marked as read');

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to mark all notifications as read');
      throw error;
    }
  });
}
