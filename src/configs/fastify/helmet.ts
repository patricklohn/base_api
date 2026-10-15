import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

/** Rotas que servem HTML (Scalar e Swagger UI), com scripts e estilos inline. */
const DOCS_ROUTE_PREFIXES = ['/docs', '/documentation'];

/**
 * Security headers (CSP, HSTS, X-Content-Type-Options, etc.) em todas as respostas.
 * A API só responde JSON, então a CSP bloqueia tudo. As rotas de documentação mantêm
 * os demais headers, mas ficam sem CSP para a UI carregar.
 */
export const helmetPlugin = fp(async (app: FastifyInstance) => {
  // Precisa ser adicionado antes do Helmet, que lê `routeOptions.helmet` no próprio onRoute
  app.addHook('onRoute', (routeOptions) => {
    const isDocsRoute = DOCS_ROUTE_PREFIXES.some(
      (prefix) => routeOptions.url === prefix || routeOptions.url.startsWith(`${prefix}/`)
    );

    if (isDocsRoute) {
      routeOptions.helmet = { contentSecurityPolicy: false };
    }
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
});
