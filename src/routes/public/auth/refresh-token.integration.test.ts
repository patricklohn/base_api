import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { db } from '@database/db/kysely';
import { eServiceAccountStatus } from '@database/db/model';
import { RefreshTokenService } from '@services/refresh-token';
import { ServiceAccountService } from '@services/service-account';
import { closeTestApp, createOrganization, createTestApp } from '@tests/helpers';

describe('refresh token (integração)', () => {
  let app: FastifyInstance;
  let organization: Awaited<ReturnType<typeof createOrganization>>;

  beforeAll(async () => {
    app = await createTestApp();
    organization = await createOrganization('Resistance', '33.000.167/0001-01');
  });

  afterAll(() => closeTestApp(app));

  /** Login que devolve o corpo da resposta e o cookie do refresh token. */
  const loginWith = async (credentials: { client_id: string; client_secret: string } = organization) => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { client_id: credentials.client_id, client_secret: credentials.client_secret },
    });
    expect(response.statusCode).toBe(200);
    return { result: response.json().result, cookie: response.cookies.find((c) => c.name === 'refresh_token') };
  };

  const refreshWith = (refresh_token: string) =>
    app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refresh_token } });

  const logoutWith = (refresh_token: string) =>
    app.inject({ method: 'POST', url: '/api/v1/auth/logout', payload: { refresh_token } });

  const meWith = (accessToken: string) =>
    app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${accessToken}` } });

  it('login devolve o refresh token no body e no cookie httpOnly restrito a /api/v1/auth', async () => {
    const { result, cookie } = await loginWith();

    expect(result).toMatchObject({ refresh_token: expect.any(String), refresh_token_expires_at: expect.any(String) });
    expect(cookie).toMatchObject({
      value: result.refresh_token,
      httpOnly: true,
      sameSite: 'Strict',
      path: '/api/v1/auth',
    });

    const stored = await db
      .selectFrom('refresh_token')
      .select('token_hash')
      .where('token_hash', '=', RefreshTokenService.hash(result.refresh_token))
      .executeTakeFirst();
    expect(stored?.token_hash).not.toBe(result.refresh_token);
  });

  it('refresh pelo body rotaciona: devolve um par novo e o token usado deixa de valer', async () => {
    const { result } = await loginWith();

    const response = await refreshWith(result.refresh_token);
    expect(response.statusCode).toBe(200);

    const rotated = response.json().result;
    expect(rotated.refresh_token).not.toBe(result.refresh_token);
    expect(rotated.role).toBe('admin');
    expect((await meWith(rotated.access_token)).statusCode).toBe(200);
  });

  it('refresh pelo cookie, sem body', async () => {
    const { cookie } = await loginWith();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refresh_token: cookie!.value },
    });

    expect(response.statusCode).toBe(200);
    expect(response.cookies.find((c) => c.name === 'refresh_token')?.value).toBe(response.json().result.refresh_token);
  });

  it('reutilizar um token rotacionado responde 401 e revoga a sessão inteira', async () => {
    const { result } = await loginWith();
    const rotated = (await refreshWith(result.refresh_token)).json().result;

    const reuse = await refreshWith(result.refresh_token);
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().error.code).toBe('REFRESH_TOKEN_INVALID');

    // O sucessor legítimo também cai: não dá para saber quem é o dono e quem roubou
    expect((await refreshWith(rotated.refresh_token)).statusCode).toBe(401);
  });

  it('logout revoga a sessão, apaga o cookie e é idempotente; outras sessões continuam valendo', async () => {
    const session = (await loginWith()).result;
    const other = (await loginWith()).result;

    const logout = await logoutWith(session.refresh_token);
    expect(logout.statusCode).toBe(204);
    expect(logout.cookies.find((c) => c.name === 'refresh_token')?.value).toBe('');

    expect((await refreshWith(session.refresh_token)).statusCode).toBe(401);
    expect((await logoutWith(session.refresh_token)).statusCode).toBe(204);
    expect((await refreshWith(other.refresh_token)).statusCode).toBe(200);
  });

  it('token vencido ou desconhecido responde 401', async () => {
    const { result } = await loginWith();
    await db
      .updateTable('refresh_token')
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where('token_hash', '=', RefreshTokenService.hash(result.refresh_token))
      .execute();

    expect((await refreshWith(result.refresh_token)).statusCode).toBe(401);
    expect((await refreshWith('token-que-nao-existe')).statusCode).toBe(401);
  });

  it('regenerar o client_secret revoga os refresh tokens da credencial', async () => {
    const own = await createOrganization('Rebel Alliance', '60.701.190/0001-04');
    const { result } = await loginWith(own);

    const credentials = await ServiceAccountService.regenerateSecret(own.client_id);

    expect((await refreshWith(result.refresh_token)).statusCode).toBe(401);
    expect((await refreshWith((await loginWith(credentials)).result.refresh_token)).statusCode).toBe(200);
  });

  it('credencial revogada não renova o token', async () => {
    const revoked = await createOrganization('Galactic Empire', '07.526.557/0001-00');
    const { result } = await loginWith(revoked);

    await db
      .updateTable('service_account')
      .set({ status: eServiceAccountStatus.revoked })
      .where('client_id', '=', revoked.client_id)
      .execute();

    expect((await refreshWith(result.refresh_token)).statusCode).toBe(401);
  });
});
