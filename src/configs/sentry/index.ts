import fp from 'fastify-plugin';
import * as Sentry from '@sentry/node';
import type { FastifyInstance } from 'fastify';

import { Env } from '@configs/env';

export const sentryPlugin = fp(async (app: FastifyInstance) => {
  const dsn = Env.SENTRY_DSN;

  if (!dsn) {
    app.log.warn('SENTRY_DSN não definido — Sentry desativado');
    return;
  }

  Sentry.init({
    dsn,
    environment: Env.SENTRY_ENVIRONMENT,
    release: Env.APP_VERSION,
    tracesSampleRate: Env.SENTRY_TRACES_SAMPLE_RATE,

    // Ignorar ruído
    ignoreErrors: ['Not Found', 'Validation Error', 'Unauthorized'],
  });

  app.addHook('preHandler', async (request, _reply) => {
    // Pega o escopo isolado desta requisição específica
    const isolationScope = Sentry.getIsolationScope();

    // Injeta os dados da requisição atual nele
    isolationScope.setTag('route', request.routeOptions?.url ?? request.url);
    isolationScope.setTag('method', request.method);
    isolationScope.setUser({ ip_address: request.ip });
    // O corpo da request não é anexado: pode conter `client_secret` ou refresh token
  });

  // Captura erros não tratados no hook de erro do Fastify
  app.addHook('onError', async (request, _reply, error) => {
    if ('statusCode' in error && Number((error as { statusCode: unknown }).statusCode) < 500) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setTag('route', request.routeOptions?.url ?? request.url);
      scope.setTag('method', request.method);
      scope.setUser({ ip_address: request.ip });
      Sentry.captureException(error);
    });
  });

  // Envia eventos pendentes antes de o processo encerrar
  app.addHook('onClose', async () => {
    await Sentry.close(2000);
  });

  app.log.info('Sentry inicializado');
});
