import Fastify, { type FastifyInstance } from 'fastify';
import { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ServiceError } from '@errors/service-error';

import { registerErrorHandlers } from './error';

/** Erro do PostgreSQL com o código informado, como o `pg` lança. */
const pgError = (code: string) => Object.assign(new DatabaseError('erro do banco', 0, 'error'), { code });

describe('registerErrorHandlers', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    registerErrorHandlers(app);

    app.get('/service-error', async () => {
      throw new ServiceError(409, 'DUPLICATED', 'Já existe');
    });
    app.get('/pg/:code', async (request) => {
      throw pgError((request.params as { code: string }).code);
    });
    app.get('/unexpected', async () => {
      throw new Error('detalhe interno que não pode vazar');
    });

    await app.ready();
  });

  afterAll(() => app.close());

  it('ServiceError vira o envelope com o status e o code dele', async () => {
    const response = await app.inject('/service-error');

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ success: false, error: { code: 'DUPLICATED', message: 'Já existe' } });
  });

  it.each([
    ['23505', 409, 'UNIQUE_VIOLATION'],
    ['23503', 422, 'FOREIGN_KEY_VIOLATION'],
    ['23514', 422, 'CHECK_VIOLATION'],
    ['22P02', 400, 'INVALID_VALUE'],
    ['42883', 400, 'INVALID_OPERATOR'],
  ])('erro %s do PostgreSQL vira %i %s', async (code, status, errorCode) => {
    const response = await app.inject(`/pg/${code}`);

    expect(response.statusCode).toBe(status);
    expect(response.json().error.code).toBe(errorCode);
  });

  it('erro inesperado vira 500 com mensagem genérica e sem stack fora de development', async () => {
    const response = await app.inject('/unexpected');

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('erro do PostgreSQL sem mapeamento também vira 500 genérico', async () => {
    const response = await app.inject('/pg/99999');

    expect(response.statusCode).toBe(500);
    expect(response.json().error.message).toBe('Internal server error');
  });

  it('rota inexistente responde 404 no envelope padrão', async () => {
    const response = await app.inject('/nao-existe');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Cannot GET /nao-existe' },
    });
  });
});
