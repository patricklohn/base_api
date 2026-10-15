import type { FastifyInstance, FastifyError } from 'fastify';
import { DatabaseError } from 'pg';

import { Env } from '@configs/env';

// Utils
import { HTTP_STATUS } from '@/utils';

/** Erros do PostgreSQL causados pelo input do client, traduzidos para 4xx. */
const PG_CLIENT_ERRORS: Record<string, { statusCode: number; code: string; message: string }> = {
  '23505': { statusCode: HTTP_STATUS.conflict, code: 'UNIQUE_VIOLATION', message: 'Registro duplicado' },
  '23503': {
    statusCode: HTTP_STATUS.unprocessable_entity,
    code: 'FOREIGN_KEY_VIOLATION',
    message: 'Registro relacionado não encontrado',
  },
  '23514': { statusCode: HTTP_STATUS.unprocessable_entity, code: 'CHECK_VIOLATION', message: 'Valor não permitido' },
  '22P02': { statusCode: HTTP_STATUS.bad_request, code: 'INVALID_VALUE', message: 'Valor em formato inválido' },
  '22007': { statusCode: HTTP_STATUS.bad_request, code: 'INVALID_VALUE', message: 'Data em formato inválido' },
  '42883': {
    statusCode: HTTP_STATUS.bad_request,
    code: 'INVALID_OPERATOR',
    message: 'Operador incompatível com o tipo da coluna',
  },
};

/**
 * Converte um erro do PostgreSQL causado pelo client em um erro HTTP 4xx.
 *
 * @param error - erro lançado pela query
 * @returns erro com `statusCode`/`code`, ou `undefined` se não for um erro de input conhecido
 */
function toClientError(error: unknown) {
  if (!(error instanceof DatabaseError) || !error.code) {
    return undefined;
  }

  return PG_CLIENT_ERRORS[error.code];
}

/**
 * Registra o manipulador de erros global e o manipulador de 404 na instância do Fastify.
 */
export function registerErrorHandlers(app: FastifyInstance) {
  // ─── Global error handler ──────────────────────────────────────────────────
  app.setErrorHandler((rawError: FastifyError, request, reply) => {
    const error = toClientError(rawError) ?? rawError;
    const statusCode = error.statusCode ?? 500;
    const isServerError = statusCode >= 500;

    if (isServerError) {
      request.log.error({ err: rawError, statusCode }, rawError.message);
    } else {
      request.log.warn({ err: rawError, statusCode }, rawError.message);
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: isServerError ? 'Internal server error' : error.message,
        ...(!isServerError && 'details' in error && typeof error.details === 'object' && error.details),
        ...(Env.NODE_ENV === 'development' &&
          isServerError && {
            stack: rawError.stack,
          }),
      },
    });
  });

  // ─── 404 handler ──────────────────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    request.log.warn(`Route not found: ${request.method} ${request.url}`);

    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Cannot ${request.method} ${request.url}`,
      },
    });
  });
}
