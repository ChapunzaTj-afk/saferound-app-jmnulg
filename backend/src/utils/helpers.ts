import type { App } from '../index.js';
import * as schema from '../db/schema.js';

/**
 * Generate a unique, short, URL-safe invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a timeline event for a round
 */
export async function createTimelineEvent(
  app: App,
  roundId: string,
  eventType: string,
  userId: string | null = null,
  eventData: Record<string, any> | null = null
): Promise<void> {
  try {
    await app.db.insert(schema.timelineEvents).values({
      roundId,
      userId,
      eventType,
      eventData,
    });
    app.logger.info(
      { roundId, eventType, userId },
      'Timeline event created'
    );
  } catch (error) {
    app.logger.error(
      { err: error, roundId, eventType },
      'Failed to create timeline event'
    );
  }
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  app: App,
  userId: string,
  type: string,
  title: string,
  message: string,
  category: string,
  roundId: string | null = null
): Promise<void> {
  try {
    await app.db.insert(schema.notifications).values({
      userId,
      roundId,
      type,
      title,
      message,
      category,
    });
    app.logger.info(
      { userId, type, roundId },
      'Notification created'
    );
  } catch (error) {
    app.logger.error(
      { err: error, userId, type },
      'Failed to create notification'
    );
  }
}

/**
 * Create notifications for all members of a round
 */
export async function notifyRoundMembers(
  app: App,
  roundId: string,
  excludeUserId: string | null,
  type: string,
  title: string,
  message: string,
  category: string
): Promise<void> {
  try {
    const members = await app.db.query.roundMembers.findMany({
      where: (members, { eq }) => eq(members.roundId, roundId),
    });

    for (const member of members) {
      if (excludeUserId && member.userId === excludeUserId) {
        continue;
      }
      await createNotification(
        app,
        member.userId,
        type,
        title,
        message,
        category,
        roundId
      );
    }
  } catch (error) {
    app.logger.error(
      { err: error, roundId },
      'Failed to notify round members'
    );
  }
}

/**
 * Get round member details by round and user ID
 */
export async function getRoundMember(
  app: App,
  roundId: string,
  userId: string
) {
  return app.db.query.roundMembers.findFirst({
    where: (members, { and, eq }) =>
      and(eq(members.roundId, roundId), eq(members.userId, userId)),
    with: {
      user: true,
    },
  });
}

/**
 * Get current member count for a round
 */
export async function getRoundMemberCount(app: App, roundId: string): Promise<number> {
  const result = await app.db.query.roundMembers.findMany({
    where: (members, { eq }) => eq(members.roundId, roundId),
  });
  return result.length;
}
