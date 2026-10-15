import Fastify from 'fastify';

import {
  loggerConfig,
  onResponseLogger,
  helmetPlugin,
  corsPlugin,
  rateLimitPlugin,
  zodPlugin,
  authPlugin,
  registerErrorHandlers,
  swaggerPlugin,
  scalarPlugin,
  sentryPlugin,
} from '@/configs';

import { registerRoutes } from '@/routes';
import { Env } from '@configs/env';

export async function buildApp() {
  const app = Fastify({
    logger: loggerConfig,
    disableRequestLogging: true, // Handled by onResponseLogger
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
    trustProxy: Env.TRUST_PROXY,
  });

  // ─── 1. Observability ──────────────────────────────────────────────────────
  await app.register(sentryPlugin);

  // ─── 2. Schema validation ──────────────────────────────────────────────────
  await app.register(zodPlugin);

  // ─── 3. Error handlers (antes dos plugins/rotas: cada contexto filho herda o handler no registro) ─
  registerErrorHandlers(app);

  // ─── 4. Security (antes das docs: Helmet, CORS e rate limit valem também para /documentation) ─
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);

  // ─── 5. API Docs (before routes so schemas are captured) ──────────────────
  await app.register(swaggerPlugin);

  // ─── 6. Auth ──────────────────────────────────────────────────────────────
  await app.register(authPlugin);

  // ─── 7. Routes ────────────────────────────────────────────────────────────
  await app.register(registerRoutes);

  // ─── 8. Docs UI (after routes so all schemas are indexed) ─────────────────
  await app.register(scalarPlugin);

  // ─── 9. Request logging hook ──────────────────────────────────────────────
  app.addHook('onResponse', onResponseLogger);

  return app;
}
