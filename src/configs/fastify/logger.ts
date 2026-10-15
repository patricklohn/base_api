import type { FastifyServerOptions } from 'fastify';

import { Env } from '@configs/env';

const isDev = Env.NODE_ENV === 'development';

/**
 * Logger configuration for Fastify/Pino.
 * In development: pino-pretty with colors.
 * In production: structured JSON — ready for Datadog, Loki, CloudWatch etc.
 */
export const loggerConfig: FastifyServerOptions['logger'] = {
  level: Env.LOG_LEVEL,
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
      },
    },
  }),
};

/**
 * Hook para registrar cada requisição/resposta em uma única linha estruturada.
 * Registre com `disableRequestLogging: true` no Fastify para evitar duplicatas.
 *
 * Exemplo de saída:
 *   GET /api/v1/health/ping - 200 (3.42ms)
 */
export function onResponseLogger(
  request: { method: string; url: string; log: { info: (msg: string) => void } },
  reply: { statusCode: number; elapsedTime: number },
  done: () => void
) {
  const status = reply.statusCode;
  const ms = reply.elapsedTime.toFixed(2);

  request.log.info(`${request.method} ${request.url} → ${status} (${ms}ms)`);
  done();
}
