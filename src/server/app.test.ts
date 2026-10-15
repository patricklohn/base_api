import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Env } from '@configs/env';

import { buildApp } from './app';

// Sem banco (ver setup-unit.ts): cobre só o que responde antes de qualquer consulta
describe('buildApp (sem banco)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(() => app.close());

  describe('Helmet', () => {
    it('envia os security headers com CSP restritiva nas rotas da API', async () => {
      const response = await app.inject('/api/v1/health/ping');

      expect(response.headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none'");
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toContain('max-age=');
      expect(response.headers['cross-origin-resource-policy']).toBe('same-site');
    });

    it('deixa a documentação sem CSP, mas com os demais headers', async () => {
      const response = await app.inject('/docs/');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-security-policy']).toBeUndefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('CORS', () => {
    it('libera origem da allowlist com allow-credentials (cookie do refresh token)', async () => {
      const response = await app.inject({ url: '/api/v1/health/ping', headers: { origin: 'http://localhost:3001' } });

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('responde 204 ao preflight de origem permitida', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/v1/auth/login',
        headers: {
          origin: 'http://localhost:3001',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization,content-type',
        },
      });

      expect(response.statusCode).toBe(204);
    });

    it('recusa origem fora da allowlist com 403', async () => {
      const response = await app.inject({ url: '/api/v1/health/ping', headers: { origin: 'http://evil.com' } });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('CORS_ORIGIN_NOT_ALLOWED');
    });

    it('aceita chamada sem Origin (servidor a servidor)', async () => {
      expect((await app.inject('/api/v1/health/ping')).statusCode).toBe(200);
    });
  });

  describe('refresh token (sem token, antes do banco)', () => {
    it('refresh sem body nem cookie responde 401 REFRESH_TOKEN_INVALID', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh' });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('REFRESH_TOKEN_INVALID');
    });

    it('logout sem token responde 204 e apaga o cookie', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', payload: {} });

      expect(response.statusCode).toBe(204);
      expect(response.headers['set-cookie']).toContain('refresh_token=;');
    });
  });

  describe('rotas públicas', () => {
    it('raiz informa nome, versão e caminho da documentação', async () => {
      const response = await app.inject('/');

      expect(response.json()).toEqual({
        success: true,
        result: { name: Env.APP_NAME, version: Env.APP_VERSION, message: 'API running', docs: '/docs' },
      });
    });

    it('ping responde pong', async () => {
      const response = await app.inject('/api/v1/health/ping');
      expect(response.json()).toEqual({ success: true, result: { message: 'pong' } });
    });

    it('ready responde 503 quando o banco está inacessível', async () => {
      const response = await app.inject('/api/v1/health/ready');

      expect(response.statusCode).toBe(503);
      expect(response.json().error.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('login recusa body inválido com 400', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { client_id: 'x' } });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });
  });

  describe('rotas privadas', () => {
    it.each([
      ['sem token', undefined],
      ['com token inválido', 'Bearer token-invalido'],
      ['com token assinado por outro segredo', `Bearer ${fakeToken()}`],
    ])('respondem 401 %s', async (_case, authorization) => {
      const response = await app.inject({
        url: '/api/v1/auth/me',
        headers: authorization ? { authorization } : {},
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('UNAUTHORIZED_TOKEN');
    });
  });
});

describe('rate limit do login', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(() => app.close());

  it(`responde 429 depois de ${Env.RATE_LIMIT_LOGIN_MAX_REQUESTS} tentativas na janela`, async () => {
    const attempt = () => app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: {} });

    for (let i = 0; i < Env.RATE_LIMIT_LOGIN_MAX_REQUESTS; i++) {
      expect((await attempt()).statusCode).toBe(400);
    }

    const blocked = await attempt();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});

/** JWT bem formado (HS256), mas assinado com um segredo diferente do da API. */
function fakeToken() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'x', role: 'admin' })}.assinatura-falsa`;
}
