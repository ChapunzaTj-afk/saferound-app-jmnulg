import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerUserRoutes } from './routes/users.js';
import { registerRoundsRoutes } from './routes/rounds.js';
import { registerRoundMembersRoutes } from './routes/roundMembers.js';
import { registerContributionsRoutes } from './routes/contributions.js';
import { registerDashboardRoutes } from './routes/dashboard.js';

// Combine schemas for full database type support
const schema = { ...appSchema, ...authSchema };

// Create application with schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with email/password and OAuth (Google, Apple)
app.withAuth();

// Enable file storage for payment proof uploads
app.withStorage();

// Register route modules AFTER app is created
registerUserRoutes(app);
registerRoundsRoutes(app);
registerRoundMembersRoutes(app);
registerContributionsRoutes(app);
registerDashboardRoutes(app);

await app.run();
app.logger.info('SafeRound application started');
