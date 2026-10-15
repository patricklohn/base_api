import type { FastifyInstance } from 'fastify';
import { AuthController } from '@controllers/auth';
import { loginRateLimit } from '@configs/fastify/rate-limit';
import * as docs from './docs';

export async function authPublicRoutes(app: FastifyInstance) {
  app.post('/login', { schema: docs.loginSchema, config: { rateLimit: loginRateLimit } }, AuthController.login);
  app.post('/refresh', { schema: docs.refreshSchema }, AuthController.refresh);
  app.post('/logout', { schema: docs.logoutSchema }, AuthController.logout);
}
