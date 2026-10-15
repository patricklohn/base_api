import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { Env } from '@configs/env';

// errors
import { ServiceError } from '@errors/service-error';

// Utils
import { HTTP_STATUS } from '@/utils';

export const corsPlugin = fp(async (app: FastifyInstance) => {
  // Pega as origens permitidas ou define o padrão local
  const allowedOrigins = Env.ALLOWED_ORIGINS
    ? Env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  await app.register(cors, {
    origin: (origin, callback) => {
      // Permite requisições sem origem (Postman, curl, Mobile Apps, Server-to-Server)
      if (!origin) {
        return callback(null, true);
      }

      // Verifica se a origem está na lista ou se o wildcard '*' foi liberado no .env
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // ServiceError para o error handler responder 403 no envelope padrão (um Error comum viraria 500)
      const corsError = new ServiceError(
        HTTP_STATUS.forbidden,
        'CORS_ORIGIN_NOT_ALLOWED',
        `Origem "${origin}" não permitida pela política de CORS`
      );
      return callback(corsError, false);
    },
    // Métodos HTTP permitidos na API
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Cabeçalhos que o cliente pode ENVIAR na requisição
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept', 'Origin'],

    // Cabeçalhos do servidor que o navegador/frontend consegue LER
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset', // Adicionado para ajudar o front a saber quando o rate limit zera
      'Content-Disposition', // Essencial se sua API for fazer download de arquivos/PDFs no front
    ],

    // O access token vai no header Authorization; o cookie só leva o refresh token para /auth/refresh e /auth/logout.
    // Com o wildcard '*' os cookies ficam desligados: liberar credenciais para qualquer origem não é seguro.
    credentials: !allowedOrigins.includes('*'),

    // Cache do preflight (OPTIONS) por 24 horas - reduz requisições desnecessárias ao servidor
    maxAge: 86_400,

    // Melhora a performance respondendo requisições OPTIONS com status 204 (No Content) em vez de 200
    optionsSuccessStatus: HTTP_STATUS.option,
  });
});
