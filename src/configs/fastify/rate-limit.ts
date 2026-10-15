import fp from 'fastify-plugin';
import rateLimit, { type RateLimitOptions } from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { Env } from '@/configs/env';

// errors
import { ServiceError } from '@errors/service-error';

/**
 * Limite específico do login: cada tentativa executa bcrypt (custo alto de CPU),
 * então a janela é bem mais restrita que a global.
 *
 * @example
 * app.post('/login', { schema, config: { rateLimit: loginRateLimit } }, handler);
 */
export const loginRateLimit: RateLimitOptions = {
  max: Env.RATE_LIMIT_LOGIN_MAX_REQUESTS,
  timeWindow: Env.RATE_LIMIT_LOGIN_WINDOW_SECONDS * 1000,
};

/**
 * Rate limit global por IP (`request.ip`, que depende de `TRUST_PROXY`).
 * O erro é lançado como `ServiceError` para o error handler global montar o envelope padrão.
 */
export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    global: true,
    max: Env.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: Env.RATE_LIMIT_WINDOW_SECONDS * 1000,
    allowList: [],

    errorResponseBuilder: (_req, context) =>
      new ServiceError(
        context.statusCode,
        'RATE_LIMIT_EXCEEDED',
        `Muitas solicitações. Tente novamente em ${context.after}.`
      ),

    // Adiciona cabeçalhos padrão a todas as respostas
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
});
