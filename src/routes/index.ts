import type { FastifyInstance } from 'fastify';
import { Env, isDocsEnabled } from '@configs/env';
import { publicRoutes } from './public';
import { privateRoutes } from './private';

export async function registerRoutes(app: FastifyInstance) {
  // ─── Root ──────────────────────────────────────────────────────────────────
  app.get('/', { schema: { hide: true } }, async (_req, reply) => {
    return reply.status(200).send({
      success: true,
      result: {
        name: Env.APP_NAME,
        version: Env.APP_VERSION,
        message: 'API running',
        docs: isDocsEnabled ? '/docs' : null,
      },
    });
  });

  // ─── Public (no auth) ──────────────────────────────────────────────────────
  await app.register(publicRoutes, { prefix: '/api/v1' });

  // ─── Private (requires app.authenticate) ──────────────────────────────────
  await app.register(privateRoutes, { prefix: '/api/v1' });
}
