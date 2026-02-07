import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerEmailAuthRoutes } from './routes/emailAuth.js';
import { registerUserRoutes } from './routes/users.js';
import { registerRoundsRoutes } from './routes/rounds.js';
import { registerRoundMembersRoutes } from './routes/roundMembers.js';
import { registerContributionsRoutes } from './routes/contributions.js';
import { registerContributionsTrackingRoutes } from './routes/contributionsTracking.js';
import { registerInvitesRoutes } from './routes/invites.js';
import { registerTimelineRoutes } from './routes/timeline.js';
import { registerPayoutsViewRoutes } from './routes/payoutsView.js';
import { registerNotificationsRoutes } from './routes/notificationsRoutes.js';
import { registerRoundSettingsRoutes } from './routes/roundSettings.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerCalendarRoutes } from './routes/calendar.js';

// Combine schemas for full database type support
const schema = { ...appSchema, ...authSchema };

// Create application with schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with email/password and OAuth (Google, Apple only)
// OAuth callback routes are automatically handled by Better Auth framework
// GitHub OAuth is explicitly disabled
// Both Google and Apple OAuth use the OAuth proxy by default (no configuration needed)
// For custom credentials, use environment variables:
// - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// - APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
app.withAuth({
  // Only Google and Apple OAuth providers enabled
  // GitHub provider is disabled
  // OAuth proxy is used by default for both providers
  // Optionally restrict trusted origins if needed
  // trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') || ["*"],
});

// Enable file storage for payment proof uploads
app.withStorage();

// Add global error handler for better error logging and debugging
app.fastify.setErrorHandler((error, request, reply) => {
  const isOAuthRequest = request.url.includes('/api/auth');
  const isOAuthCallback = request.url.includes('oauth-callback');

  // Type-safe error properties
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorCode = typeof error === 'object' && error !== null && 'code' in error ? (error as any).code : undefined;

  // Type-safe query parameters
  const query = isOAuthRequest && typeof request.query === 'object' && request.query !== null
    ? {
        ...request.query,
        code: (request.query as any).code ? '[REDACTED]' : undefined,
      }
    : undefined;

  const errorContext = {
    err: errorObj,
    method: request.method,
    path: request.url,
    query,
    statusCode: reply.statusCode,
    errorName: errorObj.name,
    errorCode,
    stack: errorObj.stack,
  };

  if (reply.statusCode >= 500) {
    app.logger.error(errorContext, isOAuthCallback
      ? 'OAuth callback server error - check database connection and OAuth provider credentials'
      : 'Server error in request'
    );

    return reply.status(reply.statusCode).send({
      error: 'Internal server error',
      message: errorObj.message,
      ...(isOAuthRequest && {
        hint: isOAuthCallback
          ? 'OAuth callback failed. Check: 1) Database connection 2) OAuth provider credentials 3) Session table'
          : 'Check OAuth configuration and environment variables',
      }),
    });
  }

  if (reply.statusCode >= 400) {
    app.logger.warn(errorContext, isOAuthRequest
      ? 'Auth request client error'
      : 'Client error in request'
    );

    return reply.status(reply.statusCode).send({
      error: errorObj.message || 'Request failed',
    });
  }

  app.logger.error(errorContext, 'Unhandled error in request');
  return reply.status(500).send({
    error: 'Internal server error',
    message: errorObj.message,
  });
});

// Register route modules AFTER app is created
registerAuthRoutes(app);
registerEmailAuthRoutes(app);
registerUserRoutes(app);
registerRoundsRoutes(app);
registerRoundMembersRoutes(app);
registerContributionsRoutes(app);
registerContributionsTrackingRoutes(app);
registerInvitesRoutes(app);
registerTimelineRoutes(app);
registerPayoutsViewRoutes(app);
registerNotificationsRoutes(app);
registerRoundSettingsRoutes(app);
registerDashboardRoutes(app);
registerCalendarRoutes(app);

await app.run();
app.logger.info('SafeRound application started');
