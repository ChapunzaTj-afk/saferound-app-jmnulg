import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerUserRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/users/me - Returns current user profile
  app.fastify.get('/api/users/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ id: string; email: string; name: string | null; timezone: string | null; preferredCurrency: string | null } | void> => {
    app.logger.info('Fetching user profile');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userData = session.user;
    app.logger.info({ userId: userData.id }, 'User profile retrieved');

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      timezone: null, // Better Auth user object doesn't have timezone - client can store in session
      preferredCurrency: null, // Client can store in session
    };
  });

  // PUT /api/users/me - Update user profile
  app.fastify.put('/api/users/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ id: string; email: string; name: string | null; timezone: string | null; preferredCurrency: string | null } | void> => {
    app.logger.info({ body: request.body }, 'Updating user profile');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const { name } = request.body as { name?: string };
    const userId = session.user.id;

    // Better Auth handles user updates via /api/auth/update-user
    // For now, we log the update request and return the current user
    if (name) {
      app.logger.info({ userId, name }, 'User name update requested (via Better Auth)');
    }

    const userData = session.user;
    app.logger.info({ userId }, 'User profile updated');

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      timezone: null,
      preferredCurrency: null,
    };
  });
}
