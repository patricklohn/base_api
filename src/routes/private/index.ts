import type { FastifyInstance } from 'fastify';
import { authPrivateRoutes } from './auth';
import { serviceAccountRoutes } from './service-account';
import { planetRoutes } from './planet';
import { characterRoutes } from './character';
import { actorRoutes } from './actor';
import { filmRoutes } from './film';
import { castingRoutes } from './casting';

/**
 * Rotas autenticadas. Cada grupo restringe os roles permitidos com `app.requireRole(...)`.
 *
 * Os hooks de auth usam `preParsing`: o rate limit é um hook `onRequest` da rota e precisa rodar antes,
 * senão requests sem token nunca são limitadas. O body só é lido depois da autenticação.
 */
export async function privateRoutes(app: FastifyInstance) {
  app.addHook('preParsing', app.authenticate);

  await app.register(authPrivateRoutes, { prefix: '/auth' });
  await app.register(serviceAccountRoutes, { prefix: '/service-account' });
  await app.register(planetRoutes, { prefix: '/planet' });
  await app.register(characterRoutes, { prefix: '/character' });
  await app.register(actorRoutes, { prefix: '/actor' });
  await app.register(filmRoutes, { prefix: '/film' });
  await app.register(castingRoutes, { prefix: '/casting' });
}
