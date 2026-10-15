import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authPublicRoutes } from './auth';

export async function publicRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authPublicRoutes, { prefix: '/auth' });
}
