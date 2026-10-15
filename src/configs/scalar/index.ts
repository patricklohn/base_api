import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

import { Env, isDocsEnabled } from '@configs/env';

/**
 * O Scalar substitui o Swagger UI por uma referência de API moderna e interativa.
 * Documentação disponível em /reference (configurável via variável de ambiente SCALAR_PATH).
 */
export const scalarPlugin = fp(async (app: FastifyInstance) => {
  if (!isDocsEnabled) {
    app.log.info('Documentação da Api desativada (Scalar e Swagger UI)');
    return;
  }

  const { default: scalarReference } = await import('@scalar/fastify-api-reference');

  await app.register(scalarReference, {
    routePrefix: '/docs',
    configuration: {
      title: `${Env.APP_NAME ?? 'Fastify API'} — Reference`,
      // Aponta para o JSON da OpenAPI gerado pelo @fastify/swagger
      spec: { url: '/documentation/json' },
      theme: 'deepSpace',
      layout: 'modern',
      persistAuth: true,
      defaultHttpClient: {
        targetKey: 'javascript',
        clientKey: 'fetch',
      },
    },
  });

  app.log.info(`Documentação da Api com Scalar disponível em '/docs'`);
});
