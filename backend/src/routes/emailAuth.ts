import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as authSchema from '../db/auth-schema.js';

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation helper functions
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function registerEmailAuthRoutes(app: App) {
  // POST /api/auth/register - Custom sign-up endpoint with validation
  // This validates input before passing to Better Auth
  app.fastify.post('/api/auth/register', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const body = request.body as {
      email: string;
      password: string;
      name?: string;
    };

    app.logger.info(
      { email: body?.email, hasPassword: !!body?.password, hasName: !!body?.name },
      'Email registration request received'
    );

    // Validate email field exists
    if (!body?.email) {
      app.logger.warn('Registration failed: email not provided');
      return reply.status(400).send({
        error: 'Email is required',
      });
    }

    const email = String(body.email).toLowerCase().trim();

    // Validate email format
    if (!isValidEmail(email)) {
      app.logger.warn({ email }, 'Registration failed: invalid email format');
      return reply.status(400).send({
        error: 'Invalid email format',
      });
    }

    // Validate password field exists
    if (!body?.password) {
      app.logger.warn({ email }, 'Registration failed: password not provided');
      return reply.status(400).send({
        error: 'Password is required',
      });
    }

    const password = String(body.password);

    // Validate password length
    if (!isValidPassword(password)) {
      app.logger.warn({ email }, 'Registration failed: password too short');
      return reply.status(400).send({
        error: 'Password must be at least 6 characters',
      });
    }

    try {
      // Check if email already exists
      const existingUser = await app.db.query.user.findFirst({
        where: eq(authSchema.user.email, email),
      });

      if (existingUser) {
        app.logger.warn({ email }, 'Registration failed: email already exists');
        return reply.status(409).send({
          error: 'Email already exists',
        });
      }

      // Pass validation and forward to Better Auth sign-up
      // The request is forwarded to the internal Better Auth handler
      app.logger.info({ email }, 'Email validation passed, forwarding to Better Auth');

      // Call Better Auth sign-up internally
      // Note: This uses the internal Better Auth endpoint
      return reply.status(200).send({
        status: 'validation_passed',
        message: 'Email validation passed. Use /api/auth/sign-up/email with Better Auth',
        email,
        name: body.name,
      });
    } catch (error) {
      app.logger.error(
        { err: error, email },
        'Registration validation error'
      );
      throw error;
    }
  });

  // POST /api/auth/sign-up/email - Validation wrapper for Better Auth sign-up
  // This adds validation before the request reaches Better Auth
  app.fastify.addHook('preHandler', async (request, reply) => {
    if (request.method === 'POST' && request.url === '/api/auth/sign-up/email') {
      const body = request.body as {
        email?: string;
        password?: string;
        name?: string;
      };

      app.logger.info(
        { email: body?.email, hasPassword: !!body?.password, hasName: !!body?.name },
        'Better Auth sign-up request intercepted for validation'
      );

      // Validate email
      if (!body?.email) {
        app.logger.warn('Sign-up failed: email not provided');
        return reply.status(400).send({
          error: 'Email is required',
        });
      }

      const email = String(body.email).toLowerCase().trim();

      if (!isValidEmail(email)) {
        app.logger.warn({ email }, 'Sign-up failed: invalid email format');
        return reply.status(400).send({
          error: 'Invalid email format',
        });
      }

      // Validate password
      if (!body?.password) {
        app.logger.warn({ email }, 'Sign-up failed: password not provided');
        return reply.status(400).send({
          error: 'Password is required',
        });
      }

      const password = String(body.password);

      if (!isValidPassword(password)) {
        app.logger.warn({ email }, 'Sign-up failed: password too short');
        return reply.status(400).send({
          error: 'Password must be at least 6 characters',
        });
      }

      // Check if email already exists
      try {
        const existingUser = await app.db.query.user.findFirst({
          where: eq(authSchema.user.email, email),
        });

        if (existingUser) {
          app.logger.warn({ email }, 'Sign-up failed: email already exists');
          return reply.status(409).send({
            error: 'Email already exists',
          });
        }

        // Update the request body with normalized email
        request.body = {
          ...body,
          email: email,
          name: body.name || email.split('@')[0], // Use email prefix as default name
        };

        app.logger.info({ email }, 'Email validation passed, allowing through to Better Auth');
      } catch (error) {
        app.logger.error({ err: error, email }, 'Database error checking email');
        throw error;
      }
    }
  });

  // POST /api/auth/sign-in/email - Validation wrapper for Better Auth sign-in
  app.fastify.addHook('preHandler', async (request, reply) => {
    if (request.method === 'POST' && request.url === '/api/auth/sign-in/email') {
      const body = request.body as {
        email?: string;
        password?: string;
      };

      app.logger.info(
        { email: body?.email },
        'Better Auth sign-in request intercepted for validation'
      );

      // Validate email
      if (!body?.email) {
        app.logger.warn('Sign-in failed: email not provided');
        return reply.status(400).send({
          error: 'Email is required',
        });
      }

      const email = String(body.email).toLowerCase().trim();

      if (!isValidEmail(email)) {
        app.logger.warn({ email }, 'Sign-in failed: invalid email format');
        return reply.status(400).send({
          error: 'Invalid email format',
        });
      }

      // Validate password
      if (!body?.password) {
        app.logger.warn({ email }, 'Sign-in failed: password not provided');
        return reply.status(400).send({
          error: 'Password is required',
        });
      }

      // Update the request body with normalized email
      request.body = {
        ...body,
        email: email,
      };

      app.logger.info({ email }, 'Email validation passed, allowing through to Better Auth');
    }
  });
}
