import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

export function registerAuthRoutes(app: App) {
  // Log all incoming requests to auth endpoints for debugging
  app.fastify.addHook('onRequest', async (request) => {
    if (request.url.includes('/api/auth')) {
      const logData: any = {
        method: request.method,
        path: request.url,
        headers: {
          origin: request.headers.origin,
          referer: request.headers.referer,
          userAgent: request.headers['user-agent'],
        },
      };

      // Log query parameters for OAuth callbacks
      if (request.url.includes('oauth-callback') || request.url.includes('code')) {
        if (typeof request.query === 'object' && request.query !== null) {
          logData.query = {
            ...request.query,
            // Don't log sensitive data
            code: (request.query as any).code ? '[REDACTED]' : undefined,
          };
        }
      }

      app.logger.info(logData, 'Auth request received');
    }
  });

  // Add hook to log auth responses
  app.fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.url.includes('/api/auth')) {
      const logLevel = reply.statusCode >= 400 ? 'warn' : 'info';
      const message = reply.statusCode >= 200 && reply.statusCode < 400
        ? 'Auth request successful'
        : 'Auth request failed';

      app.logger[logLevel](
        {
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
        },
        message
      );
    }
    return payload;
  });

  // Health check endpoint to verify OAuth service is running
  app.fastify.get('/api/auth/health', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Auth health check requested');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Authentication service is operational',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        hasAppleCredentials: !!(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID),
      },
    };
  });

  // OAuth status check endpoint with detailed provider info
  app.fastify.get('/api/auth/status', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('Auth status check requested');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'SafeRound authentication service',
      providers: {
        google: {
          enabled: true,
          callbackUrl: '/api/auth/oauth-callback/google',
          note: 'Uses OAuth proxy by default, or custom credentials via GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET',
        },
        apple: {
          enabled: true,
          callbackUrl: '/api/auth/oauth-callback/apple',
          note: 'Uses OAuth proxy by default, or custom credentials via APPLE_TEAM_ID/APPLE_KEY_ID/APPLE_PRIVATE_KEY',
        },
        github: {
          enabled: false,
          note: 'GitHub OAuth provider is disabled',
        },
        emailPassword: {
          enabled: true,
          signUpUrl: '/api/auth/sign-up/email',
          signInUrl: '/api/auth/sign-in/email',
          note: 'Email/password authentication with validation',
        },
      },
    };
  });

  // OAuth debug endpoint to test OAuth flow
  app.fastify.get('/api/auth/debug', async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info('OAuth debug endpoint accessed');
    return {
      status: 'ok',
      message: 'OAuth service is running',
      timestamp: new Date().toISOString(),
      configuration: {
        framework: 'Fastify + Better Auth',
        authEnabled: true,
        storageEnabled: true,
      },
      endpoints: {
        oauth: {
          googleSignIn: 'POST /api/auth/sign-in/social (with provider: "google")',
          appleSignIn: 'POST /api/auth/sign-in/social (with provider: "apple")',
          googleCallback: 'GET /api/auth/oauth-callback/google?code=...&state=...',
          appleCallback: 'GET /api/auth/oauth-callback/apple?code=...&state=...',
        },
        emailPassword: {
          signUp: 'POST /api/auth/sign-up/email',
          signIn: 'POST /api/auth/sign-in/email',
        },
        session: {
          getSession: 'GET /api/auth/get-session',
          signOut: 'POST /api/auth/sign-out',
        },
        user: {
          getCurrentUser: 'GET /api/users/me',
        },
      },
      notes: {
        oauthFlow: 'OAuth callback is handled automatically by Better Auth framework',
        redirectParam: 'Use redirect_to query param to redirect after authentication',
        example: '/api/auth/oauth-callback/apple?code=XXX&state=YYY&redirect_to=https://yourapp.com/dashboard',
      },
    };
  });
}
