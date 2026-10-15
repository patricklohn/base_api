// ─── Fastify core ─────────────────────────────────────────────────────────────
export {
  loggerConfig,
  onResponseLogger,
  helmetPlugin,
  corsPlugin,
  rateLimitPlugin,
  zodPlugin,
  jsonSchemaTransform,
  authPlugin,
  registerErrorHandlers,
} from './fastify';

// ─── Docs ─────────────────────────────────────────────────────────────────────
export { swaggerPlugin } from './swagger';
export { scalarPlugin } from './scalar';

// ─── Observability ────────────────────────────────────────────────────────────
export { sentryPlugin } from './sentry';
